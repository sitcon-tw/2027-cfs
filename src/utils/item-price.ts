/** Localize the starting-price suffix supplied by the marketing sheet. */
export function localizeItemPrice(price: string, locale: string): string {
	if (locale !== "en") return price;

	const startingPrice = price.match(/^\s*((?:NT)?\$\s*\d[\d,]*(?:\.\d+)?)\s*起\s*$/);
	return startingPrice ? `From ${startingPrice[1]}` : price;
}
