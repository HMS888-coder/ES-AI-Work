import { NextResponse } from "next/server";
import { loginSchema, registerSchema } from "@/lib/validators/auth-schemas";
import {
	createUser,
	DuplicateEmailError,
	DuplicateUsernameError,
	getUserByUsernameOrEmail,
	verifyPasswordHash,
} from "@/lib/services/user-service";

function validationErrorResponse(error: { flatten: () => { fieldErrors: Record<string, string[]> } }) {
	return NextResponse.json(
		{
			success: false,
			error: "Validation failed",
			details: error.flatten().fieldErrors,
		},
		{ status: 400 },
	);
}

export async function handleRegister(db: D1Database, body: unknown) {
	const parsed = registerSchema.safeParse(body);
	if (!parsed.success) {
		return validationErrorResponse(parsed.error);
	}

	try {
		const user = await createUser(db, parsed.data);
		return NextResponse.json(
			{
				success: true,
				userId: user.id,
				redirectUrl: "/mcqs",
			},
			{ status: 201 },
		);
	} catch (error) {
		if (error instanceof DuplicateUsernameError || error instanceof DuplicateEmailError) {
			return NextResponse.json(
				{
					success: false,
					error: "Username or email already exists",
				},
				{ status: 409 },
			);
		}

		return NextResponse.json(
			{
				success: false,
				error: "Internal server error",
			},
			{ status: 500 },
		);
	}
}

export async function handleLogin(db: D1Database, body: unknown) {
	const parsed = loginSchema.safeParse(body);
	if (!parsed.success) {
		return validationErrorResponse(parsed.error);
	}

	try {
		const user = await getUserByUsernameOrEmail(db, parsed.data.usernameOrEmail);
		if (!user || !verifyPasswordHash(user.password_hash, parsed.data.passwordHash)) {
			return NextResponse.json(
				{
					success: false,
					error: "Invalid username or password",
				},
				{ status: 401 },
			);
		}

		return NextResponse.json({
			success: true,
			userId: user.id,
			redirectUrl: "/mcqs",
		});
	} catch {
		return NextResponse.json(
			{
				success: false,
				error: "Internal server error",
			},
			{ status: 500 },
		);
	}
}

export async function handleLogout() {
	return NextResponse.json({
		success: true,
		redirectUrl: "/login",
	});
}
