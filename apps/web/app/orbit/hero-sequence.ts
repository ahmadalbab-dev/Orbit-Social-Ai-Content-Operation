export const HERO_SCENE_MS = 9000;
export const HERO_DISSOLVE_MS = 2400;
export const AI_STUDIO_SCALE = 0.6;
const smooth = (value: number) => {
  const x = Math.max(0, Math.min(1, value));
  // Zero velocity and acceleration at both ends prevent a visible switch.
  return x * x * x * (x * (x * 6 - 15) + 10);
};
/** Shared title position, readable holds, and an unbroken dissolve in both directions. */
export function heroSequence(elapsed: number, reduced = false) {
  if (reduced) return { orbit: 1, studio: 0 };
  const time = Math.max(0, elapsed) % (HERO_SCENE_MS * 2);
  const second = time >= HERO_SCENE_MS;
  const blend = smooth(((time % HERO_SCENE_MS) - (HERO_SCENE_MS - HERO_DISSOLVE_MS)) / HERO_DISSOLVE_MS);
  return second ? { orbit: blend, studio: 1 - blend } : { orbit: 1 - blend, studio: blend };
}
/** Hash once when building the lattice, never on each animation frame. */
export function codeCellStagger(column: number, row: number) {
  const seed = Math.sin(column * 127.1 + row * 311.7) * 43758.5453;
  return (seed - Math.floor(seed)) * 0.22;
}
export function codeCellBlend(weight: number, stagger: number) {
  if (weight <= 0) return 0;
  if (weight >= 1) return 1;
  return smooth((weight - stagger) / 0.78);
}
/** A stable per-cell stagger. Shared cells stay visible instead of double drawing two words. */
export function codeCellOpacity(weight: number, column: number, row: number) {
  return codeCellBlend(weight, codeCellStagger(column, row));
}
