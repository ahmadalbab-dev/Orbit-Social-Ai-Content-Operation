export const HERO_SCENE_MS = 9000;
export const AI_STUDIO_SCALE = 0.6;
const smooth = (value: number) => {
  const x = Math.max(0, Math.min(1, value));
  return x * x * (3 - 2 * x);
};
/** Each title holds for 7.5s, then dissolves into the next across the same cells. */
export function heroSequence(elapsed: number, reduced = false) {
  if (reduced) return { orbit: 1, studio: 0 };
  const time = Math.max(0, elapsed) % (HERO_SCENE_MS * 2),
    second = time >= HERO_SCENE_MS;
  const blend = smooth(
    ((time % HERO_SCENE_MS) - (HERO_SCENE_MS - 1500)) / 1500,
  );
  return second
    ? { orbit: blend, studio: 1 - blend }
    : { orbit: 1 - blend, studio: blend };
}
export function codeCellOpacity(weight: number, column: number, row: number) {
  if (weight <= 0) return 0;
  if (weight >= 1) return 1;
  const seed = Math.sin(column * 127.1 + row * 311.7) * 43758.5453;
  const threshold = (seed - Math.floor(seed)) * 0.7;
  return smooth((weight - threshold) / 0.3);
}
