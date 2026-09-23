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
vi.mock('$lib/server/initial-assessment-mode', () => ({
	getInitialAssessmentMode: () => 'weighted'
}));

import { load } from './+page.server';

const submission = {
	assessmentId: 'assessment-123',
	participant: { name: 'Nguyễn Văn A', email: 'student@example.com' }
};
const finalAssessment = {
	version: 1,
	assessmentId: 'assessment-123',
	completedAt: '2026-09-22T12:20:41.928Z'
};

function loadEvent(assessmentId?: string) {
	return {
		cookies: { get: vi.fn(() => assessmentId) },
		url: new URL('http://localhost/evaluation')
	};
}

describe('evaluation page server load', () => {
	beforeEach(() => vi.clearAllMocks());

	it('returns the page while the final evaluation is still loading', async () => {
		let finishLookup!: (value: typeof finalAssessment) => void;
		repositories.findQuestionnaireSubmissionByAssessmentId.mockResolvedValue(submission);
		repositories.findFinalEvaluation.mockReturnValue(
			new Promise((resolve) => {
				finishLookup = resolve;
			})
		);

		const result = await load(loadEvent('assessment-123') as never);

		expect(result).toMatchObject({ hasAssessmentCookie: true });
		expect(result?.finalAssessment).toBeInstanceOf(Promise);
		finishLookup(finalAssessment);
		expect(await result?.finalAssessment).toEqual(finalAssessment);
	});

	it('loads the final evaluation for the assessment selected during login', async () => {
		repositories.findQuestionnaireSubmissionByAssessmentId.mockResolvedValue(submission);
		repositories.findFinalEvaluation.mockResolvedValue(finalAssessment);

		const result = await load(loadEvent('assessment-123') as never);

		expect(repositories.findQuestionnaireSubmissionByAssessmentId).toHaveBeenCalledWith(
			'assessment-123'
		);
		expect(repositories.findFinalEvaluation).toHaveBeenCalledWith(submission);
		expect(result).toMatchObject({ hasAssessmentCookie: true });
		expect(await result?.finalAssessment).toEqual(finalAssessment);
	});

	it('keeps the initial evaluation when the login has no final evaluation', async () => {
		repositories.findQuestionnaireSubmissionByAssessmentId.mockResolvedValue(submission);
		repositories.findFinalEvaluation.mockResolvedValue(null);

		const result = await load(loadEvent('assessment-123') as never);

		expect(await result?.finalAssessment).toBeNull();
	});

	it('keeps the initial evaluation available when MongoDB is unavailable', async () => {
		repositories.findQuestionnaireSubmissionByAssessmentId.mockRejectedValue(
			new Error('database unavailable')
		);

		const result = await load(loadEvent('assessment-123') as never);

		expect(await result?.finalAssessment).toBeNull();
	});
});
