import { handleLogout } from "@/lib/services/auth-handlers";

export async function POST() {
	return handleLogout();
}
