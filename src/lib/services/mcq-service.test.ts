import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	ChoiceNotFoundError,
	createMcq,
	deleteMcq,
	getMcqById,
	InvalidChoicesError,
	InvalidUserError,
	listMcqs,
	McqNotFoundError,
	recordAttempt,
	updateMcq,
	type McqChoiceRow,
	type McqRow,
} from "@/lib/services/mcq-service";
import { getUserById, type User } from "@/lib/services/user-service";

vi.mock("@/lib/services/user-service", () => ({
	getUserById: vi.fn(),
}));

const sampleUser: User = {
	id: "user-1",
	first_name: "Jane",
	last_name: "Smith",
	username: "jsmith",
	email: "jsmith@school.edu",
	password_hash: "a".repeat(64),
	created_at: "2026-08-25 00:00:00",
};

const sampleMcq: McqRow = {
	id: "mcq-1",
	name: "Biology Quiz",
	question: "Which organelle performs photosynthesis?",
	created_by_user_id: "user-1",
	created_at: "2026-08-31 10:00:00",
	updated_at: "2026-08-31 10:00:00",
};

const sampleChoices: McqChoiceRow[] = [
	{
		id: "choice-1",
		mcq_id: "mcq-1",
		choice_text: "Mitochondria",
		is_correct: 0,
		position: 1,
		created_at: "2026-08-31 10:00:00",
		updated_at: "2026-08-31 10:00:00",
	},
	{
		id: "choice-2",
		mcq_id: "mcq-1",
		choice_text: "Chloroplast",
		is_correct: 1,
		position: 2,
		created_at: "2026-08-31 10:00:00",
		updated_at: "2026-08-31 10:00:00",
	},
];

type MockDbState = {
	mcqs: McqRow[];
	choices: McqChoiceRow[];
	attempts: Array<{
		id: string;
		mcq_id: string;
		mcq_choice_id: string;
		user_id: string;
		is_correct: number;
		created_at: string;
	}>;
};

let idCounter = 0;
function nextId(prefix: string): string {
	idCounter += 1;
	return `${prefix}-${idCounter}`;
}

function handleAllQuery(sql: string, args: unknown[], state: MockDbState) {
	const normalized = sql.replace(/\s+/g, " ").trim().toLowerCase();

					if (normalized.includes("select * from mcqs order by updated_at desc")) {
						const sorted = [...state.mcqs].sort((a, b) =>
							b.updated_at.localeCompare(a.updated_at),
						);
						return { results: sorted };
					}

					if (
						normalized.includes("select * from mcqs where id = ?1") &&
						!normalized.includes("mcq_choices")
					) {
						const id = args[0] as string;
						const mcq = state.mcqs.find((m) => m.id === id);
						return { results: mcq ? [mcq] : [] };
					}

					if (
						normalized.includes("select * from mcq_choices where mcq_id = ?1 order by position")
					) {
						const mcqId = args[0] as string;
						const choices = state.choices
							.filter((c) => c.mcq_id === mcqId)
							.sort((a, b) => a.position - b.position);
						return { results: choices };
					}

					if (normalized.includes("select * from mcq_choices where id = ?1")) {
						const id = args[0] as string;
						const choice = state.choices.find((c) => c.id === id);
						return { results: choice ? [choice] : [] };
					}

					if (normalized.includes("insert into mcqs")) {
						const [name, question, createdByUserId] = args as string[];
						const mcq: McqRow = {
							id: nextId("mcq"),
							name,
							question,
							created_by_user_id: createdByUserId,
							created_at: "2026-08-31 12:00:00",
							updated_at: "2026-08-31 12:00:00",
						};
						state.mcqs.push(mcq);
						return { results: [mcq] };
					}

					if (normalized.includes("insert into mcq_choices")) {
						const [mcqId, choiceText, isCorrect, position] = args as [
							string,
							string,
							number,
							number,
						];
						const choice: McqChoiceRow = {
							id: nextId("choice"),
							mcq_id: mcqId,
							choice_text: choiceText,
							is_correct: isCorrect,
							position,
							created_at: "2026-08-31 12:00:00",
							updated_at: "2026-08-31 12:00:00",
						};
						state.choices.push(choice);
						return { results: [choice] };
					}

					if (
						normalized.includes("update mcqs set") &&
						normalized.includes("updated_at = current_timestamp")
					) {
						const [name, question, id] = args as [string, string, string];
						const index = state.mcqs.findIndex((m) => m.id === id);
						if (index === -1) {
							return { results: [] };
						}
						const updated: McqRow = {
							...state.mcqs[index]!,
							name,
							question,
							updated_at: "2026-08-31 13:00:00",
						};
						state.mcqs[index] = updated;
						return { results: [updated] };
					}

					if (normalized.includes("insert into mcq_attempts")) {
						const [mcqId, mcqChoiceId, userId, isCorrect] = args as [
							string,
							string,
							string,
							number,
						];
						const attempt = {
							id: nextId("attempt"),
							mcq_id: mcqId,
							mcq_choice_id: mcqChoiceId,
							user_id: userId,
							is_correct: isCorrect,
							created_at: "2026-08-31 14:00:00",
						};
						state.attempts.push(attempt);
						return { results: [attempt] };
					}

	throw new Error(`Unhandled SQL in mock all(): ${sql}`);
}

function handleRunQuery(sql: string, args: unknown[], state: MockDbState) {
	const normalized = sql.replace(/\s+/g, " ").trim().toLowerCase();

					if (normalized.includes("delete from mcq_choices where mcq_id = ?1")) {
						const mcqId = args[0] as string;
						const before = state.choices.length;
						state.choices = state.choices.filter((c) => c.mcq_id !== mcqId);
						return { success: true, meta: { changes: before - state.choices.length } };
					}

					if (normalized.includes("delete from mcqs where id = ?1")) {
						const id = args[0] as string;
						const before = state.mcqs.length;
						state.mcqs = state.mcqs.filter((m) => m.id !== id);
						state.choices = state.choices.filter((c) => c.mcq_id !== id);
						const changes = before - state.mcqs.length;
						return { success: true, meta: { changes } };
					}

	throw new Error(`Unhandled SQL in mock run(): ${sql}`);
}

function createMockDb(state: MockDbState) {
	const db = {
		prepare: vi.fn((sql: string) => ({
			all: vi.fn(async () => handleAllQuery(sql, [], state)),
			bind: vi.fn((...args: unknown[]) => ({
				all: vi.fn(async () => handleAllQuery(sql, args, state)),
				run: vi.fn(async () => handleRunQuery(sql, args, state)),
			})),
		})),
	} as unknown as D1Database;

	return db;
}

describe("mcq-service", () => {
	let state: MockDbState;
	let db: D1Database;

	beforeEach(() => {
		idCounter = 0;
		state = { mcqs: [], choices: [], attempts: [] };
		db = createMockDb(state);
		vi.mocked(getUserById).mockReset();
		vi.mocked(getUserById).mockImplementation(async (_db, id) =>
			id === sampleUser.id ? sampleUser : null,
		);
	});

	describe("listMcqs", () => {
		it("returns empty array when no MCQs exist", async () => {
			const result = await listMcqs(db);
			expect(result).toEqual([]);
		});

		it("returns MCQs ordered by updated_at DESC", async () => {
			state.mcqs.push(
				{ ...sampleMcq, id: "mcq-a", updated_at: "2026-08-31 09:00:00" },
				{ ...sampleMcq, id: "mcq-b", updated_at: "2026-08-31 11:00:00" },
			);

			const result = await listMcqs(db);
			expect(result.map((m) => m.id)).toEqual(["mcq-b", "mcq-a"]);
		});
	});

	describe("getMcqById", () => {
		it("returns MCQ with choices ordered by position", async () => {
			state.mcqs.push(sampleMcq);
			state.choices.push(...sampleChoices);

			const result = await getMcqById(db, "mcq-1");

			expect(result).not.toBeNull();
			expect(result!.id).toBe("mcq-1");
			expect(result!.choices.map((c) => c.choice_text)).toEqual([
				"Mitochondria",
				"Chloroplast",
			]);
			expect(result!.choices[1]!.is_correct).toBe(1);
		});

		it("returns null when MCQ not found", async () => {
			const result = await getMcqById(db, "missing");
			expect(result).toBeNull();
		});
	});

	describe("createMcq", () => {
		it("inserts MCQ and choices with positions and is_correct flags", async () => {
			const result = await createMcq(db, {
				name: "New Quiz",
				question: "What is 2+2?",
				createdByUserId: "user-1",
				choices: [
					{ text: "3", isCorrect: false },
					{ text: "4", isCorrect: true },
				],
			});

			expect(result.name).toBe("New Quiz");
			expect(result.created_by_user_id).toBe("user-1");
			expect(result.choices).toHaveLength(2);
			expect(result.choices[0]!.position).toBe(1);
			expect(result.choices[0]!.is_correct).toBe(0);
			expect(result.choices[1]!.position).toBe(2);
			expect(result.choices[1]!.is_correct).toBe(1);
			expect(state.mcqs).toHaveLength(1);
			expect(state.choices).toHaveLength(2);
		});

		it("throws InvalidUserError when createdByUserId not found", async () => {
			await expect(
				createMcq(db, {
					name: "Quiz",
					question: "Question?",
					createdByUserId: "missing-user",
					choices: [
						{ text: "A", isCorrect: false },
						{ text: "B", isCorrect: true },
					],
				}),
			).rejects.toThrow(InvalidUserError);
		});

		it("throws InvalidChoicesError for fewer than 2 choices", async () => {
			await expect(
				createMcq(db, {
					name: "Quiz",
					question: "Question?",
					createdByUserId: "user-1",
					choices: [{ text: "Only one", isCorrect: true }],
				}),
			).rejects.toThrow(InvalidChoicesError);
		});

		it("throws InvalidChoicesError for more than 6 choices", async () => {
			await expect(
				createMcq(db, {
					name: "Quiz",
					question: "Question?",
					createdByUserId: "user-1",
					choices: Array.from({ length: 7 }, (_, i) => ({
						text: `Choice ${i}`,
						isCorrect: i === 0,
					})),
				}),
			).rejects.toThrow(InvalidChoicesError);
		});

		it("throws InvalidChoicesError when no choice is correct", async () => {
			await expect(
				createMcq(db, {
					name: "Quiz",
					question: "Question?",
					createdByUserId: "user-1",
					choices: [
						{ text: "A", isCorrect: false },
						{ text: "B", isCorrect: false },
					],
				}),
			).rejects.toThrow(InvalidChoicesError);
		});

		it("throws InvalidChoicesError when multiple choices are correct", async () => {
			await expect(
				createMcq(db, {
					name: "Quiz",
					question: "Question?",
					createdByUserId: "user-1",
					choices: [
						{ text: "A", isCorrect: true },
						{ text: "B", isCorrect: true },
					],
				}),
			).rejects.toThrow(InvalidChoicesError);
		});
	});

	describe("updateMcq", () => {
		it("updates header and replaces choices", async () => {
			state.mcqs.push(sampleMcq);
			state.choices.push(...sampleChoices);

			const result = await updateMcq(db, "mcq-1", {
				name: "Updated Quiz",
				question: "Updated question?",
				choices: [
					{ text: "New A", isCorrect: true },
					{ text: "New B", isCorrect: false },
				],
			});

			expect(result).not.toBeNull();
			expect(result!.name).toBe("Updated Quiz");
			expect(result!.question).toBe("Updated question?");
			expect(result!.choices).toHaveLength(2);
			expect(result!.choices[0]!.choice_text).toBe("New A");
			expect(result!.choices[0]!.is_correct).toBe(1);
			expect(state.choices.filter((c) => c.mcq_id === "mcq-1")).toHaveLength(2);
		});

		it("returns null when MCQ not found", async () => {
			const result = await updateMcq(db, "missing", {
				name: "Quiz",
				question: "Question?",
				choices: [
					{ text: "A", isCorrect: true },
					{ text: "B", isCorrect: false },
				],
			});
			expect(result).toBeNull();
		});
	});

	describe("deleteMcq", () => {
		it("removes MCQ and returns true", async () => {
			state.mcqs.push(sampleMcq);
			state.choices.push(...sampleChoices);

			const deleted = await deleteMcq(db, "mcq-1");

			expect(deleted).toBe(true);
			expect(state.mcqs).toHaveLength(0);
			expect(state.choices).toHaveLength(0);
		});

		it("returns false when MCQ not found", async () => {
			const deleted = await deleteMcq(db, "missing");
			expect(deleted).toBe(false);
		});
	});

	describe("recordAttempt", () => {
		beforeEach(() => {
			state.mcqs.push(sampleMcq);
			state.choices.push(...sampleChoices);
		});

		it("records attempt with is_correct 1 for correct choice", async () => {
			const attempt = await recordAttempt(db, "mcq-1", "choice-2", "user-1");

			expect(attempt.is_correct).toBe(1);
			expect(attempt.mcq_choice_id).toBe("choice-2");
			expect(attempt.user_id).toBe("user-1");
			expect(state.attempts).toHaveLength(1);
		});

		it("records attempt with is_correct 0 for incorrect choice", async () => {
			const attempt = await recordAttempt(db, "mcq-1", "choice-1", "user-1");

			expect(attempt.is_correct).toBe(0);
		});

		it("throws McqNotFoundError when MCQ missing", async () => {
			await expect(recordAttempt(db, "missing", "choice-1", "user-1")).rejects.toThrow(
				McqNotFoundError,
			);
		});

		it("throws InvalidUserError when user missing", async () => {
			await expect(recordAttempt(db, "mcq-1", "choice-1", "missing-user")).rejects.toThrow(
				InvalidUserError,
			);
		});

		it("throws ChoiceNotFoundError when choice missing", async () => {
			await expect(recordAttempt(db, "mcq-1", "missing-choice", "user-1")).rejects.toThrow(
				ChoiceNotFoundError,
			);
		});

		it("throws ChoiceNotFoundError when choice belongs to different MCQ", async () => {
			state.choices.push({
				id: "choice-other",
				mcq_id: "other-mcq",
				choice_text: "Other",
				is_correct: 0,
				position: 1,
				created_at: "2026-08-31 10:00:00",
				updated_at: "2026-08-31 10:00:00",
			});

			await expect(recordAttempt(db, "mcq-1", "choice-other", "user-1")).rejects.toThrow(
				ChoiceNotFoundError,
			);
		});
	});
});
