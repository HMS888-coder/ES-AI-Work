"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
	const router = useRouter();
	const [isSubmitting, setIsSubmitting] = useState(false);

	async function handleLogout() {
		setIsSubmitting(true);

		try {
			await fetch("/api/auth/logout", { method: "POST" });
			localStorage.removeItem("userId");
			router.push("/login");
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<Button type="button" variant="outline" onClick={handleLogout} disabled={isSubmitting}>
			Log out
		</Button>
	);
}
