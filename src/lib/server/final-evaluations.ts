import type { Document } from 'mongodb';
import type { QuestionnaireSubmission, StageId } from '$lib/questionnaire';
import {
	behaviourComparisonIconIds,
	type BehaviourComparisonFinding,
	type BehaviourComparisonKind,
	type FinalAssessment,
	type FinalCareerSuggestion,
	type FinalUserEvaluation
} from '$lib/evaluation';
import {
	dimensionLevelIds,
	finalDimensionDefinitions,
	type DimensionLevelId
} from '$lib/evaluation/final-dimension-content';
import { getMongoDatabase } from './mongodb';

const stages: StageId[] = ['D', 'E', 'S', 'M', 'A', 'P'];
const findingKinds: BehaviourComparisonKind[] = ['confirmed', 'emerging', 'development'];

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
	return typeof value === 'string' && value.trim().length > 0;
}

function normalizeParticipantName(name: string): string {
	return name.trim().replace(/\s+/g, ' ').toLocaleLowerCase('vi');
}

function parseStageAssessments(value: unknown): Record<StageId, string> | null {
	if (!isRecord(value)) return null;
	const result = {} as Record<StageId, string>;
	for (const stage of stages) {
		if (!isNonEmptyString(value[stage])) return null;
		result[stage] = value[stage];
	}
	return result;
}

function parseDimensionLevels(value: unknown): Record<string, DimensionLevelId> | null {
	if (!isRecord(value)) return null;
	const validLevels = new Set<string>(dimensionLevelIds);
	const result: Record<string, DimensionLevelId> = {};
	for (const dimension of finalDimensionDefinitions) {
		const level = value[dimension.id];
		if (typeof level !== 'string' || !validLevels.has(level)) return null;
		result[dimension.id] = level as DimensionLevelId;
	}
	return result;
}

function parseBehaviourComparison(value: unknown): FinalAssessment['behaviourComparison'] | null {
	if (!isRecord(value) || !isNonEmptyString(value.experienceName) || !Array.isArray(value.findings))
		return null;
	const findings: BehaviourComparisonFinding[] = [];
	const ids = new Set<string>();
	for (const finding of value.findings) {
		if (
			!isRecord(finding) ||
			!isNonEmptyString(finding.id) ||
			ids.has(finding.id) ||
			!findingKinds.includes(finding.kind as BehaviourComparisonKind) ||
			!isNonEmptyString(finding.title) ||
			!isNonEmptyString(finding.questionnaireResult) ||
			!isNonEmptyString(finding.vrEvidence) ||
			!isNonEmptyString(finding.summary)
		)
			return null;
		ids.add(finding.id);
		const icon = behaviourComparisonIconIds.find((id) => id === finding.icon);
		findings.push({
			id: finding.id,
			kind: finding.kind as BehaviourComparisonKind,
			...(icon ? { icon } : {}),
			title: finding.title,
			questionnaireResult: finding.questionnaireResult,
			vrEvidence: finding.vrEvidence,
			...(finding.kind !== 'confirmed' && isNonEmptyString(finding.remedy)
				? { remedy: finding.remedy.trim() }
				: {}),
			summary: finding.summary
		});
	}
	return { experienceName: value.experienceName, findings };
}

function parseCareerSuggestions(value: unknown): FinalCareerSuggestion[] | null {
	if (!Array.isArray(value) || value.length < 1) return null;
	const suggestions: FinalCareerSuggestion[] = [];
	const ids = new Set<string>();
	for (const suggestion of value) {
		if (
			!isRecord(suggestion) ||
			!isNonEmptyString(suggestion.id) ||
			ids.has(suggestion.id) ||
			!isNonEmptyString(suggestion.name) ||
			!Number.isInteger(suggestion.compatibilityPercent) ||
			(suggestion.compatibilityPercent as number) < 0 ||
			(suggestion.compatibilityPercent as number) > 100 ||
			!isNonEmptyString(suggestion.description)
		)
			return null;
		ids.add(suggestion.id);
		suggestions.push({
			id: suggestion.id,
			name: suggestion.name,
			compatibilityPercent: suggestion.compatibilityPercent as number,
			description: suggestion.description
		});
	}
	return suggestions;
}

function parseFinalUserEvaluation(value: unknown): FinalUserEvaluation | null {
	if (!isRecord(value)) return null;
	const fields = [
		'experienceName',
		'headline',
		'workStyle',
		'benefit',
		'challenge',
		'improvement',
		'strengthLabel',
		'developmentLabel',
		'evidence'
	] as const;
	if (fields.some((field) => !isNonEmptyString(value[field]))) return null;
	return Object.fromEntries(fields.map((field) => [field, value[field]])) as FinalUserEvaluation;
}

export function parseStoredFinalEvaluation(
	value: unknown,
	submission: Pick<QuestionnaireSubmission, 'assessmentId' | 'participant'>
): FinalAssessment | null {
	if (
		!isRecord(value) ||
		value.version !== 1 ||
		!isNonEmptyString(value.participantName) ||
		!isNonEmptyString(value.participantEmail) ||
		value.participantEmail.trim().toLocaleLowerCase() !== submission.participant.email ||
		normalizeParticipantName(value.participantName) !==
			normalizeParticipantName(submission.participant.name) ||
		(typeof value.assessmentId === 'string' && value.assessmentId !== submission.assessmentId) ||
		!isNonEmptyString(value.completedAt) ||
		Number.isNaN(Date.parse(value.completedAt))
	)
		return null;

	const stageAssessments = parseStageAssessments(value.stageAssessments);
	const dimensionLevels = parseDimensionLevels(value.dimensionLevels);
	const behaviourComparison = parseBehaviourComparison(value.behaviourComparison);
	const careerSuggestions = parseCareerSuggestions(value.careerSuggestions);
	const finalEvaluation = parseFinalUserEvaluation(value.finalEvaluation);
	if (
		!stageAssessments ||
		!dimensionLevels ||
		!behaviourComparison ||
		!careerSuggestions ||
		!finalEvaluation
	)
		return null;

	return {
		version: 1,
		assessmentId: submission.assessmentId,
		completedAt: value.completedAt,
		stageAssessments,
		dimensionLevels,
		behaviourComparison,
		careerSuggestions,
		finalEvaluation
	};
}

export async function findFinalEvaluation(
	submission: Pick<QuestionnaireSubmission, 'assessmentId' | 'participant'>
): Promise<FinalAssessment | null> {
	const collection = (await getMongoDatabase()).collection<Document>('final_evaluations');
	const documents = await collection
		.find({ participantEmail: submission.participant.email })
		.sort({ completedAt: -1 })
		.limit(10)
		.toArray();
	for (const document of documents) {
		const result = parseStoredFinalEvaluation(document, submission);
		if (result) return result;
	}
	return null;
}
