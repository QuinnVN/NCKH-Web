import type { CareerBehaviour } from '$lib/assessment/career-ranking';
import { parseCompletedSalesAssessment } from './sales-result-contract';

const labels: Record<string, string> = {
	'information-processing': 'Xử lý thông tin',
	'problem-solving': 'Giải quyết vấn đề',
	'decision-making': 'Ra quyết định',
	adaptability: 'Khả năng thích ứng',
	'pressure-response': 'Phản ứng với áp lực',
	'social-interaction': 'Tương tác xã hội'
};
function record(value: unknown): Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}
function percent(value: unknown, max = 100): number | null {
	return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= max
		? Math.round((value / max) * 100)
		: null;
}
function average(values: (number | null)[]): number | null {
	const present = values.filter((item): item is number => item !== null);
	return present.length ? Math.round(present.reduce((a, b) => a + b, 0) / present.length) : null;
}
function flag(value: unknown): number | null {
	return value === true ? 100 : value === false ? 0 : null;
}

/** Interpret rubric scores only. No claims about unrecorded actions or speech. */
export function careerObservations(games: readonly unknown[]): CareerBehaviour[] {
	const byGame = new Map<string, Map<string, CareerBehaviour[]>>();
	for (const raw of games) {
		const game = record(raw);
		if (game.status !== 'completed') continue;
		const id = String(game.gameId);
		const data = record(game.data);
		const facts: CareerBehaviour[] = [];
		const add = (code: string, score: number | null, evidence: string) => {
			if (score !== null) facts.push({ code, score, label: labels[code], evidence });
		};
		if (id === 'lawyer') {
			const lawyer = record(data.lawyer);
			if (lawyer.completionStatus && lawyer.completionStatus !== 'completed') continue;
			const criteria = record(lawyer.criterionScores);
			add(
				'information-processing',
				percent(criteria.evidenceUse, 40),
				'tiêu chí sử dụng bằng chứng trong phần biện hộ'
			);
			add(
				'problem-solving',
				percent(criteria.logicalConnections, 35),
				'tiêu chí liên kết lập luận trong phần biện hộ'
			);
			add(
				'decision-making',
				percent(criteria.conclusionFidelity, 15),
				'tiêu chí kết luận bám sát chứng cứ'
			);
			add(
				'social-interaction',
				percent(criteria.clarityAndPersuasiveness, 10),
				'tiêu chí trình bày rõ ràng và thuyết phục'
			);
		} else if (id === 'sale') {
			const part1 = record(data.part1);
			const part2 = parseCompletedSalesAssessment(raw);
			const choice =
				part1.selectedShoeId && part1.bestFitShoeId
					? flag(part1.selectedShoeId === part1.bestFitShoeId)
					: percent(part1.score);
			add(
				'information-processing',
				average([choice, flag(part2?.causeIdentification)]),
				'kết quả chọn sản phẩm và nhận diện nguyên nhân trong trải nghiệm bán hàng'
			);
			add(
				'decision-making',
				average([choice, flag(part2?.solutionSuitability)]),
				'kết quả chọn sản phẩm và tiêu chí phù hợp của giải pháp cuối'
			);
			add(
				'problem-solving',
				average([percent(part1.score), percent(part2?.score)]),
				'điểm nhiệm vụ chọn sản phẩm và xử lý khách quay lại'
			);
			add(
				'adaptability',
				percent(part2?.criterionScores.adaptabilityAndDeescalation, 50),
				'tiêu chí thích ứng và hạ nhiệt hội thoại'
			);
			add(
				'social-interaction',
				percent(part2?.criterionScores.apologyAndPolicyRemedy, 50),
				'tiêu chí ghi nhận vấn đề và xử lý theo chính sách'
			);
		} else if (id === 'doctor') {
			const cases = Array.isArray(data.cases) ? data.cases.map(record) : [];
			const accuracy = cases.map((item) => percent(item.categorizationAccuracyPercent));
			const essential = cases.map((item) => percent(item.essentialCategorizationAccuracyPercent));
			add(
				'information-processing',
				average(accuracy),
				'độ chính xác phân loại dữ kiện trong các ca bệnh'
			);
			add(
				'decision-making',
				average(essential),
				'độ chính xác phân loại dữ kiện thiết yếu của ca bệnh'
			);
			add(
				'problem-solving',
				average([...accuracy, ...essential]),
				'kết quả phân loại dữ kiện thường và thiết yếu'
			);
		} else if (id === 'clinic') {
			const patients = Array.isArray(data.patientResults) ? data.patientResults.map(record) : [];
			const deltas = patients
				.map((item) => item.scoreDelta)
				.filter((item): item is number => typeof item === 'number' && Number.isFinite(item));
			const score = deltas.length
				? Math.round((deltas.filter((item) => item > 0).length / deltas.length) * 100)
				: null;
			add('decision-making', score, 'tỷ lệ lượt xử lý bệnh nhân có điểm tăng');
			add('problem-solving', score, 'tỷ lệ lượt xử lý bệnh nhân có điểm tăng');
		}
		const group = byGame.get(id) ?? new Map<string, CareerBehaviour[]>();
		for (const fact of facts) group.set(fact.code, [...(group.get(fact.code) ?? []), fact]);
		byGame.set(id, group);
	}
	const combined = new Map<string, CareerBehaviour[]>();
	for (const group of byGame.values()) {
		for (const [code, facts] of group) {
			combined.set(code, [
				...(combined.get(code) ?? []),
				{
					...facts[0],
					score: average(facts.map((item) => item.score))!,
					evidence: [...new Set(facts.map((item) => item.evidence))].join('; ')
				}
			]);
		}
	}
	return [...combined].map(([code, facts]) => ({
		code,
		label: labels[code],
		score: average(facts.map((item) => item.score))!,
		evidence: [...new Set(facts.map((item) => item.evidence))].join('; ')
	}));
}
