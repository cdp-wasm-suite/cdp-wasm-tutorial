declare module 'cdp-wasm/wav' {
  import type { DecodedWav } from 'cdp-wasm';
  export function decodeWav(input: Uint8Array | ArrayBuffer): DecodedWav;
  export function decodeAiff(input: Uint8Array | ArrayBuffer): DecodedWav;
  export function decodeAudio(input: Uint8Array | ArrayBuffer): DecodedWav;
  export function encodeWav(audio: { sampleRate: number; channelData: Float32Array[] }): Uint8Array;
  export function wavToAudioBuffer(bytes: Uint8Array, audioContext: BaseAudioContext): AudioBuffer;
  export function audioBufferToWav(audioBuffer: AudioBuffer): Uint8Array;
  export function floatWavIsSane(bytes: Uint8Array, limit?: number): boolean;
  export function wavFrameCount(bytes: Uint8Array): number;
}
