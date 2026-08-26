import { getCloudflareContext } from "@opennextjs/cloudflare";
import { handleRegister } from "@/lib/services/auth-handlers";

export async function POST(request: Request) {
	const { env } = await getCloudflareContext();
	const body = await request.json();
	return handleRegister(env.DB, body);
}
