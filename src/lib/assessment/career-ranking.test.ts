import { describe, expect, it } from 'vitest';
import scenarios from './career-ranking-fixtures.json';
import catalog from './career-catalog.json';
import { groupedDimensions } from './config';
import { ONET_VERSION } from './onet';
import { hasCareerDescriptionLength } from './career-description';
import {
	rankCareerSuggestions,
	suggestionCareers,
	validateCareerCatalog,
	careerEvidenceDescription
} from './career-ranking';

function profile(strong: string[] = [], weak: string[] = []) {
	return groupedDimensions.map(({ id }) => ({
		id,
		score: strong.includes(id) ? 90 : weak.includes(id) ? 20 : 55
	}));
}

describe('occupational career ranking', () => {
	it.each(scenarios)(
		'agrees with the Python engine for a shared profile',
		({ scores, behaviours, interests, expected }) => {
			const actual = rankCareerSuggestions(
				Object.entries(scores).map(([id, score]) => ({ id, score })),
				behaviours,
				interests,
				7
			);
			expect(actual.map((item) => item.career.id)).toEqual(expected.map((item) => item.id));
			actual.forEach((item, index) => {
				expect(item.compatibilityPercent).toBe(expected[index].percentage);
				expect(item.score).toBeCloseTo(expected[index].score, 10);
			});
		}
	);
	it('audits every expanded profile and covers all ten fields', () => {
		validateCareerCatalog();
		expect(suggestionCareers).toHaveLength(68);
		expect(catalog.onetVersion).toBe(ONET_VERSION);
		expect(new Set(suggestionCareers.map((item) => item.interestGroup)).size).toBe(10);
	});
	it('distinguishes technical and narrative profiles using detailed dimensions', () => {
		const technical = rankCareerSuggestions(
			profile(['E4', 'E5', 'E2', 'M1', 'M3', 'P6'], ['E3', 'S2', 'M2']),
			[],
			undefined,
			7
		);
		const narrative = rankCareerSuggestions(
			profile(['M2', 'E1', 'A3', 'E3'], ['E4', 'E5', 'M1']),
			[],
			undefined,
			7
		);
		expect(['technology-engineering', 'operations-trades']).toContain(
			technical[0].career.interestGroup
		);
		expect(technical.map((item) => item.career.id)).not.toEqual(
			narrative.map((item) => item.career.id)
		);
		expect(technical.map((item) => item.career.id)).not.toContain('bien-kich');
		expect(narrative.map((item) => item.career.id)).toContain('bien-kich');
	});
	it('ranks precise scores before rounding and ignores input order', () => {
		const dimensions = profile(['M1', 'E2']);
		const ranked = rankCareerSuggestions(dimensions, [], ['media-communication'], 7);
		expect(new Set(ranked.map((item) => item.compatibilityPercent)).size).toBeGreaterThan(1);
		for (let i = 1; i < ranked.length; i++)
			expect(ranked[i - 1].score).toBeGreaterThanOrEqual(ranked[i].score);
		expect(
			rankCareerSuggestions([...dimensions].reverse(), [], ['media-communication'], 7)
		).toEqual(ranked);
	});
	it('only blends observed VR criteria and preserves missing evidence', () => {
		const dimensions = profile();
		const initial = rankCareerSuggestions(dimensions, [], ['technology-engineering'], 72);
		const final = rankCareerSuggestions(
			dimensions,
			[
				{
					code: 'information-processing',
					label: 'Xử lý thông tin',
					score: 0,
					evidence: 'tiêu chí sử dụng bằng chứng'
				}
			],
			['technology-engineering'],
			72
		);
		for (const item of final) {
			const prior = initial.find((prior) => prior.career.id === item.career.id)!;
			expect(item.vrShare).toBeGreaterThan(0);
			expect(item.vrShare).toBeLessThan(0.25);
			expect(item.score).toBeCloseTo(prior.score * (1 - item.vrShare));
		}
		expect(initial.every((item) => item.vrShare === 0)).toBe(true);
	});
	it('limits suggestions to selected fields and expands exploring across the catalog', () => {
		const dimensions = profile();
		expect(rankCareerSuggestions(dimensions, [], ['exploring'], 68)).toHaveLength(68);
		expect(
			rankCareerSuggestions(dimensions, [], ['science-research'], 7).every(
				(item) => item.career.interestGroup === 'science-research'
			)
		).toBe(true);
	});
	it('penalises a low score on a core criterion that other strengths would otherwise offset', () => {
		const rank = (dimensions: ReturnType<typeof profile>) =>
			rankCareerSuggestions(dimensions, [], ['exploring'], 72).find(
				(item) => item.career.id === 'ky-su-dien-tu'
			)!;
		const balanced = rank(profile().map((item) => ({ ...item, score: 70 })));
		const missingCore = rank(
			profile().map((item) => ({ ...item, score: item.id === 'E4' ? 20 : 80 }))
		);
		const unpenalised = rank(
			profile().map((item) => ({ ...item, score: item.id === 'E4' ? 50 : 80 }))
		);
		// E4 is a core O*NET requirement: 0.3 × (50 − 20) averaged over the core dimensions.
		const core = Object.values(missingCore.career.profile).filter((value) => value >= 1).length;
		// Both profiles have the same shape, so only the penalty differs.
		expect(unpenalised.score - missingCore.score).toBeCloseTo((0.3 * 30) / core, 10);
		expect(missingCore.score).toBeLessThan(balanced.score);
	});
	it('rejects missing dimensions and writes cited evidence with a concrete exploratory step', () => {
		expect(() => rankCareerSuggestions(profile().slice(1))).toThrow();
		const ranked = rankCareerSuggestions(profile(['M2']))[0];
		const text = careerEvidenceDescription(ranked);
		for (const fact of ranked.dimensions.slice(0, 2)) expect(text).toContain(`${fact.score}/100`);
		expect(text).toContain(ranked.career.activity);
		expect(text).not.toMatch(/yếu kém|bảo đảm thành công|VR|%/);
	});
	it('keeps both questionnaire facts, observed VR and the activity within each sentence range', () => {
		for (const behaviours of [
			[],
			[
				{
					code: 'information-processing',
					label: 'Xử lý thông tin',
					score: 82.5,
					evidence: 'tiêu chí sử dụng bằng chứng'
				}
			]
		]) {
			for (const ranked of rankCareerSuggestions(profile(), behaviours, ['exploring'], 72)) {
				for (const primary of [true, false]) {
					const description = careerEvidenceDescription(ranked, primary);
					expect(hasCareerDescriptionLength(description, primary)).toBe(true);
					for (const fact of ranked.dimensions.slice(0, 2))
						expect(description).toContain(`${fact.score}/100`);
					expect(description).toContain(ranked.career.activity);
					if (ranked.observations.length) expect(description).toContain('82.5/100');
				}
			}
		}
	});
});
