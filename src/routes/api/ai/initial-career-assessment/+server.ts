import { env } from '$env/dynamic/private';
import { json, type RequestHandler } from '@sveltejs/kit';
import {
	rankCareerSuggestions,
	careerEvidenceDescription,
	hasCareerDescriptionLength,
	type RankedCareer,
	calculateInitialAssessment,
	InitialAssessmentError,
	validateInitialAssessmentRequest,
	validateInitialAssessmentResponse,
	type InitialAssessmentRequest,
	type InitialCareerSuggestion,
	type InitialStageInsight
} from '$lib/assessment';
import { getInitialAssessmentMode } from '$lib/server/initial-assessment-mode';
import type { StageId } from '$lib/questionnaire';

const stageIds = ['D', 'E', 'S', 'M', 'A', 'P'] as const;
const retryableStatuses = new Set([429, 502, 503, 504]);
const maxRetryDelayMs = 3_000;
const stageNames = {
	D: 'Mong muốn',
	E: 'Chuyên môn',
	S: 'Vai trò xã hội',
	M: 'Tư duy',
	A: 'Khả năng thích ứng',
	P: 'Phản ứng với áp lực'
};

const pointFields = ['assessment', 'strength', 'weakness'] as const;
type PointField = (typeof pointFields)[number];
type PointTask = { stage: StageId; field: PointField };
const pointTasks: PointTask[] = stageIds.flatMap((stage) =>
	pointFields.map((field) => ({ stage, field }))
);
const pointInstructions: Record<PointField, string> = {
	assessment: 'Viết 2-3 câu ngắn về xu hướng của nhóm dựa trên các điểm nổi bật.',
	strength: 'Viết 2 câu ngắn về điểm mạnh có căn cứ từ điểm của nhóm.',
	weakness: 'Viết 2 câu ngắn về điều nên phát triển dựa trên điểm của nhóm.'
};
const sentenceSegmenter = new Intl.Segmenter('vi', { granularity: 'sentence' });
const maxPointCharacters = 380;

class InvalidCompletionError extends Error {}
const initialAssessmentModel = 'deepseek/deepseek-v4.1-flash';

function retryDelayMs(response: Response): number {
	const retryAfter = response.headers.get('retry-after');
	if (!retryAfter) return response.status === 429 ? 1_000 : 500;
	const seconds = Number(retryAfter);
	if (Number.isFinite(seconds)) return Math.max(0, seconds * 1_000);
	const date = Date.parse(retryAfter);
	return Number.isFinite(date) ? Math.max(0, date - Date.now()) : 1_000;
}

async function requestOpenRouter(
	fetcher: typeof fetch,
	apiKey: string,
	body: string
): Promise<Response> {
	for (let attempt = 0; attempt < 2; attempt += 1) {
		try {
			const response = await fetcher('https://openrouter.ai/api/v1/chat/completions', {
				method: 'POST',
				signal: AbortSignal.timeout(30_000),
				headers: {
					'content-type': 'application/json',
					authorization: `Bearer ${apiKey}`
				},
				body
			});
			if (attempt === 0 && retryableStatuses.has(response.status)) {
				const delay = retryDelayMs(response);
				if (delay <= maxRetryDelayMs) {
					await new Promise((resolve) => setTimeout(resolve, delay));
					continue;
				}
			}
			return response;
		} catch {
			if (attempt === 1) throw new Error('OpenRouter request failed');
			await new Promise((resolve) => setTimeout(resolve, 500));
		}
	}
	throw new Error('OpenRouter request failed');
}

function plainPoint(content: unknown): string {
	if (typeof content !== 'string') throw new InvalidCompletionError();
	const point = content
		.replace(/<think>[\s\S]*?<\/think>/gi, '')
		.replace(/\bUser\s+Safety\s*:\s*(?:safe|unsafe)\b/gi, '')
		.trim()
		.replace(/^(?:[-*]|\d+[.)])\s+/, '')
		.replace(/^\*+|\*+$/g, '')
		.trim();
	if (!point || /<think\b|\bUser\s+Safety\s*:/i.test(point)) throw new InvalidCompletionError();
	const sentences = [...sentenceSegmenter.segment(point)]
		.map(({ segment }) => segment.trim())
		.filter(Boolean)
		.slice(0, 3);
	let concise = sentences.join(' ');
	while (concise.length > maxPointCharacters && sentences.length > 1) {
		sentences.pop();
		concise = sentences.join(' ');
	}
	if (concise.length > maxPointCharacters) {
		const prefix = concise.slice(0, maxPointCharacters - 1);
		const lastSpace = prefix.lastIndexOf(' ');
		concise = `${prefix.slice(0, lastSpace > maxPointCharacters / 2 ? lastSpace : undefined).trimEnd()}…`;
	}
	if (!concise) throw new InvalidCompletionError();
	return concise;
}

async function requestPoint(
	fetcher: typeof fetch,
	apiKey: string,
	request: InitialAssessmentRequest,
	task: PointTask
): Promise<string> {
	for (let attempt = 0; attempt < 2; attempt += 1) {
		const upstream = await requestOpenRouter(
			fetcher,
			apiKey,
			JSON.stringify({
				model: initialAssessmentModel,
				reasoning: { enabled: false },
				temperature: 0.2,
				max_tokens: task.field === 'assessment' ? 350 : 180,
				messages: [
					{
						role: 'system',
						content:
							'Bạn phân tích hồ sơ tự báo cáo DESMAP. Chỉ dựa trên điểm được cung cấp. Viết tiếng Việt, ngôi thứ hai. Mỗi đoạn tối đa 3 câu ngắn và 50 từ. Chỉ trả về nội dung được yêu cầu, không thêm nhãn, tiêu đề, danh sách, JSON hoặc trạng thái an toàn. Điểm thấp ở nhóm D chỉ là mức độ coi trọng, không coi là yếu kém. Đây là đánh giá ban đầu, chưa có dữ liệu VR. Không suy diễn về bệnh lý, tính cách cố định hoặc khuyến nghị nghề nghiệp cuối cùng. Không chép nguyên dữ liệu đầu vào hay tạo phần trăm mới. /no_think'
					},
					{
						role: 'user',
						content: JSON.stringify({
							stage: task.stage,
							stage_name: stageNames[task.stage],
							field: task.field,
							instruction: pointInstructions[task.field],
							dimensions: request.dimensions.filter((dimension) =>
								dimension.id.startsWith(task.stage)
							)
						})
					}
				]
			})
		);
		if (!upstream.ok) throw upstream;
		try {
			const completion = await upstream.json();
			return plainPoint(completion?.choices?.[0]?.message?.content);
		} catch {
			if (attempt === 1) throw new InvalidCompletionError();
		}
	}
	throw new InvalidCompletionError();
}

async function requestCareerDescription(
	fetcher: typeof fetch,
	apiKey: string,
	request: InitialAssessmentRequest,
	ranked: RankedCareer,
	primary: boolean
): Promise<InitialCareerSuggestion> {
	const career = ranked.career;
	for (let attempt = 0; attempt < 2; attempt += 1) {
		const upstream = await requestOpenRouter(
			fetcher,
			apiKey,
			JSON.stringify({
				model: initialAssessmentModel,
				reasoning: { enabled: false },
				temperature: 0.2,
				max_tokens: 650,
				messages: [
					{
						role: 'system',
						content: `Viết một đoạn nhận xét tiếng Việt tự nhiên cho bạn về hướng nghề này trong ${primary ? '3-4' : '2-3'} câu ngắn, không vượt 1200 ký tự. Tự chọn cách mở đầu và thứ tự ý, không dùng khuôn chung cho mọi nghề. Dẫn ít nhất hai yếu tố trong evidence bằng tên và điểm dạng số/100, liên hệ chúng với công việc cụ thể. Đây là điểm tự báo cáo, không phải thành tích đã quan sát. Góp ý bằng một hoạt động thử nghề cụ thể từ exploratoryActivity, không chê bai, gắn nhãn hoặc suy ra thiếu năng lực từ một điểm thấp. Giá trị nhóm D là mong muốn về môi trường công việc. Không bịa kinh nghiệm, không dùng phần trăm, không nhắc VR, không lặp câu bảo đảm thành công, không thêm tiêu đề. /no_think`
					},
					{
						role: 'user',
						content: JSON.stringify({
							task: 'describe-career',
							dimensions: request.dimensions,
							career: { id: career.id, name: career.name, description: career.description },
							evidence: ranked.dimensions.slice(0, 4),
							exploratoryActivity: career.activity
						})
					}
				]
			})
		);
		if (!upstream.ok) throw upstream;
		try {
			const completion = await upstream.json();
			const content = completion?.choices?.[0]?.message?.content;
			if (typeof content !== 'string') throw new InvalidCompletionError();
			const description = content
				.replace(/<think>[\s\S]*?<\/think>/gi, '')
				.replace(/\bUser\s+Safety\s*:\s*(?:safe|unsafe)\b/gi, '')
				.trim();
			if (
				!description ||
				description.length > 1200 ||
				!hasCareerDescriptionLength(description, primary)
			)
				throw new InvalidCompletionError();
			const supported = ranked.dimensions.filter(
				(item) =>
					description.toLocaleLowerCase('vi').includes(item.name.toLocaleLowerCase('vi')) &&
					description.includes(`${item.score}/100`)
			);
			if (
				supported.length < 2 ||
				/yếu kém|kém cỏi|không có năng lực|không phù hợp|bảo đảm thành công|đảm bảo thành công/i.test(
					description
				)
			) {
				return {
					id: career.id,
					name: career.name,
					description: careerEvidenceDescription(ranked, primary)
				};
			}
			if (/\bVR\b|\d+\s*%|trọng số/i.test(description)) throw new InvalidCompletionError();
			return { id: career.id, name: career.name, description };
		} catch {
			if (attempt === 1)
				return {
					id: career.id,
					name: career.name,
					description: careerEvidenceDescription(ranked, primary)
				};
		}
	}
	throw new InvalidCompletionError();
}

async function requestCareerSuggestions(
	fetcher: typeof fetch,
	apiKey: string,
	request: InitialAssessmentRequest
): Promise<InitialCareerSuggestion[]> {
	const careers = rankCareerSuggestions(request.dimensions, [], request.career_interests);
	return Promise.all(
		careers.map((career, index) =>
			requestCareerDescription(fetcher, apiKey, request, career, index === 0)
		)
	);
}

async function requestAllPoints(
	fetcher: typeof fetch,
	apiKey: string,
	request: InitialAssessmentRequest
): Promise<Record<StageId, InitialStageInsight>> {
	const points = new Array<string>(pointTasks.length);
	let nextIndex = 0;
	let stopped = false;
	async function worker() {
		while (!stopped && nextIndex < pointTasks.length) {
			const index = nextIndex++;
			try {
				points[index] = await requestPoint(fetcher, apiKey, request, pointTasks[index]);
			} catch (error) {
				stopped = true;
				throw error;
			}
		}
	}
	const settled = await Promise.allSettled(Array.from({ length: 3 }, () => worker()));
	const failure = settled.find((result) => result.status === 'rejected');
	if (failure?.status === 'rejected') throw failure.reason;
	return Object.fromEntries(
		stageIds.map((stage, stageIndex) => [
			stage,
			Object.fromEntries(
				pointFields.map((field, fieldIndex) => [
					field,
					points[stageIndex * pointFields.length + fieldIndex]
				])
			)
		])
	) as Record<StageId, InitialStageInsight>;
}

export const POST: RequestHandler = async ({ request, fetch }) => {
	let body: unknown;
	try {
		body = await request.json();
		validateInitialAssessmentRequest(body);
	} catch (error) {
		const message =
			error instanceof InitialAssessmentError ? error.message : 'Dữ liệu yêu cầu không hợp lệ.';
		return json({ error: message }, { status: 422 });
	}

	if (getInitialAssessmentMode() === 'weighted') return json(calculateInitialAssessment(body));
	if (!env.OPENROUTER_API_KEY) {
		return json({ error: 'Chưa cấu hình khóa OpenRouter trong .env.' }, { status: 503 });
	}

	try {
		const stageInsights: Record<StageId, InitialStageInsight> = await requestAllPoints(
			fetch,
			env.OPENROUTER_API_KEY,
			body
		);
		const careerSuggestions = await requestCareerSuggestions(fetch, env.OPENROUTER_API_KEY, body);
		return json(
			validateInitialAssessmentResponse(
				{
					assessment_id: body.assessment_id,
					results: [],
					stage_insights: stageInsights,
					career_suggestions: careerSuggestions
				},
				body
			)
		);
	} catch (error) {
		if (error instanceof Response) {
			if (error.status === 401 || error.status === 403)
				return json({ error: 'Khóa OpenRouter không hợp lệ.' }, { status: 401 });
			if (error.status === 429) {
				const retryAfter = error.headers.get('retry-after');
				return json(
					{ error: 'OpenRouter đang giới hạn lượt phân tích. Vui lòng thử lại sau ít phút.' },
					{ status: 429, headers: retryAfter ? { 'retry-after': retryAfter } : undefined }
				);
			}
			return json({ error: 'Dịch vụ phân tích DESMAP tạm thời chưa sẵn sàng.' }, { status: 503 });
		}
		if (!(error instanceof InvalidCompletionError) && !(error instanceof InitialAssessmentError))
			return json({ error: 'Không thể kết nối tới OpenRouter.' }, { status: 503 });
		return json({ error: 'OpenRouter trả về kết quả đánh giá không hợp lệ.' }, { status: 502 });
	}
};
