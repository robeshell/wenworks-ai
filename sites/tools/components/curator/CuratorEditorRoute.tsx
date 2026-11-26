"use client";
import { useSearchParams } from "next/navigation";
import { ResourceWorkspace } from "./ResourceWorkspace";
import { isEnabledContentBlockId } from "@/lib/content-blocks";

export function CuratorEditorRoute() {
  const params = useSearchParams();
  const block = params.get("block");
  return <ResourceWorkspace key={params.get("workspace") || params.get("slug") || "new"} workspaceId={params.get("workspace") || undefined} slug={params.get("slug") || undefined} block={block && isEnabledContentBlockId(block) ? block : "tool"} />;
}
