/** Research contract for the backend-owned Part 2 result in game_results.
 * This module does not accept Unity fragments or perform database writes.
 */
export const salesVersionFields = [
	'pipelineVersion',
	'rubricVersion',
	'scenarioVersion',
	'questionSetVersion',
	'thresholdVersion',
	'promptVersion'
] as const;

export type SalesAssessmentVersions = Record<(typeof salesVersionFields)[number], string>;
export type SalesTrustState = 'restored' | 'partially_restored' | 'lost';
export type SalesCustomerRating = 'good' | 'considering' | 'bad';
export type CompletedSalesAssessment = Partial<SalesAssessmentVersions> & {
	assessmentStatus?: 'completed';
	criterionScores: { apologyAndPolicyRemedy: number; adaptabilityAndDeescalation: number };
	rawScore: number;
	policyViolationPenalty: number;
	score: number;
	trustState: SalesTrustState;
	customerRating: SalesCustomerRating;
	emotionalHandling: boolean;
	causeIdentification: boolean;
	solutionSuitability: boolean;
	trustRebuilding: boolean;
	acceptedTurnCount: number;
	completionReason: string;
	endingReason?: string | null;
};

function record(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function integer(value: unknown, min: number, max: number): value is number {
	return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;
}

function text(value: unknown): value is string {
	return typeof value === 'string' && value.trim().length > 0 && value.length <= 128;
}

/** Read the authoritative assessment only from a finalized backend aggregate.
 * Pending and review-required results remain unavailable, even with a score.
 * Legacy aggregates without version fields retain their original scoring rules.
 */
export function parseCompletedSalesAssessment(value: unknown): CompletedSalesAssessment | null {
	if (!record(value) || value.gameId !== 'sale' || !text(value.runId)) return null;
	if (value.status !== 'completed' || !record(value.data) || !record(value.data.part2)) return null;
	const part = value.data.part2;
	if (part.assessmentStatus !== undefined && part.assessmentStatus !== 'completed') return null;
	const versioned = salesVersionFields.some((field) => part[field] !== undefined);
	if (versioned && salesVersionFields.some((field) => !text(part[field]))) return null;
	if (versioned && part.assessmentStatus !== 'completed') return null;
	if (!record(part.criterionScores)) return null;
	const first = part.criterionScores.apologyAndPolicyRemedy;
	const second = part.criterionScores.adaptabilityAndDeescalation;
	if (!integer(first, 0, 50) || !integer(second, 0, 50)) return null;
	const raw = part.rawScore ?? first + second;
	const penalty = part.policyViolationPenalty ?? 0;
	if (!integer(raw, 0, 100) || raw !== first + second || !integer(penalty, 0, raw)) return null;
	if (!integer(part.score, 0, 100) || part.score !== raw - penalty) return null;
	const ratings: Record<SalesTrustState, SalesCustomerRating> = {
		restored: 'good',
		partially_restored: 'considering',
		lost: 'bad'
	};
	if (!text(part.trustState) || !Object.hasOwn(ratings, part.trustState)) return null;
	const trust = part.trustState as SalesTrustState;
	if (part.customerRating !== ratings[trust]) return null;
	const flags = [
		'emotionalHandling',
		'causeIdentification',
		'solutionSuitability',
		'trustRebuilding'
	] as const;
	if (flags.some((flag) => typeof part[flag] !== 'boolean')) return null;
	if (!integer(part.acceptedTurnCount, 0, Number.MAX_SAFE_INTEGER) || !text(part.completionReason))
		return null;
	if (part.rubricVersion === 'sales-rubric-v2') {
		if (first % 10 !== 0 || second % 10 !== 0 || penalty % 10 !== 0) return null;
		if (trust === 'restored' && (part.score < 70 || flags.some((flag) => !part[flag]))) return null;
		if (
			trust === 'partially_restored' &&
			(part.score < 40 || !part.emotionalHandling || !part.solutionSuitability)
		)
			return null;
		if (
			['manager_escalation', 'maintained_unauthorized_promise', 'second_silence'].includes(
				String(part.endingReason ?? part.completionReason)
			) &&
			trust !== 'lost'
		)
			return null;
	}
	const result: CompletedSalesAssessment = {
		criterionScores: { apologyAndPolicyRemedy: first, adaptabilityAndDeescalation: second },
		rawScore: raw,
		policyViolationPenalty: penalty,
		score: part.score,
		trustState: trust,
		customerRating: ratings[trust],
		emotionalHandling: part.emotionalHandling as boolean,
		causeIdentification: part.causeIdentification as boolean,
		solutionSuitability: part.solutionSuitability as boolean,
		trustRebuilding: part.trustRebuilding as boolean,
		acceptedTurnCount: part.acceptedTurnCount,
		completionReason: part.completionReason
	};
	if (part.assessmentStatus === 'completed') result.assessmentStatus = 'completed';
	if (part.endingReason === null || text(part.endingReason))
		result.endingReason = part.endingReason;
	if (versioned) {
		for (const field of salesVersionFields) result[field] = part[field] as string;
	}
	return result;
}
