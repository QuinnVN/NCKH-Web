import { describe, expect, it } from 'vitest';
import type { QuestionnaireSubmission } from '$lib/questionnaire';
import { finalDimensionDefinitions } from '$lib/evaluation/final-dimension-content';
import { parseStoredFinalEvaluation } from './final-evaluations';

const submission = {
	assessmentId: 'assessment-123',
	participant: { name: 'Dương Nguyễn Quỳnh Hương', email: 'quynhhuongd93@gmail.com' }
} as Pick<QuestionnaireSubmission, 'assessmentId' | 'participant'>;

function storedEvaluation() {
	return {
		version: 1,
		participantName: '  DƯƠNG Nguyễn Quỳnh Hương ',
		participantEmail: 'quynhhuongd93@gmail.com',
		completedAt: '2026-09-22T12:20:41.928Z',
		stageAssessments: Object.fromEntries(
			(['D', 'E', 'S', 'M', 'A', 'P'] as const).map((stage) => [stage, `Nhận định ${stage}`])
		),
		dimensionLevels: Object.fromEntries(
			finalDimensionDefinitions.map((dimension) => [dimension.id, 'fairly-compatible'])
		),
		behaviourComparison: {
			experienceName: 'Nhân viên bán hàng',
			findings: [
				{
					id: 'information-processing',
					kind: 'confirmed',
					title: 'Xử lý thông tin',
					questionnaireResult: 'Kết quả bảng hỏi.',
					vrEvidence: 'Bằng chứng VR.',
					summary: 'Kết luận đối chiếu.'
				}
			]
		},
		careerSuggestions: [
			{
				id: 'sales',
				name: 'Nhân viên bán hàng',
				compatibilityPercent: 70,
				description: 'Mô tả gợi ý nghề.'
			}
		],
		finalEvaluation: {
			experienceName: 'Nhân viên bán hàng',
			headline: 'Kết luận',
			workStyle: 'Cách làm việc',
			benefit: 'Điểm hỗ trợ',
			challenge: 'Điểm dễ vướng',
			improvement: 'Việc nên thử',
			strengthLabel: 'Điểm mạnh',
			developmentLabel: 'Điểm cần luyện',
			evidence: 'Bằng chứng'
		}
	};
}

describe('stored final evaluation parser', () => {
	it('attaches the matching questionnaire assessment id to the stored final evaluation', () => {
		const parsed = parseStoredFinalEvaluation(storedEvaluation(), submission);
		expect(parsed).toMatchObject({
			assessmentId: submission.assessmentId,
			stageAssessments: { D: 'Nhận định D', P: 'Nhận định P' },
			finalEvaluation: { experienceName: 'Nhân viên bán hàng' }
		});
	});

	it('rejects a result belonging to another participant', () => {
		const value = storedEvaluation();
		value.participantEmail = 'another@example.com';
		expect(parseStoredFinalEvaluation(value, submission)).toBeNull();
	});

	it('accepts a completed result with seven career suggestions', () => {
		const value = storedEvaluation();
		value.careerSuggestions = Array.from({ length: 7 }, (_, index) => ({
			id: `career-${index + 1}`,
			name: `Nghề ${index + 1}`,
			compatibilityPercent: 70 - index,
			description: `Lý do gợi ý nghề ${index + 1}.`
		}));
		expect(parseStoredFinalEvaluation(value, submission)?.careerSuggestions).toHaveLength(7);
	});

	it('keeps distinct card icons when there are more than three findings', () => {
		const value = storedEvaluation();
		const baseFinding = value.behaviourComparison.findings[0];
		const findings = [
			{ ...baseFinding, icon: 'analysis' },
			{ ...baseFinding, id: 'teamwork', icon: 'collaboration' },
			{ ...baseFinding, id: 'ideas', icon: 'creativity' },
			{ ...baseFinding, id: 'pressure', kind: 'development', icon: 'resilience' }
		];
		const parsed = parseStoredFinalEvaluation(
			{ ...value, behaviourComparison: { ...value.behaviourComparison, findings } },
			submission
		);
		expect(parsed?.behaviourComparison?.findings.map((finding) => finding.icon)).toEqual([
			'analysis',
			'collaboration',
			'creativity',
			'resilience'
		]);
	});

	it('keeps the assessment when an optional card icon is unknown', () => {
		const value = storedEvaluation();
		const finding = { ...value.behaviourComparison.findings[0], icon: 'unknown-icon' };
		const parsed = parseStoredFinalEvaluation(
			{ ...value, behaviourComparison: { ...value.behaviourComparison, findings: [finding] } },
			submission
		);
		expect(parsed?.behaviourComparison?.findings[0].icon).toBeUndefined();
	});

	it('keeps remedies for emerging and development cards while accepting older cards without one', () => {
		const value = storedEvaluation();
		const baseFinding = value.behaviourComparison.findings[0];
		const findings = [
			baseFinding,
			{ ...baseFinding, id: 'adaptability', kind: 'emerging', remedy: 'Thử cách xử lý mới.' },
			{ ...baseFinding, id: 'priority', kind: 'development', remedy: 'Luyện đặt ưu tiên.' }
		];
		const parsed = parseStoredFinalEvaluation(
			{ ...value, behaviourComparison: { ...value.behaviourComparison, findings } },
			submission
		);
		expect(parsed?.behaviourComparison?.findings.map((finding) => finding.remedy)).toEqual([
			undefined,
			'Thử cách xử lý mới.',
			'Luyện đặt ưu tiên.'
		]);
	});

	it('rejects an incomplete result so the page can fall back to the initial assessment', () => {
		const value = storedEvaluation();
		delete value.dimensionLevels.D1;
		expect(parseStoredFinalEvaluation(value, submission)).toBeNull();
	});
});
