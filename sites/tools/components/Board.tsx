"use client";

import Link from "next/link";
import { CopyPromptButton } from "@/components/CopyPromptButton";
import { useCatalog, type PublicBoard } from "@/components/CatalogNavigation";
import { ToolLogo } from "@/components/ToolLogo";
import { localePath, ui } from "@/lib/i18n";
import { withBasePath } from "@/lib/logo";
import type { PublicContentDocument } from "@/lib/public-content";
import { categoriesForBlock, categoryOf } from "@/lib/tags";
import { text, type Locale, type Tool } from "@/lib/types";
import styles from "./Board.module.css";

/**
 * One card shape for every board: the cover captured from the official page,
 * then category, name and the one-line judgement. Tools open the official
 * site; content documents open the reading page. Cards run as one continuous
 * grid ordered by category — per-category rows left most of the page empty
 * when a category held one or two entries.
 */
type Card = {
  id: string;
  name: string;
  logo?: string;
  cover?: string;
  lead: string;
  href: string;
  external: boolean;
  prompt?: string;
  category: string;
};

// Read the tool board with related tasks next to one another.
const TOOL_CATEGORY_ORDER = ["coding", "infra", "chat", "agent", "image", "video", "audio", "research", "automation"];

function toolCard(tool: Tool, locale: Locale): Card {
  return {
    id: tool.id,
    name: tool.name,
    logo: tool.logo,
    cover: tool.cover,
    lead: text(tool.verdict, locale),
    href: tool.url,
    external: true,
    category: categoryOf(tool, "tool"),
  };
}

function contentCard(item: PublicContentDocument, locale: Locale): Card {
  return {
    id: item.id,
    name: item.title,
    logo: item.logo,
    cover: item.cover,
    lead: text(item.summary, locale),
    href: localePath(locale, `/${item.blockType}s/${item.slug}/`),
    external: false,
    prompt: item.prompt,
    category: categoryOf(item, item.blockType),
  };
}

function orderCards(cards: Card[], block: PublicBoard) {
  const ids = categoriesForBlock(block).map((category) => category.id);
  const order = block === "tool" ? [...TOOL_CATEGORY_ORDER, ...ids.filter((id) => !TOOL_CATEGORY_ORDER.includes(id))] : ids;
  const rank = (id: string) => (id && order.includes(id) ? order.indexOf(id) : order.length);
  // Array.prototype.sort is stable, so entries keep curator order within a category.
  return [...cards].sort((a, b) => rank(a.category) - rank(b.category));
}

function CardMedia({ card }: { card: Card }) {
  if (card.cover) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className={styles.cover} src={withBasePath(card.cover)} alt="" loading="lazy" decoding="async" />;
  }
  if (card.prompt) {
    return <span className={styles.excerpt} aria-hidden="true">{card.prompt.slice(0, 360)}</span>;
  }
  return (
    <span className={styles.placeholder} aria-hidden="true">
      <ToolLogo tool={{ id: card.id, name: card.name, logo: card.logo }} size={44} />
    </span>
  );
}

function BoardCard({ card, locale, categoryLabel }: { card: Card; locale: Locale; categoryLabel: string }) {
  const t = ui(locale);
  return (
    <li className={styles.card}>
      <span className={styles.media}><CardMedia card={card} /></span>
      <span className={styles.category}>{categoryLabel}</span>
      <h3 className={styles.name}>
        <span className={styles.logo}>
          <ToolLogo tool={{ id: card.id, name: card.name, logo: card.logo }} size={16} />
        </span>
        {card.external ? (
          <a href={card.href} className={styles.link} target="_blank" rel="noreferrer">
            {card.name}
            <span className={styles.external} aria-hidden="true">↗</span>
            <span className="sr-only"> ({t.opensExternal})</span>
          </a>
        ) : (
          <Link href={card.href} className={styles.link} transitionTypes={["nav-forward"]}>
            {card.name}
          </Link>
        )}
        {card.prompt ? <CopyPromptButton value={card.prompt} locale={locale} className={styles.copy} /> : null}
      </h3>
      <p className={styles.lead}>{card.lead}</p>
    </li>
  );
}

export function Board({
  tools,
  content,
  locale,
}: {
  tools: Tool[];
  content: PublicContentDocument[];
  locale: Locale;
}) {
  const t = ui(locale);
  const { activeKind } = useCatalog();

  const cards = orderCards(activeKind === "tool"
    ? tools.map((tool) => toolCard(tool, locale))
    : content.filter((item) => item.blockType === activeKind).map((item) => contentCard(item, locale)), activeKind);
  const labels = new Map(categoriesForBlock(activeKind).map((category) => [category.id, category.label[locale]]));

  return (
    <div
      id="catalog-panel"
      role="tabpanel"
      aria-labelledby={`catalog-tab-${activeKind}`}
      tabIndex={0}
      className={styles.board}
    >
      {cards.length === 0 ? (
        <p className={styles.empty}>{t.empty}</p>
      ) : (
        <ul className={styles.grid}>
          {cards.map((card) => (
            <BoardCard key={card.id} card={card} locale={locale} categoryLabel={labels.get(card.category) ?? t.categoryOther} />
          ))}
        </ul>
      )}
    </div>
  );
}
