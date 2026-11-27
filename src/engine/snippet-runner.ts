import { decodeWav, wavFrameCount } from 'cdp-wasm/wav';
import { createScopedCDPClient, loadAudio, text, type StepTelemetry } from './cdp-client';

export interface SnippetOutput {
  label: string;
  wav: Uint8Array;
  blob: Blob;
  sampleRate: number;
  numChannels: number;
  durationSec: number;
  bitDepth: number;
  sizeBytes: number;
}

export interface SnippetRunResult {
  outputs: SnippetOutput[];
  logs: string[];
  steps: StepTelemetry[];
  totalDurationMs: number;
  error?: string;
}

const AsyncFunction: new (...args: string[]) => (...fnArgs: any[]) => Promise<any> =
  Object.getPrototypeOf(async function () {}).constructor;

function formatLogArg(arg: unknown): string {
  if (typeof arg === 'string') return arg;
  if (typeof arg === 'number' || typeof arg === 'boolean' || arg == null) return String(arg);
  if (arg instanceof Uint8Array) return `Uint8Array(${arg.byteLength} bytes)`;
  try {
    return JSON.stringify(arg, null, 2);
  } catch {
    return String(arg);
  }
}

function buildSnippetOutput(wavBytes: Uint8Array, label: string): SnippetOutput {
  if (!(wavBytes instanceof Uint8Array)) {
    throw new Error(`output("${label}") expected a Uint8Array of WAV bytes.`);
  }
  if (wavBytes.byteLength < 44 || wavFrameCount(wavBytes) <= 0) {
    throw new Error(`output("${label}") received an empty or invalid WAV buffer (${wavBytes.byteLength} bytes).`);
  }
  const dec = decodeWav(wavBytes);
  const blob = new Blob([wavBytes.slice()], { type: 'audio/wav' });
  return {
    label,
    wav: wavBytes,
    blob,
    sampleRate: dec.sampleRate,
    numChannels: dec.numChannels,
    durationSec: dec.length / dec.sampleRate,
    bitDepth: dec.bitDepth,
    sizeBytes: wavBytes.byteLength,
  };
}

export async function runSnippet(
  code: string,
  onStepProgress?: (step: StepTelemetry) => void
): Promise<SnippetRunResult> {
  const t0 = performance.now();
  const outputs: SnippetOutput[] = [];
  const logs: string[] = [];
  const steps: StepTelemetry[] = [];

  const scopedCdp = createScopedCDPClient((step) => {
    steps.push(step);
    onStepProgress?.(step);
  });

  const log = (...args: unknown[]) => {
    const line = args.map(formatLogArg).join(' ');
    logs.push(line);
  };

  const output = (wavBytes: Uint8Array, label?: string) => {
    const resolvedLabel = label?.trim() || (outputs.length === 0 ? 'Processed Output' : `Output ${outputs.length + 1}`);
    outputs.push(buildSnippetOutput(wavBytes, resolvedLabel));
  };

  try {
    const fn = new AsyncFunction('cdp', 'loadAudio', 'text', 'log', 'output', code);
    const ret = await fn(scopedCdp, loadAudio, text, log, output);

    if (ret instanceof Uint8Array) {
      const alreadyEmitted = outputs.some((o) => o.wav === ret);
      if (!alreadyEmitted) {
        output(ret, outputs.length === 0 ? 'Processed Output' : `Output ${outputs.length + 1}`);
      }
    } else if (ret && typeof ret === 'object' && 'bytes' in ret && (ret as any).bytes instanceof Uint8Array) {
      const bytes = (ret as any).bytes as Uint8Array;
      const alreadyEmitted = outputs.some((o) => o.wav === bytes);
      if (!alreadyEmitted) {
        output(bytes, outputs.length === 0 ? 'Processed Output' : `Output ${outputs.length + 1}`);
      }
    }

    return {
      outputs,
      logs,
      steps,
      totalDurationMs: performance.now() - t0,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      outputs,
      logs,
      steps,
      totalDurationMs: performance.now() - t0,
      error: message,
    };
  }
}
