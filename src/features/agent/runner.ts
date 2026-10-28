import { findTool } from './tools';
import type { AgentCall } from './prompt';

export type StepResult = { call: AgentCall; ok: boolean; detail: string };

/**
 * Runs a plan's calls in order, stopping at the first failure.
 *
 * Sequential rather than parallel: the tools hand off to other apps, and two
 * `Linking.openURL` calls fired at once race over which one the OS launches.
 */
export async function runPlan(calls: AgentCall[]): Promise<StepResult[]> {
  const results: StepResult[] = [];
  for (const call of calls) {
    const tool = findTool(call.tool);
    if (!tool) {
      results.push({ call, ok: false, detail: `Unknown tool "${call.tool}".` });
      break;
    }
    try {
      const detail = await tool.run(call.args);
      results.push({ call, ok: true, detail });
    } catch (error) {
      results.push({
        call,
        ok: false,
        detail: error instanceof Error ? error.message : 'The action failed.',
      });
      break;
    }
  }
  return results;
}
