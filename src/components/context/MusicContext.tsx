import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { Track } from "../../types/music";

/* =======================
   TYPES
======================= */

export type DJEffects = {
  speed: number;   // 0.5 → 2.0
  reverb: number;  // 0 → 1
  echo: number;
  bass: number;   // 0 → 1
  fadeIn: number;
  fadeOut: number;
};

export type MusicContextType = {
  currentTrack: Track | null;
  isPlaying: boolean;

  playTrack: (track: Track) => Promise<void>;
  stop: () => void;

  djEffects: DJEffects;
  setDjEffects: React.Dispatch<React.SetStateAction<DJEffects>>;
};

/* =======================
   CONTEXT / HOOK
======================= */

export const MusicContext = createContext<MusicContextType | null>(null);

export const useMusicPlayer = () => {
  const ctx = useContext(MusicContext);
  if (!ctx) throw new Error("useMusicPlayer fora do provider");
  return ctx;
};

/* =======================
   PROVIDER
======================= */

export const MusicProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  /* =======================
     AUDIO NODES (refs)
  ======================= */

  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);

  const gainRef = useRef<GainNode | null>(null);
  const delayRef = useRef<DelayNode | null>(null);
  const feedbackRef = useRef<GainNode | null>(null);
  const convolverRef = useRef<ConvolverNode | null>(null);
  const filterRef = useRef<BiquadFilterNode | null>(null);
  const bassBoostRef = useRef<BiquadFilterNode | null>(null);

  /* =======================
     STATE
  ======================= */

  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const [djEffects, setDjEffects] = useState<DJEffects>({
    speed: 1,
    reverb: 0,
    echo: 0,
    bass: 0,
    fadeIn: 0,
    fadeOut: 0,
  });

 
  /* =======================
     PLAY TRACK
  ======================= */

const initAudio = async () => {
  if (audioCtxRef.current) return;

  const ctx = new AudioContext();

  /* ========= DRY ========= */
  const gain = ctx.createGain();

  /* ========= BASS BOOST ========= */
  const bassBoost = ctx.createBiquadFilter();
  bassBoost.type = "lowshelf";
  bassBoost.frequency.value = 120;
  bassBoost.gain.value = 0;

  /* ========= WET ========= */
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 22050;

  const delay = ctx.createDelay(1);
  const feedback = ctx.createGain();
  const convolver = ctx.createConvolver();
  const wetGain = ctx.createGain();

  /* ========= CONNECTIONS ========= */

  // echo loop
  delay.connect(feedback);
  feedback.connect(delay);

  // wet chain
  filter.connect(convolver);
  convolver.connect(delay);
  delay.connect(wetGain);

  // dry chain
  bassBoost.connect(gain);

  // mix
  gain.connect(ctx.destination);
  wetGain.connect(ctx.destination);

  /* ========= DEFAULTS ========= */
  gain.gain.value = 1;
  wetGain.gain.value = 0;
  feedback.gain.value = 0;

  /* ========= REFS ========= */
  audioCtxRef.current = ctx;
  gainRef.current = gain;
  delayRef.current = delay;
  feedbackRef.current = feedback;
  convolverRef.current = convolver;
  filterRef.current = filter;
  bassBoostRef.current = bassBoost;
};



  const playTrack = async (track: Track) => {
    await initAudio();

    const ctx = audioCtxRef.current!;
    if (ctx.state !== "running") {
      await ctx.resume();
    }

    stop();

    const res = await fetch(track.url);
    const arr = await res.arrayBuffer();
    const buffer = await ctx.decodeAudioData(arr);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = djEffects.speed;


    
    // split dry / wet
    source.connect(bassBoostRef.current!); // DRY com grave
    source.connect(filterRef.current!); 

    const now = ctx.currentTime;

    gainRef.current!.gain.cancelScheduledValues(now);
    gainRef.current!.gain.setValueAtTime(0, now);
    gainRef.current!.gain.linearRampToValueAtTime(
      1,
      now + djEffects.fadeIn
    );


    source.start();

    sourceRef.current = source;
    setCurrentTrack(track);
    setIsPlaying(true);
  };


  /* =======================
     STOP
  ======================= */

  const stop = () => {
    if (!audioCtxRef.current || !sourceRef.current) return;

    const ctx = audioCtxRef.current;
    const now = ctx.currentTime;

    try {
      gainRef.current!.gain.cancelScheduledValues(now);
      gainRef.current!.gain.setValueAtTime(
        gainRef.current!.gain.value,
        now
      );
      gainRef.current!.gain.linearRampToValueAtTime(
        0,
        now + djEffects.fadeOut
      );

      sourceRef.current.stop(now + djEffects.fadeOut + 0.05);
    } catch {}

    sourceRef.current = null;
    setIsPlaying(false);
    setCurrentTrack(null);
  };


  /* =======================
     DJ EFFECTS (REAL TIME)
  ======================= */

  // SPEED / SLOWED
  useEffect(() => {
    const source = sourceRef.current;
    if (!source || !audioCtxRef.current) return;

    source.playbackRate.setValueAtTime(
      djEffects.speed,
      audioCtxRef.current.currentTime
    );

    // vibe slowed
    if (djEffects.speed < 1) {
      filterRef.current!.frequency.value = 12000 * djEffects.speed;
    } else {
      filterRef.current!.frequency.value = 22050;
    }
  }, [djEffects.speed]);

  // ECHO
  useEffect(() => {
    if (!delayRef.current || !feedbackRef.current || !gainRef.current) return;

    delayRef.current.delayTime.value = djEffects.echo * 0.4;
    feedbackRef.current.gain.value = djEffects.echo * 0.35;
  }, [djEffects.echo]);


  // REVERB
  useEffect(() => {
    if (!convolverRef.current || !audioCtxRef.current) return;

    if (djEffects.reverb === 0) {
      convolverRef.current.buffer = null;
      return;
    }

    const ctx = audioCtxRef.current;
    const length = ctx.sampleRate * 2;
    const impulse = ctx.createBuffer(2, length, ctx.sampleRate);

    for (let c = 0; c < 2; c++) {
      const channel = impulse.getChannelData(c);
      for (let i = 0; i < length; i++) {
        channel[i] =
          (Math.random() * 2 - 1) *
          Math.pow(1 - i / length, djEffects.reverb);
      }
    }

    convolverRef.current.buffer = impulse;
  }, [djEffects.reverb]);

  useEffect(() => {
    if (!bassBoostRef.current) return;

    // 0 → 1  →   0dB → +15dB
    bassBoostRef.current.gain.value = djEffects.bass * 15;
  }, [djEffects.bass]);


  /* =======================
     PROVIDER
  ======================= */

  return (
    <MusicContext.Provider
      value={{
        currentTrack,
        isPlaying,
        playTrack,
        stop,
        djEffects,
        setDjEffects,
      }}
    >
      {children}
    </MusicContext.Provider>
  );
};
