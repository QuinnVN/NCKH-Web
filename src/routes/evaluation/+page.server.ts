import { dev } from '$app/environment';
import { findFinalEvaluation } from '$lib/server/final-evaluations';
import { getInitialAssessmentMode } from '$lib/server/initial-assessment-mode';
import { findQuestionnaireSubmissionByAssessmentId } from '$lib/server/questionnaire-submissions';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ cookies, url }) => {
	const assessmentId = cookies.get('desmap_assessment_id');
	const finalAssessment = (async () => {
		if (!assessmentId) return null;
		try {
			const submission = await findQuestionnaireSubmissionByAssessmentId(assessmentId);
			return submission ? await findFinalEvaluation(submission) : null;
		} catch {
			// A database outage must not block the locally saved initial assessment.
			return null;
		}
	})();
	return {
		initialAssessmentMode: getInitialAssessmentMode(),
		finalAssessment,
		hasAssessmentCookie: Boolean(assessmentId),
		previewFinal: dev && url.searchParams.get('preview') === 'final'
	};
};
