import { describe, expect, it } from 'vitest';
import { carouselStops } from './carousel-stops';

describe('carousel stops', () => {
	it('counts reachable positions when three of five cards fit in view', () => {
		const stops = carouselStops([0, 392, 784, 1176, 1568], 784);
		expect(stops).toEqual([0, 392, 784]);
		expect(stops.slice().reverse()).toEqual([784, 392, 0]);
	});

	it('keeps each card reachable on a narrow viewport', () => {
		expect(carouselStops([0, 392, 784], 1050)).toEqual([0, 392, 784]);
	});
});
