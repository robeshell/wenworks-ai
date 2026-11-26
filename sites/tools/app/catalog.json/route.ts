import { buildCatalog } from "@/lib/catalog";

// Static export: written once to out/catalog.json at build time.
export const dynamic = "force-static";

export function GET() {
  return Response.json(buildCatalog());
}
