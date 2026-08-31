"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { McqListItem } from "@/lib/mcq/types";
import { McqRowActions } from "@/components/mcq-row-actions";
import { Button } from "@/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";

const QUESTION_TRUNCATE_LENGTH = 80;

export function truncateQuestion(question: string, maxLength = QUESTION_TRUNCATE_LENGTH): string {
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

function QuestionCell({ question }: { question: string }) {
	const displayText = truncateQuestion(question);
	const isTruncated = question.length > QUESTION_TRUNCATE_LENGTH;

	if (!isTruncated) {
		return <span>{displayText}</span>;
	}

	return (
		<Tooltip>
			<TooltipTrigger className="cursor-help truncate text-left">{displayText}</TooltipTrigger>
			<TooltipContent className="max-w-sm">{question}</TooltipContent>
		</Tooltip>
	);
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
		return (
			<div
				role="alert"
				className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4 text-amber-950 dark:text-amber-100"
			>
				<p className="font-medium">No MCQs in your test bank yet.</p>
				<p className="mt-1 text-sm">Create an MCQ to get started.</p>
				<Button
					nativeButton={false}
					className="mt-3"
					render={<Link href="/mcqs/new" />}
				>
					Create MCQ
				</Button>
			</div>
		);
	}

	return (
		<TooltipProvider>
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
								<QuestionCell question={mcq.question} />
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
		</TooltipProvider>
	);
}
