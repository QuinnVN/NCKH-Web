import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import { buildCompletionPayload, desmapQuestions } from '$lib/questionnaire';
import FinalDesmapRadar from './FinalDesmapRadar.svelte';

const scores = buildCompletionPayload({
	assessmentId: 'assessment-123e4567-e89b-42d3-a456-426614174000',
	answers: Object.fromEntries(
		desmapQuestions.map((question) => [question.id, question.options[0].letter])
	),
	careerInterests: ['science-research'],
	participant: { name: 'Nguyen Van A', email: 'student@example.com' },
	startedAt: '2026-09-12T08:00:00.000Z'
}).scores;

describe('DESMAP radar', () => {
	it('shows initial AI insights instead of final placeholder text', () => {
		const { body } = render(FinalDesmapRadar, {
			props: {
				scores,
				initial: true,
				insights: {
					D: {
						assessment: 'Nhận định dựa trên điểm nhóm D.',
						strength: 'Điểm mạnh theo điểm nhóm D.',
						weakness: 'Điểm cần phát triển theo điểm nhóm D.'
					}
				}
			}
		});
		expect(body).toContain('Nhận định dựa trên điểm nhóm D.');
		expect(body).toContain('Điểm mạnh theo điểm nhóm D.');
		expect(body).toContain('Điểm cần phát triển theo điểm nhóm D.');
		expect(body).not.toContain('Nội dung đánh giá của AI về mong muốn nghề nghiệp');
	});

	it('keeps final assessment text when no initial insights are supplied', () => {
		const { body } = render(FinalDesmapRadar, {
			props: { scores, assessments: { D: 'Nhận định từ đánh giá cuối cùng.' } }
		});
		expect(body).toContain('Nhận định từ đánh giá cuối cùng.');
	});
});
