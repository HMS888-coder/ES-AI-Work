import { NextResponse } from "next/server";
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
	type McqChoiceRow,
	type McqRow,
	type McqWithChoices,
} from "@/lib/services/mcq-service";
import {
	createMcqSchema,
	recordAttemptSchema,
	updateMcqSchema,
} from "@/lib/validators/mcq-schemas";

function validationErrorResponse(error: {
	flatten: () => { fieldErrors: Record<string, string[]> };
}) {
	return NextResponse.json(
		{
			success: false,
			error: "Validation failed",
			details: error.flatten().fieldErrors,
		},
		{ status: 400 },
	);
}

function serializeMcqRow(row: McqRow) {
	return {
		id: row.id,
		name: row.name,
		question: row.question,
		createdByUserId: row.created_by_user_id,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

function serializeChoice(row: McqChoiceRow) {
	return {
		id: row.id,
		text: row.choice_text,
		isCorrect: row.is_correct === 1,
		position: row.position,
	};
}

function serializeMcqWithChoices(mcq: McqWithChoices) {
	return {
		...serializeMcqRow(mcq),
		choices: mcq.choices.map(serializeChoice),
	};
}

function serializeAttempt(row: McqAttemptRow) {
	return {
		id: row.id,
		isCorrect: row.is_correct === 1,
	};
}

export async function handleListMcqs(db: D1Database) {
	try {
		const mcqs = await listMcqs(db);
		return NextResponse.json({
			success: true,
			mcqs: mcqs.map(serializeMcqRow),
		});
	} catch {
		return NextResponse.json(
			{ success: false, error: "Internal server error" },
			{ status: 500 },
		);
	}
}

export async function handleGetMcq(db: D1Database, id: string) {
	try {
		const mcq = await getMcqById(db, id);
		if (!mcq) {
			return NextResponse.json({ success: false, error: "MCQ not found" }, { status: 404 });
		}

		return NextResponse.json({
			success: true,
			mcq: serializeMcqWithChoices(mcq),
		});
	} catch {
		return NextResponse.json(
			{ success: false, error: "Internal server error" },
			{ status: 500 },
		);
	}
}

export async function handleCreateMcq(db: D1Database, body: unknown) {
	const parsed = createMcqSchema.safeParse(body);
	if (!parsed.success) {
		return validationErrorResponse(parsed.error);
	}

	try {
		const mcq = await createMcq(db, parsed.data);
		return NextResponse.json(
			{
				success: true,
				mcq: serializeMcqWithChoices(mcq),
			},
			{ status: 201 },
		);
	} catch (error) {
		if (error instanceof InvalidUserError) {
			return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
		}
		if (error instanceof InvalidChoicesError) {
			return NextResponse.json({ success: false, error: error.message }, { status: 400 });
		}

		return NextResponse.json(
			{ success: false, error: "Internal server error" },
			{ status: 500 },
		);
	}
}

export async function handleUpdateMcq(db: D1Database, id: string, body: unknown) {
	const parsed = updateMcqSchema.safeParse(body);
	if (!parsed.success) {
		return validationErrorResponse(parsed.error);
	}

	try {
		const mcq = await updateMcq(db, id, parsed.data);
		if (!mcq) {
			return NextResponse.json({ success: false, error: "MCQ not found" }, { status: 404 });
		}

		return NextResponse.json({
			success: true,
			mcq: serializeMcqWithChoices(mcq),
		});
	} catch (error) {
		if (error instanceof InvalidChoicesError) {
			return NextResponse.json({ success: false, error: error.message }, { status: 400 });
		}

		return NextResponse.json(
			{ success: false, error: "Internal server error" },
			{ status: 500 },
		);
	}
}

export async function handleDeleteMcq(db: D1Database, id: string) {
	try {
		const deleted = await deleteMcq(db, id);
		if (!deleted) {
			return NextResponse.json({ success: false, error: "MCQ not found" }, { status: 404 });
		}

		return NextResponse.json({ success: true });
	} catch {
		return NextResponse.json(
			{ success: false, error: "Internal server error" },
			{ status: 500 },
		);
	}
}

export async function handleRecordAttempt(db: D1Database, mcqId: string, body: unknown) {
	const parsed = recordAttemptSchema.safeParse(body);
	if (!parsed.success) {
		return validationErrorResponse(parsed.error);
	}

	try {
		const attempt = await recordAttempt(
			db,
			mcqId,
			parsed.data.mcqChoiceId,
			parsed.data.userId,
		);
		return NextResponse.json(
			{
				success: true,
				attempt: serializeAttempt(attempt),
			},
			{ status: 201 },
		);
	} catch (error) {
		if (error instanceof McqNotFoundError) {
			return NextResponse.json({ success: false, error: "MCQ not found" }, { status: 404 });
		}
		if (error instanceof InvalidUserError) {
			return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
		}
		if (error instanceof ChoiceNotFoundError) {
			return NextResponse.json({ success: false, error: "Choice not found" }, { status: 404 });
		}

		return NextResponse.json(
			{ success: false, error: "Internal server error" },
			{ status: 500 },
		);
	}
}
