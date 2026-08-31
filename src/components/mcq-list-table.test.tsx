import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { McqListTable, truncateQuestion } from "@/components/mcq-list-table";

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

	it("shows a warning and create link when no MCQs exist", async () => {
		const onEmptyChange = vi.fn();
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => ({
				ok: true,
				status: 200,
				json: async () => ({ success: true, mcqs: [] }),
			})),
		);

		render(<McqListTable onEmptyChange={onEmptyChange} />);

		expect(await screen.findByRole("alert")).toHaveTextContent(
			/No MCQs in your test bank yet/i,
		);
		expect(screen.getByRole("button", { name: /create mcq/i })).toHaveAttribute(
			"href",
			"/mcqs/new",
		);
		expect(onEmptyChange).toHaveBeenCalledWith(true);
	});

	it("shows truncated question text with full text in tooltip on hover", async () => {
		const longQuestion = `${"A".repeat(81)}?`;
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => ({
				ok: true,
				status: 200,
				json: async () => ({
					success: true,
					mcqs: [
						{
							id: "mcq-2",
							name: "Long Question Quiz",
							question: longQuestion,
							createdByUserId: "user-1",
							createdAt: "2026-08-31 10:00:00",
							updatedAt: "2026-08-31 10:00:00",
						},
					],
				}),
			})),
		);

		const user = userEvent.setup();
		render(<McqListTable />);

		const truncatedText = truncateQuestion(longQuestion);
		const trigger = await screen.findByText(truncatedText);
		expect(trigger).toBeInTheDocument();

		await user.hover(trigger);
		expect(await screen.findByText(longQuestion)).toBeInTheDocument();
	});
});
