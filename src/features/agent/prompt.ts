import { findTool, toolManifest } from './tools';

/**
 * The agent's system prompt.
 *
 * Written for a 0.5B–3B model rather than a frontier one, so the rules are short,
 * imperative and repetitive-free: those models lose accuracy with every extra
 * paragraph, and they drift off a schema they cannot see repeated. The JSON shape
 * is single-line and shown as the literal first thing to emit, because that is
 * what makes small models actually comply.
 */
export const AGENT_SYSTEM_PROMPT = `You are an Android phone agent. Turn the user's request into tool calls.

Reply with JSON only, no prose and no code fences:
{"say":"one short sentence","calls":[{"tool":"name","args":{"arg":"value"}}]}

Tools:
${toolManifest()}

Rules:
- Use the user's own words for numbers, names and codes. Never invent them.
- If the user names a contact, call contacts_find first to get the number.
- If a detail is missing, put a question in "say" and leave "calls" empty.
- One tool call per action. Two calls run in order.
- "say" is what the phone tells the user. Keep it under 12 words.
- Keep USSD codes exactly as given.
- A USSD menu comes back as text. Read it, then answer with ussd_reply.
- When a menu asks for the PIN, call pin_send. The user enters the PIN themselves in
  Settings, so never ask them for the digits in chat.

Examples:
User: call my landlord 0722 123 456
{"say":"Dialling.","calls":[{"tool":"call","args":{"number":"0722 123 456"}}]}

User: text mum that I am late
{"say":"Finding mum.","calls":[{"tool":"contacts_find","args":{"name":"mum"}}]}

User: check my airtime
{"say":"Opening the airtime menu.","calls":[{"tool":"ussd_start","args":{"code":"*334#"}}]}
`;

/**
 * Adds the phone's clock to the prompt.
 *
 * A 0.5B has no idea what day it is, so "tomorrow" and "this evening" are
 * unresolvable without this. Only the date and hours are given — a full timestamp
 * wastes tokens the model needs for the task.
 */
export function buildAgentPrompt(now = new Date()): string {
  return `${AGENT_SYSTEM_PROMPT}\nNow: ${now.toDateString()}, ${now.getHours()}:00.\n`;
}

export type AgentCall = { tool: string; args: Record<string, string> };
export type AgentPlan = { say: string; calls: AgentCall[] };

/**
 * Parses a model reply into a plan.
 *
 * Small models wrap JSON in fences, prepend "Sure!" or drop the outer braces, so
 * the reply is trimmed to its first object before parsing. When nothing parses the
 * whole reply becomes `say`, which keeps the turn useful instead of throwing.
 */
export function parsePlan(reply: string): AgentPlan {
  const start = reply.indexOf('{');
  const end = reply.lastIndexOf('}');
  const candidate = start >= 0 && end > start ? reply.slice(start, end + 1) : '';

  try {
    const raw = JSON.parse(candidate) as {
      say?: unknown;
      calls?: unknown;
      tool?: unknown;
      args?: unknown;
    };

    // Some models emit the single-call shorthand `{"tool":…,"args":…}` even when
    // told not to. Accept it rather than losing a valid action.
    const calls = Array.isArray(raw.calls)
      ? raw.calls
      : raw.tool
        ? [{ tool: raw.tool, args: raw.args }]
        : [];

    return {
      say: typeof raw.say === 'string' ? raw.say : '',
      calls: calls.flatMap((entry) => {
        if (!entry || typeof entry !== 'object') return [];
        const { tool, args } = entry as { tool?: unknown; args?: unknown };
        if (typeof tool !== 'string' || !findTool(tool)) return [];
        const clean: Record<string, string> = {};
        if (args && typeof args === 'object') {
          for (const [key, value] of Object.entries(args as Record<string, unknown>)) {
            if (value !== null && value !== undefined) clean[key] = String(value);
          }
        }
        return [{ tool, args: clean }];
      }),
    };
  } catch {
    return { say: reply.trim(), calls: [] };
  }
}
