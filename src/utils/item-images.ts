import type { ImageMetadata } from "astro";

// Item photos are downloaded from Google Drive into public/items by
// `pnpm fetch-data`. They stay there so structured data keeps a stable URL, and
// are also imported here so <Picture> can build resized AVIF/WebP versions.
const images = import.meta.glob<{ default: ImageMetadata }>("/public/items/*.{webp,jpg,jpeg,png}", { eager: true });

/** Optimizable metadata for an item image file name, if it exists locally. */
export function getItemImage(fileName: string | undefined): ImageMetadata | undefined {
	return fileName ? images[`/public/items/${fileName}`]?.default : undefined;
}

/** Original public URL, used when the file is missing from public/items. */
export function itemImageUrl(fileName: string): string {
	return `${import.meta.env.BASE_URL.replace(/\/$/, "")}/items/${fileName}`;
}
