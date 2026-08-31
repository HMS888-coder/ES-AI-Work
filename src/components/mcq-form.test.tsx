import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { McqForm } from "@/components/mcq-form";

const push = vi.fn();

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push }),
}));

describe("McqForm", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => ({
				ok: true,
				status: 201,
				json: async () => ({ success: true }),
			})),
		);
		vi.stubGlobal("localStorage", {
			setItem: vi.fn(),
			getItem: vi.fn(() => "user-1"),
			removeItem: vi.fn(),
			clear: vi.fn(),
		});
	});

	it("submits create payload and redirects to /mcqs", async () => {
		const user = userEvent.setup();
		render(<McqForm mode="create" />);

		await user.type(screen.getByLabelText(/^name$/i), "Biology Quiz");
		await user.type(screen.getByLabelText(/^question$/i), "Which organelle performs photosynthesis?");
		await user.type(screen.getByLabelText(/^choice 1$/i), "Mitochondria");
		await user.type(screen.getByLabelText(/^choice 2$/i), "Chloroplast");
		await user.click(screen.getByRole("button", { name: /save/i }));

		await waitFor(() => {
			expect(fetch).toHaveBeenCalled();
		});

		const [, requestInit] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
		expect(requestInit.method).toBe("POST");
		expect(requestInit.headers).toEqual({ "Content-Type": "application/json" });
		expect(JSON.parse(String(requestInit.body))).toEqual({
			name: "Biology Quiz",
			question: "Which organelle performs photosynthesis?",
			createdByUserId: "user-1",
			choices: [
				{ text: "Mitochondria", isCorrect: true },
				{ text: "Chloroplast", isCorrect: false },
			],
		});

		expect(push).toHaveBeenCalledWith("/mcqs");
	});

	it("navigates back to /mcqs on cancel", async () => {
		const user = userEvent.setup();
		render(<McqForm mode="create" />);

		await user.click(screen.getByRole("button", { name: /cancel/i }));

		expect(push).toHaveBeenCalledWith("/mcqs");
		expect(fetch).not.toHaveBeenCalled();
	});

	it("shows validation error when choice text is empty", async () => {
		const user = userEvent.setup();
		render(<McqForm mode="create" />);

		await user.type(screen.getByLabelText(/^name$/i), "Biology Quiz");
		await user.type(screen.getByLabelText(/^question$/i), "Question?");
		await user.click(screen.getByRole("button", { name: /save/i }));

		expect(await screen.findByRole("alert")).toHaveTextContent(/all choices must have text/i);
		expect(fetch).not.toHaveBeenCalled();
	});

	it("shows duplicate choice errors on save and blocks submit", async () => {
		const user = userEvent.setup();
		render(<McqForm mode="create" />);

		await user.type(screen.getByLabelText(/^name$/i), "Biology Quiz");
		await user.type(screen.getByLabelText(/^question$/i), "Which organelle performs photosynthesis?");
		await user.type(screen.getByLabelText(/^choice 1$/i), "Chloroplast");
		await user.type(screen.getByLabelText(/^choice 2$/i), "Chloroplast");

		expect(screen.queryByText(/^Duplicate choice$/i)).not.toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: /save/i }));

		expect(await screen.findByText(/duplicate choice text is not allowed/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/^choice 1$/i)).toHaveAttribute("aria-invalid", "true");
		expect(screen.getByLabelText(/^choice 2$/i)).toHaveAttribute("aria-invalid", "true");
		expect(screen.queryByText(/^Duplicate choice$/i)).not.toBeInTheDocument();
		expect(fetch).not.toHaveBeenCalled();
	});
});
