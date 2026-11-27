import { ActionIcon, Button, Grid, Group, Paper, Stack, Tabs, Text, TextInput, Textarea, Title } from '@mantine/core';
import { IconArrowDown, IconArrowUp, IconExternalLink, IconPlus, IconTrash } from '@tabler/icons-react';
import { useState } from 'react';
import { AGENT_IDS, AGENT_NAME, type AgentId, type Editorial, type Link } from '../../../shared/content.mjs';
import { useShared } from '../../App';
import { EditorialHead, PagePicker, useEditorial } from './shared';

const AGENT_PATH: Record<AgentId, string> = { claude: 'claude-code', codex: 'codex', antigravity: 'antigravity-cli', grok: 'grok' };

function Mover({ i, n, onMove, onDelete }: { i: number; n: number; onMove: (i: number, by: number) => void; onDelete: () => void }) {
  return (
    <Group gap={2} wrap="nowrap">
      <ActionIcon variant="subtle" color="gray" disabled={i === 0} onClick={() => onMove(i, -1)} aria-label="上移"><IconArrowUp size={14} /></ActionIcon>
      <ActionIcon variant="subtle" color="gray" disabled={i === n - 1} onClick={() => onMove(i, 1)} aria-label="下移"><IconArrowDown size={14} /></ActionIcon>
      <ActionIcon variant="subtle" color="gray" onClick={onDelete} aria-label="删除"><IconTrash size={14} /></ActionIcon>
    </Group>
  );
}

const moved = <T,>(list: T[], i: number, by: number) => { const next = [...list]; const [x] = next.splice(i, 1); next.splice(i + by, 0, x); return next; };

/** Rows of [name, page]: the start checklist and the news list. */
function LinkRows({ rows, onChange, docs, nameLabel, addLabel }: { rows: Link[]; onChange: (rows: Link[]) => void; docs: Parameters<typeof PagePicker>[0]['docs']; nameLabel: string; addLabel: string }) {
  const set = (i: number, j: 0 | 1, v: string) => onChange(rows.map((r, k) => (k === i ? ((j === 0 ? [v, r[1]] : [r[0], v]) as Link) : r)));
  return (
    <Stack gap="xs">
      {rows.map((r, i) => (
        <Grid key={i} gap="xs" align="flex-end">
          <Grid.Col span={{ base: 12, md: 5 }}><TextInput size="xs" label={i === 0 ? nameLabel : undefined} value={r[0]} onChange={(e) => set(i, 0, e.currentTarget.value)} /></Grid.Col>
          <Grid.Col span={{ base: 10, md: 6 }}><PagePicker docs={docs} label={i === 0 ? '页面' : undefined} value={r[1]} onChange={(v) => set(i, 1, v)} /></Grid.Col>
          <Grid.Col span={{ base: 2, md: 1 }}><Mover i={i} n={rows.length} onMove={(a, b) => onChange(moved(rows, a, b))} onDelete={() => onChange(rows.filter((_, k) => k !== i))} /></Grid.Col>
        </Grid>
      ))}
      <Group><Button variant="default" size="xs" leftSection={<IconPlus size={14} />} onClick={() => onChange([...rows, ['', '']])}>{addLabel}</Button></Group>
    </Stack>
  );
}

export function Paths() {
  const { status } = useShared();
  const e = useEditorial(['agents', 'start']);
  const [tab, setTab] = useState<AgentId>('claude');
  if (e.error) return <Text c="red">{e.error}</Text>;
  const d = e.draft;
  const a = d?.agents[tab];
  const docs = e.docs?.[tab];
  const setAgent = (patch: Partial<Editorial['agents'][AgentId]>) => d && e.setDraft({ ...d, agents: { ...d.agents, [tab]: { ...d.agents[tab], ...patch } } });
  const stages = a?.stages ?? [];
  const setStage = (i: number, patch: Partial<(typeof stages)[number]>) => setAgent({ stages: stages.map((s, j) => (j === i ? { ...s, ...patch } : s)) });
  const pageCount = stages.reduce((n, s) => n + s.p.length, 0);
  return (
    <Stack gap="lg">
      <EditorialHead
        title="学习路线和上手清单"
        hint="Agent 导航每家文档页的「快速上手」和「学习路线」两种视图。页面从这家的官方文档目录里挑，按标题搜。"
        state={e.state}
        dirty={e.dirty}
        saving={e.saving}
        onSave={() => e.save()}
        onReload={e.reload}
        extra={<Button variant="default" component="a" href={`${status.site}/agents/${AGENT_PATH[tab]}/`} target="_blank" rel="noopener" leftSection={<IconExternalLink size={16} />}>看线上</Button>}
      />
      <Tabs value={tab} onChange={(v) => v && setTab(v as AgentId)} color="ink">
        <Tabs.List>{AGENT_IDS.map((id) => <Tabs.Tab key={id} value={id}>{AGENT_NAME[id]}</Tabs.Tab>)}</Tabs.List>
      </Tabs>
      {a && d ? (
        <Grid gap="lg">
          <Grid.Col span={{ base: 12, lg: 8 }}>
            <Stack gap="lg">
              <Paper>
                <Title order={4}>学习路线 <Text span c="dimmed" size="sm" fw={400}>· {stages.length} 个阶段，{pageCount} 篇</Text></Title>
                <Stack gap="md" mt="md">
                  {stages.map((s, i) => (
                    <Paper key={i} p="md" bg="#fafafa">
                      <Group justify="space-between" align="flex-start" wrap="nowrap">
                        <Text size="sm" fw={600} className="num">第 {i + 1} 阶段</Text>
                        <Mover i={i} n={stages.length} onMove={(x, by) => setAgent({ stages: moved(stages, x, by) })} onDelete={() => setAgent({ stages: stages.filter((_, j) => j !== i) })} />
                      </Group>
                      <Grid gap="sm" mt="xs">
                        <Grid.Col span={{ base: 12, md: 4 }}><TextInput size="xs" label="名称" value={s.n} onChange={(ev) => setStage(i, { n: ev.currentTarget.value })} /></Grid.Col>
                        <Grid.Col span={{ base: 12, md: 8 }}><TextInput size="xs" label="一句话说明" value={s.d} onChange={(ev) => setStage(i, { d: ev.currentTarget.value })} /></Grid.Col>
                      </Grid>
                      <Text size="xs" fw={500} mt="sm" mb={4}>页面（按顺序）</Text>
                      <Stack gap={6}>
                        {s.p.map((slug, j) => (
                          <Group key={j} gap="xs" wrap="nowrap">
                            <Text size="xs" c="dimmed" w={18} className="num">{j + 1}</Text>
                            <div style={{ flex: 1 }}><PagePicker docs={docs} value={slug} onChange={(v) => setStage(i, { p: s.p.map((x, k) => (k === j ? v : x)) })} /></div>
                            <Mover i={j} n={s.p.length} onMove={(x, by) => setStage(i, { p: moved(s.p, x, by) })} onDelete={() => setStage(i, { p: s.p.filter((_, k) => k !== j) })} />
                          </Group>
                        ))}
                        <Group><Button variant="subtle" size="xs" leftSection={<IconPlus size={14} />} onClick={() => setStage(i, { p: [...s.p, ''] })}>加一篇</Button></Group>
                      </Stack>
                    </Paper>
                  ))}
                  <Group><Button variant="default" size="xs" leftSection={<IconPlus size={14} />} onClick={() => setAgent({ stages: [...stages, { n: '', d: '', p: [] }] })}>加一个阶段</Button></Group>
                </Stack>
              </Paper>
            </Stack>
          </Grid.Col>
          <Grid.Col span={{ base: 12, lg: 4 }}>
            <Stack gap="lg">
              <Paper>
                <Title order={4}>快速上手清单</Title>
                <Text size="xs" c="dimmed" mt={4} mb="md">文档页「快速上手」视图里带勾选框的那几步。</Text>
                <LinkRows rows={d.start[tab]} onChange={(rows) => e.setDraft({ ...d, start: { ...d.start, [tab]: rows } })} docs={docs} nameLabel="这一步叫什么" addLabel="加一步" />
              </Paper>
              {a.news ? (
                <Paper>
                  <Title order={4}>最新动态</Title>
                  <Text size="xs" c="dimmed" mt={4} mb="md">首页这家卡片上的几条更新。</Text>
                  <LinkRows rows={a.news} onChange={(rows) => setAgent({ news: rows })} docs={docs} nameLabel="标题" addLabel="加一条" />
                </Paper>
              ) : null}
              <Paper>
                <Title order={4} mb="md">基本信息</Title>
                <Stack gap="sm">
                  <TextInput size="xs" label="名称" value={a.name} onChange={(ev) => setAgent({ name: ev.currentTarget.value })} />
                  <TextInput size="xs" label="出品方" value={a.maker} onChange={(ev) => setAgent({ maker: ev.currentTarget.value })} />
                  <TextInput size="xs" label="文档地址前缀" description="页面路径拼在它后面" value={a.base} onChange={(ev) => setAgent({ base: ev.currentTarget.value })} classNames={{ input: 'num' }} />
                  <Textarea size="xs" label="备注" description="显示在这家文档页顶部，可以留空" value={a.note} onChange={(ev) => setAgent({ note: ev.currentTarget.value })} autosize minRows={2} />
                  <Text size="xs" c="dimmed">浏览器记录"看过"的键：<span className="num">{a.key}</span>（不要改，改了读者的阅读记录会清空）</Text>
                </Stack>
              </Paper>
            </Stack>
          </Grid.Col>
        </Grid>
      ) : null}
    </Stack>
  );
}
