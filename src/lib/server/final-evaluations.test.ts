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

	it('rejects an incomplete result so the page can fall back to the initial assessment', () => {
		const value = storedEvaluation();
		delete value.dimensionLevels.D1;
		expect(parseStoredFinalEvaluation(value, submission)).toBeNull();
	});
});
