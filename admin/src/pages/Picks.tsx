import { ActionIcon, Alert, Button, Group, Paper, Stack, Table, Text, TextInput, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconArrowDown, IconArrowUp, IconExternalLink, IconPlus, IconTrash } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { api, useApi } from '../api';
import { useShared } from '../App';
import type { Pick } from '../types';

const blank = (): Pick => ({ url: '', title: '', author: '', note: '', date: new Date().toISOString().slice(0, 10) });

export function Picks() {
  const { status } = useShared();
  const { data, reload } = useApi<Pick[]>('/picks');
  const [list, setList] = useState<Pick[]>([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (data) setList(data); }, [data]);
  const dirty = JSON.stringify(list.map(({ url, title, author, note, date }) => ({ url, title, author, note, date }))) !== JSON.stringify((data ?? []).map(({ url, title, author, note, date }) => ({ url, title, author, note, date })));
  const set = (i: number, patch: Partial<Pick>) => setList(list.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  const move = (i: number, by: number) => { const next = [...list]; const [x] = next.splice(i, 1); next.splice(i + by, 0, x); setList(next); };
  const save = async () => {
    setBusy(true);
    try {
      await api('/picks', { method: 'PUT', body: { picks: list } });
      notifications.show({ message: '已保存。到「发布」页发布后，首页才会更新。' });
      reload();
    } catch (e) {
      notifications.show({ color: 'red', message: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };
  return (
    <Stack gap="xl">
      <div className="page-head">
        <div>
          <Title order={2}>值得看的讨论</Title>
          <Text c="dimmed" size="sm" mt={4}>首页最上面那一栏，放你手挑的帖子和讨论（比如 X 上的）。有内容时首页才显示这一栏，按这里的顺序排。</Text>
        </div>
        <Group>
          <Button variant="default" component="a" href={status.site} target="_blank" rel="noopener" leftSection={<IconExternalLink size={16} />}>看首页</Button>
          <Button onClick={save} loading={busy} disabled={!dirty}>保存</Button>
        </Group>
      </div>
      {!list.length && data ? <Alert color="gray">还没有内容，首页不会显示这一栏。可以在下面加，也可以从收件箱里「放到首页讨论」。</Alert> : null}
      <Paper p={0}>
        <Table.ScrollContainer minWidth={900}>
          <Table>
            <Table.Thead><Table.Tr><Table.Th pl="md" w={60}>顺序</Table.Th><Table.Th>链接和标题</Table.Th><Table.Th w={160}>作者或来源</Table.Th><Table.Th>一句话说明</Table.Th><Table.Th w={140}>日期</Table.Th><Table.Th w={50} /></Table.Tr></Table.Thead>
            <Table.Tbody>
              {list.map((p, i) => (
                <Table.Tr key={i}>
                  <Table.Td pl="md"><Group gap={2} wrap="nowrap"><ActionIcon variant="subtle" color="gray" disabled={i === 0} onClick={() => move(i, -1)} aria-label="上移"><IconArrowUp size={14} /></ActionIcon><ActionIcon variant="subtle" color="gray" disabled={i === list.length - 1} onClick={() => move(i, 1)} aria-label="下移"><IconArrowDown size={14} /></ActionIcon></Group></Table.Td>
                  <Table.Td><Stack gap={4}><TextInput size="xs" placeholder="https://" value={p.url} onChange={(e) => set(i, { url: e.currentTarget.value })} /><TextInput size="xs" placeholder="标题" value={p.title} onChange={(e) => set(i, { title: e.currentTarget.value })} /></Stack></Table.Td>
                  <Table.Td><TextInput size="xs" value={p.author} onChange={(e) => set(i, { author: e.currentTarget.value })} /></Table.Td>
                  <Table.Td><TextInput size="xs" value={p.note} onChange={(e) => set(i, { note: e.currentTarget.value })} /></Table.Td>
                  <Table.Td><TextInput size="xs" type="date" value={p.date} onChange={(e) => set(i, { date: e.currentTarget.value })} /></Table.Td>
                  <Table.Td><ActionIcon variant="subtle" color="gray" onClick={() => setList(list.filter((_, j) => j !== i))} aria-label="删除"><IconTrash size={16} /></ActionIcon></Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
        <Group p="md"><Button variant="default" size="xs" leftSection={<IconPlus size={14} />} onClick={() => setList([...list, blank()])}>加一条</Button>{dirty ? <Text size="xs" c="accent.6">有改动还没保存</Text> : null}</Group>
      </Paper>
    </Stack>
  );
}
