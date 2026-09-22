import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import { placeholderFinalEvaluation } from '$lib/evaluation';
import FinalUserEvaluation from './FinalUserEvaluation.svelte';

describe('final user evaluation', () => {
	it('answers the four questions required by the final evaluation format', () => {
		const { body } = render(FinalUserEvaluation, {
			props: { evaluation: placeholderFinalEvaluation }
		});

		expect(body).toContain('Cách bạn thường làm việc');
		expect(body).toContain('Điều hỗ trợ bạn');
		expect(body).toContain('Điểm dễ vướng');
		expect(body).toContain('Việc nên thử tiếp theo');
		expect(body).toContain(placeholderFinalEvaluation.evidence);
	});

	it('marks placeholder content so it cannot be mistaken for a stored result', () => {
		const { body } = render(FinalUserEvaluation, {
			props: { evaluation: placeholderFinalEvaluation }
		});

		expect(body).toContain('Dữ liệu minh họa');
	});
});
