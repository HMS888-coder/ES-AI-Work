import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function Home() {
	return (
		<div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
			<div className="w-full max-w-md space-y-6 text-center">
				<div className="space-y-2">
					<h1 className="text-3xl font-semibold">Quiz Maker</h1>
					<p className="text-muted-foreground">
						Collaborate with other teachers to build a shared MCQ test bank.
					</p>
				</div>
				<div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
					<Link href="/login" className={cn(buttonVariants())}>
						Sign in
					</Link>
					<Link href="/register" className={cn(buttonVariants({ variant: "outline" }))}>
						Create account
					</Link>
				</div>
			</div>
		</div>
	);
}
