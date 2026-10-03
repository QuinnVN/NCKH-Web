import { describe, expect, it } from 'vitest';
import { parseCompletedSalesAssessment, salesVersionFields } from './sales-result-contract';
import backendAggregate from './fixtures/completed-sales-v2.json';

function aggregate() {
	return {
		runId: 'research-run',
		gameId: 'sale',
		status: 'completed',
		data: {
			part2: {
				pipelineVersion: 'sales-openrouter-v2',
				rubricVersion: 'sales-rubric-v2',
				scenarioVersion: 'returning-shoes-v2',
				questionSetVersion: 'sales-jev-v2',
				thresholdVersion: 'sales-thresholds-v2',
				promptVersion: 'lan-writer-v2',
				assessmentStatus: 'completed',
				criterionScores: { apologyAndPolicyRemedy: 50, adaptabilityAndDeescalation: 50 },
				rawScore: 100,
				policyViolationPenalty: 10,
				score: 90,
				trustState: 'restored',
				customerRating: 'good',
				emotionalHandling: true,
				causeIdentification: true,
				solutionSuitability: true,
				trustRebuilding: true,
				acceptedTurnCount: 8,
				completionReason: 'natural',
				endingReason: null
			}
		}
	};
}

describe('backend Sales assessment contract', () => {
	it('reads the actual synthetic aggregate exported by the backend public API authority test', () => {
		expect(parseCompletedSalesAssessment(backendAggregate)).toMatchObject({
			score: 100,
			trustState: 'restored',
			pipelineVersion: 'sales-openrouter-v2',
			rubricVersion: 'sales-rubric-v2',
			assessmentStatus: 'completed'
		});
	});
	it('preserves all frozen versions and score while excluding provider diagnostics', () => {
		const value = aggregate();
		const parsed = parseCompletedSalesAssessment({
			...value,
			data: { part2: { ...value.data.part2, transcript: 'private', apiKey: 'never expose' } }
		});
		expect(parsed).toMatchObject({ score: 90, pipelineVersion: 'sales-openrouter-v2' });
		expect(parsed).not.toHaveProperty('transcript');
		expect(parsed).not.toHaveProperty('apiKey');
	});

	it.each(['pending', 'needs-review'])(
		'rejects %s assessment even if score is present',
		(status) => {
			const value = aggregate();
			value.data.part2.assessmentStatus = status;
			expect(parseCompletedSalesAssessment(value)).toBeNull();
		}
	);

	it('rejects a draft and a Unity fragment with plausible completed defaults', () => {
		const value = aggregate();
		expect(parseCompletedSalesAssessment({ ...value, status: 'draft' })).toBeNull();
		expect(
			parseCompletedSalesAssessment({ kind: 'sales.part2.completed', data: value.data })
		).toBeNull();
	});

	it('requires a complete provenance tuple for versioned results', () => {
		const value = aggregate();
		const incomplete: Record<string, unknown> = { ...value.data.part2 };
		delete incomplete.promptVersion;
		expect(parseCompletedSalesAssessment({ ...value, data: { part2: incomplete } })).toBeNull();
	});

	it.each([
		{ score: 80 },
		{ rawScore: 90 },
		{ policyViolationPenalty: -10 },
		{ policyViolationPenalty: 7, score: 93 },
		{ customerRating: 'bad' },
		{ trustRebuilding: false },
		{ endingReason: 'manager_escalation' }
	])('rejects an internally inconsistent v2 result %j', (change) => {
		const value = aggregate();
		expect(
			parseCompletedSalesAssessment({
				...value,
				data: { part2: { ...value.data.part2, ...change } }
			})
		).toBeNull();
	});

	it('accepts a legacy score without inventing new versions or regrading it', () => {
		const value = aggregate();
		const legacy: Record<string, unknown> = { ...value.data.part2 };
		for (const field of salesVersionFields) delete legacy[field];
		delete legacy.assessmentStatus;
		legacy.criterionScores = { apologyAndPolicyRemedy: 45, adaptabilityAndDeescalation: 40 };
		legacy.rawScore = 85;
		legacy.score = 75;
		const parsed = parseCompletedSalesAssessment({ ...value, data: { part2: legacy } });
		expect(parsed?.score).toBe(75);
		expect(parsed).not.toHaveProperty('rubricVersion');
	});

	it('preserves legacy scoring when a new legacy session records its versions', () => {
		const value = aggregate();
		const legacy = {
			...value.data.part2,
			...Object.fromEntries(salesVersionFields.map((field) => [field, 'sales-legacy-v1'])),
			criterionScores: { apologyAndPolicyRemedy: 45, adaptabilityAndDeescalation: 40 },
			rawScore: 85,
			score: 75
		};
		expect(parseCompletedSalesAssessment({ ...value, data: { part2: legacy } })?.score).toBe(75);
	});
});
