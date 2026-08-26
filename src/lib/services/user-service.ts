import { timingSafeEqual } from "node:crypto";

export type User = {
	id: string;
	first_name: string;
	last_name: string;
	username: string;
	email: string;
	password_hash: string;
	created_at: string;
};

export type CreateUserInput = {
	firstName: string;
	lastName: string;
	username: string;
	email: string;
	passwordHash: string;
};

export type UpdateUserInput = {
	firstName?: string;
	lastName?: string;
	email?: string;
	passwordHash?: string;
};

export class DuplicateUsernameError extends Error {
	constructor() {
		super("Username already exists");
		this.name = "DuplicateUsernameError";
	}
}

export class DuplicateEmailError extends Error {
	constructor() {
		super("Email already exists");
		this.name = "DuplicateEmailError";
	}
}

function firstResult<T>(results: T[] | undefined): T | null {
	return results?.[0] ?? null;
}

export async function getUserByUsername(db: D1Database, username: string): Promise<User | null> {
	const result = await db
		.prepare("SELECT * FROM users WHERE username = ?1")
		.bind(username)
		.all<User>();

	return firstResult(result.results);
}

export async function getUserByEmail(db: D1Database, email: string): Promise<User | null> {
	const result = await db.prepare("SELECT * FROM users WHERE email = ?1").bind(email).all<User>();

	return firstResult(result.results);
}

export async function getUserById(db: D1Database, id: string): Promise<User | null> {
	const result = await db.prepare("SELECT * FROM users WHERE id = ?1").bind(id).all<User>();

	return firstResult(result.results);
}

export async function getUserByUsernameOrEmail(
	db: D1Database,
	usernameOrEmail: string,
): Promise<User | null> {
	const result = await db
		.prepare("SELECT * FROM users WHERE username = ?1 OR email = ?1")
		.bind(usernameOrEmail)
		.all<User>();

	return firstResult(result.results);
}

export async function createUser(db: D1Database, input: CreateUserInput): Promise<User> {
	if (await getUserByUsername(db, input.username)) {
		throw new DuplicateUsernameError();
	}

	if (await getUserByEmail(db, input.email)) {
		throw new DuplicateEmailError();
	}

	const result = await db
		.prepare(
			`INSERT INTO users (first_name, last_name, username, email, password_hash)
       VALUES (?1, ?2, ?3, ?4, ?5)
       RETURNING *`,
		)
		.bind(input.firstName, input.lastName, input.username, input.email, input.passwordHash)
		.all<User>();

	const user = firstResult(result.results);
	if (!user) {
		throw new Error("Failed to create user");
	}

	return user;
}

export async function updateUser(
	db: D1Database,
	id: string,
	input: UpdateUserInput,
): Promise<User | null> {
	const assignments: string[] = [];
	const values: unknown[] = [];
	let index = 1;

	if (input.firstName !== undefined) {
		assignments.push(`first_name = ?${index++}`);
		values.push(input.firstName);
	}
	if (input.lastName !== undefined) {
		assignments.push(`last_name = ?${index++}`);
		values.push(input.lastName);
	}
	if (input.email !== undefined) {
		assignments.push(`email = ?${index++}`);
		values.push(input.email);
	}
	if (input.passwordHash !== undefined) {
		assignments.push(`password_hash = ?${index++}`);
		values.push(input.passwordHash);
	}

	if (assignments.length === 0) {
		return getUserById(db, id);
	}

	values.push(id);

	const result = await db
		.prepare(`UPDATE users SET ${assignments.join(", ")} WHERE id = ?${index} RETURNING *`)
		.bind(...values)
		.all<User>();

	return firstResult(result.results);
}

export async function deleteUser(db: D1Database, id: string): Promise<boolean> {
	const result = await db.prepare("DELETE FROM users WHERE id = ?1").bind(id).run();
	return result.meta.changes > 0;
}

export function verifyPasswordHash(storedHash: string, submittedHash: string): boolean {
	const storedBuffer = Buffer.from(storedHash);
	const submittedBuffer = Buffer.from(submittedHash);

	if (storedBuffer.length !== submittedBuffer.length) {
		return false;
	}

	return timingSafeEqual(storedBuffer, submittedBuffer);
}
