import { getCloudflareContext } from "@opennextjs/cloudflare";
import {
	handleDeleteMcq,
	handleGetMcq,
	handleUpdateMcq,
} from "@/lib/services/mcq-handlers";

type RouteContext = {
	params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
	const { env } = await getCloudflareContext();
	const { id } = await context.params;
	return handleGetMcq(env.DB, id);
}

export async function PUT(request: Request, context: RouteContext) {
	const { env } = await getCloudflareContext();
	const { id } = await context.params;
	const body = await request.json();
	return handleUpdateMcq(env.DB, id, body);
}

export async function DELETE(_request: Request, context: RouteContext) {
	const { env } = await getCloudflareContext();
	const { id } = await context.params;
	return handleDeleteMcq(env.DB, id);
}
