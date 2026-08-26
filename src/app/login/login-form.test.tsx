import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LoginForm } from "@/components/login-form";

const push = vi.fn();

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push }),
}));

vi.mock("@/lib/auth/hash-password", () => ({
	hashPassword: vi.fn(async (password: string) => `hashed-${password}`),
}));

describe("LoginForm", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => ({
				ok: true,
				status: 200,
				json: async () => ({
					success: true,
					userId: "user-1",
					redirectUrl: "/mcqs",
				}),
			})),
		);
		vi.stubGlobal("localStorage", {
			setItem: vi.fn(),
			getItem: vi.fn(),
			removeItem: vi.fn(),
			clear: vi.fn(),
		});
	});

	it("renders login fields", () => {
		render(<LoginForm />);

		expect(screen.getByLabelText(/username or email/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
	});

	it("submits hashed password to login API", async () => {
		const user = userEvent.setup();
		render(<LoginForm />);

		await user.type(screen.getByLabelText(/username or email/i), "jsmith");
		await user.type(screen.getByLabelText(/^password$/i), "password123");
		await user.click(screen.getByRole("button", { name: /^login$/i }));

		await waitFor(() => {
			expect(fetch).toHaveBeenCalledWith("/api/auth/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					usernameOrEmail: "jsmith",
					passwordHash: "hashed-password123",
				}),
			});
		});

		expect(push).toHaveBeenCalledWith("/mcqs");
	});

	it("shows generic error on 401", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => ({
				ok: false,
				status: 401,
				json: async () => ({
					success: false,
					error: "Invalid username or password",
				}),
			})),
		);

		const user = userEvent.setup();
		render(<LoginForm />);

		await user.type(screen.getByLabelText(/username or email/i), "jsmith");
		await user.type(screen.getByLabelText(/^password$/i), "wrong");
		await user.click(screen.getByRole("button", { name: /^login$/i }));

		expect(await screen.findByRole("alert")).toHaveTextContent(
			/Invalid username or password/i,
		);
	});
});
