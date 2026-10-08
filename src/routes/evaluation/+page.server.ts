import { dev } from '$app/environment';
import { getInitialAssessmentMode } from '$lib/server/initial-assessment-mode';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ url }) => ({
	initialAssessmentMode: getInitialAssessmentMode(),
	previewFinal: dev && url.searchParams.get('preview') === 'final'
});
