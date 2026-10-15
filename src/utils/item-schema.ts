import { parseDeadline } from "./deadline.js";
import { getItemOptions, type ItemData } from "./items-loader.js";

export function createItemSchema(item: ItemData, description: string, itemsUrl: URL) {
	const deadline = parseDeadline(item.deadline);
	const priceValidUntil = deadline ? `${deadline.getFullYear()}-${String(deadline.getMonth() + 1).padStart(2, "0")}-${String(deadline.getDate()).padStart(2, "0")}` : undefined;
	const offers = getItemOptions(item).flatMap(option => {
		// Missing prices, plan benefits and starting prices are not exact offers.
		const match = option.price.trim().match(/^(?:(?:NT)?\$\s*)?(\d+(?:,\d{3})*(?:\.\d+)?)$/);
		if (!match) return [];
		const price = Number(match[1].replaceAll(",", ""));
		if (!Number.isFinite(price)) return [];

		const soldOut = item.remaining.trim() === "0" || option.remaining.trim() === "0";
		const inStock = Number(option.remaining) > 0 || item.quantity === "不限";
		return [
			{
				"@type": "Offer",
				name: option.name,
				price,
				priceCurrency: "TWD",
				availability: soldOut ? "https://schema.org/SoldOut" : inStock ? "https://schema.org/InStock" : undefined,
				priceValidUntil,
				seller: { "@type": "Organization", name: "SITCON" }
			}
		];
	});

	return {
		"@context": "https://schema.org",
		"@type": "Product",
		name: item.name,
		description,
		image: item.image ? new URL(item.image, itemsUrl).href : undefined,
		brand: { "@type": "Organization", name: "SITCON" },
		offers: offers.length ? offers : undefined
	};
}
