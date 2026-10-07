import catalog from './career-catalog.json';
import { groupedDimensions } from './config';

export const CAREER_RANKING_VERSION = catalog.version;
export const suggestionCareers = catalog.careers;
export type SuggestionCareer = (typeof suggestionCareers)[number];
export type CareerScoreInput = { id: string; score: number };
export type CareerBehaviour = { code: string; label: string; score: number; evidence: string };
export type RankedCareer = {
	career: SuggestionCareer;
	score: number;
	compatibilityPercent: number;
	questionnaireScore: number;
	vrShare: number;
	dimensions: { id: string; name: string; score: number; importance: number }[];
	observations: CareerBehaviour[];
};

function correlation(xs: readonly number[], ys: readonly number[]): number {
	const xMean = xs.reduce((sum, value) => sum + value, 0) / xs.length;
	const yMean = ys.reduce((sum, value) => sum + value, 0) / ys.length;
	let xy = 0;
	let xx = 0;
	let yy = 0;
	for (let i = 0; i < xs.length; i++) {
		xy += (xs[i] - xMean) * (ys[i] - yMean);
		xx += (xs[i] - xMean) ** 2;
		yy += (ys[i] - yMean) ** 2;
	}
	const denominator = Math.sqrt(xx * yy);
	return denominator ? xy / denominator : 0;
}

/**
 * Questionnaire score on 0-100, following the O*NET profile-linking approach. Non-Desire
 * dimensions compare the shape of the self-reported profile with the career's O*NET profile by
 * Pearson correlation; Desire dimensions compare levels with the career's work values; low
 * self-reports on core requirements (profile >= minProfile) reduce the score.
 */
function questionnaireFit(career: SuggestionCareer, scores: ReadonlyMap<string, number>): number {
	const profile = Object.entries(career.profile);
	const targets = Object.entries(career.desireTargets);
	const desire =
		targets.reduce((sum, [id, target]) => sum + 100 - Math.abs(scores.get(id)! - target), 0) /
		targets.length;
	const shape =
		50 +
		50 *
			correlation(
				profile.map(([id]) => scores.get(id)!),
				profile.map(([, value]) => value)
			);
	const { threshold, factor, minProfile } = catalog.shortfallPenalty;
	const core = profile.filter(([, value]) => value >= minProfile);
	const shortfall = core.length
		? core.reduce((sum, [id]) => sum + Math.max(0, threshold - scores.get(id)!), 0) / core.length
		: 0;
	const share = catalog.desireShare;
	return Math.min(100, Math.max(0, desire * share + shape * (1 - share) - factor * shortfall));
}

// DESMAP is exploratory. O*NET-derived profiles are not calibrated success probabilities.
export function rankCareerSuggestions(
	dimensions: readonly CareerScoreInput[],
	behaviours: readonly CareerBehaviour[] = [],
	interests?: readonly string[],
	limit = 3
): RankedCareer[] {
	const scores = new Map(dimensions.map(({ id, score }) => [id, score]));
	for (const dimension of groupedDimensions) {
		const score = scores.get(dimension.id);
		if (score === undefined || !Number.isFinite(score) || score < 0 || score > 100)
			throw new Error(`Thiếu điểm hợp lệ cho ${dimension.id}.`);
	}
	const selected = new Set(interests?.filter((id) => id !== 'exploring'));
	const restrict = selected.size > 0 && !interests?.includes('exploring');
	const pool = suggestionCareers.filter(
		(career) => !restrict || selected.has(career.interestGroup)
	);
	const rankings = pool.map((career): RankedCareer => {
		const questionnaireScore = questionnaireFit(career, scores);
		const observations = [
			...new Map(
				behaviours
					.filter(
						(item) =>
							Object.hasOwn(career.vrWeights, item.code) &&
							Number.isFinite(item.score) &&
							item.score >= 0 &&
							item.score <= 100 &&
							item.evidence.trim()
					)
					.map((item) => [item.code, item])
			).values()
		];
		const vrWeights = career.vrWeights as Record<string, number>;
		const availableWeight = observations.reduce((sum, item) => sum + vrWeights[item.code], 0);
		const totalWeight = Object.values(vrWeights).reduce((sum, weight) => sum + weight, 0);
		const vrShare = (catalog.maxVrShare * availableWeight) / totalWeight;
		const vrScore = availableWeight
			? observations.reduce((sum, item) => sum + item.score * vrWeights[item.code], 0) /
				availableWeight
			: 0;
		const score = questionnaireScore * (1 - vrShare) + vrScore * vrShare;
		return {
			career,
			score,
			questionnaireScore,
			vrShare,
			compatibilityPercent: Math.round(score),
			// The career's strongest O*NET requirements, at least three, explain the suggestion.
			dimensions: groupedDimensions
				.filter(({ id }) => !id.startsWith('D'))
				.map(({ id, name }) => ({
					id,
					name,
					score: scores.get(id)!,
					importance: career.weights[id],
					profile: career.profile[id as keyof typeof career.profile]
				}))
				.sort((a, b) => b.profile - a.profile || b.score - a.score || a.id.localeCompare(b.id))
				.filter((item, index) => index < 3 || item.importance >= 3)
				.map(({ id, name, score, importance }) => ({ id, name, score, importance })),
			observations: observations.sort(
				(a, b) =>
					vrWeights[b.code] - vrWeights[a.code] || b.score - a.score || a.code.localeCompare(b.code)
			)
		};
	});
	// Keep precision until selection. Rounding before sorting creates artificial ties.
	return rankings
		.sort((a, b) => b.score - a.score || a.career.id.localeCompare(b.career.id))
		.slice(0, limit);
}

export function careerEvidenceDescription(ranked: RankedCareer, primary = true): string {
	const { career, dimensions, observations } = ranked;
	const facts = dimensions
		.slice(0, 2)
		.map((item) => `${item.name.toLocaleLowerCase('vi')} ${item.score}/100`)
		.join(' và ');
	const questionnaire = `Trong bảng hỏi, bạn tự đánh giá ${facts}.`;
	const work = `Công việc ${career.name} cần ${career.description}.`;
	const observation = observations[0];
	const vr = observation
		? `Trong nhiệm vụ đã trải nghiệm, kết quả VR ghi nhận ${observation.evidence}, ở mức ${observation.score}/100.`
		: 'Chưa có quan sát VR liên quan để đối chiếu hướng nghề này.';
	const action = `Bạn có thể ${career.activity} để tìm hiểu cách mình đáp ứng công việc.`;
	const variation = [...career.id].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 3;
	const opening = primary
		? variation === 0
			? [questionnaire, work]
			: [work, questionnaire]
		: [
				variation === 0
					? `Trong bảng hỏi, bạn tự đánh giá ${facts}; công việc ${career.name} cần ${career.description}.`
					: `Công việc ${career.name} cần ${career.description}; trong bảng hỏi, bạn tự đánh giá ${facts}.`
			];
	return opening.concat(observations.length ? [vr] : [], [action]).join(' ');
}

export function validateCareerCatalog(): void {
	const ids = new Set<string>();
	const profiles = new Set<string>();
	for (const career of suggestionCareers) {
		if (ids.has(career.id)) throw new Error('Danh mục nghề bị trùng mã.');
		ids.add(career.id);
		if (
			Object.keys(career.weights).length !== 28 ||
			Object.keys(career.profile).length !== 22 ||
			groupedDimensions.some(
				({ id }) =>
					!Number.isFinite(career.weights[id]) || career.weights[id] < 1 || career.weights[id] > 5
			) ||
			Object.values(career.profile).some((value) => !Number.isFinite(value))
		)
			throw new Error(`Trọng số nghề ${career.id} không hợp lệ.`);
		const profile = JSON.stringify([career.weights, career.desireTargets]);
		if (profiles.has(profile))
			throw new Error(`Hồ sơ nghề ${career.id} bị trùng trọng số và giá trị.`);
		profiles.add(profile);
		if (
			Object.values(career.desireTargets).some((value) => value < 0 || value > 100) ||
			Object.values(career.vrWeights).some((value) => value < 0 || value > 5) ||
			!career.activity.trim()
		)
			throw new Error(`Tiêu chí nghề ${career.id} không hợp lệ.`);
	}
}

validateCareerCatalog();
