import { z } from "zod";

const mcqChoiceSchema = z.object({
	text: z.string().trim().min(1),
	isCorrect: z.boolean(),
});

const mcqChoicesArraySchema = z
	.array(mcqChoiceSchema)
	.min(2, "MCQ must have at least 2 choices")
	.max(6, "MCQ must have at most 6 choices")
	.refine((choices) => choices.filter((choice) => choice.isCorrect).length === 1, {
		message: "Exactly one choice must be marked correct",
	});

export const createMcqSchema = z
	.object({
		name: z.string().trim().min(1),
		question: z.string().trim().min(1),
		createdByUserId: z.string().min(1),
		choices: mcqChoicesArraySchema,
	})
	.strict();

export const updateMcqSchema = z
	.object({
		name: z.string().trim().min(1),
		question: z.string().trim().min(1),
		choices: mcqChoicesArraySchema,
	})
	.strict();

export const recordAttemptSchema = z
	.object({
		mcqChoiceId: z.string().min(1),
		userId: z.string().min(1),
	})
	.strict();

export type CreateMcqBody = z.infer<typeof createMcqSchema>;
export type UpdateMcqBody = z.infer<typeof updateMcqSchema>;
export type RecordAttemptBody = z.infer<typeof recordAttemptSchema>;
