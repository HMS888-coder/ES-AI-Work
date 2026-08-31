import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { McqPreview } from "@/components/mcq-preview";

describe("McqPreview", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.stubGlobal("localStorage", {
			setItem: vi.fn(),
			getItem: vi.fn(() => "user-1"),
			removeItem: vi.fn(),
			clear: vi.fn(),
		});
	});

	it("submits attempt and highlights the correct choice in green", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async (url: string) => {
				if (url === "/api/mcqs/mcq-1") {
					return {
						ok: true,
						status: 200,
						json: async () => ({
							success: true,
							mcq: {
								id: "mcq-1",
								name: "Biology Quiz",
								question: "Which organelle performs photosynthesis?",
								createdByUserId: "user-1",
								createdAt: "2026-08-31 10:00:00",
								updatedAt: "2026-08-31 10:00:00",
								choices: [
									{ id: "choice-1", text: "Mitochondria", isCorrect: false, position: 1 },
									{ id: "choice-2", text: "Chloroplast", isCorrect: true, position: 2 },
								],
							},
						}),
					};
				}

				return {
					ok: true,
					status: 201,
					json: async () => ({
						success: true,
						attempt: { id: "attempt-1", isCorrect: true },
					}),
				};
			}),
		);

		const user = userEvent.setup();
		render(<McqPreview mcqId="mcq-1" />);

		expect(await screen.findByText(/Which organelle performs photosynthesis/i)).toBeInTheDocument();

		await user.click(screen.getByRole("radio", { name: /chloroplast/i }));
		await user.click(screen.getByRole("button", { name: /^submit$/i }));

		await waitFor(() => {
			expect(fetch).toHaveBeenCalledWith("/api/mcqs/mcq-1/attempts", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ mcqChoiceId: "choice-2", userId: "user-1" }),
			});
		});

		expect(await screen.findByRole("status")).toHaveTextContent(/correct/i);
		expect(screen.getByText("Chloroplast").closest("div")).toHaveClass("text-green-600");
		expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
	});

	it("highlights wrong selection in red and correct answer in green", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async (url: string) => {
				if (url === "/api/mcqs/mcq-1") {
					return {
						ok: true,
						status: 200,
						json: async () => ({
							success: true,
							mcq: {
								id: "mcq-1",
								name: "Biology Quiz",
								question: "Which organelle performs photosynthesis?",
								createdByUserId: "user-1",
								createdAt: "2026-08-31 10:00:00",
								updatedAt: "2026-08-31 10:00:00",
								choices: [
									{ id: "choice-1", text: "Mitochondria", isCorrect: false, position: 1 },
									{ id: "choice-2", text: "Chloroplast", isCorrect: true, position: 2 },
								],
							},
						}),
					};
				}

				return {
					ok: true,
					status: 201,
					json: async () => ({
						success: true,
						attempt: { id: "attempt-1", isCorrect: false },
					}),
				};
			}),
		);

		const user = userEvent.setup();
		render(<McqPreview mcqId="mcq-1" />);

		expect(await screen.findByText(/Which organelle performs photosynthesis/i)).toBeInTheDocument();

		await user.click(screen.getByRole("radio", { name: /mitochondria/i }));
		await user.click(screen.getByRole("button", { name: /^submit$/i }));

		expect(await screen.findByRole("status")).toHaveTextContent(/incorrect/i);
		expect(screen.getByText("Mitochondria").closest("div")).toHaveClass("text-red-600");
		expect(screen.getByText("Chloroplast").closest("div")).toHaveClass("text-green-600");
	});
});
