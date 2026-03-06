import { useMusicPlayer } from "../context/MusicContext";

export const MusicDJPanel = () => {
  const { djEffects, setDjEffects } = useMusicPlayer();

  const slider = (
    label: string,
    key: keyof typeof djEffects,
    min: number,
    max: number,
    step: number,
    format?: (v: number) => string
  ) => (
    <label className="text-xs select-none">
      {label} {format ? format(djEffects[key]) : djEffects[key]}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={djEffects[key]}
        onDoubleClick={() =>
          setDjEffects((s) => ({ ...s, [key]: min }))
        }
        onChange={(e) =>
          setDjEffects((s) => ({
            ...s,
            [key]: +e.target.value,
          }))
        }
        className="w-full"
      />
    </label>
  );

  return (
    <div className="mb-3 rounded bg-zinc-800 p-2 space-y-2">
      <h4 className="text-xs font-bold text-purple-300">DJ MODE</h4>

      {slider("Speed", "speed", 0.5, 2, 0.05, (v) => `(${v.toFixed(2)}x)`)}
      {slider("Echo", "echo", 0, 1, 0.05)}
      {slider("Reverb", "reverb", 0, 1, 0.05)}
      {slider("Bass Boost", "bass", 0, 1, 0.05)}
      {slider("Fade In", "fadeIn", 0, 5, 0.1, (v) => `(${v.toFixed(1)}s)`)}
      {slider("Fade Out", "fadeOut", 0, 5, 0.1, (v) => `(${v.toFixed(1)}s)`)}
    </div>
  );
};
