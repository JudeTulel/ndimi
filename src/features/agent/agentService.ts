import { streamChat, type ChatMessage } from '../chat/chatService';
import { AGENT_SYSTEM_PROMPT, parsePlan, type AgentPlan } from './prompt';
import { runPlan, type StepResult } from './runner';

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

    const reply = await streamChat(
      thread,
      (partial) => {
        if (round === 0) onSay(partial);
      },
      signal,
      AGENT_SYSTEM_PROMPT
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

  return { say, steps: trail.join('\n') };
}

function describeSteps(results: StepResult[]): string[] {
  return results.map((r) => `${r.ok ? '✓' : '✗'} ${r.call.tool}${r.ok ? '' : ` — ${r.detail}`}`);
}
