import type { RequestEvent } from '@sveltejs/kit';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	rankCareerSuggestions,
	careerEvidenceDescription,
	hasCareerDescriptionLength,
	buildInitialAssessmentRequest,
	calculateInitialAssessment
} from '$lib/assessment';
import { buildCompletionPayload, desmapQuestions } from '$lib/questionnaire';

const mode = vi.hoisted(() => vi.fn(() => 'ai' as 'ai' | 'weighted'));
const privateEnv = vi.hoisted(() => ({ OPENROUTER_API_KEY: 'test-key' }));
vi.mock('$env/dynamic/private', () => ({ env: privateEnv }));
vi.mock('$lib/server/initial-assessment-mode', () => ({ getInitialAssessmentMode: mode }));

import { POST } from './+server';

const stageIds = ['D', 'E', 'S', 'M', 'A', 'P'];
const fields = ['assessment', 'strength', 'weakness'];
const payload = buildCompletionPayload({
	assessmentId: 'assessment-123e4567-e89b-42d3-a456-426614174000',
	answers: Object.fromEntries(
		desmapQuestions.map((question) => [question.id, question.options[0].letter])
	),
	careerInterests: ['science-research'],
	participant: { name: 'Nguyen Van A', email: 'student@example.com' },
	startedAt: '2026-09-12T08:00:00.000Z'
});
const requestBody = buildInitialAssessmentRequest(payload);

function event(body: string, fetcher: typeof fetch): RequestEvent {
	return {
		request: new Request('http://localhost/api/ai/initial-career-assessment', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body
		}),
		fetch: fetcher
	} as unknown as RequestEvent;
}

function completion(content: string): Response {
	return new Response(JSON.stringify({ choices: [{ message: { content } }] }), {
		status: 200,
		headers: { 'content-type': 'application/json' }
	});
}

function pointFromRequest(options: RequestInit | undefined): { stage: string; field: string } {
	const sent = JSON.parse(String(options?.body));
	return JSON.parse(sent.messages[1].content);
}

function contentForRequest(options: RequestInit | undefined): string {
	const input = pointFromRequest(options) as {
		stage?: string;
		field?: string;
		task?: string;
		career?: { id: string };
	};
	if (input.task === 'rank-careers') return 'lawyer,doctor,teacher';
	if (input.task === 'describe-career') {
		const ranked = rankCareerSuggestions(requestBody.dimensions, [], requestBody.career_interests);
		const index = ranked.findIndex((item) => item.career.id === input.career?.id);
		return careerEvidenceDescription(ranked[index], index === 0);
	}
	return `Nội dung ${input.stage} ${input.field}.`;
}

function successfulFetcher() {
	return vi.fn<typeof fetch>().mockImplementation(async (_url, options) => {
		return completion(`  ${contentForRequest(options)}  `);
	});
}

describe('initial DESMAP analysis proxy', () => {
	beforeEach(() => {
		privateEnv.OPENROUTER_API_KEY = 'test-key';
	});

	afterEach(() => {
		mode.mockReturnValue('ai');
	});

	it('rejects malformed browser input before contacting OpenRouter', async () => {
		const fetcher = vi.fn<typeof fetch>();
		const response = await POST(event('{}', fetcher));
		expect(response.status).toBe(422);
		expect(fetcher).not.toHaveBeenCalled();
	});

	it('recovers from the observed long-career and safety-model 502 sequence', async () => {
		const fetcher = successfulFetcher().mockImplementation(async (_url, options) => {
			const sent = JSON.parse(String(options?.body));
			const input = pointFromRequest(options) as { task?: string; career?: { id: string } };
			if (input.task === 'describe-career' && input.career?.id === 'chuyen-vien-logistics') {
				if (sent.models?.includes('qwen/qwen3.7-flash'))
					return completion('Một nhận xét dài. '.repeat(90));
				if (sent.models?.includes('openrouter/free')) return completion('User Safety: safe');
			}
			return completion(contentForRequest(options));
		});
		const response = await POST(event(JSON.stringify(requestBody), fetcher));
		expect(response.status).toBe(200);
		expect((await response.json()).career_suggestions).toHaveLength(3);
	});
	it('retries excessive sentence counts and returns concise grounded career descriptions', async () => {
		const fetcher = successfulFetcher().mockImplementation(async (_url, options) => {
			const input = pointFromRequest(options) as { task?: string };
			return completion(
				input.task === 'describe-career' ? 'Nhận xét ngắn. '.repeat(6) : contentForRequest(options)
			);
		});
		const response = await POST(event(JSON.stringify(requestBody), fetcher));
		expect(response.status).toBe(200);
		const result = await response.json();
		result.career_suggestions.forEach((career: { description: string }, index: number) => {
			expect(hasCareerDescriptionLength(career.description, index === 0)).toBe(true);
			expect(career.description).toContain('/100');
		});
		const requests = fetcher.mock.calls
			.map(([, options]) => JSON.parse(String(options?.body)))
			.filter((sent) => JSON.parse(sent.messages[1].content).task === 'describe-career');
		expect(requests).toHaveLength(6);
		const top = rankCareerSuggestions(requestBody.dimensions, [], requestBody.career_interests)[0]
			.career.id;
		for (const sent of requests) {
			const input = JSON.parse(sent.messages[1].content);
			expect(sent.messages[0].content).toContain(input.career.id === top ? '3-4' : '2-3');
		}
	});

	it('keeps the complete assessment when a career answer remains over the character limit', async () => {
		const fetcher = successfulFetcher().mockImplementation(async (_url, options) => {
			const input = pointFromRequest(options) as { task?: string };
			return completion(
				input.task === 'describe-career' ? 'Nhận xét dài. '.repeat(110) : contentForRequest(options)
			);
		});
		const response = await POST(event(JSON.stringify(requestBody), fetcher));
		expect(response.status).toBe(200);
		const result = await response.json();
		expect(Object.keys(result.stage_insights)).toHaveLength(6);
		expect(result.career_suggestions).toEqual(
			rankCareerSuggestions(requestBody.dimensions, [], requestBody.career_interests).map(
				(item, index) => ({
					id: item.career.id,
					name: item.career.name,
					description: careerEvidenceDescription(item, index === 0)
				})
			)
		);
	});

	it('ranks the expanded catalog in code and gives AI evidence only for selected careers', async () => {
		const fetcher = successfulFetcher();
		const response = await POST(event(JSON.stringify(requestBody), fetcher));
		expect(response.status).toBe(200);
		const result = await response.json();
		const ranked = rankCareerSuggestions(requestBody.dimensions, [], requestBody.career_interests);
		expect(result.career_suggestions.map(({ id }: { id: string }) => id)).toEqual(
			ranked.map((item) => item.career.id)
		);
		expect(result.results).toEqual([]);
		const calls = fetcher.mock.calls
			.map(([, options]) => JSON.parse(String(options?.body)))
			.filter((sent) => JSON.parse(sent.messages[1].content).task === 'describe-career');
		expect(calls).toHaveLength(3);
		for (const sent of calls) {
			const input = JSON.parse(sent.messages[1].content);
			expect(input.dimensions).toHaveLength(28);
			expect(input.evidence.length).toBeGreaterThanOrEqual(2);
			expect(input.exploratoryActivity).toBeTruthy();
			expect(sent.messages[0].content).toContain('không dùng khuôn chung');
			expect(sent.messages[1].content).not.toContain('student@example.com');
		}
	});

	it('replaces unsupported or negative career prose with grounded constructive evidence', async () => {
		const fetcher = successfulFetcher().mockImplementation(async (_url, options) => {
			const input = pointFromRequest(options) as { task?: string };
			return completion(
				input.task === 'describe-career'
					? 'Bạn yếu kém nên không phù hợp công việc này.'
					: contentForRequest(options)
			);
		});
		const response = await POST(event(JSON.stringify(requestBody), fetcher));
		expect(response.status).toBe(200);
		const result = await response.json();
		expect(result.career_suggestions).toEqual(
			rankCareerSuggestions(requestBody.dimensions, [], requestBody.career_interests).map(
				(item, index) => ({
					id: item.career.id,
					name: item.career.name,
					description: careerEvidenceDescription(item, index === 0)
				})
			)
		);
		expect(JSON.stringify(result.career_suggestions)).not.toMatch(/yếu kém|không phù hợp/);
	});

	it('requests each needed point as plain text and assembles the six groups in code', async () => {
		const fetcher = successfulFetcher();
		const response = await POST(event(JSON.stringify(requestBody), fetcher));
		expect(response.status).toBe(200);
		expect(fetcher).toHaveBeenCalledTimes(21);
		const result = await response.json();
		expect(result).toEqual({
			assessment_id: requestBody.assessment_id,
			results: [],
			stage_insights: Object.fromEntries(
				stageIds.map((stage) => [
					stage,
					Object.fromEntries(fields.map((field) => [field, `Nội dung ${stage} ${field}.`]))
				])
			),
			career_suggestions: rankCareerSuggestions(
				requestBody.dimensions,
				[],
				requestBody.career_interests
			).map((item, index) => ({
				id: item.career.id,
				name: item.career.name,
				description: careerEvidenceDescription(item, index === 0)
			}))
		});
		const requests = fetcher.mock.calls.flatMap(([, options]) => {
			const { stage, field, dimensions } = pointFromRequest(options) as {
				stage?: string;
				field?: string;
				dimensions?: { id: string }[];
			};
			if (!stage || !field || !dimensions) return [];
			expect(dimensions.every((dimension) => dimension.id.startsWith(stage))).toBe(true);
			return [{ stage, field }];
		});
		expect(requests).toEqual(
			expect.arrayContaining(stageIds.flatMap((stage) => fields.map((field) => ({ stage, field }))))
		);
		for (const [, options] of fetcher.mock.calls) {
			const sent = JSON.parse(String(options?.body));
			expect(sent.model).toBe('deepseek/deepseek-v4.1-flash');
			expect(sent.models).toBeUndefined();
			expect(sent.reasoning).toEqual({ enabled: false });
			expect(sent.response_format).toBeUndefined();
			expect(sent.messages[0].content).toContain('/no_think');
			expect(sent.messages[1].content).not.toContain('student@example.com');
		}
	});

	it('limits simultaneous point requests to three', async () => {
		let release!: () => void;
		const gate = new Promise<void>((resolve) => {
			release = resolve;
		});
		const fetcher = vi.fn<typeof fetch>().mockImplementation(async (_url, options) => {
			await gate;
			return completion(contentForRequest(options));
		});
		const pending = POST(event(JSON.stringify(requestBody), fetcher));
		try {
			await vi.waitFor(() => expect(fetcher).toHaveBeenCalledTimes(3));
		} finally {
			release();
		}
		expect((await pending).status).toBe(200);
		expect(fetcher).toHaveBeenCalledTimes(21);
	});

	it('uses the weighted test mode without contacting OpenRouter', async () => {
		mode.mockReturnValue('weighted');
		const fetcher = vi.fn<typeof fetch>();
		const response = await POST(event(JSON.stringify(requestBody), fetcher));
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual(calculateInitialAssessment(requestBody));
		expect(fetcher).not.toHaveBeenCalled();
	});

	it('reports a missing private key', async () => {
		privateEnv.OPENROUTER_API_KEY = '';
		const fetcher = vi.fn<typeof fetch>();
		const response = await POST(event(JSON.stringify(requestBody), fetcher));
		expect(response.status).toBe(503);
		expect(fetcher).not.toHaveBeenCalled();
	});

	it('rejects an empty point without exposing partial results', async () => {
		const fetcher = successfulFetcher().mockImplementation(async (_url, options) => {
			const { stage, field } = pointFromRequest(options);
			return completion(
				stage === 'D' && field === 'assessment' ? '   ' : contentForRequest(options)
			);
		});
		const response = await POST(event(JSON.stringify(requestBody), fetcher));
		expect(response.status).toBe(502);
		expect(await response.json()).toEqual({
			error: 'OpenRouter trả về kết quả đánh giá không hợp lệ.'
		});
	});

	it('keeps at most three short sentences from a long model answer', async () => {
		const fetcher = successfulFetcher().mockImplementation(async (_url, options) => {
			const { stage, field } = pointFromRequest(options);
			return completion(
				stage === 'D' && field === 'assessment'
					? 'Câu thứ nhất ngắn. Câu thứ hai ngắn. Câu thứ ba ngắn. Câu thứ tư không hiển thị. Câu thứ năm không hiển thị.'
					: stage === 'D' && field === 'strength'
						? `Bạn ${'có điểm nổi bật '.repeat(40)}`
						: contentForRequest(options)
			);
		});
		const response = await POST(event(JSON.stringify(requestBody), fetcher));
		expect(response.status).toBe(200);
		const result = await response.json();
		expect(result.stage_insights.D.assessment).toBe(
			'Câu thứ nhất ngắn. Câu thứ hai ngắn. Câu thứ ba ngắn.'
		);
		expect(result.stage_insights.D.strength.length).toBeLessThanOrEqual(380);
		expect(result.stage_insights.D.strength).toMatch(/…$/);
	});

	it('strips a safety label from an otherwise useful answer', async () => {
		const fetcher = successfulFetcher().mockImplementation(async (_url, options) => {
			const { stage, field } = pointFromRequest(options);
			return completion(
				stage === 'D' && field === 'strength'
					? 'User Safety: Safe\nBạn có thể xác định điều mình coi trọng.'
					: contentForRequest(options)
			);
		});
		const response = await POST(event(JSON.stringify(requestBody), fetcher));
		expect(response.status).toBe(200);
		const result = await response.json();
		expect(result.stage_insights.D.strength).toBe('Bạn có thể xác định điều mình coi trọng.');
		expect(JSON.stringify(result)).not.toMatch(/User Safety/i);
	});

	it('retries a safety-only answer with DeepSeek before displaying results', async () => {
		let safetyReturned = false;
		const fetcher = successfulFetcher().mockImplementation(async (_url, options) => {
			const { stage, field } = pointFromRequest(options);
			if (!safetyReturned && stage === 'D' && field === 'strength') {
				safetyReturned = true;
				return completion('User Safety: safe');
			}
			return completion(contentForRequest(options));
		});
		const response = await POST(event(JSON.stringify(requestBody), fetcher));
		expect(response.status).toBe(200);
		const result = await response.json();
		expect(result.stage_insights.D.strength).toBe('Nội dung D strength.');
		expect(fetcher).toHaveBeenCalledTimes(22);
		const retried = fetcher.mock.calls.filter(
			([, options]) =>
				pointFromRequest(options).stage === 'D' && pointFromRequest(options).field === 'strength'
		);
		expect(JSON.parse(String(retried[1][1]?.body)).model).toBe('deepseek/deepseek-v4.1-flash');
		expect(JSON.parse(String(retried[1][1]?.body)).models).toBeUndefined();
		expect(JSON.stringify(result)).not.toMatch(/User Safety/i);
	});

	it('rejects repeated safety-only answers without exposing the label', async () => {
		const fetcher = successfulFetcher().mockImplementation(async (_url, options) => {
			const { stage, field } = pointFromRequest(options);
			return completion(
				stage === 'D' && field === 'strength' ? 'User Safety: Safe' : contentForRequest(options)
			);
		});
		const response = await POST(event(JSON.stringify(requestBody), fetcher));
		expect(response.status).toBe(502);
		expect(JSON.stringify(await response.json())).not.toMatch(/User Safety/i);
	});

	it('retries a temporary rate limit once for a point', async () => {
		let limited = false;
		const fetcher = vi.fn<typeof fetch>().mockImplementation(async (_url, options) => {
			const { stage, field } = pointFromRequest(options);
			if (!limited && stage === 'D' && field === 'assessment') {
				limited = true;
				return new Response('{}', { status: 429, headers: { 'retry-after': '0' } });
			}
			return completion(contentForRequest(options));
		});
		const response = await POST(event(JSON.stringify(requestBody), fetcher));
		expect(response.status).toBe(200);
		expect(fetcher).toHaveBeenCalledTimes(22);
	});

	it('preserves a persistent 429 without exposing upstream details', async () => {
		const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
			new Response(JSON.stringify({ detail: 'internal error' }), {
				status: 429,
				headers: { 'retry-after': '0' }
			})
		);
		const response = await POST(event(JSON.stringify(requestBody), fetcher));
		expect(response.status).toBe(429);
		expect(JSON.stringify(await response.json())).not.toContain('internal error');
	});

	it('does not retry beyond the provider retry window', async () => {
		const fetcher = vi
			.fn<typeof fetch>()
			.mockResolvedValue(new Response('{}', { status: 429, headers: { 'retry-after': '60' } }));
		const response = await POST(event(JSON.stringify(requestBody), fetcher));
		expect(response.status).toBe(429);
		expect(response.headers.get('retry-after')).toBe('60');
		expect(fetcher).toHaveBeenCalledTimes(3);
	});
});
