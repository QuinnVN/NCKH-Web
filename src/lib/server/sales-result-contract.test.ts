import { describe, expect, it } from 'vitest';
import { parseCompletedSalesAssessment, salesVersionFields } from './sales-result-contract';
import historicalAggregate from './fixtures/completed-sales-v2.json';
import backendAggregate from './fixtures/completed-sales-v3.json';
import partialAggregates from './fixtures/completed-sales-v3-partial.json';

function aggregate() {
	const value = structuredClone(backendAggregate);
	value.data.part2.policyViolationPenalty = 10;
	value.data.part2.score = 90;
	return value;
}

describe('backend Sales assessment contract', () => {
	it.each([
		'sales-rubric-v2',
		'sales-rubric-v2.1',
		'sales-rubric-v2.2',
		'sales-rubric-v2.3',
		'sales-rubric-v2.4'
	])('applies the same score and ending checks to %s', (rubricVersion) => {
		const value = structuredClone(historicalAggregate);
		value.data.part2.rubricVersion = rubricVersion;
		value.data.part2.policyViolationPenalty = 10;
		value.data.part2.score = 90;
		value.data.part2.acceptedTurnCount = 6;
		value.data.part2.endingReason = 'objectives_completed';
		expect(parseCompletedSalesAssessment(value)).toMatchObject({
			rubricVersion,
			acceptedTurnCount: 6,
			score: 90
		});
		for (const change of [
			{ policyViolationPenalty: 7, score: 93 },
			{ trustRebuilding: false },
			{ endingReason: 'manager_escalation' }
		]) {
			expect(
				parseCompletedSalesAssessment({
					...value,
					data: { part2: { ...value.data.part2, ...change } }
				})
			).toBeNull();
		}
		const partial = {
			...value.data.part2,
			criterionScores: { apologyAndPolicyRemedy: 20, adaptabilityAndDeescalation: 20 },
			rawScore: 40,
			policyViolationPenalty: 0,
			score: 40,
			trustState: 'partially_restored',
			customerRating: 'considering',
			causeIdentification: false,
			trustRebuilding: false,
			endingReason: 'turn_limit'
		};
		expect(parseCompletedSalesAssessment({ ...value, data: { part2: partial } })).toMatchObject({
			score: 40
		});
		for (const change of [
			{ policyViolationPenalty: 10, score: 30, endingReason: 'exchange_accepted' },
			{ emotionalHandling: false },
			{ solutionSuitability: false }
		]) {
			expect(
				parseCompletedSalesAssessment({ ...value, data: { part2: { ...partial, ...change } } })
			).toBeNull();
		}
	});
	it('reads the historical v2 aggregate exported by the backend public API authority test', () => {
		expect(parseCompletedSalesAssessment(historicalAggregate)).toMatchObject({
			score: 100,
			trustState: 'restored',
			pipelineVersion: 'sales-openrouter-v2',
			rubricVersion: 'sales-rubric-v2',
			assessmentStatus: 'completed'
		});
	});
	it('reads the current v3 scorer projection with its mixed-version provenance tuple', () => {
		expect(parseCompletedSalesAssessment(backendAggregate)).toMatchObject({
			score: 100,
			trustState: 'restored',
			pipelineVersion: 'sales-openrouter-v3',
			rubricVersion: 'sales-rubric-v3',
			scenarioVersion: 'returning-shoes-v2',
			questionSetVersion: 'sales-jev-v3',
			thresholdVersion: 'sales-thresholds-v2.1',
			promptVersion: 'lan-writer-v3',
			assessmentStatus: 'completed'
		});
	});
	it('preserves all frozen versions and score while excluding provider diagnostics', () => {
		const value = aggregate();
		const parsed = parseCompletedSalesAssessment({
			...value,
			data: { part2: { ...value.data.part2, transcript: 'private', apiKey: 'never expose' } }
		});
		expect(parsed).toMatchObject({ score: 90, pipelineVersion: 'sales-openrouter-v3' });
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
		{ customerRating: 'bad' }
	])('rejects an internally inconsistent completed result %j', (change) => {
		const value = aggregate();
		expect(
			parseCompletedSalesAssessment({
				...value,
				data: { part2: { ...value.data.part2, ...change } }
			})
		).toBeNull();
	});

	it.each([
		{
			criterionScores: { apologyAndPolicyRemedy: 45, adaptabilityAndDeescalation: 50 },
			rawScore: 95,
			score: 85
		},
		{
			criterionScores: { apologyAndPolicyRemedy: 50, adaptabilityAndDeescalation: 45 },
			rawScore: 95,
			score: 85
		},
		{ policyViolationPenalty: 7, score: 93 },
		{ policyViolationPenalty: 40, score: 60 },
		{ emotionalHandling: false },
		{ causeIdentification: false },
		{ solutionSuitability: false },
		{ trustRebuilding: false }
	])('rejects an impossible restored v3 result %j', (change) => {
		const value = aggregate();
		expect(
			parseCompletedSalesAssessment({
				...value,
				data: { part2: { ...value.data.part2, ...change } }
			})
		).toBeNull();
	});

	it.each(['manager_escalation', 'maintained_unauthorized_promise', 'second_silence'])(
		'requires lost trust for v3 %s, including the completion-reason fallback',
		(reason) => {
			const value = aggregate();
			for (const endingReason of [reason, null]) {
				const part2 = { ...value.data.part2, endingReason, completionReason: reason };
				expect(parseCompletedSalesAssessment({ ...value, data: { part2 } })).toBeNull();
				expect(
					parseCompletedSalesAssessment({
						...value,
						data: {
							part2: { ...part2, trustState: 'lost', customerRating: 'bad' }
						}
					})
				).toMatchObject({ trustState: 'lost', score: 90 });
			}
		}
	);

	it.each(partialAggregates)('reads the backend partial v3 outcome $runId', (value) => {
		expect(parseCompletedSalesAssessment(value)).toMatchObject({
			rubricVersion: 'sales-rubric-v3',
			score: value.data.part2.score,
			policyViolationPenalty: value.data.part2.policyViolationPenalty,
			criterionScores: value.data.part2.criterionScores,
			trustState: 'partially_restored',
			customerRating: 'considering',
			emotionalHandling: value.data.part2.emotionalHandling,
			causeIdentification: value.data.part2.causeIdentification,
			solutionSuitability: value.data.part2.solutionSuitability,
			trustRebuilding: value.data.part2.trustRebuilding,
			endingReason: value.data.part2.endingReason
		});
	});

	it('accepts v3 outcomes exactly at the restored and ordinary partial score thresholds', () => {
		for (const [value, policyViolationPenalty, score] of [
			[backendAggregate, 30, 70],
			[partialAggregates[3], 20, 40]
		] as const) {
			expect(
				parseCompletedSalesAssessment({
					...value,
					data: {
						part2: { ...value.data.part2, policyViolationPenalty, score }
					}
				})
			).toMatchObject({ score, trustState: value.data.part2.trustState });
		}
	});

	it.each([
		{ endingReason: 'stopped_early', completionReason: 'stopped_early' },
		{ emotionalHandling: false },
		{ criterionScores: { apologyAndPolicyRemedy: 10, adaptabilityAndDeescalation: 10 } }
	])('rejects an impossible early-exchange v3 outcome %j', (change) => {
		const value = partialAggregates[0];
		expect(
			parseCompletedSalesAssessment({
				...value,
				data: {
					part2: { ...value.data.part2, ...change }
				}
			})
		).toBeNull();
	});

	it.each([
		{ policyViolationPenalty: 30, score: 30 },
		{ solutionSuitability: false },
		{ criterionScores: { apologyAndPolicyRemedy: 30, adaptabilityAndDeescalation: 30 } }
	])('rejects an impossible ordinary partial v3 outcome %j', (change) => {
		const value = partialAggregates[3];
		expect(
			parseCompletedSalesAssessment({
				...value,
				data: {
					part2: { ...value.data.part2, ...change }
				}
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
