import { Badge, Tooltip } from '@mantine/core';
import type { Issue, Kind, Status } from '../../shared/content.mjs';
import { KIND_LABEL, STATUS_LABEL } from '../../shared/content.mjs';
import { assetUrl } from '../format';

const STATUS_COLOR: Record<Status, string> = { active: 'teal', draft: 'gray', archived: 'dark' };

export const StatusBadge = ({ status }: { status: Status }) => (
  <Badge color={STATUS_COLOR[status]} variant={status === 'active' ? 'light' : 'outline'}>{STATUS_LABEL[status]}</Badge>
);

export const KindBadge = ({ kind }: { kind: Kind }) => <Badge color="ink" variant="outline">{KIND_LABEL[kind]}</Badge>;

export function IssuesBadge({ issues }: { issues: Issue[] }) {
  if (!issues.length) return null;
  return (
    <Tooltip label={issues.map((i) => i.label).join('、')} multiline maw={260} withArrow>
      <Badge color="accent" variant="light">待补充 {issues.length}</Badge>
    </Tooltip>
  );
}

export function Thumb({ site, cover, logo }: { site: string; cover?: string; logo?: string }) {
  const src = assetUrl(site, cover || logo);
  return src ? <img className="thumb" src={src} alt="" loading="lazy" /> : <span className="thumb-empty">无图</span>;
}
