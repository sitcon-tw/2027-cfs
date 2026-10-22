/** Parse an exact listed amount without treating missing or starting prices as zero. */
export function parseExactPrice(price: string): number | null {
	const match = price.trim().match(/^(?:(?:NT)?\$\s*)?(\d+(?:,\d{3})*(?:\.\d+)?)$/);
	if (!match) return null;
	const amount = Number(match[1].replaceAll(",", ""));
	return Number.isFinite(amount) ? amount : null;
}

/** Localize the starting-price suffix supplied by the marketing sheet. */
export function localizeItemPrice(price: string, locale: string): string {
	if (locale !== "en") return price;

	const startingPrice = price.match(/^\s*((?:NT)?\$\s*\d[\d,]*(?:\.\d+)?)\s*起\s*$/);
	return startingPrice ? `From ${startingPrice[1]}` : price;
}
