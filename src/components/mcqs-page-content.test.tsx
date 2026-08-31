import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { McqsPageContent } from "@/components/mcqs-page-content";

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: vi.fn() }),
}));

describe("McqsPageContent", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("hides header Create MCQ when the list is empty", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => ({
				ok: true,
				status: 200,
				json: async () => ({ success: true, mcqs: [] }),
			})),
		);

		render(<McqsPageContent />);

		expect(await screen.findByRole("alert")).toHaveTextContent(
			/No MCQs in your test bank yet/i,
		);
		expect(screen.getAllByRole("button", { name: /create mcq/i })).toHaveLength(1);
	});

	it("shows header Create MCQ when MCQs exist", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => ({
				ok: true,
				status: 200,
				json: async () => ({
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
				}),
			})),
		);

		render(<McqsPageContent />);

		expect(await screen.findByText("Biology Quiz")).toBeInTheDocument();
		expect(screen.getAllByRole("button", { name: /create mcq/i })).toHaveLength(1);
	});
});
