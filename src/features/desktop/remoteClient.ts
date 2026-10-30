import {
  getActiveEndpoint,
  getConnection,
  getSavedKeyPair,
  RemoteCapability,
} from './connectionStore';
import { signCanonicalRequest } from './crypto';
import { pinnedRequest } from './transport';

export class RemoteInferenceError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'RemoteInferenceError';
    this.code = code;
  }
}

/**
 * Sends an authenticated request to the paired Ndimi Desktop host.
 */
export async function sendAuthenticatedRequest(
  method: string,
  path: string,
  bodyJson = ''
): Promise<{ status: number; body: string }> {
  const conn = getConnection();
  const endpoint = getActiveEndpoint() ?? conn?.endpoints[0];

  if (!conn || !endpoint) {
    throw new RemoteInferenceError(
      'REMOTE_UNAVAILABLE',
      'No paired computer connected. Reconnect in Settings › Connect to a computer.'
    );
  }

  const kp = await getSavedKeyPair(conn.deviceId);
  if (!kp) {
    throw new RemoteInferenceError(
      'AUTH_ERROR',
      'Device authentication credentials not found. Pair again with the computer.'
    );
  }

  // 1. Fetch challenge nonce
  const chal = await pinnedRequest(
    endpoint,
    'GET',
    '/v1/challenge',
    { 'x-journal-version': '1' },
    undefined,
    conn.certificateSha256
  );

  if (chal.status !== 200) {
    throw new RemoteInferenceError(
      'REMOTE_UNAVAILABLE',
      'Computer did not respond to challenge request. Check Wi-Fi connection.'
    );
  }

  const { nonce } = JSON.parse(chal.body) as { nonce?: string };
  if (!nonce) {
    throw new RemoteInferenceError('REMOTE_UNAVAILABLE', 'Invalid challenge nonce from computer.');
  }

  // 2. Compute canonical signature
  const sig = signCanonicalRequest(conn.deviceId, method, path, nonce, bodyJson, kp.seedHex);

  // 3. Send request
  return pinnedRequest(
    endpoint,
    method,
    path,
    {
      'x-journal-version': '1',
      'x-journal-device': conn.deviceId,
      'x-journal-nonce': nonce,
      'x-journal-signature': sig,
    },
    bodyJson,
    conn.certificateSha256
  );
}

export type JobState = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled' | 'interrupted' | 'expired';

export type JobResult = {
  id: string;
  operation: string;
  state: JobState;
  text?: string;
  error?: string;
  model?: string;
};

/**
 * Submits a durable text job to Ndimi Desktop and polls until completion.
 */
export async function submitAndPollJob(
  operation: string,
  prompt: string,
  signal?: { cancelled: boolean }
): Promise<string> {
  const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const submitBody = JSON.stringify({
    id: jobId,
    operation,
    prompt,
  });

  const submitRes = await sendAuthenticatedRequest('POST', '/v1/jobs', submitBody);
  if (submitRes.status !== 200) {
    let errMsg = 'Failed to submit inference job to desktop.';
    try {
      const errJson = JSON.parse(submitRes.body) as { error?: { message?: string } };
      if (errJson.error?.message) errMsg = errJson.error.message;
    } catch {}
    throw new RemoteInferenceError('JOB_SUBMIT_FAILED', errMsg);
  }

  // Poll for completion
  const startTime = Date.now();
  const timeoutMs = 60000; // 60s timeout

  while (Date.now() - startTime < timeoutMs) {
    if (signal?.cancelled) {
      void cancelJob(jobId, operation);
      throw new RemoteInferenceError('CANCELLED', 'Inference request was cancelled.');
    }

    await new Promise((resolve) => setTimeout(resolve, 600));

    const pollRes = await sendAuthenticatedRequest('GET', `/v1/jobs/${jobId}`);
    if (pollRes.status !== 200) continue;

    const job = JSON.parse(pollRes.body) as JobResult;
    if (job.state === 'completed') {
      // Acknowledge receipt
      void acknowledgeJob(jobId);
      return job.text ?? '';
    }

    if (job.state === 'failed' || job.state === 'cancelled' || job.state === 'interrupted' || job.state === 'expired') {
      throw new RemoteInferenceError(
        'JOB_FAILED',
        job.error ? `Computer inference failed: ${job.error}` : 'Inference job failed on computer.'
      );
    }
  }

  throw new RemoteInferenceError('TIMEOUT', 'Inference timed out waiting for computer response.');
}

/** Cancels a job on the desktop */
async function cancelJob(id: string, operation: string): Promise<void> {
  try {
    await sendAuthenticatedRequest('POST', `/v1/jobs/${id}/cancel`, JSON.stringify({ operation }));
  } catch {}
}

/** Acknowledges a completed job on the desktop */
async function acknowledgeJob(id: string): Promise<void> {
  try {
    await sendAuthenticatedRequest('POST', `/v1/jobs/${id}/ack`);
  } catch {}
}

/**
 * Executes text translation remotely on Ndimi Desktop's assigned text model.
 */
export async function translateRemote(
  text: string,
  from: string,
  to: string,
  signal?: { cancelled: boolean }
): Promise<string> {
  const fromName = from === 'sw' ? 'Swahili' : 'English';
  const toName = to === 'sw' ? 'Swahili' : 'English';

  const prompt = `Translate the following text faithfully from ${fromName} to ${toName}. Preserve the original formatting and meaning. Return only the translated text, no commentary, analysis or markdown fences.\n\n${text.trim()}`;

  // Use 'text' operation supported by desktop library capability
  return submitAndPollJob('text', prompt, signal);
}

/**
 * Executes chat/agent reasoning remotely on Ndimi Desktop's assigned model.
 */
export async function chatRemote(
  history: { role: string; content: string }[],
  systemPrompt?: string,
  signal?: { cancelled: boolean }
): Promise<string> {
  const messages = systemPrompt
    ? [{ role: 'system', content: systemPrompt }, ...history]
    : history;

  const conversationText = messages
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join('\n\n');

  const prompt = `${conversationText}\n\nASSISTANT:`;
  return submitAndPollJob('text', prompt, signal);
}
