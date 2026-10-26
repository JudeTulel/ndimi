import { completion, loadModel, unloadModel } from '@qvac/sdk';
import { CATALOG, type CatalogModel } from '../models/catalog';
import { getSnapshot } from '../models/modelStore';

export type ChatMessage = { role: 'user' | 'assistant'; content: string };

let loaded: { modelId: string; source: string } | null = null;

/**
 * Loads the installed chat model into the QVAC runtime and returns its runtime
 * id. Kept warm across turns; unloaded explicitly when the model is removed or
 * swapped.
 */
export async function ensureChatModel(): Promise<string> {
  const model = CATALOG.find(
    (m) => m.task === 'chat' && getSnapshot()[m.id]?.status === 'installed'
  );
  if (!model) throw new Error('No chat model installed. Install one in Settings › Models.');

  const state = getSnapshot()[model.id];
  if (state?.status !== 'installed') throw new Error('Chat model is not installed.');
  const source = state.localPath;

  if (loaded && loaded.source === source) return loaded.modelId;

  if (loaded) {
    await unloadModel({ modelId: loaded.modelId }).catch(() => {});
    loaded = null;
  }

  const modelId = await loadModel({
    modelSrc: source,
    modelType: 'llamacpp-completion',
    modelConfig: { ctx_size: 2048 },
  });
  loaded = { modelId, source };
  return modelId;
}

export async function unloadChatModel(): Promise<void> {
  if (!loaded) return;
  await unloadModel({ modelId: loaded.modelId }).catch(() => {});
  loaded = null;
}

export function hasChatModel(): CatalogModel | undefined {
  return CATALOG.find((m) => m.task === 'chat' && getSnapshot()[m.id]?.status === 'installed');
}

/**
 * Streams a reply. `onDelta` fires per token so the caller can render live text.
 */
export async function streamChat(
  history: ChatMessage[],
  onDelta: (text: string) => void,
  signal?: { cancelled: boolean }
): Promise<string> {
  const modelId = await ensureChatModel();
  const run = completion({
    modelId,
    history: history.map((m) => ({ role: m.role, content: m.content })),
    stream: true,
  });

  let full = '';
  for await (const event of run.events) {
    if (signal?.cancelled) break;
    if (event.type === 'contentDelta') {
      full += event.text;
      onDelta(full);
    }
  }
  if (signal?.cancelled) return full;
  const final = await run.final;
  return final.contentText || full;
}
