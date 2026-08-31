import { getUserById } from "@/lib/services/user-service";

export type McqRow = {
	id: string;
	name: string;
	question: string;
	created_by_user_id: string;
	created_at: string;
	updated_at: string;
};

export type McqChoiceRow = {
	id: string;
	mcq_id: string;
	choice_text: string;
	is_correct: number;
	position: number;
	created_at: string;
	updated_at: string;
};

export type McqAttemptRow = {
	id: string;
	mcq_id: string;
	mcq_choice_id: string;
	user_id: string;
	is_correct: number;
	created_at: string;
};

export type McqChoiceInput = {
	text: string;
	isCorrect: boolean;
};

export type CreateMcqInput = {
	name: string;
	question: string;
	createdByUserId: string;
	choices: McqChoiceInput[];
};

export type UpdateMcqInput = {
	name: string;
	question: string;
	choices: McqChoiceInput[];
};

export type McqWithChoices = McqRow & {
	choices: McqChoiceRow[];
};

export class InvalidUserError extends Error {
	constructor() {
		super("User not found");
		this.name = "InvalidUserError";
	}
}

export class InvalidChoicesError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "InvalidChoicesError";
	}
}

export class McqNotFoundError extends Error {
	constructor() {
		super("MCQ not found");
		this.name = "McqNotFoundError";
	}
}

export class ChoiceNotFoundError extends Error {
	constructor() {
		super("Choice not found");
		this.name = "ChoiceNotFoundError";
	}
}

function firstResult<T>(results: T[] | undefined): T | null {
	return results?.[0] ?? null;
}

function validateChoices(choices: McqChoiceInput[]): void {
	if (choices.length < 2 || choices.length > 6) {
		throw new InvalidChoicesError("MCQ must have between 2 and 6 choices");
	}

	for (const choice of choices) {
		if (choice.text.trim().length === 0) {
			throw new InvalidChoicesError("Choice text cannot be empty");
		}
	}

	const correctCount = choices.filter((c) => c.isCorrect).length;
	if (correctCount !== 1) {
		throw new InvalidChoicesError("Exactly one choice must be marked correct");
	}
}

async function insertChoices(
	db: D1Database,
	mcqId: string,
	choices: McqChoiceInput[],
): Promise<McqChoiceRow[]> {
	const inserted: McqChoiceRow[] = [];

	for (const [index, choice] of choices.entries()) {
		const result = await db
			.prepare(
				`INSERT INTO mcq_choices (mcq_id, choice_text, is_correct, position)
         VALUES (?1, ?2, ?3, ?4)
         RETURNING *`,
			)
			.bind(mcqId, choice.text.trim(), choice.isCorrect ? 1 : 0, index + 1)
			.all<McqChoiceRow>();

		const row = firstResult(result.results);
		if (!row) {
			throw new Error("Failed to insert choice");
		}
		inserted.push(row);
	}

	return inserted;
}

async function getChoicesForMcq(db: D1Database, mcqId: string): Promise<McqChoiceRow[]> {
	const result = await db
		.prepare("SELECT * FROM mcq_choices WHERE mcq_id = ?1 ORDER BY position ASC")
		.bind(mcqId)
		.all<McqChoiceRow>();

	return result.results ?? [];
}

export async function listMcqs(db: D1Database): Promise<McqRow[]> {
	const result = await db
		.prepare("SELECT * FROM mcqs ORDER BY updated_at DESC")
		.all<McqRow>();

	return result.results ?? [];
}

export async function getMcqById(db: D1Database, id: string): Promise<McqWithChoices | null> {
	const mcqResult = await db
		.prepare("SELECT * FROM mcqs WHERE id = ?1")
		.bind(id)
		.all<McqRow>();

	const mcq = firstResult(mcqResult.results);
	if (!mcq) {
		return null;
	}

	const choices = await getChoicesForMcq(db, id);
	return { ...mcq, choices };
}

export async function createMcq(db: D1Database, input: CreateMcqInput): Promise<McqWithChoices> {
	const user = await getUserById(db, input.createdByUserId);
	if (!user) {
		throw new InvalidUserError();
	}

	validateChoices(input.choices);

	const mcqResult = await db
		.prepare(
			`INSERT INTO mcqs (name, question, created_by_user_id)
       VALUES (?1, ?2, ?3)
       RETURNING *`,
		)
		.bind(input.name.trim(), input.question.trim(), input.createdByUserId)
		.all<McqRow>();

	const mcq = firstResult(mcqResult.results);
	if (!mcq) {
		throw new Error("Failed to create MCQ");
	}

	const choices = await insertChoices(db, mcq.id, input.choices);
	return { ...mcq, choices };
}

export async function updateMcq(
	db: D1Database,
	id: string,
	input: UpdateMcqInput,
): Promise<McqWithChoices | null> {
	validateChoices(input.choices);

	const mcqResult = await db
		.prepare(
			`UPDATE mcqs
       SET name = ?1, question = ?2, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?3
       RETURNING *`,
		)
		.bind(input.name.trim(), input.question.trim(), id)
		.all<McqRow>();

	const mcq = firstResult(mcqResult.results);
	if (!mcq) {
		return null;
	}

	await db.prepare("DELETE FROM mcq_choices WHERE mcq_id = ?1").bind(id).run();
	const choices = await insertChoices(db, id, input.choices);

	return { ...mcq, choices };
}

export async function deleteMcq(db: D1Database, id: string): Promise<boolean> {
	const result = await db.prepare("DELETE FROM mcqs WHERE id = ?1").bind(id).run();
	return result.meta.changes > 0;
}

export async function recordAttempt(
	db: D1Database,
	mcqId: string,
	mcqChoiceId: string,
	userId: string,
): Promise<McqAttemptRow> {
	const mcq = await getMcqById(db, mcqId);
	if (!mcq) {
		throw new McqNotFoundError();
	}

	const user = await getUserById(db, userId);
	if (!user) {
		throw new InvalidUserError();
	}

	const choiceResult = await db
		.prepare("SELECT * FROM mcq_choices WHERE id = ?1")
		.bind(mcqChoiceId)
		.all<McqChoiceRow>();

	const choice = firstResult(choiceResult.results);
	if (!choice || choice.mcq_id !== mcqId) {
		throw new ChoiceNotFoundError();
	}

	const isCorrect = choice.is_correct === 1 ? 1 : 0;

	const attemptResult = await db
		.prepare(
			`INSERT INTO mcq_attempts (mcq_id, mcq_choice_id, user_id, is_correct)
       VALUES (?1, ?2, ?3, ?4)
       RETURNING *`,
		)
		.bind(mcqId, mcqChoiceId, userId, isCorrect)
		.all<McqAttemptRow>();

	const attempt = firstResult(attemptResult.results);
	if (!attempt) {
		throw new Error("Failed to record attempt");
	}

	return attempt;
}
