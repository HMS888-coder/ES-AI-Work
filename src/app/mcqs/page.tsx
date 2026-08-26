import { LogoutButton } from "@/components/logout-button";

export default function McqsPage() {
	return (
		<div className="mx-auto flex min-h-svh w-full max-w-2xl flex-col gap-6 p-6 md:p-10">
			<div className="flex items-start justify-between gap-4">
				<div className="space-y-2">
					<h1 className="text-2xl font-semibold">MCQ Test Bank</h1>
					<p className="text-muted-foreground">
						This area will be built in the next sprint. You&apos;ll create and manage
						multiple-choice questions here.
					</p>
				</div>
				<LogoutButton />
			</div>
		</div>
	);
}
