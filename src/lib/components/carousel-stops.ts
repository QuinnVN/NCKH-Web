export function carouselStops(cardOffsets: number[], maxScroll: number): number[] {
	const stops: number[] = [];
	for (const offset of cardOffsets) {
		const position = Math.max(0, Math.min(offset, maxScroll));
		if (stops.length === 0 || position - stops[stops.length - 1] > 2) stops.push(position);
	}
	return stops;
}
