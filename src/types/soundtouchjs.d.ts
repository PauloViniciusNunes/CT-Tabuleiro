declare module "soundtouchjs" {
  export class SoundTouch {
    tempo: number;
    rate: number;

    constructor(sampleRate: number);
  }

  export class SimpleFilter {
    constructor(
      source: {
        extract(target: Float32Array, numFrames: number): number;
      },
      soundTouch: SoundTouch
    );

    extract(target: Float32Array, numFrames: number): number;
  }
}
