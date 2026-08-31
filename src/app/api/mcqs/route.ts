import { getCloudflareContext } from "@opennextjs/cloudflare";
import { handleCreateMcq, handleListMcqs } from "@/lib/services/mcq-handlers";

export async function GET() {
	const { env } = await getCloudflareContext();
	return handleListMcqs(env.DB);
}

export async function POST(request: Request) {
	const { env } = await getCloudflareContext();
	const body = await request.json();
	return handleCreateMcq(env.DB, body);
}
