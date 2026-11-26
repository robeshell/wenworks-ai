import type { Metadata } from "next";
import { Suspense } from "react";
import { ModelPicker } from "@/components/ModelPicker";
import { PageHeading, PageShell } from "@/components/PageShell";
import { loadPopularity, loadPrices, loadRankings } from "@/lib/data";
import { formatUpdatedAt } from "@/lib/format";
import { toPickModels } from "@/lib/pick";
import { buildTiers } from "@/lib/tiers";

export const metadata: Metadata = { title: "模型选型" };

export default async function PickPage() {
  const [rankings, prices, popularity] = await Promise.all([
    loadRankings(),
    loadPrices(),
    loadPopularity(),
  ]);

  if (!rankings?.items.length) {
    return (
      <PageShell active="pick">
        <PageHeading title="模型选型" meta="暂无数据" />
        <p className="text-sm text-muted-foreground">
          暂无数据。可在项目目录运行{" "}
          <code className="font-mono text-foreground">npm run fetch</code> 后刷新。
        </p>
      </PageShell>
    );
  }

  const board = buildTiers(
    rankings.items,
    prices?.items ?? [],
    popularity?.items ?? [],
    rankings.updatedAt,
  );
  const models = toPickModels(board, rankings.items, prices?.items ?? []);

  return (
    <PageShell active="pick">
      <PageHeading
        title="模型选型"
        meta={`选场景和预算，给出 3–5 个推荐 · 数据更新至 ${formatUpdatedAt(rankings.updatedAt)}`}
      />
      {/* The picker reads its state from the URL, which a static page only has in the browser. */}
      <Suspense fallback={<p className="text-sm text-muted-foreground">正在载入…</p>}>
        <ModelPicker models={models} />
      </Suspense>
    </PageShell>
  );
}
