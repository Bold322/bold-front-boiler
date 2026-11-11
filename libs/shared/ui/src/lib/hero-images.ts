export const heroImages = [
  '/auth/hero-train.webp',
  '/auth/hero-van.webp',
  '/auth/hero-coast.webp',
  '/auth/hero-rome.webp',
  '/auth/hero-gallery.webp',
  '/auth/hero-vinyl.webp',
] as const;

export function pickRandomHero(): string {
  return heroImages[Math.floor(Math.random() * heroImages.length)]!;
}
