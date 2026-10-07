import { beforeEach, describe, expect, it, vi } from 'vitest';

const database = vi.hoisted(() => {
	const updateOne = vi.fn();
	const createIndex = vi.fn().mockResolvedValue(undefined);
	const collection = vi.fn(() => ({ updateOne, createIndex }));
	return { updateOne, createIndex, collection };
});
vi.mock('./mongodb', () => ({
	getMongoDatabase: async () => ({ collection: database.collection })
}));

import { saveInitialEvaluation } from './questionnaire-submissions';

describe('initial evaluation MongoDB document', () => {
	beforeEach(() => {
		database.updateOne.mockReset();
		database.updateOne.mockResolvedValue({ matchedCount: 1 });
	});

	it('embeds AI insights and suggestions in the matching questionnaire document', async () => {
		const stageInsights = Object.fromEntries(
			(['D', 'E', 'S', 'M', 'A', 'P'] as const).map((stage) => [
				stage,
				{ assessment: stage, strength: stage, weakness: stage }
			])
		) as Parameters<typeof saveInitialEvaluation>[1];
		const careerSuggestions = [{ id: 'doctor', name: 'Bác sĩ', description: 'Gợi ý từ DESMAP.' }];
		const saved = await saveInitialEvaluation('assessment-123', stageInsights, careerSuggestions);
		expect(saved).toBe(true);
		expect(database.collection).toHaveBeenCalledWith('questionnaire_submissions');
		expect(database.updateOne).toHaveBeenCalledWith(
			{ assessmentId: 'assessment-123' },
			{
				$set: {
					initialEvaluation: {
						version: 1,
						stageInsights,
						careerSuggestions,
						savedAt: expect.any(Date)
					},
					updatedAt: expect.any(Date)
				}
			}
		);
	});
});
