# Auth screen hero images

Drop hero images here. The auth screen picks a **random one on every page load**, and both the right showcase pane and the blurred page backdrop use the same image (so background colors always continue from the photo).

## Adding a new image

1. Convert to WebP first (`magick input.png -quality 80 -define webp:method=6 hero-<name>.webp`).
2. Drop the `.webp` file in this folder.
3. Add the path to `libs/shared/ui/src/lib/hero-images.ts` so it joins the rotation.
4. Recommended size ≥ 1200×1400, portrait-friendly.
5. Keep each file under ~300 KB; quality 80 is usually plenty since the image is blurred.

## Current rotation

- `hero-train.webp`
- `hero-van.webp`
- `hero-coast.webp`
- `hero-rome.webp`
- `hero-gallery.webp`
- `hero-vinyl.webp`

## Overriding

Pass `<AuthLayout imageSrc="/auth/hero-van.webp">…</AuthLayout>` to lock to a specific image.
