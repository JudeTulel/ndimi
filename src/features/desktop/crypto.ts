import * as Crypto from 'expo-crypto';
// @ts-expect-error - node-forge types are untyped in this environment
import forge from 'node-forge';

/**
 * Standard byte to base64 encoding without external dependencies.
 */
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return forge.util.encode64(binary);
}

/**
 * Standard base64 to byte array decoding.
 */
export function base64ToBytes(b64: string): Uint8Array {
  const binary = forge.util.decode64(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/[^0-9a-fA-F]/g, '');
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export function utf8ToBytes(text: string): Uint8Array {
  const binary = forge.util.encodeUtf8(text);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/** Computes hex-encoded SHA-256 digest of a string or byte sequence. */
export async function sha256Hex(data: string | Uint8Array): Promise<string> {
  if (typeof data === 'string') {
    return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, data);
  }
  const md = forge.md.sha256.create();
  let binary = '';
  for (let i = 0; i < data.length; i++) {
    binary += String.fromCharCode(data[i]);
  }
  md.update(binary);
  return md.digest().toHex();
}

/** Synchronous sha256 hex digest using node-forge */
export function sha256HexSync(data: string | Uint8Array): string {
  const md = forge.md.sha256.create();
  if (typeof data === 'string') {
    md.update(forge.util.encodeUtf8(data));
  } else {
    let binary = '';
    for (let i = 0; i < data.length; i++) {
      binary += String.fromCharCode(data[i]);
    }
    md.update(binary);
  }
  return md.digest().toHex();
}

export type DeviceKeyPair = {
  /** Hex-encoded 32-byte seed for persistent SecureStore storage */
  seedHex: string;
  /** 32-byte Ed25519 public key in Base64 (44 chars with padding) */
  publicKeyBase64: string;
  /** First 32 hex chars of sha256(rawPublicKeyBytes) */
  deviceId: string;
};

/**
 * Generates an Ed25519 keypair from cryptographically random seed bytes.
 */
export async function generateDeviceKeyPair(): Promise<DeviceKeyPair> {
  const seed = await Crypto.getRandomBytesAsync(32);
  return deriveDeviceKeyPair(seed);
}

/**
 * Derives the Ed25519 keypair and device ID from a 32-byte seed.
 */
export function deriveDeviceKeyPair(seed: Uint8Array): DeviceKeyPair {
  const kp = forge.ed25519.generateKeyPair({ seed });
  const pubBytes = new Uint8Array(kp.publicKey);
  const publicKeyBase64 = bytesToBase64(pubBytes);
  const deviceId = sha256HexSync(pubBytes).slice(0, 32);

  return {
    seedHex: bytesToHex(seed),
    publicKeyBase64,
    deviceId,
  };
}

/**
 * Signs enrollment proof:
 * `pair-v1\n${desktopId}\n${secret}\n${publicKey}\n${name}`
 */
export function signEnrollmentProof(
  desktopId: string,
  secret: string,
  publicKeyBase64: string,
  deviceName: string,
  seedHex: string
): string {
  const seed = hexToBytes(seedHex);
  const kp = forge.ed25519.generateKeyPair({ seed });
  const message = `pair-v1\n${desktopId}\n${secret}\n${publicKeyBase64}\n${deviceName}`;
  const messageBytes = utf8ToBytes(message);
  const signatureBytes = forge.ed25519.sign({
    message: messageBytes,
    privateKey: kp.privateKey,
  });
  return bytesToBase64(new Uint8Array(signatureBytes));
}

/**
 * Signs canonical API request:
 * `v1\n${device}\n${method}\n${route}\n${nonce}\n${sha256(body)}`
 */
export function signCanonicalRequest(
  deviceId: string,
  method: string,
  route: string,
  nonce: string,
  body: string,
  seedHex: string
): string {
  const bodyDigest = sha256HexSync(body);
  const canonical = `v1\n${deviceId}\n${method}\n${route}\n${nonce}\n${bodyDigest}`;
  const seed = hexToBytes(seedHex);
  const kp = forge.ed25519.generateKeyPair({ seed });
  const messageBytes = utf8ToBytes(canonical);
  const signatureBytes = forge.ed25519.sign({
    message: messageBytes,
    privateKey: kp.privateKey,
  });
  return bytesToBase64(new Uint8Array(signatureBytes));
}
