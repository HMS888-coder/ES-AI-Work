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
	type McqAttemptRow,
	type McqRow,
	type McqWithChoices,
} from "@/lib/services/mcq-service";
import {
	handleCreateMcq,
	handleDeleteMcq,
	handleGetMcq,
	handleListMcqs,
	handleRecordAttempt,
	handleUpdateMcq,
} from "@/lib/services/mcq-handlers";

vi.mock("@/lib/services/mcq-service", () => ({
	listMcqs: vi.fn(),
	getMcqById: vi.fn(),
	createMcq: vi.fn(),
	updateMcq: vi.fn(),
	deleteMcq: vi.fn(),
	recordAttempt: vi.fn(),
	InvalidUserError: class InvalidUserError extends Error {
		name = "InvalidUserError";
	},
	InvalidChoicesError: class InvalidChoicesError extends Error {
		name = "InvalidChoicesError";
		constructor(message: string) {
			super(message);
		}
	},
	McqNotFoundError: class McqNotFoundError extends Error {
		name = "McqNotFoundError";
	},
	ChoiceNotFoundError: class ChoiceNotFoundError extends Error {
		name = "ChoiceNotFoundError";
	},
}));

const mockDb = {} as D1Database;

const sampleMcqRow: McqRow = {
	id: "mcq-1",
	name: "Biology Quiz",
	question: "Which organelle performs photosynthesis?",
	created_by_user_id: "user-1",
	created_at: "2026-08-31 10:00:00",
	updated_at: "2026-08-31 10:00:00",
};

const sampleMcqWithChoices: McqWithChoices = {
	...sampleMcqRow,
	choices: [
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
	],
};

const validCreateBody = {
	name: "Biology Quiz",
	question: "Which organelle performs photosynthesis?",
	createdByUserId: "user-1",
	choices: [
		{ text: "Mitochondria", isCorrect: false },
		{ text: "Chloroplast", isCorrect: true },
	],
};

const validUpdateBody = {
	name: "Updated Quiz",
	question: "Updated question?",
	choices: [
		{ text: "New A", isCorrect: true },
		{ text: "New B", isCorrect: false },
	],
};

const sampleAttempt: McqAttemptRow = {
	id: "attempt-1",
	mcq_id: "mcq-1",
	mcq_choice_id: "choice-2",
	user_id: "user-1",
	is_correct: 1,
	created_at: "2026-08-31 11:00:00",
};

describe("handleListMcqs", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns 200 with serialized mcqs", async () => {
		vi.mocked(listMcqs).mockResolvedValue([sampleMcqRow]);

		const response = await handleListMcqs(mockDb);
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body).toEqual({
			success: true,
			mcqs: [
				{
					id: "mcq-1",
					name: "Biology Quiz",
					question: "Which organelle performs photosynthesis?",
					createdByUserId: "user-1",
					createdAt: "2026-08-31 10:00:00",
					updatedAt: "2026-08-31 10:00:00",
				},
			],
		});
	});

	it("returns 500 on unexpected error", async () => {
		vi.mocked(listMcqs).mockRejectedValue(new Error("db failure"));

		const response = await handleListMcqs(mockDb);
		const body = await response.json();

		expect(response.status).toBe(500);
		expect(body.success).toBe(false);
	});
});

describe("handleGetMcq", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns 200 with serialized mcq", async () => {
		vi.mocked(getMcqById).mockResolvedValue(sampleMcqWithChoices);

		const response = await handleGetMcq(mockDb, "mcq-1");
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body.success).toBe(true);
		expect(body.mcq.id).toBe("mcq-1");
		expect(body.mcq.choices).toHaveLength(2);
		expect(body.mcq.choices[1]).toEqual({
			id: "choice-2",
			text: "Chloroplast",
			isCorrect: true,
			position: 2,
		});
	});

	it("returns 404 when MCQ not found", async () => {
		vi.mocked(getMcqById).mockResolvedValue(null);

		const response = await handleGetMcq(mockDb, "missing");
		const body = await response.json();

		expect(response.status).toBe(404);
		expect(body).toEqual({ success: false, error: "MCQ not found" });
	});
});

describe("handleCreateMcq", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns 201 on valid body", async () => {
		vi.mocked(createMcq).mockResolvedValue(sampleMcqWithChoices);

		const response = await handleCreateMcq(mockDb, validCreateBody);
		const body = await response.json();

		expect(response.status).toBe(201);
		expect(body.success).toBe(true);
		expect(body.mcq.id).toBe("mcq-1");
		expect(createMcq).toHaveBeenCalledWith(mockDb, validCreateBody);
	});

	it("returns 400 on validation failure", async () => {
		const response = await handleCreateMcq(mockDb, { name: "Quiz" });
		const body = await response.json();

		expect(response.status).toBe(400);
		expect(body.success).toBe(false);
		expect(body.error).toBe("Validation failed");
		expect(createMcq).not.toHaveBeenCalled();
	});

	it("returns 400 when no choice is marked correct", async () => {
		const response = await handleCreateMcq(mockDb, {
			...validCreateBody,
			choices: [
				{ text: "A", isCorrect: false },
				{ text: "B", isCorrect: false },
			],
		});
		const body = await response.json();

		expect(response.status).toBe(400);
		expect(body.success).toBe(false);
		expect(createMcq).not.toHaveBeenCalled();
	});

	it("returns 404 when user not found", async () => {
		vi.mocked(createMcq).mockRejectedValue(new InvalidUserError());

		const response = await handleCreateMcq(mockDb, validCreateBody);
		const body = await response.json();

		expect(response.status).toBe(404);
		expect(body).toEqual({ success: false, error: "User not found" });
	});

	it("returns 400 on invalid choices from service", async () => {
		vi.mocked(createMcq).mockRejectedValue(
			new InvalidChoicesError("Exactly one choice must be marked correct"),
		);

		const response = await handleCreateMcq(mockDb, validCreateBody);
		const body = await response.json();

		expect(response.status).toBe(400);
		expect(body.success).toBe(false);
		expect(body.error).toBe("Exactly one choice must be marked correct");
	});
});

describe("handleUpdateMcq", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns 200 on valid body", async () => {
		vi.mocked(updateMcq).mockResolvedValue(sampleMcqWithChoices);

		const response = await handleUpdateMcq(mockDb, "mcq-1", validUpdateBody);
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body.success).toBe(true);
		expect(updateMcq).toHaveBeenCalledWith(mockDb, "mcq-1", validUpdateBody);
	});

	it("returns 400 on validation failure", async () => {
		const response = await handleUpdateMcq(mockDb, "mcq-1", { name: "Quiz" });
		const body = await response.json();

		expect(response.status).toBe(400);
		expect(body.success).toBe(false);
		expect(updateMcq).not.toHaveBeenCalled();
	});

	it("returns 404 when MCQ not found", async () => {
		vi.mocked(updateMcq).mockResolvedValue(null);

		const response = await handleUpdateMcq(mockDb, "missing", validUpdateBody);
		const body = await response.json();

		expect(response.status).toBe(404);
		expect(body).toEqual({ success: false, error: "MCQ not found" });
	});
});

describe("handleDeleteMcq", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns 200 when MCQ deleted", async () => {
		vi.mocked(deleteMcq).mockResolvedValue(true);

		const response = await handleDeleteMcq(mockDb, "mcq-1");
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body).toEqual({ success: true });
	});

	it("returns 404 when MCQ not found", async () => {
		vi.mocked(deleteMcq).mockResolvedValue(false);

		const response = await handleDeleteMcq(mockDb, "missing");
		const body = await response.json();

		expect(response.status).toBe(404);
		expect(body).toEqual({ success: false, error: "MCQ not found" });
	});
});

describe("handleRecordAttempt", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns 201 with serialized attempt", async () => {
		vi.mocked(recordAttempt).mockResolvedValue(sampleAttempt);

		const response = await handleRecordAttempt(mockDb, "mcq-1", {
			mcqChoiceId: "choice-2",
			userId: "user-1",
		});
		const body = await response.json();

		expect(response.status).toBe(201);
		expect(body).toEqual({
			success: true,
			attempt: { id: "attempt-1", isCorrect: true },
		});
		expect(recordAttempt).toHaveBeenCalledWith(mockDb, "mcq-1", "choice-2", "user-1");
	});

	it("returns 400 on validation failure", async () => {
		const response = await handleRecordAttempt(mockDb, "mcq-1", { userId: "user-1" });
		const body = await response.json();

		expect(response.status).toBe(400);
		expect(body.success).toBe(false);
		expect(recordAttempt).not.toHaveBeenCalled();
	});

	it("returns 404 when MCQ not found", async () => {
		vi.mocked(recordAttempt).mockRejectedValue(new McqNotFoundError());

		const response = await handleRecordAttempt(mockDb, "missing", {
			mcqChoiceId: "choice-1",
			userId: "user-1",
		});
		const body = await response.json();

		expect(response.status).toBe(404);
		expect(body).toEqual({ success: false, error: "MCQ not found" });
	});

	it("returns 404 when user not found", async () => {
		vi.mocked(recordAttempt).mockRejectedValue(new InvalidUserError());

		const response = await handleRecordAttempt(mockDb, "mcq-1", {
			mcqChoiceId: "choice-1",
			userId: "missing",
		});
		const body = await response.json();

		expect(response.status).toBe(404);
		expect(body).toEqual({ success: false, error: "User not found" });
	});

	it("returns 404 when choice not found", async () => {
		vi.mocked(recordAttempt).mockRejectedValue(new ChoiceNotFoundError());

		const response = await handleRecordAttempt(mockDb, "mcq-1", {
			mcqChoiceId: "missing",
			userId: "user-1",
		});
		const body = await response.json();

		expect(response.status).toBe(404);
		expect(body).toEqual({ success: false, error: "Choice not found" });
	});
});
