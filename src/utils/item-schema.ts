import { parseDeadline } from "./deadline.js";
import { getItemOptions, type ItemData } from "./items-loader.js";
import { isDeadlinePassed } from "./local-storage.js";
import { parseExactPrice } from "./item-price.js";

export function createItemOffers(item: ItemData) {
	// Only TV screen rotation (27) can be sponsored without a tiered package.
	if (item.id !== "27" || isDeadlinePassed(item.deadline)) return [];

	const deadline = parseDeadline(item.deadline);
	const priceValidUntil = deadline ? `${deadline.getFullYear()}-${String(deadline.getMonth() + 1).padStart(2, "0")}-${String(deadline.getDate()).padStart(2, "0")}` : undefined;
	return getItemOptions(item).flatMap(option => {
		// Missing prices, plan benefits and starting prices are not exact offers.
		const price = parseExactPrice(option.price);
		if (price === null) return [];

		const soldOut = item.remaining.trim() === "0" || option.remaining.trim() === "0";
		return [
			{
				"@type": "Offer",
				name: option.name,
				price,
				priceCurrency: "TWD",
				// Blank remaining means sponsorship is open without a quantity limit.
				availability: soldOut ? "https://schema.org/SoldOut" : "https://schema.org/InStock",
				priceValidUntil,
				seller: { "@type": "Organization", name: "SITCON" }
			}
		];
	});
}

export function createItemSchema(item: ItemData, description: string, itemsUrl: URL) {
	const offers = createItemOffers(item);
	// Product rich results require an offer when there are no reviews or ratings.
	if (!offers.length) return null;

	return {
		"@context": "https://schema.org",
		"@type": "Product",
		name: item.name,
		description,
		image: item.image ? new URL(item.image, itemsUrl).href : undefined,
		brand: { "@type": "Organization", name: "SITCON" },
		offers
	};
}
