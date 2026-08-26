import { z } from "zod";

const rejectPlaintextPassword = <T extends z.ZodType>(schema: T) =>
	schema.refine((value) => !("password" in (value as object)), {
		message: "Plaintext password is not allowed",
	});

export const registerSchema = rejectPlaintextPassword(
	z
		.object({
			firstName: z.string().min(1),
			lastName: z.string().min(1),
			username: z.string().min(1),
			email: z.string().email(),
			passwordHash: z.string().min(1),
		})
		.strict(),
);

export const loginSchema = rejectPlaintextPassword(
	z
		.object({
			usernameOrEmail: z.string().min(1),
			passwordHash: z.string().min(1),
		})
		.strict(),
);

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
