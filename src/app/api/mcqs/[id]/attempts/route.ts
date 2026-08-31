import { getCloudflareContext } from "@opennextjs/cloudflare";
import { handleRecordAttempt } from "@/lib/services/mcq-handlers";

type RouteContext = {
	params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
	const { env } = await getCloudflareContext();
	const { id } = await context.params;
	const body = await request.json();
	return handleRecordAttempt(env.DB, id, body);
}
