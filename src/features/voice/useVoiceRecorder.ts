import type { AudioRecorder } from 'expo-audio';
import { useAudioRecorder } from 'expo-audio';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Capture format: mono AAC in an MP4 container.
 *
 * The ASR adapter decodes the file with FFmpeg on the runtime side, so any
 * container FFmpeg reads works; m4a is the one expo-audio records reliably on
 * Android. 16 kHz mono is the whisper input rate, which keeps the decode cheap.
 */
const RECORDING_OPTIONS = {
  extension: '.m4a',
  sampleRate: 16000,
  numberOfChannels: 1,
  bitRate: 64000,
  android: {
    outputFormat: 'mpeg4' as const,
    audioEncoder: 'aac' as const,
  },
  ios: {
    outputFormat: 'aac ',
    audioQuality: 96,
  },
  web: {
    mimeType: 'audio/webm',
    bitsPerSecond: 64000,
  },
};

export type RecorderStatus = 'idle' | 'recording' | 'stopped';

export type VoiceRecorder = {
  recorder: AudioRecorder;
  status: RecorderStatus;
  /** Whole seconds since start, for the on-screen timer. */
  seconds: number;
  /** Input level in dBFS while recording, or null when unavailable. */
  level: number | null;
  start: () => Promise<void>;
  /** Resolves with the recorded file URI. */
  stop: () => Promise<string>;
  cancel: () => Promise<void>;
};

export function useVoiceRecorder(): VoiceRecorder {
  const recorder = useAudioRecorder(RECORDING_OPTIONS);
  const [status, setStatus] = useState<RecorderStatus>('idle');
  const [seconds, setSeconds] = useState(0);
  const [level, setLevel] = useState<number | null>(null);
  const ticker = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTicker = useCallback(() => {
    if (ticker.current) clearInterval(ticker.current);
    ticker.current = null;
  }, []);

  const start = useCallback(async () => {
    await recorder.prepareToRecordAsync();
    recorder.record();
    setStatus('recording');
    setSeconds(0);
    clearTicker();
    ticker.current = setInterval(() => {
      const state = recorder.getStatus();
      setSeconds(Math.floor(state.durationMillis / 1000));
      setLevel(typeof state.metering === 'number' ? state.metering : null);
    }, 250);
  }, [clearTicker, recorder]);

  const stop = useCallback(async () => {
    clearTicker();
    await recorder.stop();
    setStatus('stopped');
    setLevel(null);
    const uri = recorder.uri;
    if (!uri) throw new Error('The recording produced no audio file.');
    return uri;
  }, [clearTicker, recorder]);

  const cancel = useCallback(async () => {
    clearTicker();
    try {
      await recorder.stop();
    } catch {
      // stopping an already-stopped recorder is not an error worth surfacing
    }
    setStatus('idle');
    setSeconds(0);
    setLevel(null);
  }, [clearTicker, recorder]);

  useEffect(() => clearTicker, [clearTicker]);

  return { recorder, status, seconds, level, start, stop, cancel };
}
