import type { RequestEvent } from '@sveltejs/kit';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const repositories = vi.hoisted(() => ({
	findQuestionnaireSubmissionByAssessmentId: vi.fn(),
	findFinalEvaluation: vi.fn()
}));

vi.mock('$lib/server/questionnaire-submissions', () => ({
	findQuestionnaireSubmissionByAssessmentId: repositories.findQuestionnaireSubmissionByAssessmentId
}));
vi.mock('$lib/server/final-evaluations', () => ({
	findFinalEvaluation: repositories.findFinalEvaluation
}));

import { POST } from './+server';

const assessmentId = 'assessment-123e4567-e89b-42d3-a456-426614174000';
const submission = {
	assessmentId,
	participant: { name: 'Nguyễn Văn A', email: 'student@example.com' }
};
const finalAssessment = {
	version: 1,
	assessmentId,
	completedAt: '2026-09-22T12:20:41.928Z'
};

function postEvent(value: unknown): RequestEvent {
	return {
		request: new Request('http://localhost/api/final-evaluations', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(value)
		})
	} as unknown as RequestEvent;
}

describe('final evaluation lookup endpoint', () => {
	beforeEach(() => vi.clearAllMocks());

	it('returns the final evaluation for the stored assessment', async () => {
		repositories.findQuestionnaireSubmissionByAssessmentId.mockResolvedValue(submission);
		repositories.findFinalEvaluation.mockResolvedValue(finalAssessment);

		const response = await POST(postEvent({ assessmentId }));

		expect(repositories.findQuestionnaireSubmissionByAssessmentId).toHaveBeenCalledWith(
			assessmentId
		);
		expect(repositories.findFinalEvaluation).toHaveBeenCalledWith(submission);
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ finalAssessment });
	});

	it('returns null before the submission or final evaluation exists', async () => {
		repositories.findQuestionnaireSubmissionByAssessmentId.mockResolvedValue(null);

		const response = await POST(postEvent({ assessmentId }));

		expect(repositories.findFinalEvaluation).not.toHaveBeenCalled();
		expect(await response.json()).toEqual({ finalAssessment: null });
	});

	it('rejects a malformed assessment ID without contacting MongoDB', async () => {
		const response = await POST(postEvent({ assessmentId: 'assessment-123' }));

		expect(response.status).toBe(422);
		expect(repositories.findQuestionnaireSubmissionByAssessmentId).not.toHaveBeenCalled();
	});

	it('reports a database outage as retryable', async () => {
		repositories.findQuestionnaireSubmissionByAssessmentId.mockRejectedValue(
			new Error('database unavailable')
		);

		const response = await POST(postEvent({ assessmentId }));

		expect(response.status).toBe(503);
	});
});
