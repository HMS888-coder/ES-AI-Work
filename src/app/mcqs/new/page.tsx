import Link from "next/link";
import { McqForm } from "@/components/mcq-form";
import { Button } from "@/components/ui/button";

export default function NewMcqPage() {
	return (
		<div className="mx-auto flex min-h-svh w-full max-w-3xl flex-col gap-6 p-6 md:p-10">
			<div className="flex items-center justify-between gap-4">
				<h1 className="text-2xl font-semibold">Create MCQ</h1>
				<Button nativeButton={false} variant="outline" render={<Link href="/mcqs" />}>
					Back to list
				</Button>
			</div>
			<McqForm mode="create" />
		</div>
	);
}
