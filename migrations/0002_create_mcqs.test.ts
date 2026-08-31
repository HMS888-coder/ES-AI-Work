import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const MIGRATIONS_DIR = join(process.cwd(), "migrations");

const MCQS_COLUMNS = [
	"id",
	"name",
	"question",
	"created_by_user_id",
	"created_at",
	"updated_at",
] as const;

const MCQ_CHOICES_COLUMNS = [
	"id",
	"mcq_id",
	"choice_text",
	"is_correct",
	"position",
	"created_at",
	"updated_at",
] as const;

const MCQ_ATTEMPTS_COLUMNS = [
	"id",
	"mcq_id",
	"mcq_choice_id",
	"user_id",
	"is_correct",
	"created_at",
] as const;

const INDEXES = [
	"idx_mcqs_created_by_user_id",
	"idx_mcq_choices_mcq_id",
	"idx_mcq_attempts_mcq_id",
	"idx_mcq_attempts_user_id",
] as const;

function getMcqsMigrationSql(): string {
	const sqlFiles = readdirSync(MIGRATIONS_DIR).filter(
		(file) => file.endsWith(".sql") && file.includes("create_mcqs"),
	);

	expect(sqlFiles.length).toBeGreaterThan(0);

	return readFileSync(join(MIGRATIONS_DIR, sqlFiles[0]!), "utf8");
}

describe("0002_create_mcqs migration", () => {
	it("defines the mcqs table with required columns", () => {
		const sql = getMcqsMigrationSql();

		expect(sql).toMatch(/CREATE TABLE mcqs/i);

		for (const column of MCQS_COLUMNS) {
			expect(sql).toMatch(new RegExp(`\\b${column}\\b`, "i"));
		}
	});

	it("defines the mcq_choices table with required columns", () => {
		const sql = getMcqsMigrationSql();

		expect(sql).toMatch(/CREATE TABLE mcq_choices/i);

		for (const column of MCQ_CHOICES_COLUMNS) {
			expect(sql).toMatch(new RegExp(`\\b${column}\\b`, "i"));
		}
	});

	it("defines the mcq_attempts table with required columns", () => {
		const sql = getMcqsMigrationSql();

		expect(sql).toMatch(/CREATE TABLE mcq_attempts/i);

		for (const column of MCQ_ATTEMPTS_COLUMNS) {
			expect(sql).toMatch(new RegExp(`\\b${column}\\b`, "i"));
		}
	});

	it("creates foreign keys with ON DELETE CASCADE", () => {
		const sql = getMcqsMigrationSql();

		expect(sql).toMatch(/created_by_user_id.*REFERENCES users\(id\).*ON DELETE CASCADE/is);
		expect(sql).toMatch(/mcq_id.*REFERENCES mcqs\(id\).*ON DELETE CASCADE/is);
		expect(sql).toMatch(/mcq_choice_id.*REFERENCES mcq_choices\(id\).*ON DELETE CASCADE/is);
		expect(sql).toMatch(/user_id.*REFERENCES users\(id\).*ON DELETE CASCADE/is);
	});

	it("creates required indexes", () => {
		const sql = getMcqsMigrationSql();

		for (const index of INDEXES) {
			expect(sql).toMatch(new RegExp(index, "i"));
		}
	});
});
