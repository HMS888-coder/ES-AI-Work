"use client";

import Link from "next/link";
import { MoreVerticalIcon } from "lucide-react";
import { useState } from "react";
import { DeleteMcqDialog } from "@/components/delete-mcq-dialog";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type McqRowActionsProps = {
	mcqId: string;
	mcqName: string;
	onDeleted?: () => void;
};

export function McqRowActions({ mcqId, mcqName, onDeleted }: McqRowActionsProps) {
	const [deleteOpen, setDeleteOpen] = useState(false);

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger
					render={
						<Button variant="ghost" size="icon-sm" aria-label="Open actions menu">
							<MoreVerticalIcon />
						</Button>
					}
				/>
				<DropdownMenuContent align="end">
					<DropdownMenuItem render={<Link href={`/mcqs/${mcqId}/edit`} />}>
						Edit
					</DropdownMenuItem>
					<DropdownMenuItem render={<Link href={`/mcqs/${mcqId}/preview`} />}>
						Preview
					</DropdownMenuItem>
					<DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
						Delete
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
			<DeleteMcqDialog
				mcqId={mcqId}
				mcqName={mcqName}
				open={deleteOpen}
				onOpenChange={setDeleteOpen}
				onDeleted={onDeleted}
			/>
		</>
	);
}
