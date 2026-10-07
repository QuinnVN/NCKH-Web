import type { RequestEvent } from '@sveltejs/kit';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { assessmentCareers } from '$lib/assessment';
import { buildCompletionPayload, desmapQuestions } from '$lib/questionnaire';

const repository = vi.hoisted(() => ({
	findQuestionnaireSubmissionByAssessmentId: vi.fn(),
	saveInitialEvaluation: vi.fn()
}));
vi.mock('$lib/server/questionnaire-submissions', () => repository);

import { POST } from './+server';

const submission = buildCompletionPayload({
	assessmentId: 'assessment-123e4567-e89b-42d3-a456-426614174000',
	answers: Object.fromEntries(
		desmapQuestions.map((question) => [question.id, question.options[0].letter])
	),
	careerInterests: ['health-wellbeing'],
	participant: { name: 'Nguyen Van A', email: 'student@example.com' },
	startedAt: '2026-09-12T08:00:00.000Z'
});

const initialEvaluation = {
	assessment_id: submission.assessmentId,
	results: [],
	stage_insights: Object.fromEntries(
		(['D', 'E', 'S', 'M', 'A', 'P'] as const).map((stage) => [
			stage,
			{ assessment: `Nhận định ${stage}.`, strength: 'Điểm mạnh.', weakness: 'Cần phát triển.' }
		])
	),
	career_suggestions: [
		{
			id: 'doctor',
			name: assessmentCareers.find((career) => career.id === 'doctor')!.name,
			description: 'Hướng đáng tìm hiểu từ DESMAP.'
		}
	]
};

function event(value: unknown): RequestEvent {
	return {
		request: new Request('http://localhost/api/initial-evaluations', {
			method: 'POST',
			body: JSON.stringify(value)
		})
	} as RequestEvent;
}

describe('initial evaluation MongoDB sync', () => {
	beforeEach(() => {
		repository.findQuestionnaireSubmissionByAssessmentId.mockReset();
		repository.saveInitialEvaluation.mockReset();
		repository.findQuestionnaireSubmissionByAssessmentId.mockResolvedValue(submission);
		repository.saveInitialEvaluation.mockResolvedValue(true);
	});

	it('stores only validated AI analysis and career suggestions for a saved questionnaire', async () => {
		const response = await POST(event(initialEvaluation));
		expect(response.status).toBe(200);
		expect(repository.findQuestionnaireSubmissionByAssessmentId).toHaveBeenCalledWith(
			submission.assessmentId
		);
		expect(repository.saveInitialEvaluation).toHaveBeenCalledWith(
			submission.assessmentId,
			initialEvaluation.stage_insights,
			initialEvaluation.career_suggestions
		);
	});

	it('waits for questionnaire sync before saving the AI result', async () => {
		repository.findQuestionnaireSubmissionByAssessmentId.mockResolvedValue(null);
		const response = await POST(event(initialEvaluation));
		expect(response.status).toBe(409);
		expect(repository.saveInitialEvaluation).not.toHaveBeenCalled();
	});

	it('rejects an altered AI career before writing to MongoDB', async () => {
		const response = await POST(
			event({
				...initialEvaluation,
				career_suggestions: [{ ...initialEvaluation.career_suggestions[0], id: 'invented' }]
			})
		);
		expect(response.status).toBe(422);
		expect(repository.saveInitialEvaluation).not.toHaveBeenCalled();
	});

	it('reports MongoDB outages without discarding the browser result', async () => {
		repository.saveInitialEvaluation.mockRejectedValue(new Error('database unavailable'));
		const response = await POST(event(initialEvaluation));
		expect(response.status).toBe(503);
	});
});
