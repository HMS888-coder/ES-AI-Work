export type McqChoiceResponse = {
	id: string;
	text: string;
	isCorrect: boolean;
	position: number;
};

export type McqResponse = {
	id: string;
	name: string;
	question: string;
	createdByUserId: string;
	createdAt: string;
	updatedAt: string;
	choices?: McqChoiceResponse[];
};

export type McqListItem = Omit<McqResponse, "choices">;
