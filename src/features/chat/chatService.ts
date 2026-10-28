import { cancel, completion, loadModel, unloadModel } from '@qvac/sdk';
import { toRuntimePath } from '../../core/fs/paths';
import { getActiveChatModel, setActiveChatModel } from '../../core/db/settings';
import { CATALOG, type CatalogModel } from '../models/catalog';
import { getSnapshot } from '../models/modelStore';

export type ChatMessage = { role: 'user' | 'assistant'; content: string };

type Loaded = { modelId: string; catalogId: string; installedAt: string };

let loaded: Loaded | null = null;

/**
 * Which chat model the assistant should use.
 *
 * Several chat models can be installed at once, so the catalog order alone cannot
 * decide. The preference is held in memory for the synchronous render paths and
 * mirrored into the preference store so it survives a restart; listeners let the
 * model list repaint when the choice changes.
 */
let activeChatId: string | null = null;
const activeListeners = new Set<() => void>();

function installedChatModels(): CatalogModel[] {
  const snapshot = getSnapshot();
  return CATALOG.filter((m) => m.task === 'chat' && snapshot[m.id]?.status === 'installed');
}

/** The preferred model if it is installed, else whatever chat model exists. */
function resolveChatModel(): CatalogModel | undefined {
  const installed = installedChatModels();
  if (activeChatId) {
    const preferred = installed.find((m) => m.id === activeChatId);
    if (preferred) return preferred;
  }
  return installed[0];
}

export function getActiveChatId(): string | null {
  return activeChatId;
}

/**
 * The id actually being used, preference resolved. Without this the list would show
 * nothing as in-use on a fresh install where no choice has been made yet, while the
 * assistant is already running the fallback model.
 */
export function getInUseChatId(): string | null {
  return resolveChatModel()?.id ?? null;
}

function emitActive() {
  activeListeners.forEach((fn) => fn());
}

/** Re-renders subscribers whenever the active chat model changes. */
export function subscribeActiveChat(fn: () => void): () => void {
  activeListeners.add(fn);
  return () => {
    activeListeners.delete(fn);
  };
}

/** Reads the persisted choice. Called once when the assistant screen mounts. */
export async function loadActiveChatModel(): Promise<void> {
  const stored = await getActiveChatModel();
  activeChatId = stored ? stored : null;
  emitActive();
}

/**
 * Points the assistant at a specific installed chat model. The warm handle is
 * dropped so the next turn loads the new weights instead of reusing the old ones.
 */
export async function setActiveChat(id: string): Promise<void> {
  if (activeChatId === id) return;
  activeChatId = id;
  await setActiveChatModel(id);
  await unloadChatModel();
  emitActive();
}

/** Forget the preference, e.g. when the chosen model is removed. */
export async function clearActiveChat(): Promise<void> {
  activeChatId = null;
  await setActiveChatModel('');
  emitActive();
}

/**
 * Loads the installed chat model into the QVAC runtime and returns its runtime
 * id. Kept warm across turns; unloaded explicitly when the model is removed or a
 * different one is installed.
 */
export async function ensureChatModel(): Promise<string> {
  const model = resolveChatModel();
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

/** The model the assistant is currently set to use, if any is installed. */
export function hasChatModel(): CatalogModel | undefined {
  return resolveChatModel();
}

/**
 * Streams a reply. `onDelta` fires per token so the caller can render live text.
 */
export async function streamChat(
  history: ChatMessage[],
  onDelta: (text: string) => void,
  signal?: { cancelled: boolean },
  /** Prepended as a `system` turn when the caller brings its own brief (the agent). */
  systemPrompt?: string
): Promise<string> {
  const modelId = await ensureChatModel();
  const prompt = systemPrompt
    ? [{ role: 'system', content: systemPrompt }, ...history]
    : history;
  const run = completion({
    modelId,
    history: prompt.map((m) => ({ role: m.role, content: m.content })),
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
