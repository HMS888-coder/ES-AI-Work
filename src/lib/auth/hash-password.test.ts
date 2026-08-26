import { describe, expect, it } from "vitest";
import { hashPassword } from "@/lib/auth/hash-password";

describe("hashPassword", () => {
	it("produces the same hash for the same input", async () => {
		const first = await hashPassword("password123");
		const second = await hashPassword("password123");
		expect(first).toBe(second);
	});

	it("produces different hashes for different inputs", async () => {
		const first = await hashPassword("password123");
		const second = await hashPassword("password456");
		expect(first).not.toBe(second);
	});

	it("returns a lowercase hex string", async () => {
		const hash = await hashPassword("password123");
		expect(hash).toMatch(/^[0-9a-f]{64}$/);
	});
});
