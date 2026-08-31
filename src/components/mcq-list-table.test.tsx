import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { McqListTable } from "@/components/mcq-list-table";

describe("McqListTable", () => {
	beforeEach(() => {
		vi.clearAllMocks();
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
	});

	it("renders MCQ rows from the API", async () => {
		render(<McqListTable />);

		expect(await screen.findByText("Biology Quiz")).toBeInTheDocument();
		expect(screen.getByText(/Which organelle performs photosynthesis/i)).toBeInTheDocument();
		expect(fetch).toHaveBeenCalledWith("/api/mcqs");
	});
});
