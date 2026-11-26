"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { VendorBadge } from "@/components/VendorBadge";
import { formatPricePerMillion } from "@/lib/currency";
import { formatNumber } from "@/lib/format";
import {
  BUDGETS,
  HOT_RANK,
  SUB_LABEL,
  USE_CASES,
  filtersToQuery,
  parseFilters,
  pickModels,
} from "@/lib/pick";
import type { Pick, PickFilters, PickModel } from "@/lib/pick";
import { logoForCreator } from "@/lib/vendors";

function contextLabel(tokens: number | null): string {
  if (tokens === null) return "—";
  if (tokens >= 1_000_000) return `${+(tokens / 1_000_000).toFixed(1)}M`;
  return `${Math.round(tokens / 1000)}K`;
}

function budgetLabel(budget: number | null): string {
  return budget === null ? "不限" : `≤ $${budget}`;
}

function PickCard({ pick, index, showContext }: { pick: Pick; index: number; showContext: boolean }) {
  const { model } = pick;
  return (
    <li className="pick-card">
      <span className="pick-rank num" aria-hidden="true">
        {index + 1}
      </span>
      <div className="pick-main">
        <div className="pick-head">
          <span className="pick-name">{model.family}</span>
          <span className="pick-tier" data-tier={model.tier}>
            {model.tier === "rest" ? "五档以外" : model.tierLabel}
          </span>
          {model.isOpenWeights ? <span className="tier-chip">开源</span> : null}
          {model.popularityRank !== null && model.popularityRank <= HOT_RANK ? (
            <span className="tier-chip tier-chip-hot" title="OpenRouter 近 7 天使用排行">
              热门 #{model.popularityRank}
            </span>
          ) : null}
        </div>
        <div className="pick-vendor">
          <VendorBadge
            name={model.creator}
            logoSrc={logoForCreator(model.creator, model.creatorLogo)}
          />
        </div>
        <p className="pick-reason">{pick.reason}</p>
      </div>
      <dl className="pick-stats">
        <div>
          <dt>综合分</dt>
          <dd className="num">{formatNumber(model.score)}</dd>
        </div>
        {pick.subKey || pick.subMissing ? (
          <div>
            <dt>{pick.subKey ? SUB_LABEL[pick.subKey] : "Agentic"}</dt>
            {pick.subValue !== null ? (
              <dd className="num">{formatNumber(pick.subValue)}</dd>
            ) : (
              <dd className="pick-missing">暂无该项评测</dd>
            )}
          </div>
        ) : null}
        <div>
          <dt>混合单价</dt>
          <dd className="num">
            {model.blendedPerMillion === null
              ? "—"
              : formatPricePerMillion(model.blendedPerMillion)}
          </dd>
        </div>
        {showContext ? (
          <div>
            <dt>上下文</dt>
            <dd className="num">{contextLabel(model.contextLength)}</dd>
          </div>
        ) : null}
      </dl>
    </li>
  );
}

export function ModelPicker({ models }: { models: PickModel[] }) {
  const searchParams = useSearchParams();
  const [copied, setCopied] = useState(false);

  // The URL is the only state, so a shared link restores the same result.
  const filters = useMemo(
    () => parseFilters(new URLSearchParams(searchParams.toString())),
    [searchParams],
  );
  const result = useMemo(() => pickModels(models, filters), [models, filters]);
  const useCase = USE_CASES.find((item) => item.key === filters.use)!;

  function update(next: PickFilters) {
    const query = filtersToQuery(next);
    // The real pathname keeps the /models prefix; usePathname() would drop it.
    const pathname = window.location.pathname;
    window.history.replaceState(null, "", query ? `${pathname}?${query}` : pathname);
    setCopied(false);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="pick-board">
      <div className="pick-controls">
        <fieldset className="pick-field">
          <legend>使用场景</legend>
          <div className="pick-options">
            {USE_CASES.map((item) => (
              <button
                key={item.key}
                type="button"
                className="pick-option"
                aria-pressed={filters.use === item.key}
                onClick={() => update({ ...filters, use: item.key })}
              >
                {item.label}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset className="pick-field">
          <legend>预算（混合单价，美元 / 百万 token）</legend>
          <div className="pick-options">
            {BUDGETS.map((budget) => (
              <button
                key={String(budget)}
                type="button"
                className="pick-option num"
                aria-pressed={filters.budget === budget}
                onClick={() => update({ ...filters, budget })}
              >
                {budgetLabel(budget)}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset className="pick-field">
          <legend>可选条件</legend>
          <div className="pick-options">
            <label className="pick-check">
              <input
                type="checkbox"
                checked={filters.open}
                onChange={(event) => update({ ...filters, open: event.target.checked })}
              />
              只看开源
            </label>
            <label className="pick-check">
              <input
                type="checkbox"
                checked={filters.hot}
                onChange={(event) => update({ ...filters, hot: event.target.checked })}
              />
              只看热门（OpenRouter 前 {HOT_RANK}）
            </label>
          </div>
        </fieldset>
      </div>

      <section aria-live="polite">
        <div className="pick-result-head">
          <h2 className="tier-section-title">
            {result.picks.length > 0 ? `推荐 ${result.picks.length} 个` : "没有符合条件的模型"}
          </h2>
          <button type="button" className="pick-copy" onClick={copyLink}>
            {copied ? "已复制" : "复制结果链接"}
          </button>
        </div>
        <p className="pick-note">
          {useCase.note}
          {result.picks.length > 0 ? ` 符合条件的模型共 ${result.matched} 个。` : ""}
        </p>

        {result.picks.length > 0 ? (
          <ol className="pick-list">
            {result.picks.map((pick, index) => (
              <PickCard
                key={pick.model.familyKey}
                pick={pick}
                index={index}
                showContext={filters.use === "long"}
              />
            ))}
          </ol>
        ) : (
          <div className="pick-empty">
            {result.hints.length > 0 ? (
              <>
                <p>条件太严了，可以放宽其中一项：</p>
                <ul>
                  {result.hints.map((hint) => (
                    <li key={hint.label}>
                      <button
                        type="button"
                        className="pick-hint"
                        onClick={() => update(hint.filters)}
                      >
                        {hint.label}
                      </button>
                      <span>有 {hint.count} 个模型符合</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p>当前数据里没有符合这些条件的模型。</p>
            )}
          </div>
        )}
      </section>

      <p className="pick-note">
        混合单价按输入 : 输出 = 3 : 1 计算。同一模型的不同推理强度合并为一个，取综合分最高的那个。
        推荐由数据自动算出，只作参考；单项评测缺失时用综合分代替，不按 0 分计。
      </p>
    </div>
  );
}
