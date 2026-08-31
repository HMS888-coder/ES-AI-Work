"use client";

import { useState } from "react";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type DeleteMcqDialogProps = {
	mcqId: string;
	mcqName: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onDeleted?: () => void;
};

export function DeleteMcqDialog({
	mcqId,
	mcqName,
	open,
	onOpenChange,
	onDeleted,
}: DeleteMcqDialogProps) {
	const [error, setError] = useState<string | null>(null);
	const [isDeleting, setIsDeleting] = useState(false);

	async function handleDelete() {
		setError(null);
		setIsDeleting(true);

		try {
			const response = await fetch(`/api/mcqs/${mcqId}`, { method: "DELETE" });
			const data = (await response.json()) as { success?: boolean; error?: string };

			if (!response.ok || !data.success) {
				setError(data.error ?? "Failed to delete MCQ");
				return;
			}

			onOpenChange(false);
			onDeleted?.();
		} catch {
			setError("Failed to delete MCQ");
		} finally {
			setIsDeleting(false);
		}
	}

	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Delete MCQ?</AlertDialogTitle>
					<AlertDialogDescription>
						This action cannot be undone. This will permanently delete &quot;{mcqName}&quot;
						and all related choices and attempts.
					</AlertDialogDescription>
				</AlertDialogHeader>
				{error ? <p role="alert">{error}</p> : null}
				<AlertDialogFooter>
					<AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
					<AlertDialogAction
						variant="destructive"
						disabled={isDeleting}
						onClick={(event) => {
							event.preventDefault();
							void handleDelete();
						}}
					>
						Delete
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
