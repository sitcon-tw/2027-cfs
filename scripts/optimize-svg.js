// Optimize SVG assets in place: `pnpm optimize:svg [files...]`.
//
// Figma exports embed every logo as a full-resolution base64 PNG, even when the
// logo is drawn only ~100px wide. This script downsizes each embedded bitmap to
// what is actually displayed (times EMBED_SCALE for high-DPI screens), re-encodes
// it as WebP, and then runs svgo on the markup. Running it twice is harmless:
// already-small bitmaps are kept as they are.
import { readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";
import { optimize } from "svgo";

const DEFAULT_FILES = [
	"src/assets/img/sponsor_upper.svg",
	"src/assets/img/sponsor_lower.svg",
	"src/assets/img/schools-text-2025.svg",
	"src/assets/img/cycle/Cycle.svg",
	"src/assets/img/cycle/Cycle.en.svg"
];
// Pixels per SVG user unit to keep. The marquee draws one user unit at about
// 1 CSS px, so 2.5 covers 2x screens with some headroom.
const EMBED_SCALE = 2.5;
const WEBP_QUALITY = 85;

const attr = (tag, name) => tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];

/** Largest drawn width (in user units) for each embedded <image> id. */
function displayedWidths(svg) {
	const patternToUse = new Map();
	for (const m of svg.matchAll(/<pattern\s[^>]*id="([^"]+)"[^>]*>\s*<use\s([^>]*)\/?>/g)) {
		const href = attr(` ${m[2]}`, "xlink:href") || attr(` ${m[2]}`, "href");
		const matrix = attr(` ${m[2]}`, "transform")?.match(/matrix\(([^)]+)\)/);
		if (href && matrix) patternToUse.set(m[1], { image: href.slice(1), scaleX: Math.abs(parseFloat(matrix[1].trim().split(/[\s,]+/)[0])) });
	}
	const imageWidths = new Map(); // id -> intrinsic width attribute
	for (const m of svg.matchAll(/<image\s[^>]*>/g)) imageWidths.set(attr(m[0], "id"), parseFloat(attr(m[0], "width")));

	const drawn = new Map();
	for (const m of svg.matchAll(/<rect\s[^>]*fill="url\(#([^)]+)\)"[^>]*>/g)) {
		const use = patternToUse.get(m[1]);
		const rectWidth = parseFloat(attr(m[0], "width"));
		if (!use || !rectWidth) continue;
		// patternContentUnits="objectBoundingBox": the image spans rectWidth * scaleX * intrinsicWidth user units.
		const width = rectWidth * use.scaleX * (imageWidths.get(use.image) || 0);
		drawn.set(use.image, Math.max(drawn.get(use.image) || 0, width));
	}
	return drawn;
}

async function shrinkEmbeddedImages(svg) {
	const drawn = displayedWidths(svg);
	let result = svg;
	for (const m of svg.matchAll(/<image\s[^>]*>/g)) {
		const tag = m[0];
		const id = attr(tag, "id");
		const href = attr(tag, "xlink:href") || attr(tag, "href");
		const data = href?.match(/^data:image\/[a-z+]+;base64,(.+)$/);
		if (!data || !drawn.has(id)) continue;
		const input = Buffer.from(data[1], "base64");
		const { width } = await sharp(input).metadata();
		const target = Math.ceil(drawn.get(id) * EMBED_SCALE);
		const output = await sharp(input)
			.resize({ width: Math.min(width, target), withoutEnlargement: true })
			.webp({ quality: WEBP_QUALITY, alphaQuality: 90, effort: 6 })
			.toBuffer();
		if (output.length >= input.length) continue;
		result = result.replace(href, `data:image/webp;base64,${output.toString("base64")}`);
	}
	return result;
}

const files = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT_FILES;
for (const file of files) {
	const before = readFileSync(file, "utf8");
	const shrunk = await shrinkEmbeddedImages(before);
	const { data } = optimize(shrunk, {
		path: file,
		multipass: true,
		// svgo 4 keeps the viewBox by default, so the images still scale with CSS.
		plugins: ["preset-default"]
	});
	writeFileSync(file, data);
	const kb = n => `${(Buffer.byteLength(n) / 1024).toFixed(1)}KB`;
	console.log(`${file}: ${kb(before)} -> ${kb(data)}`);
}
