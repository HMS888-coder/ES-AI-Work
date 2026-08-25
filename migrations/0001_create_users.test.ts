import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const MIGRATIONS_DIR = join(process.cwd(), "migrations");

const REQUIRED_COLUMNS = [
	"id",
	"first_name",
	"last_name",
	"username",
	"email",
	"password_hash",
	"created_at",
] as const;

function getUsersMigrationSql(): string {
	const sqlFiles = readdirSync(MIGRATIONS_DIR).filter(
		(file) => file.endsWith(".sql") && file.includes("create_users"),
	);

	expect(sqlFiles.length).toBeGreaterThan(0);

	return readFileSync(join(MIGRATIONS_DIR, sqlFiles[0]!), "utf8");
}

describe("0001_create_users migration", () => {
	it("defines the users table with required columns", () => {
		const sql = getUsersMigrationSql();

		expect(sql).toMatch(/CREATE TABLE users/i);

		for (const column of REQUIRED_COLUMNS) {
			expect(sql).toMatch(new RegExp(`\\b${column}\\b`, "i"));
		}
	});

	it("creates indexes on username and email", () => {
		const sql = getUsersMigrationSql();

		expect(sql).toMatch(/idx_users_username/i);
		expect(sql).toMatch(/idx_users_email/i);
		expect(sql).toMatch(/username/i);
		expect(sql).toMatch(/email/i);
	});
});
