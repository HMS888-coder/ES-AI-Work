"use client";

import { useCallback, useEffect, useState } from "react";
import type { McqListItem } from "@/lib/mcq/types";
import { McqRowActions } from "@/components/mcq-row-actions";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

function truncateQuestion(question: string, maxLength = 80): string {
	if (question.length <= maxLength) {
		return question;
	}
	return `${question.slice(0, maxLength)}...`;
}

async function fetchMcqs(): Promise<{ mcqs: McqListItem[]; error: string | null }> {
	try {
		const response = await fetch("/api/mcqs");
		const data = (await response.json()) as {
			success?: boolean;
			mcqs?: McqListItem[];
			error?: string;
		};

		if (!response.ok || !data.success || !data.mcqs) {
			return { mcqs: [], error: data.error ?? "Failed to load MCQs" };
		}

		return { mcqs: data.mcqs, error: null };
	} catch {
		return { mcqs: [], error: "Failed to load MCQs" };
	}
}

export function McqListTable() {
	const [mcqs, setMcqs] = useState<McqListItem[]>([]);
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		let cancelled = false;

		void fetchMcqs().then(({ mcqs: nextMcqs, error: nextError }) => {
			if (cancelled) {
				return;
			}

			setMcqs(nextMcqs);
			setError(nextError);
			setIsLoading(false);
		});

		return () => {
			cancelled = true;
		};
	}, []);

	const refreshMcqs = useCallback(async () => {
		setIsLoading(true);
		setError(null);

		const { mcqs: nextMcqs, error: nextError } = await fetchMcqs();
		setMcqs(nextMcqs);
		setError(nextError);
		setIsLoading(false);
	}, []);

	if (isLoading) {
		return <p className="text-muted-foreground">Loading MCQs...</p>;
	}

	if (error) {
		return <p role="alert">{error}</p>;
	}

	if (mcqs.length === 0) {
		return <p className="text-muted-foreground">No MCQs yet. Create your first question.</p>;
	}

	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>Name</TableHead>
					<TableHead>Question</TableHead>
					<TableHead className="w-[70px]">Actions</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{mcqs.map((mcq) => (
					<TableRow key={mcq.id}>
						<TableCell className="font-medium">{mcq.name}</TableCell>
						<TableCell className="max-w-md truncate">
							{truncateQuestion(mcq.question)}
						</TableCell>
						<TableCell>
							<McqRowActions
								mcqId={mcq.id}
								mcqName={mcq.name}
								onDeleted={() => void refreshMcqs()}
							/>
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}
