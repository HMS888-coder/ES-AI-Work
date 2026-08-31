import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DeleteMcqDialog } from "@/components/delete-mcq-dialog";

describe("DeleteMcqDialog", () => {
	const onOpenChange = vi.fn();
	const onDeleted = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => ({
				ok: true,
				status: 200,
				json: async () => ({ success: true }),
			})),
		);
	});

	it("calls DELETE when delete is confirmed", async () => {
		const user = userEvent.setup();
		render(
			<DeleteMcqDialog
				mcqId="mcq-1"
				mcqName="Biology Quiz"
				open
				onOpenChange={onOpenChange}
				onDeleted={onDeleted}
			/>,
		);

		await user.click(screen.getByRole("button", { name: /delete/i }));

		await waitFor(() => {
			expect(fetch).toHaveBeenCalledWith("/api/mcqs/mcq-1", { method: "DELETE" });
		});

		expect(onDeleted).toHaveBeenCalled();
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});
});
