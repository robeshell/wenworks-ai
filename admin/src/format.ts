import type { Kind } from '../shared/content.mjs';

const ZONE = 'Asia/Shanghai';

export function when(iso?: string | null): string {
  if (!iso) return '—';
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return '—';
  const diff = (Date.now() - t.getTime()) / 1000;
  if (diff < 60) return '刚刚';
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} 天前`;
  return exact(iso);
}

export function exact(iso?: string | null): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('zh-CN', { timeZone: ZONE, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso));
}

/** Where an entry shows on the public site. */
export function liveUrl(site: string, kind: Kind, slug: string): string {
  return kind === 'tool' ? `${site}/tools/?kind=tool#resource-${slug}` : `${site}/tools/${kind}s/${slug}/`;
}

/**
 * An image path from the catalog (/logos/x.png) as something the admin can show:
 * the admin serves images uploaded but not yet published, and sends the rest on to the site.
 */
export function assetUrl(_site: string, path?: string): string {
  if (!path) return '';
  return /^https?:\/\//.test(path) ? path : `/api/assets${path}`;
}

export const slugify = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
