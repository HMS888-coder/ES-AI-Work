import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	createUser,
	deleteUser,
	DuplicateEmailError,
	DuplicateUsernameError,
	getUserByEmail,
	getUserById,
	getUserByUsername,
	getUserByUsernameOrEmail,
	updateUser,
	verifyPasswordHash,
	type User,
} from "@/lib/services/user-service";

const sampleUser: User = {
	id: "abc123",
	first_name: "Jane",
	last_name: "Smith",
	username: "jsmith",
	email: "jsmith@school.edu",
	password_hash: "a".repeat(64),
	created_at: "2026-08-25 00:00:00",
};

type MockDbState = {
	users: User[];
};

function createMockDb(state: MockDbState) {
	const db = {
		prepare: vi.fn((sql: string) => ({
			bind: vi.fn((...args: unknown[]) => ({
				all: vi.fn(async () => {
					const normalized = sql.replace(/\s+/g, " ").trim().toLowerCase();

					if (
						normalized.includes("select") &&
						normalized.includes("where username = ?1 or email = ?1")
					) {
						const value = args[0] as string;
						const user = state.users.find((u) => u.username === value || u.email === value);
						return { results: user ? [user] : [] };
					}

					if (normalized.includes("select") && normalized.includes("where username = ?1")) {
						const username = args[0] as string;
						const user = state.users.find((u) => u.username === username);
						return { results: user ? [user] : [] };
					}

					if (normalized.includes("select") && normalized.includes("where email = ?1")) {
						const email = args[0] as string;
						const user = state.users.find((u) => u.email === email);
						return { results: user ? [user] : [] };
					}

					if (normalized.includes("select") && normalized.includes("where id = ?1")) {
						const id = args[0] as string;
						const user = state.users.find((u) => u.id === id);
						return { results: user ? [user] : [] };
					}

					if (normalized.includes("insert into users")) {
						const [firstName, lastName, username, email, passwordHash] = args as string[];
						const user: User = {
							id: "generated-id",
							first_name: firstName,
							last_name: lastName,
							username,
							email,
							password_hash: passwordHash,
							created_at: "2026-08-26 00:00:00",
						};
						state.users.push(user);
						return { results: [user] };
					}

					if (normalized.includes("update users set")) {
						const id = args[args.length - 1] as string;
						const userIndex = state.users.findIndex((u) => u.id === id);
						if (userIndex === -1) {
							return { results: [] };
						}

						const updated = { ...state.users[userIndex]! };
						let argIndex = 0;
						if (/first_name = \?\d*/.test(normalized)) {
							updated.first_name = args[argIndex++] as string;
						}
						if (/last_name = \?\d*/.test(normalized)) {
							updated.last_name = args[argIndex++] as string;
						}
						if (/email = \?\d*/.test(normalized)) {
							updated.email = args[argIndex++] as string;
						}
						if (/password_hash = \?\d*/.test(normalized)) {
							updated.password_hash = args[argIndex++] as string;
						}

						state.users[userIndex] = updated;
						return { results: [updated] };
					}

					throw new Error(`Unhandled SQL in mock: ${sql}`);
				}),
				run: vi.fn(async () => {
					const normalized = sql.replace(/\s+/g, " ").trim().toLowerCase();

					if (normalized.includes("delete from users where id = ?1")) {
						const id = args[0] as string;
						const before = state.users.length;
						state.users = state.users.filter((u) => u.id !== id);
						const changes = before - state.users.length;
						return { success: true, meta: { changes } };
					}

					throw new Error(`Unhandled SQL in mock run: ${sql}`);
				}),
			})),
		})),
	} as unknown as D1Database;

	return db;
}

describe("user-service", () => {
	let state: MockDbState;
	let db: D1Database;

	beforeEach(() => {
		state = { users: [] };
		db = createMockDb(state);
	});

	describe("createUser", () => {
		it("inserts and returns user with generated id", async () => {
			const user = await createUser(db, {
				firstName: "Jane",
				lastName: "Smith",
				username: "jsmith",
				email: "jsmith@school.edu",
				passwordHash: "hashed-password",
			});

			expect(user.id).toBe("generated-id");
			expect(user.username).toBe("jsmith");
			expect(user.email).toBe("jsmith@school.edu");
			expect(user.password_hash).toBe("hashed-password");
			expect(state.users).toHaveLength(1);
		});

		it("rejects duplicate username", async () => {
			state.users.push(sampleUser);

			await expect(
				createUser(db, {
					firstName: "John",
					lastName: "Doe",
					username: "jsmith",
					email: "john@school.edu",
					passwordHash: "hash",
				}),
			).rejects.toThrow(DuplicateUsernameError);
		});

		it("rejects duplicate email", async () => {
			state.users.push(sampleUser);

			await expect(
				createUser(db, {
					firstName: "John",
					lastName: "Doe",
					username: "jdoe",
					email: "jsmith@school.edu",
					passwordHash: "hash",
				}),
			).rejects.toThrow(DuplicateEmailError);
		});
	});

	describe("getUserByUsername", () => {
		it("returns user when found", async () => {
			state.users.push(sampleUser);
			const user = await getUserByUsername(db, "jsmith");
			expect(user).toEqual(sampleUser);
		});

		it("returns null when not found", async () => {
			const user = await getUserByUsername(db, "missing");
			expect(user).toBeNull();
		});
	});

	describe("getUserByEmail", () => {
		it("returns user when found", async () => {
			state.users.push(sampleUser);
			const user = await getUserByEmail(db, "jsmith@school.edu");
			expect(user).toEqual(sampleUser);
		});

		it("returns null when not found", async () => {
			const user = await getUserByEmail(db, "missing@school.edu");
			expect(user).toBeNull();
		});
	});

	describe("getUserById", () => {
		it("returns user when found", async () => {
			state.users.push(sampleUser);
			const user = await getUserById(db, "abc123");
			expect(user).toEqual(sampleUser);
		});

		it("returns null when not found", async () => {
			const user = await getUserById(db, "missing");
			expect(user).toBeNull();
		});
	});

	describe("getUserByUsernameOrEmail", () => {
		it("finds user by username", async () => {
			state.users.push(sampleUser);
			const user = await getUserByUsernameOrEmail(db, "jsmith");
			expect(user).toEqual(sampleUser);
		});

		it("finds user by email", async () => {
			state.users.push(sampleUser);
			const user = await getUserByUsernameOrEmail(db, "jsmith@school.edu");
			expect(user).toEqual(sampleUser);
		});
	});

	describe("updateUser", () => {
		it("persists changes", async () => {
			state.users.push(sampleUser);

			const updated = await updateUser(db, "abc123", {
				firstName: "Janet",
				email: "janet@school.edu",
			});

			expect(updated).toEqual({
				...sampleUser,
				first_name: "Janet",
				email: "janet@school.edu",
			});
		});

		it("returns null when user not found", async () => {
			const updated = await updateUser(db, "missing", { firstName: "Janet" });
			expect(updated).toBeNull();
		});
	});

	describe("deleteUser", () => {
		it("removes record", async () => {
			state.users.push(sampleUser);
			const deleted = await deleteUser(db, "abc123");
			expect(deleted).toBe(true);
			expect(state.users).toHaveLength(0);
		});

		it("returns false when user not found", async () => {
			const deleted = await deleteUser(db, "missing");
			expect(deleted).toBe(false);
		});
	});

	describe("verifyPasswordHash", () => {
		it("returns true on match", () => {
			const hash = "a".repeat(64);
			expect(verifyPasswordHash(hash, hash)).toBe(true);
		});

		it("returns false on mismatch", () => {
			const stored = "a".repeat(64);
			const submitted = "b".repeat(64);
			expect(verifyPasswordHash(stored, submitted)).toBe(false);
		});

		it("returns false on length mismatch", () => {
			expect(verifyPasswordHash("short", "much-longer-value")).toBe(false);
		});
	});
});
