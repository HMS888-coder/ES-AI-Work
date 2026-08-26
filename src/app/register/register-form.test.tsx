import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RegisterForm } from "@/components/register-form";

const push = vi.fn();

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push }),
}));

vi.mock("@/lib/auth/hash-password", () => ({
	hashPassword: vi.fn(async (password: string) => `hashed-${password}`),
}));

describe("RegisterForm", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => ({
				ok: true,
				status: 201,
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

	it("renders register fields", () => {
		render(<RegisterForm />);

		expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
	});

	it("submits hashed password to register API", async () => {
		const user = userEvent.setup();
		render(<RegisterForm />);

		await user.type(screen.getByLabelText(/first name/i), "Jane");
		await user.type(screen.getByLabelText(/last name/i), "Smith");
		await user.type(screen.getByLabelText(/username/i), "jsmith");
		await user.type(screen.getByLabelText(/^email$/i), "jsmith@school.edu");
		await user.type(screen.getByLabelText(/^password$/i), "password123");
		await user.type(screen.getByLabelText(/confirm password/i), "password123");
		await user.click(screen.getByRole("button", { name: /create account/i }));

		await waitFor(() => {
			expect(fetch).toHaveBeenCalledWith("/api/auth/register", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					firstName: "Jane",
					lastName: "Smith",
					username: "jsmith",
					email: "jsmith@school.edu",
					passwordHash: "hashed-password123",
				}),
			});
		});

		expect(push).toHaveBeenCalledWith("/mcqs");
	});

	it("shows validation error when passwords do not match", async () => {
		const user = userEvent.setup();
		render(<RegisterForm />);

		await user.type(screen.getByLabelText(/first name/i), "Jane");
		await user.type(screen.getByLabelText(/last name/i), "Smith");
		await user.type(screen.getByLabelText(/username/i), "jsmith");
		await user.type(screen.getByLabelText(/^email$/i), "jsmith@school.edu");
		await user.type(screen.getByLabelText(/^password$/i), "password123");
		await user.type(screen.getByLabelText(/confirm password/i), "different");
		await user.click(screen.getByRole("button", { name: /create account/i }));

		expect(await screen.findByRole("alert")).toHaveTextContent(/passwords do not match/i);
		expect(fetch).not.toHaveBeenCalled();
	});

	it("shows API error message on failed registration", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => ({
				ok: false,
				status: 409,
				json: async () => ({
					success: false,
					error: "Username or email already exists",
				}),
			})),
		);

		const user = userEvent.setup();
		render(<RegisterForm />);

		await user.type(screen.getByLabelText(/first name/i), "Jane");
		await user.type(screen.getByLabelText(/last name/i), "Smith");
		await user.type(screen.getByLabelText(/username/i), "jsmith");
		await user.type(screen.getByLabelText(/^email$/i), "jsmith@school.edu");
		await user.type(screen.getByLabelText(/^password$/i), "password123");
		await user.type(screen.getByLabelText(/confirm password/i), "password123");
		await user.click(screen.getByRole("button", { name: /create account/i }));

		expect(await screen.findByRole("alert")).toHaveTextContent(
			/Username or email already exists/i,
		);
	});
});
