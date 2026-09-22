import { dev } from '$app/environment';
import { findFinalEvaluation } from '$lib/server/final-evaluations';
import { getInitialAssessmentMode } from '$lib/server/initial-assessment-mode';
import { findQuestionnaireSubmissionByAssessmentId } from '$lib/server/questionnaire-submissions';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies, url }) => {
	let finalAssessment = null;
	const assessmentId = cookies.get('desmap_assessment_id');
	if (assessmentId) {
		try {
			const submission = await findQuestionnaireSubmissionByAssessmentId(assessmentId);
			if (submission) finalAssessment = await findFinalEvaluation(submission);
		} catch {
			// A database outage must not block the locally saved initial assessment.
		}
	}
	return {
		initialAssessmentMode: getInitialAssessmentMode(),
		finalAssessment,
		previewFinal: dev && url.searchParams.get('preview') === 'final'
	};
};
