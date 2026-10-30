import * as SecureStore from 'expo-secure-store';
import {
  deriveDeviceKeyPair,
  generateDeviceKeyPair,
  hexToBytes,
  signCanonicalRequest,
  signEnrollmentProof,
} from './crypto';
import { pinnedRequest } from './transport';

const CONNECTION_STORAGE_KEY = 'ndimi_desktop_connection_v1';
const KEY_REF_PREFIX = 'ndimi_desktop_key_';

export type QrPayload = {
  v: number;
  id: string;
  name: string;
  pin: string;
  endpoints: string[];
  secret: string;
  expires: number;
};

export type ComputerConnection = {
  protocolVersion: 1;
  desktopId: string;
  displayName: string;
  endpoints: string[];
  certificateSha256: string;
  deviceId: string;
  privateKeyRef: string;
  pairedAt: number;
  inferenceTarget: 'phone' | 'computer';
};

export type RemoteCapability = {
  id: string;
  model?: string;
  status:
    | 'ready'
    | 'loading'
    | 'unloaded'
    | 'needs_download'
    | 'unassigned'
    | 'incompatible'
    | 'failed'
    | 'busy'
    | 'unavailable';
  reason?: string;
  operations?: string[];
  [key: string]: unknown;
};

export type ConnectionState =
  | 'not_paired'
  | 'pairing'
  | 'awaiting_approval'
  | 'connected'
  | 'reconnecting'
  | 'paused'
  | 'revoked';

let currentConnection: ComputerConnection | null = null;
let currentState: ConnectionState = 'not_paired';
let currentCapabilities: RemoteCapability[] = [];
let activeEndpoint: string | null = null;
let lastError: string | null = null;
let pendingTicket: { ticket: string; qr: QrPayload; deviceName: string } | null = null;

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((fn) => fn());
}

export function subscribeConnection(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getConnection(): ComputerConnection | null {
  return currentConnection;
}

export function getConnectionState(): ConnectionState {
  return currentState;
}

export function getCapabilities(): RemoteCapability[] {
  return currentCapabilities;
}

export function getActiveEndpoint(): string | null {
  return activeEndpoint;
}

export function getLastError(): string | null {
  return lastError;
}

export function getInferenceTarget(): 'phone' | 'computer' {
  if (currentState !== 'connected') return 'phone';
  return currentConnection?.inferenceTarget ?? 'phone';
}

/** Parses and validates the raw QR code content. */
export function parseQrPayload(raw: string): QrPayload {
  const trimmed = raw.trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error('QR code is not a valid JSON pairing payload.');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid QR code data.');
  }

  const p = parsed as Record<string, unknown>;
  if (p.v !== 1) {
    throw new Error(`Incompatible pairing version: ${p.v ?? 'unknown'}. Protocol v1 required.`);
  }
  if (typeof p.id !== 'string' || !p.id) {
    throw new Error('Missing computer ID in pairing code.');
  }
  if (typeof p.pin !== 'string' || !/^[0-9a-fA-F]{64}$/.test(p.pin)) {
    throw new Error('Invalid or missing certificate fingerprint pin in pairing code.');
  }
  if (!Array.isArray(p.endpoints) || p.endpoints.length === 0) {
    throw new Error('No network endpoints found in pairing code.');
  }
  if (typeof p.secret !== 'string' || !p.secret) {
    throw new Error('Missing pairing secret.');
  }
  if (typeof p.expires !== 'number' || p.expires < Date.now()) {
    throw new Error('Pairing code has expired. Generate a fresh QR on the desktop.');
  }

  return {
    v: 1,
    id: p.id,
    name: typeof p.name === 'string' ? p.name : 'Ndimi Desktop',
    pin: p.pin.toLowerCase(),
    endpoints: p.endpoints.filter((e): e is string => typeof e === 'string'),
    secret: p.secret,
    expires: p.expires,
  };
}

/** Initializes and loads stored connection on app startup. */
export async function initializeConnection(): Promise<void> {
  try {
    const raw = await SecureStore.getItemAsync(CONNECTION_STORAGE_KEY);
    if (!raw) {
      currentConnection = null;
      currentState = 'not_paired';
      notify();
      return;
    }

    const conn = JSON.parse(raw) as ComputerConnection;
    currentConnection = conn;
    if (conn.inferenceTarget === 'computer') {
      currentState = 'reconnecting';
    } else {
      currentState = 'paused';
    }
    notify();

    // Verify connectivity in background
    void refreshStatus();
  } catch (e) {
    currentConnection = null;
    currentState = 'not_paired';
    lastError = e instanceof Error ? e.message : 'Failed to load connection';
    notify();
  }
}

/** Initiates pairing with a scanned QR payload. */
export async function startPairing(qr: QrPayload, deviceName: string): Promise<string> {
  currentState = 'pairing';
  lastError = null;
  notify();

  try {
    // Generate fresh keypair for this device
    const kp = await generateDeviceKeyPair();
    const keyRef = `${KEY_REF_PREFIX}${kp.deviceId}`;
    await SecureStore.setItemAsync(keyRef, kp.seedHex);

    const proof = signEnrollmentProof(qr.id, qr.secret, kp.publicKeyBase64, deviceName, kp.seedHex);

    const body = JSON.stringify({
      publicKey: kp.publicKeyBase64,
      name: deviceName,
      secret: qr.secret,
      proof,
    });

    let lastEx: Error | null = null;
    let ticket: string | null = null;

    // Try endpoints in order until one responds
    for (const endpoint of qr.endpoints) {
      try {
        const res = await pinnedRequest(
          endpoint,
          'POST',
          '/v1/pair',
          { 'x-journal-version': '1' },
          body,
          qr.pin
        );

        if (res.status === 200) {
          const data = JSON.parse(res.body) as { ticket?: string; id?: string };
          if (data.ticket) {
            ticket = data.ticket;
            activeEndpoint = endpoint;
            break;
          }
        } else {
          lastEx = new Error(`Pairing rejected (${res.status}): ${res.body}`);
        }
      } catch (err) {
        lastEx = err instanceof Error ? err : new Error(String(err));
      }
    }

    if (!ticket) {
      currentState = 'not_paired';
      lastError = lastEx?.message ?? 'Could not reach computer endpoints on this network.';
      notify();
      throw new Error(lastError);
    }

    pendingTicket = { ticket, qr, deviceName };
    currentState = 'awaiting_approval';
    notify();
    return ticket;
  } catch (error) {
    currentState = 'not_paired';
    lastError = error instanceof Error ? error.message : 'Pairing failed';
    notify();
    throw error;
  }
}

/** Polls desktop approval status for the pending ticket. */
export async function checkPairStatus(): Promise<'pending' | 'approved' | 'denied'> {
  if (!pendingTicket || !activeEndpoint) {
    return 'denied';
  }

  const { ticket, qr } = pendingTicket;
  const body = JSON.stringify({ ticket });

  try {
    const res = await pinnedRequest(
      activeEndpoint,
      'POST',
      '/v1/pair-status',
      { 'x-journal-version': '1' },
      body,
      qr.pin
    );

    if (res.status !== 200) {
      currentState = 'not_paired';
      pendingTicket = null;
      lastError = 'Pairing ticket expired or desktop cancelled pairing.';
      notify();
      return 'denied';
    }

    const data = JSON.parse(res.body) as { state?: string; id?: string };
    if (data.state === 'approved') {
      const kp = await getSavedKeyPair(data.id ?? '');
      if (!kp) throw new Error('Private key reference lost.');

      const conn: ComputerConnection = {
        protocolVersion: 1,
        desktopId: qr.id,
        displayName: qr.name,
        endpoints: qr.endpoints,
        certificateSha256: qr.pin,
        deviceId: kp.deviceId,
        privateKeyRef: `${KEY_REF_PREFIX}${kp.deviceId}`,
        pairedAt: Date.now(),
        inferenceTarget: 'computer',
      };

      await SecureStore.setItemAsync(CONNECTION_STORAGE_KEY, JSON.stringify(conn));
      currentConnection = conn;
      currentState = 'connected';
      pendingTicket = null;
      notify();

      void refreshStatus();
      return 'approved';
    }

    if (data.state === 'denied') {
      currentState = 'not_paired';
      pendingTicket = null;
      lastError = 'Pairing was denied on the computer.';
      notify();
      return 'denied';
    }

    return 'pending';
  } catch (error) {
    lastError = error instanceof Error ? error.message : 'Error checking pairing status';
    notify();
    return 'pending';
  }
}

/** Reads the saved seed and derives the keypair. */
export async function getSavedKeyPair(deviceId: string) {
  const seedHex = await SecureStore.getItemAsync(`${KEY_REF_PREFIX}${deviceId}`);
  if (!seedHex) return null;
  return deriveDeviceKeyPair(hexToBytes(seedHex));
}

/** Refreshes desktop connection status and capability manifest. */
export async function refreshStatus(): Promise<void> {
  if (!currentConnection) {
    currentState = 'not_paired';
    notify();
    return;
  }

  const conn = currentConnection;
  const kp = await getSavedKeyPair(conn.deviceId);
  if (!kp) {
    currentState = 'revoked';
    lastError = 'Device credentials missing. Please pair again.';
    notify();
    return;
  }

  const endpointsToTry = activeEndpoint
    ? [activeEndpoint, ...conn.endpoints.filter((e) => e !== activeEndpoint)]
    : conn.endpoints;

  let reached = false;
  for (const endpoint of endpointsToTry) {
    try {
      // Step 1: Challenge
      const chalRes = await pinnedRequest(
        endpoint,
        'GET',
        '/v1/challenge',
        { 'x-journal-version': '1' },
        undefined,
        conn.certificateSha256
      );

      if (chalRes.status !== 200) continue;
      const { nonce } = JSON.parse(chalRes.body) as { nonce: string };
      if (!nonce) continue;

      // Step 2: Authenticated /v1/status
      const sig = signCanonicalRequest(conn.deviceId, 'GET', '/v1/status', nonce, '', kp.seedHex);
      const statusRes = await pinnedRequest(
        endpoint,
        'GET',
        '/v1/status',
        {
          'x-journal-version': '1',
          'x-journal-device': conn.deviceId,
          'x-journal-nonce': nonce,
          'x-journal-signature': sig,
        },
        undefined,
        conn.certificateSha256
      );

      if (statusRes.status === 200) {
        const payload = JSON.parse(statusRes.body) as {
          id?: string;
          name?: string;
          capabilities?: RemoteCapability[];
        };
        activeEndpoint = endpoint;
        currentCapabilities = payload.capabilities ?? [];
        currentState = conn.inferenceTarget === 'computer' ? 'connected' : 'paused';
        lastError = null;
        reached = true;
        notify();
        break;
      } else if (statusRes.status === 401) {
        currentState = 'revoked';
        lastError = 'Device was revoked on Ndimi Desktop.';
        notify();
        return;
      }
    } catch {
      // Try next endpoint
    }
  }

  if (!reached) {
    currentState = 'reconnecting';
    lastError = 'Computer is currently unreachable on this local network.';
    notify();
  }
}

/** Toggles between 'phone' and 'computer' inference targets. */
export async function setInferenceTarget(target: 'phone' | 'computer'): Promise<void> {
  if (!currentConnection) return;
  currentConnection = { ...currentConnection, inferenceTarget: target };
  await SecureStore.setItemAsync(CONNECTION_STORAGE_KEY, JSON.stringify(currentConnection));

  if (target === 'computer') {
    currentState = 'connected';
    void refreshStatus();
  } else {
    currentState = 'paused';
  }
  notify();
}

/** Pauses remote inference without deleting the trust record. */
export async function pauseConnection(): Promise<void> {
  await setInferenceTarget('phone');
}

/** Forgets computer: revokes trust on desktop if reachable, then wipes local keys. */
export async function forgetConnection(): Promise<void> {
  if (currentConnection && activeEndpoint) {
    try {
      const conn = currentConnection;
      const kp = await getSavedKeyPair(conn.deviceId);
      if (kp) {
        const chal = await pinnedRequest(
          activeEndpoint,
          'GET',
          '/v1/challenge',
          { 'x-journal-version': '1' },
          undefined,
          conn.certificateSha256
        );
        const { nonce } = JSON.parse(chal.body) as { nonce: string };
        if (nonce) {
          const sig = signCanonicalRequest(conn.deviceId, 'POST', '/v1/forget', nonce, '', kp.seedHex);
          await pinnedRequest(
            activeEndpoint,
            'POST',
            '/v1/forget',
            {
              'x-journal-version': '1',
              'x-journal-device': conn.deviceId,
              'x-journal-nonce': nonce,
              'x-journal-signature': sig,
            },
            undefined,
            conn.certificateSha256
          );
        }
      }
    } catch {
      // Best-effort remote revocation
    }
  }

  if (currentConnection) {
    await SecureStore.deleteItemAsync(`${KEY_REF_PREFIX}${currentConnection.deviceId}`).catch(() => {});
  }
  await SecureStore.deleteItemAsync(CONNECTION_STORAGE_KEY).catch(() => {});

  currentConnection = null;
  currentState = 'not_paired';
  currentCapabilities = [];
  activeEndpoint = null;
  lastError = null;
  pendingTicket = null;
  notify();
}
