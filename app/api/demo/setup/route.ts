import { createSupabaseAdminClient, requireRequestUser } from "@/lib/server/supabaseAdmin";
import { DEMO_EMAIL, listScreenshotDemos, seedScreenshotDemo } from "@/scripts/demo/seed-screenshot-catalog.mjs";

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") return new Response("Not found", { status: 404 });
  const url = new URL(request.url);
  if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) return new Response("Local access required", { status: 403 });
  if (request.headers.get("origin") !== url.origin) return new Response("Same-origin access required", { status: 403 });
  try {
    const user = await requireRequestUser(request);
    if (user.email?.toLowerCase() !== DEMO_EMAIL) return new Response("Use the configured demo account", { status: 403 });
    const body = await request.json();
    if (body.action === "list") return Response.json({ demos: listScreenshotDemos(), email: user.email });
    if (typeof body.key !== "string") return new Response("Demo key required", { status: 400 });
    const result = await seedScreenshotDemo(createSupabaseAdminClient(), user, body.key);
    return Response.json(result);
  } catch (error) {
    if (error instanceof Response) return error;
    return Response.json({ error: error instanceof Error ? error.message : "Unable to import demo" }, { status: 500 });
  }
}
