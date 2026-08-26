"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { hashPassword } from "@/lib/auth/hash-password";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function LoginForm({
	className,
	...props
}: React.ComponentProps<"div">) {
	const router = useRouter();
	const [error, setError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setError(null);
		setIsSubmitting(true);

		const formData = new FormData(event.currentTarget);
		const usernameOrEmail = String(formData.get("usernameOrEmail") ?? "").trim();
		const password = String(formData.get("password") ?? "");

		try {
			const passwordHash = await hashPassword(password);
			const response = await fetch("/api/auth/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ usernameOrEmail, passwordHash }),
			});

			const data = (await response.json()) as {
				success?: boolean;
				error?: string;
				userId?: string;
			};

			if (!response.ok || !data.success) {
				setError("Invalid username or password");
				return;
			}

			if (data.userId) {
				localStorage.setItem("userId", data.userId);
			}

			router.push("/mcqs");
		} catch {
			setError("Invalid username or password");
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<div className={cn("flex flex-col gap-6", className)} {...props}>
			<Card>
				<CardHeader>
					<CardTitle>Login to your account</CardTitle>
					<CardDescription>
						Enter your username or email below to login to your account
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit}>
						<FieldGroup>
							<Field>
								<FieldLabel htmlFor="usernameOrEmail">Username or Email</FieldLabel>
								<Input
									id="usernameOrEmail"
									name="usernameOrEmail"
									type="text"
									placeholder="jsmith or m@example.com"
									required
								/>
							</Field>
							<Field>
								<FieldLabel htmlFor="password">Password</FieldLabel>
								<Input id="password" name="password" type="password" required />
							</Field>
							{error ? <FieldError>{error}</FieldError> : null}
							<Field>
								<Button type="submit" disabled={isSubmitting}>
									Login
								</Button>
								<FieldDescription className="text-center">
									Don&apos;t have an account?{" "}
									<Link href="/register" className="underline-offset-4 hover:underline">
										Register
									</Link>
								</FieldDescription>
							</Field>
						</FieldGroup>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
