import { json, type RequestHandler } from '@sveltejs/kit';
import { findFinalEvaluation } from '$lib/server/final-evaluations';
import { findQuestionnaireSubmissionByAssessmentId } from '$lib/server/questionnaire-submissions';

const maximumBodyBytes = 1_000;
const assessmentIdPattern =
	/^assessment-[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// POST keeps the assessment ID out of URLs, browser history and access logs.
export const POST: RequestHandler = async ({ request }) => {
	let value: unknown;
	try {
		const raw = await request.text();
		if (new TextEncoder().encode(raw).byteLength > maximumBodyBytes)
			return json({ error: 'Dữ liệu tra cứu quá lớn.' }, { status: 413 });
		value = JSON.parse(raw);
	} catch {
		return json({ error: 'Dữ liệu tra cứu không hợp lệ.' }, { status: 422 });
	}
	const assessmentId =
		value && typeof value === 'object' && 'assessmentId' in value ? value.assessmentId : null;
	if (typeof assessmentId !== 'string' || !assessmentIdPattern.test(assessmentId))
		return json({ error: 'Dữ liệu tra cứu không hợp lệ.' }, { status: 422 });

	try {
		const submission = await findQuestionnaireSubmissionByAssessmentId(assessmentId);
		const finalAssessment = submission ? await findFinalEvaluation(submission) : null;
		return json({ finalAssessment });
	} catch {
		return json({ error: 'Máy chủ lưu kết quả tạm thời chưa sẵn sàng.' }, { status: 503 });
	}
};
