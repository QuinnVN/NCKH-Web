import { describe, expect, it, vi } from 'vitest';
import type { QuestionnaireSubmission } from '$lib/questionnaire';
import { finalDimensionDefinitions } from '$lib/evaluation/final-dimension-content';
import { parseStoredFinalEvaluation, findFinalEvaluation } from './final-evaluations';
import { buildCompletionPayload, desmapQuestions } from '$lib/questionnaire';
import { rankCareerSuggestions, careerEvidenceDescription } from '$lib/assessment/career-ranking';
import { careerObservations } from './career-observations';

const mongo = vi.hoisted(() => vi.fn());
vi.mock('./mongodb', () => ({ getMongoDatabase: mongo }));

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
	it('recalculates old Mongo careers from the matching questionnaire and completed VR without writes', async () => {
		const payload = buildCompletionPayload({
			assessmentId: 'assessment-123e4567-e89b-42d3-a456-426614174000',
			participant: submission.participant,
			careerInterests: ['technology-engineering'],
			answers: Object.fromEntries(
				desmapQuestions.map((question) => [question.id, question.options[0].letter])
			),
			startedAt: '2026-09-12T08:00:00.000Z'
		});
		const records = [
			{
				gameId: 'lawyer',
				status: 'completed',
				data: { lawyer: { criterionScores: { evidenceUse: 32, logicalConnections: 28 } } }
			}
		];
		const finalCollection = {
			find: vi.fn(() => ({
				sort: () => ({ limit: () => ({ toArray: async () => [storedEvaluation()] }) })
			}))
		};
		const gameCollection = {
			distinct: vi.fn(async () => [submission.participant.name]),
			find: vi.fn((query: unknown) => {
				void query;
				return { toArray: async () => records };
			})
		};
		const identityCollection = { distinct: vi.fn(async () => [submission.participant.email]) };
		mongo.mockResolvedValue({
			collection: (name: string) =>
				name === 'final_evaluations'
					? finalCollection
					: name === 'game_results'
						? gameCollection
						: identityCollection
		});
		const result = await findFinalEvaluation(payload);
		const ranked = rankCareerSuggestions(
			Object.entries(payload.scores.groups).map(([id, value]) => ({ id, score: value.percent })),
			careerObservations(records),
			payload.careerInterests,
			7
		);
		expect(result?.careerSuggestions).toEqual(
			ranked.map((item, index) => ({
				id: item.career.id,
				name: item.career.name,
				compatibilityPercent: item.compatibilityPercent,
				description: careerEvidenceDescription(item, index === 0)
			}))
		);
		expect(gameCollection.find.mock.calls[0][0]).toMatchObject({
			participantName: submission.participant.name,
			status: 'completed',
			$and: [
				{ $or: [{ assessmentId: payload.assessmentId }, { assessmentId: { $exists: false } }] },
				{
					$or: [
						{ participantEmail: submission.participant.email },
						{ participantEmail: { $exists: false } }
					]
				}
			]
		});
		gameCollection.distinct.mockResolvedValue([
			submission.participant.name,
			submission.participant.name.toLocaleUpperCase('vi')
		]);
		expect((await findFinalEvaluation(payload))?.careerSuggestions).toEqual(
			storedEvaluation().careerSuggestions
		);
		gameCollection.distinct.mockResolvedValue([submission.participant.name]);
		identityCollection.distinct.mockResolvedValue(['other@example.com']);
		expect((await findFinalEvaluation(payload))?.careerSuggestions).toEqual(
			storedEvaluation().careerSuggestions
		);
		gameCollection.distinct.mockRejectedValueOnce(new Error('telemetry unavailable'));
		expect((await findFinalEvaluation(payload))?.careerSuggestions).toEqual(
			storedEvaluation().careerSuggestions
		);
	});
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
