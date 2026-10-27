import { cancel, completion, loadModel, unloadModel } from '@qvac/sdk';
import { toRuntimePath } from '../../core/fs/paths';
import { CATALOG, type CatalogModel } from '../models/catalog';
import { getSnapshot } from '../models/modelStore';

export type ChatMessage = { role: 'user' | 'assistant'; content: string };

type Loaded = { modelId: string; catalogId: string; installedAt: string };

let loaded: Loaded | null = null;

/**
 * Loads the installed chat model into the QVAC runtime and returns its runtime
 * id. Kept warm across turns; unloaded explicitly when the model is removed or a
 * different one is installed.
 */
export async function ensureChatModel(): Promise<string> {
  const model = CATALOG.find(
    (m) => m.task === 'chat' && getSnapshot()[m.id]?.status === 'installed'
  );
  if (!model) throw new Error('No chat model installed. Install one in Settings › Models.');

  const state = getSnapshot()[model.id];
  if (state?.status !== 'installed') throw new Error('Chat model is not installed.');

  if (loaded && loaded.catalogId === model.id && loaded.installedAt === state.installedAt) {
    return loaded.modelId;
  }

  if (loaded) {
    await unloadModel({ modelId: loaded.modelId }).catch(() => {});
    loaded = null;
  }

  const modelId = await loadModel({
    modelSrc: toRuntimePath(state.localPath),
    modelType: 'llamacpp-completion',
    modelConfig: { ctx_size: 2048 },
  });
  loaded = { modelId, catalogId: model.id, installedAt: state.installedAt };
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
    if (signal?.cancelled) {
      // Targeted cancel, so a peer run on the same model keeps decoding.
      await cancel({ requestId: run.requestId }).catch(() => {});
      break;
    }
    if (event.type === 'contentDelta') {
      full += event.text;
      onDelta(full);
    }
  }
  if (signal?.cancelled) return full;

  // Cancelling the decode tears down the event stream, so `run.final` can reject or
  // resolve without a terminal event. Keep whatever already streamed instead of
  // failing the whole turn and blanking the bubble.
  try {
    const final = await run.final;
    return final.contentText || full;
  } catch (error) {
    if (full) return full;
    throw error;
  }
}
