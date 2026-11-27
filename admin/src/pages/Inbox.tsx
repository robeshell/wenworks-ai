import { Alert, Anchor, Badge, Button, Drawer, Grid, Group, Modal, MultiSelect, Paper, Progress, Select, Stack, Table, Tabs, Text, TextInput, Textarea, Title } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconHome, IconSparkles, IconTrash } from '@tabler/icons-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import type { Draft, Kind } from '../../shared/content.mjs';
import { KIND_LABEL, KINDS } from '../../shared/content.mjs';
import { api, useApi } from '../api';
import { useShared } from '../App';
import { Bilingual } from '../components/fields';
import { exact, when } from '../format';
import type { InboxItem } from '../types';

const STATUS: Record<InboxItem['status'], [string, string]> = {
  new: ['待起草', 'gray'], drafted: ['待审核', 'accent'], failed: ['起草失败', 'red'],
  accepted: ['已收录', 'teal'], picked: ['已放首页', 'teal'], dismissed: ['已丢弃', 'dark'],
};
const OPEN = ['new', 'drafted', 'failed'];
const host = (url: string) => { try { return new URL(url).host.replace(/^www\./, ''); } catch { return url; } };

function Review({ item, onDone }: { item: InboxItem; onDone: () => void }) {
  const { taxonomy } = useShared();
  const navigate = useNavigate();
  const [d, setD] = useState<Draft>(item.draft!);
  const [busy, setBusy] = useState(false);
  const [pickOpen, pickCtl] = useDisclosure();
  const [pick, setPick] = useState({ title: d.title, note: d.summary.zh, author: '' });
  const set = (patch: Partial<Draft>) => setD({ ...d, ...patch });
  const categories = taxonomy.categories.filter((c) => c.blocks.includes(d.kind)).map((c) => ({ value: c.id, label: c.label.zh }));
  const tags = [...taxonomy.tags.map((t) => ({ value: t.id, label: t.label.zh })), ...d.tags.filter((t) => !taxonomy.tags.some((x) => x.id === t)).map((t) => ({ value: t, label: `${t}（词表外）` }))];
  const accept = async () => {
    setBusy(true);
    try {
      const r = await api<{ entry: string }>(`/inbox/${item.id}/accept`, { method: 'POST', body: { draft: d } });
      notifications.show({ message: '已收录为草稿，接着补封面、检查正文。' });
      onDone();
      navigate(`/content/${encodeURIComponent(r.entry)}`);
    } catch (e) {
      notifications.show({ color: 'red', message: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };
  const toHome = async () => {
    setBusy(true);
    try {
      await api(`/inbox/${item.id}/pick`, { method: 'POST', body: pick });
      notifications.show({ message: '已放进首页「值得看的讨论」，发布后上线。' });
      pickCtl.close();
      onDone();
    } catch (e) {
      notifications.show({ color: 'red', message: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };
  const body = d.kind === 'skill' || d.kind === 'project';
  return (
    <Stack gap="lg">
      <Text size="sm"><Anchor href={item.url} target="_blank" rel="noopener">{item.url}</Anchor></Text>
      {d.rationale ? <Alert color="gray" title="AI 的判断">{d.rationale}{d.confidence != null ? `（把握 ${Math.round(d.confidence * 100)}%）` : ''}</Alert> : null}
      <Grid gap="md">
        <Grid.Col span={{ base: 12, md: 4 }}><Select label="板块" data={KINDS.map((k) => ({ value: k, label: KIND_LABEL[k] }))} value={d.kind} onChange={(v) => v && set({ kind: v as Kind, category: '' })} allowDeselect={false} /></Grid.Col>
        <Grid.Col span={{ base: 12, md: 4 }}><TextInput label="标题" value={d.title} onChange={(e) => set({ title: e.currentTarget.value })} /></Grid.Col>
        <Grid.Col span={{ base: 12, md: 4 }}><TextInput label="地址名" value={d.slug} onChange={(e) => set({ slug: e.currentTarget.value })} classNames={{ input: 'num' }} /></Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}><Select label="分类" data={categories} value={d.category || null} onChange={(v) => set({ category: v ?? '' })} searchable /></Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}><MultiSelect label="标签" data={tags} value={d.tags} onChange={(v) => set({ tags: v })} searchable /></Grid.Col>
      </Grid>
      {d.kind === 'tool' ? <Bilingual label="一句话判断" value={d.verdict} onChange={(v) => set({ verdict: v })} counter /> : null}
      <Bilingual label="简介" value={d.summary} onChange={(v) => set({ summary: v })} rows={2} />
      {d.kind === 'tool' || d.kind === 'site' ? <Bilingual label="详细说明" value={d.description} onChange={(v) => set({ description: v })} rows={4} /> : null}
      {body ? <Text size="sm" c="dimmed">正文：中文 {d.body.zh.length} 字，英文 {d.body.en.length} 字。收录后在编辑页里看和改。</Text> : null}
      {d.kind === 'prompt' ? <Text size="sm" c="dimmed">提示词 {d.prompt.length} 字，变量 {d.variables.length} 个。收录后在编辑页里看和改。</Text> : null}
      {d.logoUrl ? <Text size="xs" c="dimmed">页面上的图标：<Anchor href={d.logoUrl} target="_blank" rel="noopener" size="xs">{d.logoUrl}</Anchor>（可以存下来，在编辑页上传）</Text> : null}
      <Group justify="flex-end">
        <Button variant="default" leftSection={<IconHome size={16} />} onClick={pickCtl.open}>放到首页讨论</Button>
        <Button leftSection={<IconCheck size={16} />} onClick={accept} loading={busy} disabled={!d.title || !d.slug}>收录为草稿</Button>
      </Group>
      <Modal opened={pickOpen} onClose={pickCtl.close} title="放到首页「值得看的讨论」">
        <Stack>
          <TextInput label="标题" value={pick.title} onChange={(e) => setPick({ ...pick, title: e.currentTarget.value })} />
          <TextInput label="作者或来源" placeholder="比如 @someone 或 Hacker News" value={pick.author} onChange={(e) => setPick({ ...pick, author: e.currentTarget.value })} />
          <Textarea label="一句话说明" value={pick.note} onChange={(e) => setPick({ ...pick, note: e.currentTarget.value })} autosize minRows={2} />
          <Group justify="flex-end"><Button variant="default" onClick={pickCtl.close}>取消</Button><Button onClick={toHome} loading={busy} disabled={!pick.title}>放到首页</Button></Group>
        </Stack>
      </Modal>
    </Stack>
  );
}

export function Inbox() {
  const { status } = useShared();
  const { data, reload, setData } = useApi<InboxItem[]>('/inbox');
  const [urls, setUrls] = useState('');
  const [note, setNote] = useState('');
  const [adding, setAdding] = useState(false);
  const [working, setWorking] = useState<number[]>([]);
  const [batch, setBatch] = useState<{ done: number; total: number } | null>(null);
  const [tab, setTab] = useState<string | null>('open');
  const [review, setReview] = useState<InboxItem | null>(null);
  const items = (data ?? []).filter((i) => (tab === 'open' ? OPEN.includes(i.status) : !OPEN.includes(i.status)));

  const add = async () => {
    setAdding(true);
    try {
      const r = await api<{ added: string[]; skipped: { url: string; reason: string }[] }>('/inbox', { method: 'POST', body: { urls, note } });
      notifications.show({ message: `加入 ${r.added.length} 条${r.skipped.length ? `，跳过 ${r.skipped.length} 条：${r.skipped.map((s) => `${host(s.url)} ${s.reason}`).join('；')}` : ''}` , autoClose: r.skipped.length ? 8000 : 3500 });
      setUrls('');
      setNote('');
      reload();
    } catch (e) {
      notifications.show({ color: 'red', message: (e as Error).message });
    } finally {
      setAdding(false);
    }
  };
  const draftOne = async (item: InboxItem) => {
    setWorking((w) => [...w, item.id]);
    try {
      const updated = await api<InboxItem>(`/inbox/${item.id}/draft`, { method: 'POST' });
      setData((list) => (list ?? []).map((i) => (i.id === item.id ? updated : i)));
      return true;
    } catch (e) {
      notifications.show({ color: 'red', title: host(item.url), message: (e as Error).message });
      reload();
      return false;
    } finally {
      setWorking((w) => w.filter((id) => id !== item.id));
    }
  };
  const draftAll = async () => {
    const todo = (data ?? []).filter((i) => i.status === 'new' || i.status === 'failed');
    setBatch({ done: 0, total: todo.length });
    for (const [n, item] of todo.entries()) {
      await draftOne(item);
      setBatch({ done: n + 1, total: todo.length });
    }
    setBatch(null);
  };
  const dismiss = async (item: InboxItem) => {
    await api(`/inbox/${item.id}/dismiss`, { method: 'POST' });
    reload();
  };
  const pending = (data ?? []).filter((i) => i.status === 'new' || i.status === 'failed').length;

  return (
    <Stack gap="xl">
      <div className="page-head">
        <div>
          <Title order={2}>收件箱</Title>
          <Text c="dimmed" size="sm" mt={4}>贴进链接，AI 读网页起草条目；你审核后收录成草稿，或放到首页讨论，或丢掉。</Text>
        </div>
        <Button leftSection={<IconSparkles size={16} />} onClick={draftAll} disabled={!pending || Boolean(batch) || !status.openrouter} loading={Boolean(batch)}>全部起草（{pending}）</Button>
      </div>

      {!status.openrouter ? <Alert color="accent" title="还不能起草">还没有配置 OpenRouter 密钥。在 Cloudflare 里给 wenworks-admin 加一个名为 OPENROUTER_API_KEY 的密钥，再到「设置」里选模型。</Alert> : null}
      {batch ? <Paper p="md"><Text size="sm" mb={6}>正在起草 {batch.done}/{batch.total}，每条大约半分钟到一分钟，可以先做别的。</Text><Progress value={(batch.done / batch.total) * 100} color="ink" /></Paper> : null}

      <Paper>
        <Grid gap="md" align="flex-end">
          <Grid.Col span={{ base: 12, md: 7 }}><Textarea label="链接" description="每行一个，一次最多 20 个。已经收录或已在收件箱里的会自动跳过。" placeholder={'https://...\nhttps://github.com/...'} value={urls} onChange={(e) => setUrls(e.currentTarget.value)} autosize minRows={3} /></Grid.Col>
          <Grid.Col span={{ base: 12, md: 5 }}><Stack gap="sm"><TextInput label="备注（可选）" description="给 AI 的提示，比如「这是个技能，不是工具」" value={note} onChange={(e) => setNote(e.currentTarget.value)} /><Button onClick={add} loading={adding} disabled={!urls.trim()}>加入收件箱</Button></Stack></Grid.Col>
        </Grid>
      </Paper>

      <Paper p={0}>
        <Tabs value={tab} onChange={setTab} color="ink">
          <Tabs.List px="md" pt="xs">
            <Tabs.Tab value="open">待处理 <Text span c="dimmed" size="sm" className="num">{(data ?? []).filter((i) => OPEN.includes(i.status)).length}</Text></Tabs.Tab>
            <Tabs.Tab value="done">已处理</Tabs.Tab>
          </Tabs.List>
        </Tabs>
        <Table.ScrollContainer minWidth={760}>
          <Table>
            <Table.Thead><Table.Tr><Table.Th pl="md">链接</Table.Th><Table.Th w={120}>状态</Table.Th><Table.Th>草稿</Table.Th><Table.Th w={110}>加入</Table.Th><Table.Th w={260} /></Table.Tr></Table.Thead>
            <Table.Tbody>
              {items.map((i) => (
                <Table.Tr key={i.id}>
                  <Table.Td pl="md">
                    <Anchor href={i.url} target="_blank" rel="noopener" size="sm" fw={500}>{host(i.url)}</Anchor>
                    <Text size="xs" c="dimmed" lineClamp={1} maw={360}>{i.url}</Text>
                    {i.note ? <Text size="xs" c="dimmed">备注：{i.note}</Text> : null}
                  </Table.Td>
                  <Table.Td><Badge color={STATUS[i.status][1]}>{working.includes(i.id) ? '起草中…' : STATUS[i.status][0]}</Badge></Table.Td>
                  <Table.Td>
                    {i.draft ? <><Text size="sm" fw={500}>{i.draft.title} <Text span size="xs" c="dimmed">· {KIND_LABEL[i.draft.kind]}</Text></Text><Text size="xs" c="dimmed" lineClamp={1}>{i.draft.verdict.zh || i.draft.summary.zh}</Text></> : null}
                    {i.status === 'failed' ? <Text size="xs" c="red" lineClamp={2}>{i.error}</Text> : null}
                    {i.status === 'accepted' && i.entry_id ? <Anchor component={Link} to={`/content/${encodeURIComponent(i.entry_id)}`} size="xs">打开条目 →</Anchor> : null}
                  </Table.Td>
                  <Table.Td><Text size="xs" c="dimmed" title={exact(i.created_at)}>{when(i.created_at)}</Text></Table.Td>
                  <Table.Td>
                    <Group gap="xs" justify="flex-end" wrap="nowrap" pr="sm">
                      {OPEN.includes(i.status) ? <Button size="xs" variant={i.status === 'drafted' ? 'default' : 'filled'} loading={working.includes(i.id)} disabled={!status.openrouter} onClick={() => draftOne(i)}>{i.status === 'drafted' ? '重新起草' : 'AI 起草'}</Button> : null}
                      {i.status === 'drafted' ? <Button size="xs" color="accent" onClick={() => setReview(i)}>审核</Button> : null}
                      {OPEN.includes(i.status) ? <Button size="xs" variant="subtle" color="gray" leftSection={<IconTrash size={14} />} onClick={() => dismiss(i)}>丢弃</Button> : null}
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
              {data && !items.length ? <Table.Tr><Table.Td colSpan={5}><Text ta="center" c="dimmed" py="xl" size="sm">{tab === 'open' ? '收件箱是空的。在上面贴几个链接试试。' : '还没有处理过的链接。'}</Text></Table.Td></Table.Tr> : null}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Paper>

      <Drawer opened={Boolean(review)} onClose={() => setReview(null)} title={<Text fw={600}>审核草稿</Text>} position="right" size="xl">
        {review ? <Review key={review.id} item={review} onDone={() => { setReview(null); reload(); }} /> : null}
      </Drawer>
    </Stack>
  );
}
