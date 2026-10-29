import { streamChat, type ChatMessage } from '../chat/chatService';
import { buildAgentPrompt, parsePlan, type AgentPlan } from './prompt';
import { runPlan, type StepResult } from './runner';
import { ussdSessionOpen } from './ussd';
import { clock, extractContactAndMessage, extractContactNumber } from './tools';

/** Rounds of model → tool → model. Three is enough for a USSD menu and a confirm. */
const MAX_ROUNDS = 3;

export type AgentTurn = {
  /** What to speak to the user. */
  say: string;
  /** Tool trail, rendered under the bubble. */
  steps: string;
};

/**
 * One agent turn: model plans, tools run, results go back to the model.
 *
 * Results are fed back because a USSD menu is only readable *after* it opens —
 * without a second round the model would answer blind and the user would have to
 * relay the menu by hand. The loop stops as soon as a round plans no calls, or
 * after MAX_ROUNDS, so a confused small model cannot spin.
 *
 * A failing tool also ends the loop: retrying the same broken step three times just
 * burns tokens on a phone.
 */
export async function runAgentTurn(
  history: ChatMessage[],
  signal: { cancelled: boolean },
  onSay: (text: string) => void
): Promise<AgentTurn> {
  let thread: ChatMessage[] = [...history];
  const trail: string[] = [];
  let say = '';

  for (let round = 0; round < MAX_ROUNDS; round += 1) {
    if (signal.cancelled) break;

    // Deterministic, model-free routing for requests the small model can fail at:
    // clock reads, contact-based call/sms, and everything while a USSD menu is open.
    // A matched shortcut is returned immediately, so the user never waits on a
    // pointless model round and never sees "I did not catch that".
    let direct = false;
    const trimmed = (history[history.length - 1]?.content ?? '').trim().toLowerCase();

    // A USSD session is already open: any input is a menu reply or a PIN send. No model.
    if (ussdSessionOpen()) {
      const input = (history[history.length - 1]?.content ?? '').trim();
      if (input === '') break;
      const trimmedInput = input.toLowerCase();
      let reply = input;
      if (/^send the pin$/i.test(trimmedInput) || /^(send|enter)\s+(the\s+)?pin/i.test(trimmedInput)) {
        const pinResult = await runPlan([{ tool: 'pin_send', args: {} }]);
        reply = pinResult[0]?.detail ?? '';
      } else if (/^ussd$/i.test(trimmedInput) || /^(open|run)\b/i.test(trimmedInput)) {
        // Explicit open is a shortcut; the model would say "Opening the..." but we
        // let it through as an explicit-code shortcut instead.
      } else {
        const result = await runPlan([{ tool: 'ussd_reply', args: { input: reply } }]);
        reply = result[0]?.detail ?? '';
      }
      trail.push(`✓ ussd_reply`);
      say = reply || 'Done.';
      direct = true;
    } else if (/what time is it|current time|time now|clock/i.test(trimmed)) {
      say = clock();
      direct = true;
    } else if (/^(call|dial)\b/i.test(trimmed)) {
      const callMatch = trimmed.match(/^(call|dial)\b/i);
      if (callMatch) {
        const rest = trimmed.slice(callMatch[0].length).trim();
        const number = extractContactNumber(rest);
        if (number) {
          say = `Dialling ${number}.`;
          direct = true;
          void runPlan([{ tool: 'call', args: { number } }]);
        }
      }
    } else if (/^(text|message|sms|send an sms|text my)\b/i.test(trimmed)) {
      const textMatch = trimmed.match(/^(text|message|sms|send an sms|text my)\b/i);
      if (textMatch) {
        const rest = trimmed.slice(textMatch[0].length).trim();
        const contact = extractContactAndMessage(rest);
        if (contact) {
          const { name, message } = contact;
          say = `Texting ${name}.`;
          direct = true;
          void runPlan([{ tool: 'sms', args: { name, message } }]);
        }
      }
    }

    if (direct) {
      if (!say) say = 'Done.';
      break;
    }

    const reply = await streamChat(
      thread,
      (partial) => {
        if (round === 0) onSay(partial);
      },
      signal,
      buildAgentPrompt()
    );

    const plan: AgentPlan = parsePlan(reply);
    if (plan.say) say = plan.say;
    if (plan.calls.length === 0) break;

    const results: StepResult[] = await runPlan(plan.calls);
    trail.push(...describeSteps(results));

    // Report the outcome back so the next round can read the menu or confirm. The
    // reply goes in as the assistant turn, per the transcript contract.
    thread = [
      ...thread,
      { role: 'assistant', content: reply },
      {
        role: 'user',
        content: `Tool results:\n${results
          .map((r) => `${r.call.tool}: ${r.ok ? r.detail : `FAILED — ${r.detail}`}`)
          .join('\n')}\n\nGive the next step, or finish with the final answer in "say" and no calls.`,
      },
    ];

    if (results.some((r) => !r.ok)) break;
  }

  return { say: say || (trail.length ? 'Done.' : 'I did not catch that — try again.'), steps: trail.join('\n') };
}

function describeSteps(results: StepResult[]): string[] {
  return results.map((r) => `${r.ok ? '✓' : '✗'} ${r.call.tool}${r.ok ? '' : ` — ${r.detail}`}`);
}
