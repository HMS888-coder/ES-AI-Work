"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { McqResponse } from "@/lib/mcq/types";
import { Button } from "@/components/ui/button";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

type McqPreviewProps = {
	mcqId: string;
};

function getChoiceRowClassName(
	choiceId: string,
	hasSubmitted: boolean,
	correctChoiceId: string | undefined,
	submittedChoiceId: string | null,
): string {
	if (!hasSubmitted) {
		return "";
	}

	if (choiceId === correctChoiceId) {
		return "text-green-600 dark:text-green-400 font-medium";
	}

	if (choiceId === submittedChoiceId) {
		return "text-red-600 dark:text-red-400 font-medium";
	}

	return "";
}

export function McqPreview({ mcqId }: McqPreviewProps) {
	const [mcq, setMcq] = useState<McqResponse | null>(null);
	const [selectedChoiceId, setSelectedChoiceId] = useState<string>("");
	const [submittedChoiceId, setSubmittedChoiceId] = useState<string | null>(null);
	const [hasSubmitted, setHasSubmitted] = useState(false);
	const [feedback, setFeedback] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isSubmitting, setIsSubmitting] = useState(false);

	useEffect(() => {
		async function loadMcq() {
			setIsLoading(true);
			setError(null);

			try {
				const response = await fetch(`/api/mcqs/${mcqId}`);
				const data = (await response.json()) as {
					success?: boolean;
					mcq?: McqResponse;
					error?: string;
				};

				if (!response.ok || !data.success || !data.mcq) {
					setError(data.error ?? "Failed to load MCQ");
					return;
				}

				setMcq(data.mcq);
			} catch {
				setError("Failed to load MCQ");
			} finally {
				setIsLoading(false);
			}
		}

		void loadMcq();
	}, [mcqId]);

	async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setError(null);
		setFeedback(null);

		if (!selectedChoiceId) {
			setError("Select an answer before submitting");
			return;
		}

		const userId = localStorage.getItem("userId");
		if (!userId) {
			setError("You must be logged in to submit an attempt");
			return;
		}

		setIsSubmitting(true);

		try {
			const response = await fetch(`/api/mcqs/${mcqId}/attempts`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ mcqChoiceId: selectedChoiceId, userId }),
			});
			const data = (await response.json()) as {
				success?: boolean;
				attempt?: { isCorrect?: boolean };
				error?: string;
			};

			if (!response.ok || !data.success) {
				setError(data.error ?? "Failed to submit attempt");
				return;
			}

			setSubmittedChoiceId(selectedChoiceId);
			setHasSubmitted(true);
			setFeedback(data.attempt?.isCorrect ? "Correct!" : "Incorrect.");
		} catch {
			setError("Failed to submit attempt");
		} finally {
			setIsSubmitting(false);
		}
	}

	if (isLoading) {
		return <p className="text-muted-foreground">Loading preview...</p>;
	}

	if (error && !mcq) {
		return <p role="alert">{error}</p>;
	}

	if (!mcq) {
		return <p role="alert">MCQ not found</p>;
	}

	const correctChoiceId = mcq.choices?.find((choice) => choice.isCorrect)?.id;

	return (
		<form onSubmit={handleSubmit} className="space-y-6">
			<div className="space-y-2">
				<h2 className="text-xl font-semibold">{mcq.name}</h2>
				<p>{mcq.question}</p>
			</div>
			<FieldGroup>
				<Field>
					<FieldLabel>Select your answer</FieldLabel>
					<RadioGroup
						value={selectedChoiceId}
						onValueChange={setSelectedChoiceId}
						className="gap-3"
						disabled={hasSubmitted}
					>
						{mcq.choices?.map((choice) => (
							<div
								key={choice.id}
								className={cn(
									"flex items-center gap-2",
									getChoiceRowClassName(
										choice.id,
										hasSubmitted,
										correctChoiceId,
										submittedChoiceId,
									),
								)}
							>
								<RadioGroupItem
									value={choice.id}
									id={`preview-${choice.id}`}
									disabled={hasSubmitted}
								/>
								<label htmlFor={`preview-${choice.id}`} className="text-sm">
									{choice.text}
								</label>
							</div>
						))}
					</RadioGroup>
				</Field>
				{error ? <FieldError>{error}</FieldError> : null}
				{feedback ? <p role="status">{feedback}</p> : null}
				<div className="flex gap-2">
					<Button type="submit" disabled={isSubmitting || hasSubmitted}>
						Submit answer
					</Button>
					<Button
						type="button"
						nativeButton={false}
						variant="outline"
						render={<Link href="/mcqs" />}
					>
						Cancel
					</Button>
				</div>
			</FieldGroup>
		</form>
	);
}
