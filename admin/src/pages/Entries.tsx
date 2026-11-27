import { ActionIcon, Anchor, Button, Checkbox, Group, Pagination, Paper, SegmentedControl, Select, Stack, Switch, Table, Text, TextInput, Title, Tooltip } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconExternalLink, IconSearch } from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import type { Kind, Status } from '../../shared/content.mjs';
import { KIND_LABEL, KINDS, STATUS_LABEL } from '../../shared/content.mjs';
import { api, useApi } from '../api';
import { useShared } from '../App';
import { IssuesBadge, KindBadge, StatusBadge, Thumb } from '../components/bits';
import { NewEntryButton } from '../components/NewEntry';
import { exact, liveUrl, when } from '../format';
import type { EntrySummary } from '../types';

const PAGE = 20;

export function Entries() {
  const [params, setParams] = useSearchParams();
  const kind = (params.get('kind') as Kind | null) ?? null;
  const status = (params.get('status') as Status | null) ?? null;
  const category = params.get('category');
  const todo = params.get('todo') === '1';
  const [q, setQ] = useState(params.get('q') ?? '');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const { data, reload } = useApi<EntrySummary[]>('/entries');
  const { status: site, taxonomy } = useShared();
  const navigate = useNavigate();

  const set = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };
  useEffect(() => {
    setPage(1);
    setSelected([]);
  }, [kind, status, category, todo, q]);

  const categoryLabel = useMemo(() => new Map(taxonomy.categories.map((c) => [c.id, c.label.zh])), [taxonomy]);
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (data ?? []).filter(
      (e) =>
        (!kind || e.kind === kind) &&
        (!status || e.status === status) &&
        (!category || e.category === category) &&
        (!todo || (e.issues.length && e.status !== 'archived')) &&
        (!needle || [e.title, e.slug, e.line].some((t) => t.toLowerCase().includes(needle))),
    ).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  }, [data, kind, status, category, todo, q]);
  const shown = rows.slice((page - 1) * PAGE, page * PAGE);
  const allShown = shown.length > 0 && shown.every((r) => selected.includes(r.id));

  const batch = async (next: Status) => {
    setBusy(true);
    try {
      const r = await api<{ changed: number }>('/entries/batch', { method: 'POST', body: { ids: selected, status: next } });
      notifications.show({ message: `已把 ${r.changed} 条设为「${STATUS_LABEL[next]}」，发布后生效。` });
      setSelected([]);
      reload();
    } catch (e) {
      notifications.show({ color: 'red', message: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const categories = taxonomy.categories.filter((c) => !kind || c.blocks.includes(kind)).map((c) => ({ value: c.id, label: c.label.zh }));
  return (
    <Stack gap="lg">
      <div className="page-head">
        <div>
          <Title order={2}>{kind ? KIND_LABEL[kind] : '全部条目'}</Title>
          <Text c="dimmed" size="sm" mt={4}>{data ? `共 ${rows.length} 条` : '加载中…'}{todo ? '，只看待补充的' : ''}</Text>
        </div>
        <NewEntryButton kind={kind ?? undefined} />
      </div>

      <Paper p="md">
        <Group gap="sm" wrap="wrap">
          <TextInput placeholder="搜标题、地址名、简介" leftSection={<IconSearch size={16} />} value={q} onChange={(e) => setQ(e.currentTarget.value)} w={240} />
          <SegmentedControl
            value={kind ?? 'all'}
            onChange={(v) => { const next = new URLSearchParams(params); if (v === 'all') next.delete('kind'); else next.set('kind', v); next.delete('category'); setParams(next, { replace: true }); }}
            data={[{ value: 'all', label: '全部' }, ...KINDS.map((k) => ({ value: k, label: KIND_LABEL[k] }))]}
          />
          <Select placeholder="所有状态" data={(['active', 'draft', 'archived'] as Status[]).map((s) => ({ value: s, label: STATUS_LABEL[s] }))} value={status} onChange={(v) => set('status', v)} clearable w={130} />
          <Select placeholder="所有分类" data={categories} value={category} onChange={(v) => set('category', v)} clearable searchable w={150} />
          <Switch label="只看待补充" checked={todo} onChange={(e) => set('todo', e.currentTarget.checked ? '1' : null)} color="accent" />
        </Group>
      </Paper>

      {selected.length ? (
        <Paper p="sm" style={{ borderColor: 'var(--accent)' }}>
          <Group justify="space-between">
            <Text size="sm">已选 <span className="num">{selected.length}</span> 条</Text>
            <Group gap="xs">
              <Button size="xs" loading={busy} onClick={() => batch('active')}>设为已发布</Button>
              <Button size="xs" variant="default" loading={busy} onClick={() => batch('draft')}>设为草稿</Button>
              <Button size="xs" variant="default" loading={busy} onClick={() => batch('archived')}>归档</Button>
              <Button size="xs" variant="subtle" color="gray" onClick={() => setSelected([])}>取消选择</Button>
            </Group>
          </Group>
        </Paper>
      ) : null}

      <Paper p={0}>
        <Table.ScrollContainer minWidth={820}>
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th w={40} pl="md"><Checkbox checked={allShown} indeterminate={!allShown && shown.some((r) => selected.includes(r.id))} onChange={() => setSelected(allShown ? selected.filter((id) => !shown.some((r) => r.id === id)) : [...new Set([...selected, ...shown.map((r) => r.id)])])} aria-label="全选本页" /></Table.Th>
                <Table.Th w={72}>封面</Table.Th>
                <Table.Th>条目</Table.Th>
                <Table.Th w={90}>板块</Table.Th>
                <Table.Th w={110}>分类</Table.Th>
                <Table.Th w={90}>状态</Table.Th>
                <Table.Th w={120}>更新</Table.Th>
                <Table.Th w={48} />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {shown.map((e) => (
                <Table.Tr key={e.id} bg={selected.includes(e.id) ? 'var(--mantine-color-ink-1)' : undefined}>
                  <Table.Td pl="md"><Checkbox checked={selected.includes(e.id)} onChange={() => setSelected(selected.includes(e.id) ? selected.filter((x) => x !== e.id) : [...selected, e.id])} aria-label={`选择 ${e.title}`} /></Table.Td>
                  <Table.Td><Thumb site={site.site} cover={e.cover} logo={e.logo} /></Table.Td>
                  <Table.Td style={{ cursor: 'pointer' }} onClick={() => navigate(`/content/${encodeURIComponent(e.id)}`)}>
                    <Group gap="xs" wrap="nowrap"><Text size="sm" fw={500}>{e.title}</Text><IssuesBadge issues={e.issues} /></Group>
                    <Text size="xs" c="dimmed" lineClamp={1}>{e.line || <span className="num">{e.slug}</span>}</Text>
                  </Table.Td>
                  <Table.Td><KindBadge kind={e.kind} /></Table.Td>
                  <Table.Td><Text size="sm">{categoryLabel.get(e.category) ?? (e.category || '—')}</Text></Table.Td>
                  <Table.Td><StatusBadge status={e.status} /></Table.Td>
                  <Table.Td><Text size="xs" c="dimmed" title={exact(e.updatedAt)}>{when(e.updatedAt)}</Text></Table.Td>
                  <Table.Td>
                    {e.status === 'active' ? (
                      <Tooltip label="在网站上看"><ActionIcon component="a" href={liveUrl(site.site, e.kind, e.slug)} target="_blank" rel="noopener" variant="subtle" color="gray" aria-label="在网站上看"><IconExternalLink size={16} /></ActionIcon></Tooltip>
                    ) : null}
                  </Table.Td>
                </Table.Tr>
              ))}
              {data && !rows.length ? (
                <Table.Tr><Table.Td colSpan={8}><Text ta="center" c="dimmed" py="xl" size="sm">没有符合条件的条目。<Anchor component={Link} to="/content" size="sm">清除筛选</Anchor></Text></Table.Td></Table.Tr>
              ) : null}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Paper>
      {rows.length > PAGE ? <Group justify="flex-end"><Pagination total={Math.ceil(rows.length / PAGE)} value={page} onChange={setPage} color="ink" /></Group> : null}
    </Stack>
  );
}
