import { MongoServerError, type Collection } from 'mongodb';
import type { QuestionnaireSubmission } from '$lib/questionnaire';
import { getMongoDatabase } from './mongodb';

type StoredQuestionnaireSubmission = QuestionnaireSubmission & {
	normalizedEmail: string;
	syncStatus: 'synced';
	createdAt: Date;
	updatedAt: Date;
};

let collectionPromise: Promise<Collection<StoredQuestionnaireSubmission>> | undefined;

async function getCollection(): Promise<Collection<StoredQuestionnaireSubmission>> {
	collectionPromise ??= (async () => {
		const collection = (await getMongoDatabase()).collection<StoredQuestionnaireSubmission>(
			'questionnaire_submissions'
		);
		await Promise.all([
			collection.createIndex({ normalizedEmail: 1 }, { unique: true }),
			collection.createIndex({ assessmentId: 1 }, { unique: true })
		]);
		return collection;
	})();
	try {
		return await collectionPromise;
	} catch (error) {
		collectionPromise = undefined;
		throw error;
	}
}

export async function emailHasAssessment(normalizedEmail: string): Promise<boolean> {
	const collection = await getCollection();
	return Boolean(await collection.findOne({ normalizedEmail }, { projection: { _id: 1 } }));
}

function normalizeParticipantName(name: string): string {
	return name.trim().replace(/\s+/g, ' ').toLocaleLowerCase('vi');
}

function toQuestionnaireSubmission(
	submission: StoredQuestionnaireSubmission
): QuestionnaireSubmission {
	return {
		version: submission.version,
		completed: submission.completed,
		assessmentId: submission.assessmentId,
		startedAt: submission.startedAt,
		completedAt: submission.completedAt,
		participant: submission.participant,
		careerInterests: submission.careerInterests,
		answers: submission.answers,
		scores: submission.scores
	};
}

export async function findQuestionnaireSubmission(
	name: string,
	normalizedEmail: string
): Promise<QuestionnaireSubmission | null> {
	const collection = await getCollection();
	const submission = await collection.findOne({ normalizedEmail });
	if (
		!submission ||
		normalizeParticipantName(submission.participant.name) !== normalizeParticipantName(name)
	) {
		return null;
	}

	return toQuestionnaireSubmission(submission);
}

export async function findQuestionnaireSubmissionByAssessmentId(
	assessmentId: string
): Promise<QuestionnaireSubmission | null> {
	const collection = await getCollection();
	const submission = await collection.findOne({ assessmentId });
	return submission ? toQuestionnaireSubmission(submission) : null;
}

export async function saveQuestionnaireSubmission(
	payload: QuestionnaireSubmission
): Promise<'created' | 'updated' | 'conflict'> {
	const collection = await getCollection();
	const normalizedEmail = payload.participant.email;
	const existing = await collection.findOne({ normalizedEmail });
	if (existing) {
		if (existing.assessmentId !== payload.assessmentId) return 'conflict';
		await collection.updateOne(
			{ _id: existing._id },
			{ $set: { ...payload, normalizedEmail, syncStatus: 'synced', updatedAt: new Date() } }
		);
		return 'updated';
	}

	const now = new Date();
	try {
		await collection.insertOne({
			...payload,
			normalizedEmail,
			syncStatus: 'synced',
			createdAt: now,
			updatedAt: now
		});
		return 'created';
	} catch (error) {
		if (!(error instanceof MongoServerError) || error.code !== 11000) throw error;
		const raced = await collection.findOne({ normalizedEmail });
		if (raced?.assessmentId === payload.assessmentId) return 'updated';
		return 'conflict';
	}
}
