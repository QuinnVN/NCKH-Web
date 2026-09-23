import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	buildCompletionPayload,
	clearSavedQuestionnaire,
	createAssessmentId,
	createQuestionnairePresentationOrder,
	desmapQuestions,
	parseCompletionPayload,
	QUESTIONNAIRE_COMPLETION_STORAGE_KEY,
	QUESTIONNAIRE_STORAGE_KEY,
	readCompletionPayload,
	readQuestionnaireSessionRoute,
	readSavedQuestionnaire,
	writeCompletionPayload,
	writeSavedQuestionnaire,
	type QuestionnaireDraft
} from './data';

const uuid = '123e4567-e89b-42d3-a456-426614174000';

function completedRecord() {
	return buildCompletionPayload({
		assessmentId: `assessment-${uuid}`,
		answers: Object.fromEntries(
			desmapQuestions.map((question) => [question.id, question.options[0].letter])
		),
		careerInterests: ['science-research'],
		participant: { name: 'Nguyen Van A', email: 'Student@Example.com ' },
		startedAt: '2026-09-12T08:00:00.000Z',
		completedAt: '2026-09-12T08:30:00.000Z'
	});
}

function draftRecord(): QuestionnaireDraft {
	return {
		version: 1,
		completed: false,
		step: 'questions',
		currentIndex: 1,
		startedAt: '2026-09-12T08:00:00.000Z',
		updatedAt: '2026-09-12T08:05:00.000Z',
		participant: { name: 'Nguyen Van A', email: 'student@example.com' },
		careerInterests: ['science-research'],
		answers: { [desmapQuestions[0].id]: 'A' },
		presentationOrder: createQuestionnairePresentationOrder()
	};
}

function mockBrowserStorage() {
	const local = new Map<string, string>();
	const session = new Map<string, string>();
	const storage = (values: Map<string, string>) => ({
		getItem: (key: string) => values.get(key) ?? null,
		setItem: (key: string, value: string) => values.set(key, value),
		removeItem: (key: string) => values.delete(key)
	});
	vi.stubGlobal('window', { localStorage: storage(local), sessionStorage: storage(session) });
	return { local, session };
}

describe('questionnaire draft storage', () => {
	afterEach(() => vi.unstubAllGlobals());

	it('autosaves the draft in local storage and keeps completion in session storage', () => {
		const { local, session } = mockBrowserStorage();
		const draft = draftRecord();

		expect(writeSavedQuestionnaire(draft)).toBe(true);
		expect(readSavedQuestionnaire()).toEqual(draft);
		expect(local.get(QUESTIONNAIRE_STORAGE_KEY)).toBe(JSON.stringify(draft));
		expect(session.has(QUESTIONNAIRE_STORAGE_KEY)).toBe(false);

		expect(writeCompletionPayload(completedRecord())).toBe(true);
		expect(session.has(QUESTIONNAIRE_COMPLETION_STORAGE_KEY)).toBe(true);
		expect(local.has(QUESTIONNAIRE_COMPLETION_STORAGE_KEY)).toBe(false);
	});

	it('moves an existing session draft to local storage', () => {
		const { local, session } = mockBrowserStorage();
		const draft = draftRecord();
		session.set(QUESTIONNAIRE_STORAGE_KEY, JSON.stringify(draft));

		expect(readSavedQuestionnaire()).toEqual(draft);
		expect(local.get(QUESTIONNAIRE_STORAGE_KEY)).toBe(JSON.stringify(draft));
		expect(session.has(QUESTIONNAIRE_STORAGE_KEY)).toBe(false);
	});

	it('clears both current and legacy drafts after completion', () => {
		const { local, session } = mockBrowserStorage();
		const raw = JSON.stringify(draftRecord());
		local.set(QUESTIONNAIRE_STORAGE_KEY, raw);
		session.set(QUESTIONNAIRE_STORAGE_KEY, raw);

		clearSavedQuestionnaire();
		expect(local.has(QUESTIONNAIRE_STORAGE_KEY)).toBe(false);
		expect(session.has(QUESTIONNAIRE_STORAGE_KEY)).toBe(false);
	});
});

describe('completed questionnaire identity', () => {
	afterEach(() => vi.unstubAllGlobals());

	it('creates a schema-safe assessment identifier', () => {
		expect(createAssessmentId(() => uuid)).toBe(`assessment-${uuid}`);
	});

	it('keeps an existing identifier and all score levels', () => {
		const parsed = parseCompletionPayload(completedRecord());
		expect(parsed?.assessmentId).toBe(`assessment-${uuid}`);
		expect(parsed?.participant).toEqual({ name: 'Nguyen Van A', email: 'student@example.com' });
		expect(Object.keys(parsed?.scores.dimensions ?? {})).toHaveLength(35);
		expect(Object.keys(parsed?.scores.groups ?? {})).toHaveLength(28);
		expect(Object.keys(parsed?.scores.stages ?? {})).toHaveLength(6);
	});

	it('upgrades a valid legacy record once without losing questionnaire data', () => {
		const legacy = { ...completedRecord(), assessmentId: undefined };
		const parsed = parseCompletionPayload(legacy, () => `assessment-${uuid}`);
		expect(parsed?.assessmentId).toBe(`assessment-${uuid}`);
		expect(parsed?.answers).toEqual(legacy.answers);
		expect(parsed?.careerInterests).toEqual(legacy.careerInterests);
		expect(parsed?.completedAt).toBe(legacy.completedAt);
	});

	it('rejects corrupted records and malformed identifiers', () => {
		const record = completedRecord();
		expect(parseCompletionPayload({ ...record, answers: {} })).toBeNull();
		expect(parseCompletionPayload({ ...record, careerInterests: ['missing'] })).toBeNull();
		expect(
			parseCompletionPayload({ ...record, participant: { name: '', email: 'bad' } })
		).toBeNull();
		expect(
			parseCompletionPayload(
				{ ...record, assessmentId: 'assessment-not-a-uuid' },
				() => `assessment-${uuid}`
			)
		).toBeNull();
	});

	it('preserves a restored MongoDB submission for the evaluation page', () => {
		const values = new Map<string, string>();
		vi.stubGlobal('window', {
			sessionStorage: {
				getItem: (key: string) => values.get(key) ?? null,
				setItem: (key: string, value: string) => values.set(key, value)
			}
		});

		const submission = completedRecord();
		expect(writeCompletionPayload(submission)).toBe(true);
		expect(readCompletionPayload()).toEqual(submission);
	});

	it('keeps a logged-in participant on their evaluation route for the tab session', () => {
		const values = new Map<string, string>();
		vi.stubGlobal('window', {
			sessionStorage: {
				getItem: (key: string) => values.get(key) ?? null,
				setItem: (key: string, value: string) => values.set(key, value)
			}
		});

		expect(writeCompletionPayload(completedRecord())).toBe(true);
		expect(readQuestionnaireSessionRoute()).toBe('/evaluation');
	});
});
