import { json, type RequestHandler } from '@sveltejs/kit';
import {
	buildInitialAssessmentRequest,
	InitialAssessmentError,
	validateInitialAssessmentResponse
} from '$lib/assessment';
import {
	findQuestionnaireSubmissionByAssessmentId,
	saveInitialEvaluation
} from '$lib/server/questionnaire-submissions';

const maximumBodyBytes = 30_000;

export const POST: RequestHandler = async ({ request }) => {
	const contentLength = Number(request.headers.get('content-length') ?? 0);
	if (contentLength > maximumBodyBytes)
		return json({ error: 'Dữ liệu đánh giá quá lớn.' }, { status: 413 });

	let value: unknown;
	try {
		const raw = await request.text();
		if (new TextEncoder().encode(raw).byteLength > maximumBodyBytes)
			return json({ error: 'Dữ liệu đánh giá quá lớn.' }, { status: 413 });
		value = JSON.parse(raw);
	} catch {
		return json({ error: 'Dữ liệu đánh giá không hợp lệ.' }, { status: 422 });
	}
	const assessmentId =
		value && typeof value === 'object' && 'assessment_id' in value ? value.assessment_id : null;
	if (typeof assessmentId !== 'string')
		return json({ error: 'Dữ liệu đánh giá không hợp lệ.' }, { status: 422 });

	try {
		const submission = await findQuestionnaireSubmissionByAssessmentId(assessmentId);
		if (!submission) return json({ error: 'Bài làm DESMAP chưa được đồng bộ.' }, { status: 409 });
		const result = validateInitialAssessmentResponse(
			value,
			buildInitialAssessmentRequest(submission)
		);
		if (!result.stage_insights || !result.career_suggestions)
			return json({ error: 'Dữ liệu đánh giá không hợp lệ.' }, { status: 422 });
		const saved = await saveInitialEvaluation(
			assessmentId,
			result.stage_insights,
			result.career_suggestions
		);
		if (!saved) return json({ error: 'Bài làm DESMAP chưa được đồng bộ.' }, { status: 409 });
		return json({ assessmentId, status: 'synced' });
	} catch (error) {
		if (error instanceof InitialAssessmentError)
			return json({ error: 'Dữ liệu đánh giá không hợp lệ.' }, { status: 422 });
		return json({ error: 'Máy chủ lưu kết quả tạm thời chưa sẵn sàng.' }, { status: 503 });
	}
};
