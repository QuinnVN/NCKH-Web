import { describe, expect, it } from 'vitest';
import { careerObservations } from './career-observations';
import sales from './fixtures/completed-sales-v2.json';
import partialSales from './fixtures/completed-sales-v3-partial.json';

describe('career VR evidence', () => {
	it('maps a v3 early exchange without inventing cause or solution evidence', () => {
		expect(careerObservations([partialSales[0]]).map((item) => [item.code, item.score])).toEqual([
			['information-processing', 0],
			['decision-making', 0],
			['problem-solving', 20],
			['adaptability', 0],
			['social-interaction', 40]
		]);
	});
	it('keeps valid Part 1 evidence when an impossible v3 Part 2 is rejected', () => {
		const value = partialSales[0];
		const observations = careerObservations([
			{
				...value,
				data: {
					part1: { score: 80 },
					part2: { ...value.data.part2, endingReason: 'manager_escalation' }
				}
			}
		]);
		expect(observations.map((item) => [item.code, item.score])).toEqual([
			['information-processing', 80],
			['decision-making', 80],
			['problem-solving', 80]
		]);
	});
	it('keeps zero scores and does not invent unobserved pressure or adaptability', () => {
		const observations = careerObservations([
			{
				gameId: 'lawyer',
				status: 'completed',
				data: { lawyer: { criterionScores: { evidenceUse: 0, logicalConnections: 35 } } }
			}
		]);
		expect(observations.map((item) => [item.code, item.score])).toEqual([
			['information-processing', 0],
			['problem-solving', 100]
		]);
	});
	it('ignores unfinished or invalid rubric results', () => {
		expect(careerObservations([{ ...sales, status: 'pending' }])).toEqual([]);
		const invalid = structuredClone(sales);
		invalid.data.part2.assessmentStatus = 'needs_review';
		const observations = careerObservations([invalid]);
		expect(observations.map((item) => item.code)).not.toContain('adaptability');
		expect(observations.map((item) => item.code)).not.toContain('social-interaction');
	});
	it('merges repeated runs before combining different experiences', () => {
		const game = (accuracy: number) => ({
			gameId: 'doctor',
			status: 'completed',
			data: { cases: [{ categorizationAccuracyPercent: accuracy }] }
		});
		const lawyer = {
			gameId: 'lawyer',
			status: 'completed',
			data: { lawyer: { criterionScores: { evidenceUse: 40 } } }
		};
		const observed = careerObservations([game(0), game(100), game(50), lawyer]);
		expect(observed.find((item) => item.code === 'information-processing')?.score).toBe(75);
	});
});
