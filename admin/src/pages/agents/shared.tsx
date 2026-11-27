// Shared pieces of the three Agent 导航 pages: loading and saving editorial.json,
// the conflict banner, and a page picker that searches an agent's docs by title.
import { ActionIcon, Alert, Badge, Button, Group, Select, Text, TextInput, Title, Tooltip } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconCloudUpload, IconLink, IconList, IconRefresh } from '@tabler/icons-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import type { AgentId, DocPage, Editorial } from '../../../shared/content.mjs';
import { api, useApi } from '../../api';
import { exact, when } from '../../format';

export type EditorialState = { data: Editorial; edited: boolean; conflict: boolean; editedAt: string | null; editedBy: string | null };

/** The working copy plus a local draft of the sections this page edits. */
export function useEditorial<K extends keyof Editorial>(keys: K[]) {
  const remote = useApi<EditorialState>('/editorial');
  const docs = useApi<Record<AgentId, DocPage[]>>('/agents/docs');
  const [draft, setDraft] = useState<Pick<Editorial, K> | null>(null);
  const [saving, setSaving] = useState(false);
  const pick = (d: Editorial) => Object.fromEntries(keys.map((k) => [k, structuredClone(d[k])])) as Pick<Editorial, K>;
  useEffect(() => {
    if (remote.data) setDraft(pick(remote.data.data));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remote.data]);
  const dirty = Boolean(remote.data && draft && JSON.stringify(pick(remote.data.data)) !== JSON.stringify(draft));
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  const save = async (override?: Partial<Editorial>) => {
    setSaving(true);
    try {
      const next = await api<EditorialState>('/editorial', { method: 'PUT', body: { sections: override ?? draft } });
      remote.setData(next);
      notifications.show({ message: '已保存。到「发布」页发布后，Agent 导航才会更新。' });
    } catch (e) {
      notifications.show({ color: 'red', message: (e as Error).message });
    } finally {
      setSaving(false);
    }
  };
  const reload = async () => {
    try {
      remote.setData(await api<EditorialState>('/editorial/reload', { method: 'POST' }));
      notifications.show({ message: '已按仓库里的版本重新载入。' });
    } catch (e) {
      notifications.show({ color: 'red', message: (e as Error).message });
    }
  };
  return { state: remote.data, error: remote.error, docs: docs.data, draft, setDraft, dirty, saving, save, reload };
}

export function EditorialHead({ title, hint, state, dirty, saving, onSave, onReload, extra }: { title: string; hint: string; state: EditorialState | null; dirty: boolean; saving: boolean; onSave: () => void; onReload: () => void; extra?: ReactNode }) {
  return (
    <>
      <div className="page-head">
        <div>
          <Group gap="sm"><Title order={2}>{title}</Title>{dirty ? <Badge color="accent" variant="filled">未保存</Badge> : state?.edited ? <Badge color="accent">已保存，未发布</Badge> : null}</Group>
          <Text c="dimmed" size="sm" mt={4}>{hint}</Text>
          {state?.editedAt ? <Text c="dimmed" size="xs" mt={4} title={exact(state.editedAt)}>后台最近一次修改：{when(state.editedAt)}{state.editedBy ? `，${state.editedBy}` : ''}</Text> : null}
        </div>
        <Group>
          {extra}
          {state?.edited ? <Button variant="default" component={Link} to="/publish" leftSection={<IconCloudUpload size={16} />}>去发布</Button> : null}
          <Button onClick={onSave} loading={saving} disabled={!dirty}>保存</Button>
        </Group>
      </div>
      {state?.conflict ? (
        <Alert color="red" title="仓库里的版本在后台之外被改过" mb="lg">
          <Text size="sm">这份内容在后台改过还没发布，同时仓库里的文件也被别处改了。为了不覆盖那边的修改，发布时会跳过它。</Text>
          <Button mt="sm" size="xs" color="red" variant="light" leftSection={<IconRefresh size={14} />} onClick={onReload}>以仓库为准重新载入（放弃后台的修改）</Button>
        </Alert>
      ) : null}
    </>
  );
}

/** Picks a page from an agent's docs by title; a full URL can be typed instead. */
export function PagePicker({ docs, value, onChange, label, placeholder = '搜页面标题' }: { docs?: DocPage[]; value: string; onChange: (slug: string) => void; label?: string; placeholder?: string }) {
  const [typing, setTyping] = useState(/^https?:\/\//.test(value));
  const data = useMemo(() => {
    const list = (docs ?? []).map((p) => ({ value: p.slug, label: `${p.title}  ·  ${p.slug}` }));
    if (value && !list.some((o) => o.value === value)) list.unshift({ value, label: `${value}（不在文档目录里）` });
    return list;
  }, [docs, value]);
  const known = !value || (docs ?? []).some((p) => p.slug === value) || /^https?:\/\//.test(value);
  const toggle = (
    <Tooltip label={typing ? '从文档目录里选' : '直接填网址'}>
      <ActionIcon variant="subtle" color="gray" onClick={() => setTyping(!typing)} aria-label={typing ? '从目录选' : '填网址'}>{typing ? <IconList size={14} /> : <IconLink size={14} />}</ActionIcon>
    </Tooltip>
  );
  return typing ? (
    <TextInput label={label} size="xs" value={value} onChange={(e) => onChange(e.currentTarget.value)} placeholder="https://..." rightSection={toggle} />
  ) : (
    <Select label={label} size="xs" data={data} value={value || null} onChange={(v) => onChange(v ?? '')} searchable clearable placeholder={placeholder} limit={60} maxDropdownHeight={320} rightSection={toggle} rightSectionPointerEvents="all" error={known ? undefined : '不在文档目录里'} nothingFoundMessage="没有找到" />
  );
}
