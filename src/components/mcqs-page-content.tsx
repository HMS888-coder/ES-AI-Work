"use client";

import Link from "next/link";
import { useState } from "react";
import { LogoutButton } from "@/components/logout-button";
import { McqListTable } from "@/components/mcq-list-table";
import { Button } from "@/components/ui/button";

export function McqsPageContent() {
	const [listIsEmpty, setListIsEmpty] = useState<boolean | null>(null);

	return (
		<div className="mx-auto flex min-h-svh w-full max-w-5xl flex-col gap-6 p-6 md:p-10">
			<div className="flex items-start justify-between gap-4">
				<div className="space-y-2">
					<h1 className="text-2xl font-semibold">MCQ Test Bank</h1>
					<p className="text-muted-foreground">
						Create, edit, preview, and manage multiple-choice questions.
					</p>
				</div>
				<div className="flex shrink-0 items-center gap-2">
					{listIsEmpty !== true ? (
						<Button nativeButton={false} render={<Link href="/mcqs/new" />}>
							Create MCQ
						</Button>
					) : null}
					<LogoutButton />
				</div>
			</div>
			<McqListTable onEmptyChange={setListIsEmpty} />
		</div>
	);
}
