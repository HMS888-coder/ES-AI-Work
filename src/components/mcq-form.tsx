"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { McqResponse } from "@/lib/mcq/types";
import { Button } from "@/components/ui/button";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";

type ChoiceDraft = {
	id?: string;
	text: string;
};

type McqFormProps = {
	mode: "create" | "edit";
	mcqId?: string;
};

const DEFAULT_CHOICES: ChoiceDraft[] = [{ text: "" }, { text: "" }];

function getDuplicateChoiceIndices(choices: ChoiceDraft[]): Set<number> {
	const indices = new Set<number>();

	const textMap = new Map<string, number[]>();
	for (const [index, choice] of choices.entries()) {
		const key = choice.text.trim().toLowerCase();
		if (!key) {
			continue;
		}
		const existing = textMap.get(key) ?? [];
		existing.push(index);
		textMap.set(key, existing);
	}

	for (const duplicateIndices of textMap.values()) {
		if (duplicateIndices.length > 1) {
			for (const index of duplicateIndices) {
				indices.add(index);
			}
		}
	}

	const idMap = new Map<string, number[]>();
	for (const [index, choice] of choices.entries()) {
		if (!choice.id) {
			continue;
		}
		const existing = idMap.get(choice.id) ?? [];
		existing.push(index);
		idMap.set(choice.id, existing);
	}

	for (const duplicateIndices of idMap.values()) {
		if (duplicateIndices.length > 1) {
			for (const index of duplicateIndices) {
				indices.add(index);
			}
		}
	}

	return indices;
}

function hasDuplicateChoiceIds(choices: ChoiceDraft[]): boolean {
	const seenIds = new Set<string>();
	for (const choice of choices) {
		if (!choice.id) {
			continue;
		}
		if (seenIds.has(choice.id)) {
			return true;
		}
		seenIds.add(choice.id);
	}
	return false;
}

function hasDuplicateChoiceText(choices: ChoiceDraft[]): boolean {
	const seenText = new Set<string>();
	for (const choice of choices) {
		const key = choice.text.trim().toLowerCase();
		if (!key) {
			continue;
		}
		if (seenText.has(key)) {
			return true;
		}
		seenText.add(key);
	}
	return false;
}

export function McqForm({ mode, mcqId }: McqFormProps) {
	const router = useRouter();
	const [name, setName] = useState("");
	const [question, setQuestion] = useState("");
	const [choices, setChoices] = useState<ChoiceDraft[]>(DEFAULT_CHOICES);
	const [correctIndex, setCorrectIndex] = useState(0);
	const [error, setError] = useState<string | null>(null);
	const [showChoiceErrors, setShowChoiceErrors] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isLoading, setIsLoading] = useState(mode === "edit");

	const duplicateIndices = useMemo(
		() => getDuplicateChoiceIndices(choices),
		[choices],
	);

	useEffect(() => {
		if (mode !== "edit" || !mcqId) {
			return;
		}

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

				setName(data.mcq.name);
				setQuestion(data.mcq.question);
				setChoices(
					data.mcq.choices?.map((choice) => ({
						id: choice.id,
						text: choice.text,
					})) ?? DEFAULT_CHOICES,
				);
				const correctChoiceIndex =
					data.mcq.choices?.findIndex((choice) => choice.isCorrect) ?? 0;
				setCorrectIndex(correctChoiceIndex >= 0 ? correctChoiceIndex : 0);
			} catch {
				setError("Failed to load MCQ");
			} finally {
				setIsLoading(false);
			}
		}

		void loadMcq();
	}, [mode, mcqId]);

	function addChoice() {
		if (choices.length >= 6) {
			return;
		}
		setChoices([...choices, { text: "" }]);
	}

	function removeChoice(index: number) {
		if (choices.length <= 2) {
			return;
		}
		const nextChoices = choices.filter((_, i) => i !== index);
		setChoices(nextChoices);
		if (correctIndex >= nextChoices.length) {
			setCorrectIndex(nextChoices.length - 1);
		} else if (correctIndex > index) {
			setCorrectIndex(correctIndex - 1);
		}
	}

	function updateChoiceText(index: number, text: string) {
		setShowChoiceErrors(false);
		setChoices(
			choices.map((choice, i) => (i === index ? { ...choice, text } : choice)),
		);
	}

	function validateForm(): string | null {
		if (!name.trim()) {
			return "Name is required";
		}
		if (!question.trim()) {
			return "Question is required";
		}
		if (choices.some((choice) => !choice.text.trim())) {
			return "All choices must have text";
		}
		if (hasDuplicateChoiceIds(choices)) {
			return "Duplicate choice id is not allowed";
		}
		if (hasDuplicateChoiceText(choices)) {
			return "Duplicate choice text is not allowed";
		}
		return null;
	}

	async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setError(null);
		setShowChoiceErrors(true);

		const validationError = validateForm();
		if (validationError) {
			setError(validationError);
			return;
		}

		setIsSubmitting(true);

		const payload = {
			name: name.trim(),
			question: question.trim(),
			choices: choices.map((choice, index) => ({
				text: choice.text.trim(),
				isCorrect: index === correctIndex,
			})),
		};

		try {
			if (mode === "create") {
				const userId = localStorage.getItem("userId");
				if (!userId) {
					setError("You must be logged in to create an MCQ");
					return;
				}

				const response = await fetch("/api/mcqs", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ ...payload, createdByUserId: userId }),
				});
				const data = (await response.json()) as { success?: boolean; error?: string };

				if (!response.ok || !data.success) {
					setError(data.error ?? "Failed to create MCQ");
					return;
				}
			} else {
				const response = await fetch(`/api/mcqs/${mcqId}`, {
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(payload),
				});
				const data = (await response.json()) as { success?: boolean; error?: string };

				if (!response.ok || !data.success) {
					setError(data.error ?? "Failed to update MCQ");
					return;
				}
			}

			router.push("/mcqs");
		} catch {
			setError(mode === "create" ? "Failed to create MCQ" : "Failed to update MCQ");
		} finally {
			setIsSubmitting(false);
		}
	}

	if (isLoading) {
		return <p className="text-muted-foreground">Loading MCQ...</p>;
	}

	return (
		<form onSubmit={handleSubmit} className="space-y-6">
			<FieldGroup>
				<Field>
					<FieldLabel htmlFor="mcq-name">Name</FieldLabel>
					<Input
						id="mcq-name"
						value={name}
						onChange={(event) => setName(event.target.value)}
						required
					/>
				</Field>
				<Field>
					<FieldLabel htmlFor="mcq-question">Question</FieldLabel>
					<Textarea
						id="mcq-question"
						value={question}
						onChange={(event) => setQuestion(event.target.value)}
						required
					/>
				</Field>
				<Field>
					<FieldLabel>Choices</FieldLabel>
					<RadioGroup
						value={String(correctIndex)}
						onValueChange={(value) => setCorrectIndex(Number(value))}
						className="gap-3"
					>
						{choices.map((choice, index) => (
							<div key={choice.id ?? index} className="space-y-1">
								<div className="flex items-center gap-2">
									<RadioGroupItem value={String(index)} id={`choice-${index}`} />
									<Input
										aria-label={`Choice ${index + 1}`}
										value={choice.text}
										onChange={(event) => updateChoiceText(index, event.target.value)}
										placeholder={`Choice ${index + 1}`}
										className="flex-1"
										aria-invalid={showChoiceErrors && duplicateIndices.has(index)}
									/>
									<Button
										type="button"
										variant="outline"
										size="sm"
										disabled={choices.length <= 2}
										onClick={() => removeChoice(index)}
									>
										Remove
									</Button>
								</div>
							</div>
						))}
					</RadioGroup>
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="mt-2"
						disabled={choices.length >= 6}
						onClick={addChoice}
					>
						Add choice
					</Button>
				</Field>
				{error ? <FieldError>{error}</FieldError> : null}
				<div className="flex gap-2">
					<Button type="submit" disabled={isSubmitting}>
						Save
					</Button>
					<Button
						type="button"
						variant="outline"
						disabled={isSubmitting}
						onClick={() => router.push("/mcqs")}
					>
						Cancel
					</Button>
				</div>
			</FieldGroup>
		</form>
	);
}
