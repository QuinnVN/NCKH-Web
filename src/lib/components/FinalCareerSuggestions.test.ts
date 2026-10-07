import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import FinalCareerSuggestions from './FinalCareerSuggestions.svelte';

const suggestions = [
	{
		id: 'doctor',
		name: 'Bác sĩ',
		compatibilityPercent: 91,
		description: 'Giải thích chi tiết dựa trên kết quả DESMAP và hành vi trong VR.'
	},
	{
		id: 'teacher',
		name: 'Giáo viên',
		compatibilityPercent: 82,
		description: 'Khả năng truyền đạt phù hợp với công việc giảng dạy.'
	},
	{
		id: 'lawyer',
		name: 'Luật sư',
		compatibilityPercent: 76,
		description: 'Tư duy phân tích phù hợp với ngành luật.'
	}
];

describe('final career suggestions', () => {
	it('shortens stored prose while retaining scored evidence, VR and the exploratory step', () => {
		const description =
			'Công việc cần xử lý dữ kiện. Trong bảng hỏi, bạn tự đánh giá phân tích 82.5/100 và truyền đạt 75/100. VR ghi nhận tiêu chí xử lý thông tin 80/100. Có thể đối chiếu thêm với nhiệm vụ khác. Đây là một hướng để cân nhắc. Bạn có thể thử phân tích một tình huống thực tế.';
		const { body } = render(FinalCareerSuggestions, {
			props: {
				suggestions: [
					{ ...suggestions[0], description },
					{ ...suggestions[1], description }
				]
			}
		});
		expect(body).toContain(
			'Công việc cần xử lý dữ kiện. Trong bảng hỏi, bạn tự đánh giá phân tích 82.5/100 và truyền đạt 75/100. VR ghi nhận tiêu chí xử lý thông tin 80/100. Bạn có thể thử phân tích một tình huống thực tế.'
		);
		expect(body).toContain(
			'Trong bảng hỏi, bạn tự đánh giá phân tích 82.5/100 và truyền đạt 75/100. VR ghi nhận tiêu chí xử lý thông tin 80/100. Bạn có thể thử phân tích một tình huống thực tế.'
		);
		expect(body).not.toContain('Có thể đối chiếu thêm với nhiệm vụ khác.');
		expect(body).not.toContain('Đây là một hướng để cân nhắc.');
	});
	it('shows initial suggestions without VR claims or compatibility percentages', () => {
		const initialSuggestions = [
			{ id: 'lawyer', name: 'Luật sư', description: 'Bạn có thể tìm hiểu công việc lập luận.' },
			{ id: 'doctor', name: 'Bác sĩ', description: 'Bạn có thể tìm hiểu công việc chăm sóc.' }
		];
		const { body } = render(FinalCareerSuggestions, {
			props: { suggestions: initialSuggestions, initial: true }
		});
		expect(body).toContain('Chỉ dựa trên kết quả bài test DESMAP');
		expect(body).not.toContain('hành vi quan sát được');
		expect(body).toContain('Nghề nên tìm hiểu trước');
		expect(body).toContain('aria-labelledby="primary-career-lawyer"');
		expect(body).not.toContain('%');
	});
	it('emphasises one recommendation and keeps two alternatives concise', () => {
		const { body } = render(FinalCareerSuggestions, { props: { suggestions } });

		expect(body).toContain('Hướng nên khám phá trước');
		expect(body).toContain('Giải thích chi tiết dựa trên kết quả DESMAP và hành vi trong VR.');
		expect(body).toContain('Hai hướng khác để khám phá');
		expect(body).toContain('Khả năng truyền đạt phù hợp với công việc giảng dạy.');
		expect(body).toContain('Tư duy phân tích phù hợp với ngành luật.');
	});

	it('does not render compatibility percentages or score bars', () => {
		const { body } = render(FinalCareerSuggestions, { props: { suggestions } });

		expect(body).not.toMatch(/91%|82%|76%/);
		expect(body).not.toContain('role="img"');
		expect(body).not.toContain('tương thích');
	});

	it('shows every career when the final assessment contains more than three', () => {
		const extraSuggestions = Array.from({ length: 4 }, (_, index) => ({
			id: `extra-${index}`,
			name: `Nghề thêm ${index + 1}`,
			compatibilityPercent: 70 - index,
			description: `Lý do nghề thêm ${index + 1}.`
		}));
		const { body } = render(FinalCareerSuggestions, {
			props: { suggestions: [...suggestions, ...extraSuggestions] }
		});
		expect(body).toContain('6 hướng khác để khám phá');
		for (const suggestion of extraSuggestions) expect(body).toContain(suggestion.name);
	});

	it('places the highest compatibility career in the primary panel', () => {
		const { body } = render(FinalCareerSuggestions, {
			props: { suggestions: [suggestions[1], suggestions[0], suggestions[2]] }
		});
		expect(body).toContain('aria-labelledby="primary-career-doctor"');
	});
});
