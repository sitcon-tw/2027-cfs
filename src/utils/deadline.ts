/** Parse a source deadline, treating blank or invalid values as unset. */
export function parseDeadline(deadline?: string | null): Date | null {
	const value = deadline?.trim();
	if (!value) return null;

	// Parse calendar dates locally so ISO dates do not shift a day across time zones.
	const parts = value.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
	if (parts) {
		const [, year, month, day] = parts.map(Number);
		const date = new Date(year, month - 1, day);
		// Date normalizes impossible dates such as February 30; treat those as unset.
		return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
	}

	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? null : date;
}

/** Format a valid deadline for a card or popup without its translated label. */
export function formatDeadline(deadline?: string | null): string {
	const date = parseDeadline(deadline);
	return date ? `${date.getMonth() + 1}/${date.getDate()}` : "";
}
