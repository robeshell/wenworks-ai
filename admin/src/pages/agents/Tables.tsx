import { ActionIcon, Button, Group, Paper, Stack, Table, Tabs, Text, TextInput, Tooltip } from '@mantine/core';
import { IconArrowDown, IconArrowUp, IconExternalLink, IconLink, IconLinkOff, IconPlus, IconTrash } from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { AGENT_IDS, AGENT_NAME, comparisonData, comparisonRows, type AgentId, type Cell, type CompareRow, type Editorial } from '../../../shared/content.mjs';
import { useShared } from '../../App';
import { EditorialHead, PagePicker, useEditorial } from './shared';

const moved = <T,>(list: T[], i: number, by: number) => { const next = [...list]; const [x] = next.splice(i, 1); next.splice(i + by, 0, x); return next; };

function RowTools({ i, n, onMove, onDelete }: { i: number; n: number; onMove: (by: number) => void; onDelete: () => void }) {
  return (
    <Group gap={2} wrap="nowrap">
      <ActionIcon variant="subtle" color="gray" disabled={i === 0} onClick={() => onMove(-1)} aria-label="上移"><IconArrowUp size={14} /></ActionIcon>
      <ActionIcon variant="subtle" color="gray" disabled={i === n - 1} onClick={() => onMove(1)} aria-label="下移"><IconArrowDown size={14} /></ActionIcon>
      <ActionIcon variant="subtle" color="gray" onClick={onDelete} aria-label="删除这一行"><IconTrash size={14} /></ActionIcon>
    </Group>
  );
}

/** A cell of the 基本情况 / 价格 tables: text, or text that links to a docs page or URL. */
function CellInput({ value, onChange }: { value: Cell; onChange: (v: Cell) => void }) {
  if (typeof value === 'number') return <Text size="xs" c="dimmed">自动统计</Text>;
  const isLink = Array.isArray(value);
  const text = isLink ? value[1] : value;
  return (
    <Stack gap={4}>
      <TextInput
        size="xs"
        value={text}
        onChange={(e) => onChange(isLink ? [value[0], e.currentTarget.value] : e.currentTarget.value)}
        rightSection={
          <Tooltip label={isLink ? '去掉链接' : '加链接'}>
            <ActionIcon variant="subtle" color="gray" onClick={() => onChange(isLink ? value[1] : ['', text])} aria-label={isLink ? '去掉链接' : '加链接'}>{isLink ? <IconLinkOff size={14} /> : <IconLink size={14} />}</ActionIcon>
          </Tooltip>
        }
      />
      {isLink ? <TextInput size="xs" placeholder="页面路径或 https:// 网址" value={value[0]} onChange={(e) => onChange([e.currentTarget.value, value[1]])} classNames={{ input: 'num' }} /> : null}
    </Stack>
  );
}

function FactTable({ rows, onChange, addLabel }: { rows: Editorial['pick']; onChange: (rows: Editorial['pick']) => void; addLabel: string }) {
  const set = (i: number, r: Editorial['pick'][number]) => onChange(rows.map((x, j) => (j === i ? r : x)));
  return (
    <Paper p={0}>
      <Table.ScrollContainer minWidth={1100}>
        <Table verticalSpacing="xs">
          <Table.Thead><Table.Tr><Table.Th pl="md" w={180}>项目</Table.Th>{AGENT_IDS.map((id) => <Table.Th key={id}>{AGENT_NAME[id]}</Table.Th>)}<Table.Th w={90} /></Table.Tr></Table.Thead>
          <Table.Tbody>
            {rows.map((r, i) => (
              <Table.Tr key={i} style={{ verticalAlign: 'top' }}>
                <Table.Td pl="md"><TextInput size="xs" value={r[0]} onChange={(e) => set(i, [e.currentTarget.value, r[1]])} /></Table.Td>
                {AGENT_IDS.map((id) => <Table.Td key={id}><CellInput value={r[1][id]} onChange={(v) => set(i, [r[0], { ...r[1], [id]: v }])} /></Table.Td>)}
                <Table.Td><RowTools i={i} n={rows.length} onMove={(by) => onChange(moved(rows, i, by))} onDelete={() => onChange(rows.filter((_, j) => j !== i))} /></Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
      <Group p="md"><Button variant="default" size="xs" leftSection={<IconPlus size={14} />} onClick={() => onChange([...rows, ['', { claude: '', codex: '', antigravity: '', grok: '' }]])}>{addLabel}</Button><Text size="xs" c="dimmed">格子可以是纯文字，也可以点链接图标加一个链接（文档页面路径或网址）。</Text></Group>
    </Paper>
  );
}

function CompareTable({ rows, onChange, docs }: { rows: CompareRow[]; onChange: (rows: CompareRow[]) => void; docs: Record<AgentId, Parameters<typeof PagePicker>[0]['docs']> | null }) {
  const set = (i: number, id: AgentId, k: 0 | 1, v: string) => onChange(rows.map((r, j) => (j === i ? { ...r, cells: { ...r.cells, [id]: (k === 0 ? [v, r.cells[id][1]] : [r.cells[id][0], v]) } } : r)));
  return (
    <Paper p={0}>
      <Table.ScrollContainer minWidth={1200}>
        <Table verticalSpacing="xs">
          <Table.Thead><Table.Tr><Table.Th pl="md" w={150}>功能</Table.Th>{AGENT_IDS.map((id) => <Table.Th key={id}>{AGENT_NAME[id]}</Table.Th>)}<Table.Th w={90} /></Table.Tr></Table.Thead>
          <Table.Tbody>
            {rows.map((r, i) => (
              <Table.Tr key={i} style={{ verticalAlign: 'top' }}>
                <Table.Td pl="md"><TextInput size="xs" value={r.label} onChange={(e) => onChange(rows.map((x, j) => (j === i ? { ...x, label: e.currentTarget.value } : x)))} /></Table.Td>
                {AGENT_IDS.map((id) => (
                  <Table.Td key={id}>
                    <Stack gap={4}>
                      <PagePicker docs={docs?.[id]} value={r.cells[id][0]} onChange={(v) => set(i, id, 0, v)} placeholder="没有就留空" />
                      {r.cells[id][0] ? <TextInput size="xs" placeholder="显示文字（留空用页面标题）" value={r.cells[id][1]} onChange={(e) => set(i, id, 1, e.currentTarget.value)} /> : null}
                    </Stack>
                  </Table.Td>
                ))}
                <Table.Td><RowTools i={i} n={rows.length} onMove={(by) => onChange(moved(rows, i, by))} onDelete={() => onChange(rows.filter((_, j) => j !== i))} /></Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
      <Group p="md"><Button variant="default" size="xs" leftSection={<IconPlus size={14} />} onClick={() => onChange([...rows, { label: '', cells: { claude: ['', ''], codex: ['', ''], antigravity: ['', ''], grok: ['', ''] } }])}>加一个功能</Button><Text size="xs" c="dimmed">每格选这家文档里讲这个功能的页面；这家没有就留空。</Text></Group>
    </Paper>
  );
}

export function Tables() {
  const { status } = useShared();
  const e = useEditorial(['pick', 'price', 'cmp', 'cmp2']);
  const [tab, setTab] = useState<string | null>('pick');
  const d = e.draft;
  // The comparison is stored as two lists (Claude/Codex and the other two); edit it as one table.
  const rows = useMemo(() => (d ? comparisonRows(d.cmp, d.cmp2) : []), [d]);
  if (e.error) return <Text c="red">{e.error}</Text>;
  return (
    <Stack gap="lg">
      <EditorialHead
        title="对照表"
        hint="Agent 导航「对比」页的三张表：基本情况、价格、功能对照。"
        state={e.state}
        dirty={e.dirty}
        saving={e.saving}
        onSave={() => e.save()}
        onReload={e.reload}
        extra={<Button variant="default" component="a" href={`${status.site}/agents/compare/`} target="_blank" rel="noopener" leftSection={<IconExternalLink size={16} />}>看线上</Button>}
      />
      <Tabs value={tab} onChange={setTab} color="ink">
        <Tabs.List>
          <Tabs.Tab value="pick">基本情况</Tabs.Tab>
          <Tabs.Tab value="price">价格</Tabs.Tab>
          <Tabs.Tab value="cmp">功能对照</Tabs.Tab>
        </Tabs.List>
      </Tabs>
      {d && tab === 'pick' ? <FactTable rows={d.pick} onChange={(pick) => e.setDraft({ ...d, pick })} addLabel="加一行" /> : null}
      {d && tab === 'price' ? <FactTable rows={d.price} onChange={(price) => e.setDraft({ ...d, price })} addLabel="加一行" /> : null}
      {d && tab === 'cmp' ? <CompareTable rows={rows} onChange={(next) => e.setDraft({ ...d, ...comparisonData(next) })} docs={e.docs} /> : null}
    </Stack>
  );
}
