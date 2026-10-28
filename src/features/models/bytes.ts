import * as FileSystem from 'expo-file-system/legacy';

/**
 * Chunked file reading for `expo-crypto`.
 *
 * The digest API takes one contiguous `BufferSource`, so the whole artifact has to
 * be assembled before hashing. Reads are chunked rather than one giant call: a
 * several-hundred-MB base64 string in a single bridge hop is what runs out of memory.
 */

/**
 * Reading the whole artifact into one array gives expo-crypto a single digest input;
 * model files are hundreds of MB, which stays inside RN's array limits.
 */
export async function readFileBytes(uri: string): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  const info = await FileSystem.getInfoAsync(uri);
  const total = info.exists ? info.size : 0;
  const chunkSize = 4 * 1024 * 1024;

  for (let offset = 0; offset < total; offset += chunkSize) {
    const chunk = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
      position: offset,
      length: Math.min(chunkSize, total - offset),
    });
    chunks.push(base64ToBytes(chunk));
  }

  const out = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
  let at = 0;
  for (const chunk of chunks) {
    out.set(chunk, at);
    at += chunk.length;
  }
  return out;
}

export function base64ToBytes(value: string): Uint8Array {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const clean = value.replace(/[^A-Za-z0-9+/]/g, '');
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let bits = 0;
  let acc = 0;
  let index = 0;
  for (let i = 0; i < clean.length; i++) {
    acc = (acc << 6) | alphabet.indexOf(clean[i]);
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[index++] = (acc >> bits) & 0xff;
    }
  }
  return out.subarray(0, index);
}
