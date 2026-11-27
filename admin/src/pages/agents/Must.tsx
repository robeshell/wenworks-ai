import { ActionIcon, Anchor, Button, Group, Paper, Select, Stack, Table, Text, TextInput } from '@mantine/core';
import { IconArrowDown, IconArrowUp, IconExternalLink, IconPlus, IconTrash } from '@tabler/icons-react';
import { AGENT_IDS, AGENT_NAME, type AgentId } from '../../../shared/content.mjs';
import { useShared } from '../../App';
import { EditorialHead, useEditorial } from './shared';

export function Must() {
  const { status } = useShared();
  const e = useEditorial(['must']);
  const list = e.draft?.must ?? [];
  const setList = (must: typeof list) => e.setDraft({ must });
  const set = (i: number, patch: Partial<(typeof list)[number]>) => setList(list.map((m, j) => (j === i ? { ...m, ...patch } : m)));
  const move = (i: number, by: number) => { const next = [...list]; const [x] = next.splice(i, 1); next.splice(i + by, 0, x); setList(next); };
  if (e.error) return <Text c="red">{e.error}</Text>;
  return (
    <Stack gap="lg">
      <EditorialHead
        title="推荐文章"
        hint="Agent 导航「文章」页上人工挑的「值得读的官方文章」，首页的「推荐文章」也从这里按 Agent 轮流取 4 篇。同一家的按这里的顺序排。"
        state={e.state}
        dirty={e.dirty}
        saving={e.saving}
        onSave={() => e.save()}
        onReload={e.reload}
        extra={<Button variant="default" component="a" href={`${status.site}/agents/articles/`} target="_blank" rel="noopener" leftSection={<IconExternalLink size={16} />}>看线上</Button>}
      />
      <Paper p={0}>
        <Table.ScrollContainer minWidth={980}>
          <Table>
            <Table.Thead><Table.Tr><Table.Th pl="md" w={70}>顺序</Table.Th><Table.Th w={160}>Agent</Table.Th><Table.Th>标题和链接</Table.Th><Table.Th>推荐理由</Table.Th><Table.Th w={50} /></Table.Tr></Table.Thead>
            <Table.Tbody>
              {list.map((m, i) => (
                <Table.Tr key={i}>
                  <Table.Td pl="md"><Group gap={2} wrap="nowrap"><ActionIcon variant="subtle" color="gray" disabled={i === 0} onClick={() => move(i, -1)} aria-label="上移"><IconArrowUp size={14} /></ActionIcon><ActionIcon variant="subtle" color="gray" disabled={i === list.length - 1} onClick={() => move(i, 1)} aria-label="下移"><IconArrowDown size={14} /></ActionIcon></Group></Table.Td>
                  <Table.Td><Select size="xs" data={AGENT_IDS.map((id) => ({ value: id, label: AGENT_NAME[id] }))} value={m.a} onChange={(v) => v && set(i, { a: v as AgentId })} allowDeselect={false} /></Table.Td>
                  <Table.Td>
                    <Stack gap={4}>
                      <TextInput size="xs" placeholder="文章标题（原文）" value={m.t} onChange={(ev) => set(i, { t: ev.currentTarget.value })} />
                      <TextInput size="xs" placeholder="https://" value={m.u} onChange={(ev) => set(i, { u: ev.currentTarget.value })} rightSection={/^https?:\/\//.test(m.u) ? <Anchor href={m.u} target="_blank" rel="noopener" c="dimmed" aria-label="打开"><IconExternalLink size={14} /></Anchor> : null} />
                    </Stack>
                  </Table.Td>
                  <Table.Td><TextInput size="xs" placeholder="一句话说明为什么值得读" value={m.w} onChange={(ev) => set(i, { w: ev.currentTarget.value })} /></Table.Td>
                  <Table.Td><ActionIcon variant="subtle" color="gray" onClick={() => setList(list.filter((_, j) => j !== i))} aria-label="删除"><IconTrash size={16} /></ActionIcon></Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
        <Group p="md"><Button variant="default" size="xs" leftSection={<IconPlus size={14} />} onClick={() => setList([...list, { a: 'claude', t: '', u: '', w: '' }])}>加一篇</Button><Text size="xs" c="dimmed">共 {list.length} 篇</Text></Group>
      </Paper>
    </Stack>
  );
}
