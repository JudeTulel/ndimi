import {
  getConnection,
  getConnectionState,
  getInferenceTarget,
  getCapabilities,
} from './connectionStore';

export function isUseComputerActive(): boolean {
  return getInferenceTarget() === 'computer' && getConnectionState() === 'connected';
}

export function getRemoteHostDisplayName(): string | null {
  const conn = getConnection();
  return conn ? conn.displayName : null;
}

export function getRemoteAssignedModel(): string | null {
  const caps = getCapabilities();
  const textCap = caps.find((c) => c.id === 'text');
  return textCap?.model ?? 'Laptop Model';
}
