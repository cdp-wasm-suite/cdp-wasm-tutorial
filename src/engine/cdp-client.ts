import { decodeAudio, decodeWav, encodeWav } from 'cdp-wasm/wav';

export interface StepTelemetry {
  program: string;
  args: string[];
  command: string;
  durationMs: number;
  cacheHit: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface RunIO {
  inputs?: Record<string, Uint8Array>;
  outputs?: string[];
  collect?: { prefix: string; ext?: string }[];
}

export interface RunResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  outputs: Record<string, Uint8Array>;
}

export interface ProcessOptions {
  inExt?: string;
  outExt?: string;
  channels?: 'split' | 'mix';
  data?: string | Uint8Array;
  extraInputs?: Record<string, Uint8Array>;
}

export interface ProcessResult {
  bytes: Uint8Array;
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface CDPClient {
  run(program: string, args: string[], io?: RunIO): Promise<RunResult>;
  process(
    program: string,
    args: string[],
    inputBytes: Uint8Array,
    opts?: ProcessOptions
  ): Promise<ProcessResult>;
  eachChannel(
    wavBytes: Uint8Array,
    fn: (monoWav: Uint8Array, channelIndex: number) => Promise<Uint8Array> | Uint8Array
  ): Promise<Uint8Array>;
}

interface PendingCall {
  resolve: (value: any) => void;
  reject: (err: Error) => void;
}

class CDPWorkerBridge {
  private worker: Worker | null = null;
  private initPromise: Promise<void> | null = null;
  private nextId = 1;
  private pending = new Map<number, PendingCall>();

  private ensureWorker(): Promise<void> {
    if (this.initPromise) return this.initPromise;

    this.worker = new Worker(new URL('./cdp-worker.ts', import.meta.url), {
      type: 'module',
    });

    this.worker.onmessage = (event: MessageEvent) => {
      const msg = event.data;
      const call = this.pending.get(msg.id);
      if (!call) return;
      this.pending.delete(msg.id);
      if (msg.type === 'error') {
        call.reject(new Error(msg.message || 'Unknown CDP worker error'));
      } else {
        call.resolve(msg);
      }
    };

    this.worker.onerror = (event: ErrorEvent) => {
      const err = new Error(event.message || 'CDP worker crashed');
      for (const [, call] of this.pending) {
        call.reject(err);
      }
      this.pending.clear();
      this.worker = null;
      this.initPromise = null;
    };

    const baseUrl = new URL(`${import.meta.env.BASE_URL}wasm/`, window.location.href).href;
    this.initPromise = this.postRaw({ type: 'init', baseUrl }).then(() => undefined);
    return this.initPromise;
  }

  private postRaw(payload: Record<string, unknown>): Promise<any> {
    if (!this.worker) return Promise.reject(new Error('Worker not created'));
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.worker!.postMessage({ ...payload, id });
    });
  }

  async run(program: string, args: string[], io?: RunIO, onStep?: (step: StepTelemetry) => void): Promise<RunResult> {
    await this.ensureWorker();
    const res = await this.postRaw({ type: 'run', program, args, io });
    const r = res.result as RunResult & { durationMs: number; cacheHit: boolean; command: string };
    onStep?.({
      program,
      args: [...args],
      command: r.command,
      durationMs: r.durationMs,
      cacheHit: r.cacheHit,
      stdout: r.stdout,
      stderr: r.stderr,
      exitCode: r.exitCode,
    });
    return {
      exitCode: r.exitCode,
      stdout: r.stdout,
      stderr: r.stderr,
      outputs: r.outputs,
    };
  }

  async process(
    program: string,
    args: string[],
    inputBytes: Uint8Array,
    opts?: ProcessOptions,
    onStep?: (step: StepTelemetry) => void
  ): Promise<ProcessResult> {
    await this.ensureWorker();
    const res = await this.postRaw({ type: 'process', program, args, inputBytes, opts });
    const r = res.result as ProcessResult & { durationMs: number; cacheHit: boolean; command: string };
    onStep?.({
      program,
      args: [...args],
      command: r.command,
      durationMs: r.durationMs,
      cacheHit: r.cacheHit,
      stdout: r.stdout,
      stderr: r.stderr,
      exitCode: r.exitCode,
    });
    return {
      bytes: r.bytes,
      stdout: r.stdout,
      stderr: r.stderr,
      exitCode: r.exitCode,
    };
  }

  async clearCache(): Promise<void> {
    await this.ensureWorker();
    await this.postRaw({ type: 'clearCache' });
  }
}

const bridge = new CDPWorkerBridge();

const audioCache = new Map<string, Uint8Array>();

export function getAudioUrl(fileName: string): string {
  const clean = fileName.replace(/^\/+/, '');
  return new URL(`${import.meta.env.BASE_URL}audio/${clean}`, window.location.href).href;
}

export async function loadAudio(fileName: string): Promise<Uint8Array> {
  const clean = fileName.replace(/^\/+/, '');
  const key = clean.toLowerCase();
  const cached = audioCache.get(key);
  if (cached) return cached;

  const url = getAudioUrl(clean);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Could not load audio asset "${clean}" (HTTP ${res.status})`);
  }
  const bytes = new Uint8Array(await res.arrayBuffer());
  audioCache.set(key, bytes);
  return bytes;
}

export function text(content: string): Uint8Array {
  return new TextEncoder().encode(content);
}

export async function clearCDPCache(): Promise<void> {
  return bridge.clearCache();
}

export function createScopedCDPClient(onStep?: (step: StepTelemetry) => void): CDPClient {
  const client: CDPClient = {
    run(program, args, io) {
      return bridge.run(program, args, io, onStep);
    },
    process(program, args, inputBytes, opts) {
      return bridge.process(program, args, inputBytes, opts, onStep);
    },
    async eachChannel(wavBytes, fn) {
      const dec = decodeAudio(wavBytes);
      if (dec.numChannels <= 1) {
        return fn(wavBytes, 0);
      }
      const outs = [];
      for (let c = 0; c < dec.numChannels; c++) {
        const monoWav = encodeWav({ sampleRate: dec.sampleRate, channelData: [dec.channelData[c]] });
        const processed = await fn(monoWav, c);
        outs.push(decodeWav(processed));
      }
      const length = Math.max(...outs.map((o) => o.length));
      const channelData = outs.map((o) => {
        if (o.length === length) return o.channelData[0];
        const padded = new Float32Array(length);
        padded.set(o.channelData[0]);
        return padded;
      });
      return encodeWav({ sampleRate: outs[0].sampleRate, channelData });
    },
  };
  return client;
}

export const cdp: CDPClient = createScopedCDPClient();
