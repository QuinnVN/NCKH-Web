const sentenceSegmenter = new Intl.Segmenter('vi', { granularity: 'sentence' });

export function careerDescriptionSentences(text: string): string[] {
	return [...sentenceSegmenter.segment(text)].map(({ segment }) => segment.trim()).filter(Boolean);
}

export function hasCareerDescriptionLength(text: string, primary: boolean): boolean {
	const count = careerDescriptionSentences(text).length;
	return count >= (primary ? 3 : 2) && count <= (primary ? 4 : 3);
}

// Older saved descriptions may predate the generation limits. Keep complete
// evidence sentences and the closing advice rather than cut a sentence in half.
export function conciseCareerDescription(text: string, primary: boolean): string {
	const sentences = careerDescriptionSentences(text);
	const limit = primary ? 4 : 3;
	if (sentences.length <= limit) return sentences.join(' ');
	const last = sentences.length - 1;
	const priority = (sentence: string) =>
		(sentence.includes('/100') ? 2 : 0) + (/\bVR\b/.test(sentence) ? 1 : 0);
	const selected = sentences
		.slice(0, last)
		.map((sentence, index) => ({ index, priority: priority(sentence) }))
		.sort((a, b) => b.priority - a.priority || a.index - b.index)
		.slice(0, limit - 1)
		.map(({ index }) => index)
		.concat(last)
		.sort((a, b) => a - b);
	return selected.map((index) => sentences[index]).join(' ');
}
