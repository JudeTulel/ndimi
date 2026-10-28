import { unloadModel } from '@qvac/sdk';
import * as Crypto from 'expo-crypto';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { CATALOG, type CatalogModel } from '../models/catalog';
import { readFileBytes } from '../models/bytes';
import { loadRuntimeModelAt } from '../models/modelStore';

/**
 * Adopting a model the user already has on disk.
 *
 * A picked file arrives as a `content://` URI, which the Bare runtime cannot open —
 * every inference path needs a real path. So the file is copied into the models
 * directory and becomes an ordinary install from there, which also means resume,
 * checksum and remove all keep working unchanged.
 *
 * Three gates, cheapest first:
 *
 * 1. Checksum against the catalog, when a curated entry matches the digest. This is
 *    what makes adopting safe: the bytes are proven to be the artifact the runtime
 *    was tuned for, not just a file with a similar name.
 * 2. A real load through the inference config, because a matching digest still does
 *    not prove the addon will open it.
 * 3. A filename fixup. TranslatePsy weights are identified by artifact basename, so a
 *    renamed copy installs and loads fine but silently falls back to the generic LLM
 *    prompt. The basename is restored from the matched catalog entry.
 */

export type AdoptResult =
  | { ok: true; catalogId: string; localPath: string; installedAt: string; renamed: boolean }
  | { ok: false; message: string };

const MODEL_DIR = `${FileSystem.documentDirectory}models/`;

async function sha256Of(uri: string): Promise<string> {
  const digest = await Crypto.digest(
    Crypto.CryptoDigestAlgorithm.SHA256,
    (await readFileBytes(uri)) as unknown as BufferSource
  );
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Smallest installable catalog entry whose digest matches, so a verified pick resolves. */
function matchByDigest(sha256: string): CatalogModel | undefined {
  return CATALOG.find((m) => m.sha256.toLowerCase() === sha256.toLowerCase());
}

/** Best-effort match for an unverified pick, by filename then by task guess. */
function matchByName(name: string): CatalogModel | undefined {
  const lower = name.toLowerCase();
  return CATALOG.find((m) => {
    const base = m.filename.toLowerCase();
    return lower === base || lower.endsWith(base) || base.includes(lower.replace(/\.[^.]+$/, ''));
  });
}

/**
 * Runs the picked file through the same load path the feature uses. Returns null on
 * success, or the runtime's reason.
 */
async function probe(model: CatalogModel, uri: string): Promise<string | null> {
  try {
    const id = await loadRuntimeModelAt(model, uri);
    await unloadModel({ modelId: id }).catch(() => {});
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : 'The runtime rejected the file.';
  }
}

/** Extension the runtime keys off, kept from whatever the user picked. */
function extensionOf(name: string): string {
  const match = name.match(/\.[a-z0-9]+$/i);
  return match ? match[0] : '.gguf';
}

/**
 * Opens the system picker and adopts the chosen file.
 *
 * `onStage` reports progress because hashing a 641 MB file is a visible wait.
 */
export async function adoptModelFile(
  onStage: (stage: 'picking' | 'hashing' | 'copying' | 'probing') => void
): Promise<AdoptResult | null> {
  onStage('picking');
  const picked = await DocumentPicker.getDocumentAsync({
    // The runtime only loads GGUF and whisper GGML weights.
    type: ['application/octet-stream', 'application/x-gguf', '*/*'],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (picked.canceled || !picked.assets?.length) return null;

  const asset = picked.assets[0];
  if (!asset.name.toLowerCase().match(/\.(gguf|bin)$/)) {
    return { ok: false, message: 'That is not a model file. Pick a .gguf or .bin weight.' };
  }

  onStage('hashing');
  let sha256: string;
  try {
    sha256 = await sha256Of(asset.uri);
  } catch (error) {
    return {
      ok: false,
      message: `Could not read that file: ${error instanceof Error ? error.message : 'unknown error'}`,
    };
  }

  // Prefer a digest match. Falling back to the filename only decides the *task*; the
  // load gate below still has to pass.
  const verified = matchByDigest(sha256);
  const model = verified ?? matchByName(asset.name);
  if (!model) {
    return {
      ok: false,
      message:
        'Unrecognised model. Its checksum matches nothing in the catalog and the name gives no clue — it would load under the wrong settings.',
    };
  }

  onStage('copying');
  await FileSystem.makeDirectoryAsync(MODEL_DIR, { intermediates: true }).catch(() => {});

  // Keep the upstream basename when it is known (verified pick), so the runtime's
  // basename detection works. Otherwise keep what the user's file was called.
  const renamed = !!verified && asset.name !== model.filename;
  const targetName = verified ? model.filename : asset.name;
  const target = `${MODEL_DIR}adopted-${Date.now()}-${targetName}`;
  try {
    await FileSystem.copyAsync({ from: asset.uri, to: target });
  } catch (error) {
    return {
      ok: false,
      message: `Could not copy the file into app storage: ${
        error instanceof Error ? error.message : 'unknown error'
      }`,
    };
  }

  onStage('probing');
  const reason = await probe(model, target);
  if (reason) {
    await FileSystem.deleteAsync(target, { idempotent: true }).catch(() => {});
    return { ok: false, message: `The runtime could not open that file: ${reason}` };
  }

  return {
    ok: true,
    catalogId: model.id,
    localPath: target,
    installedAt: new Date().toISOString(),
    renamed,
  };
}

export { extensionOf, sha256Of };
