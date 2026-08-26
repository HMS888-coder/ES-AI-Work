import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	createUser,
	DuplicateEmailError,
	DuplicateUsernameError,
	getUserByUsernameOrEmail,
	verifyPasswordHash,
	type User,
} from "@/lib/services/user-service";
import { handleLogin, handleLogout, handleRegister } from "@/lib/services/auth-handlers";

vi.mock("@/lib/services/user-service", () => ({
	createUser: vi.fn(),
	getUserByUsernameOrEmail: vi.fn(),
	verifyPasswordHash: vi.fn(),
	DuplicateUsernameError: class DuplicateUsernameError extends Error {
		name = "DuplicateUsernameError";
	},
	DuplicateEmailError: class DuplicateEmailError extends Error {
		name = "DuplicateEmailError";
	},
}));

const mockDb = {} as D1Database;

const sampleUser: User = {
	id: "user-1",
	first_name: "Jane",
	last_name: "Smith",
	username: "jsmith",
	email: "jsmith@school.edu",
	password_hash: "a".repeat(64),
	created_at: "2026-08-26 00:00:00",
};

const validRegisterBody = {
	firstName: "Jane",
	lastName: "Smith",
	username: "jsmith",
	email: "jsmith@school.edu",
	passwordHash: "hashed-password",
};

const validLoginBody = {
	usernameOrEmail: "jsmith",
	passwordHash: "hashed-password",
};

describe("handleRegister", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns 201 on valid body", async () => {
		vi.mocked(createUser).mockResolvedValue(sampleUser);

		const response = await handleRegister(mockDb, validRegisterBody);
		const body = await response.json();

		expect(response.status).toBe(201);
		expect(body).toEqual({
			success: true,
			userId: "user-1",
			redirectUrl: "/mcqs",
		});
	});

	it("returns 400 on validation failure", async () => {
		const response = await handleRegister(mockDb, { firstName: "Jane" });
		const body = await response.json();

		expect(response.status).toBe(400);
		expect(body.success).toBe(false);
		expect(body.error).toBe("Validation failed");
		expect(body.details).toBeDefined();
		expect(createUser).not.toHaveBeenCalled();
	});

	it("returns 409 on duplicate username", async () => {
		vi.mocked(createUser).mockRejectedValue(new DuplicateUsernameError());

		const response = await handleRegister(mockDb, validRegisterBody);
		const body = await response.json();

		expect(response.status).toBe(409);
		expect(body).toEqual({
			success: false,
			error: "Username or email already exists",
		});
	});

	it("returns 409 on duplicate email", async () => {
		vi.mocked(createUser).mockRejectedValue(new DuplicateEmailError());

		const response = await handleRegister(mockDb, validRegisterBody);
		const body = await response.json();

		expect(response.status).toBe(409);
		expect(body).toEqual({
			success: false,
			error: "Username or email already exists",
		});
	});

	it("passes passwordHash to createUser, not plaintext password", async () => {
		vi.mocked(createUser).mockResolvedValue(sampleUser);

		await handleRegister(mockDb, validRegisterBody);

		expect(createUser).toHaveBeenCalledWith(mockDb, {
			firstName: "Jane",
			lastName: "Smith",
			username: "jsmith",
			email: "jsmith@school.edu",
			passwordHash: "hashed-password",
		});
	});

	it("rejects body with plaintext password field", async () => {
		const response = await handleRegister(mockDb, {
			...validRegisterBody,
			password: "plaintext",
		});
		const body = await response.json();

		expect(response.status).toBe(400);
		expect(body.success).toBe(false);
		expect(createUser).not.toHaveBeenCalled();
	});
});

describe("handleLogin", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns 200 on valid credentials", async () => {
		vi.mocked(getUserByUsernameOrEmail).mockResolvedValue(sampleUser);
		vi.mocked(verifyPasswordHash).mockReturnValue(true);

		const response = await handleLogin(mockDb, validLoginBody);
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body).toEqual({
			success: true,
			userId: "user-1",
			redirectUrl: "/mcqs",
		});
	});

	it("returns 401 on wrong password", async () => {
		vi.mocked(getUserByUsernameOrEmail).mockResolvedValue(sampleUser);
		vi.mocked(verifyPasswordHash).mockReturnValue(false);

		const response = await handleLogin(mockDb, validLoginBody);
		const body = await response.json();

		expect(response.status).toBe(401);
		expect(body).toEqual({
			success: false,
			error: "Invalid username or password",
		});
	});

	it("returns 401 on unknown user", async () => {
		vi.mocked(getUserByUsernameOrEmail).mockResolvedValue(null);

		const response = await handleLogin(mockDb, validLoginBody);
		const body = await response.json();

		expect(response.status).toBe(401);
		expect(body).toEqual({
			success: false,
			error: "Invalid username or password",
		});
	});

	it("returns 400 on invalid body", async () => {
		const response = await handleLogin(mockDb, { usernameOrEmail: "jsmith" });
		const body = await response.json();

		expect(response.status).toBe(400);
		expect(body.success).toBe(false);
		expect(body.error).toBe("Validation failed");
		expect(getUserByUsernameOrEmail).not.toHaveBeenCalled();
	});
});

describe("handleLogout", () => {
	it("returns 200 with redirectUrl /login", async () => {
		const response = await handleLogout();
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body).toEqual({
			success: true,
			redirectUrl: "/login",
		});
	});
});
