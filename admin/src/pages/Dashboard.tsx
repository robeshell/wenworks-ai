import { Alert, Anchor, Badge, Button, Group, Loader, Paper, SimpleGrid, Stack, Table, Text, Timeline, Title, UnstyledButton } from '@mantine/core';
import { IconAlertTriangle, IconCheck, IconCloudUpload, IconEdit, IconExternalLink, IconInbox, IconRefresh } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { KIND_LABEL, KINDS } from '../../shared/content.mjs';
import { useApi } from '../api';
import { useShared } from '../App';
import { IssuesBadge, KindBadge } from '../components/bits';
import { NewEntryButton } from '../components/NewEntry';
import { exact, when } from '../format';
import type { Health, Overview } from '../types';

/** A number that leads somewhere: the place to deal with it. */
function Stat({ label, value, note, to, alert }: { label: string; value: ReactNode; note?: ReactNode; to?: string; alert?: boolean }) {
  const body = (
    <Paper h="100%" style={alert ? { borderTop: '3px solid var(--accent)' } : undefined}>
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <Text size="sm" c="dimmed">{label}</Text>
        {to ? <Text size="xs" c="dimmed">→</Text> : null}
      </Group>
      <div className="stat-value" style={{ marginTop: 8, color: alert ? 'var(--accent)' : undefined }}>{value}</div>
      {note ? <Text size="xs" c="dimmed" mt={8}>{note}</Text> : null}
    </Paper>
  );
  return to ? <UnstyledButton component={Link} to={to} style={{ display: 'block', height: '100%' }}>{body}</UnstyledButton> : body;
}

const RUN: Record<string, [string, string]> = {
  success: ['正常', 'teal'], failure: ['失败', 'red'], cancelled: ['已取消', 'gray'], skipped: ['跳过', 'gray'], timed_out: ['超时', 'red'], startup_failure: ['没能启动', 'red'],
};

function Jobs({ health }: { health: Health | null }) {
  if (!health) return <Group gap="xs"><Loader size="xs" color="ink" /><Text size="sm" c="dimmed">正在读取 GitHub 上的运行记录…</Text></Group>;
  return (
    <Table>
      <Table.Tbody>
        {health.workflows.map((w) => {
          const running = w.status && w.status !== 'completed';
          const [label, color] = running ? ['运行中', 'blue'] : w.conclusion ? RUN[w.conclusion] ?? [w.conclusion, 'gray'] : ['没有记录', 'gray'];
          return (
            <Table.Tr key={w.file}>
              <Table.Td><Text size="sm" fw={500}>{w.label}</Text><Text size="xs" c="dimmed">{w.hint}</Text></Table.Td>
              <Table.Td w={90}>{w.available ? <Badge color={color} variant={color === 'red' ? 'filled' : 'light'}>{label}</Badge> : <Text size="xs" c="dimmed">读取不到</Text>}</Table.Td>
              <Table.Td w={100}><Text size="xs" c="dimmed" title={exact(w.at)}>{when(w.at)}</Text></Table.Td>
              <Table.Td w={40}><Anchor href={w.url} target="_blank" rel="noopener" c="dimmed" aria-label="在 GitHub 上看"><IconExternalLink size={14} /></Anchor></Table.Td>
            </Table.Tr>
          );
        })}
      </Table.Tbody>
    </Table>
  );
}

const ACTIVITY_ICON = { save: <IconEdit size={12} />, publish: <IconCloudUpload size={12} />, inbox: <IconInbox size={12} /> };

export function Dashboard() {
  const { data } = useApi<Overview>('/overview');
  const health = useApi<Health>('/health');
  const { status } = useShared();
  const navigate = useNavigate();
  if (!data) return null;
  const sum = (s: 'active' | 'draft' | 'archived') => KINDS.reduce((n, k) => n + data.counts[k][s], 0);
  const failing = (health.data?.workflows ?? []).filter((w) => w.conclusion && ['failure', 'timed_out', 'startup_failure'].includes(w.conclusion));
  const pending = health.data?.pending;
  return (
    <Stack gap="xl">
      <div className="page-head">
        <div>
          <Title order={2}>工作台</Title>
          <Text c="dimmed" size="sm" mt={4}>要处理的事、网站和自动任务的状态、最近的动静。</Text>
        </div>
        <Group>
          <Button variant="default" leftSection={<IconRefresh size={16} />} onClick={health.reload} loading={health.loading}>刷新状态</Button>
          <NewEntryButton />
        </Group>
      </div>

      {!status.githubToken ? <Alert color="accent" title="还不能发布">还没有配置 GitHub 令牌，可以先编辑，配置后才能发布到网站。详见「设置」。</Alert> : null}
      {failing.length ? (
        <Alert color="red" icon={<IconAlertTriangle size={18} />} title={`${failing.map((w) => w.label).join('、')}最近一次失败了`}>
          <Text size="sm">点下面列表里的链接看 GitHub 上的日志。{failing.some((w) => w.file === 'refresh-models.yml') ? '模型数据刷新失败通常是因为仓库里还没有 AA_API_KEY 这个 Secret。' : ''}</Text>
        </Alert>
      ) : null}

      <SimpleGrid cols={{ base: 2, md: 4 }}>
        <Stat label="待发布" to="/publish" alert={Boolean(pending)} value={pending == null ? (health.loading ? <Loader size="sm" color="ink" /> : '—') : pending} note={pending == null ? (health.data?.pendingError ?? (status.githubToken ? '' : '配置令牌后显示')) : pending ? '个文件改了还没上线' : '网站和后台一致'} />
        <Stat label="收件箱" to="/inbox" alert={data.inbox > 0} value={data.inbox} note={data.inbox ? '条链接等着起草或审核' : '没有待处理的链接'} />
        <Stat label="草稿" to="/content?status=draft" value={sum('draft')} note={`已发布 ${sum('active')} 条 · 待补充 ${data.todo.length} 条`} />
        <Stat label="上次发布" to="/publish" value={data.lastPublish ? when(data.lastPublish.published_at) : '—'} note={data.lastPublish ? `${data.lastPublish.published_by}${data.lastPublish.message ? ` · ${data.lastPublish.message}` : ''}` : '后台还没有发布过'} />
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="xl">
        <Paper>
          <Group justify="space-between" mb="md">
            <Title order={4}>网站和自动任务</Title>
            <Anchor href={`https://github.com/${status.repo}/actions`} target="_blank" rel="noopener" size="sm">全部运行记录 →</Anchor>
          </Group>
          <Jobs health={health.data} />
        </Paper>

        <Paper>
          <Title order={4} mb="md">最近动态</Title>
          {data.activity.length ? (
            <Timeline bulletSize={20} lineWidth={1} color="ink">
              {data.activity.slice(0, 8).map((a, i) => (
                <Timeline.Item key={i} bullet={ACTIVITY_ICON[a.kind]} title={a.link ? <Anchor component={Link} to={a.link} size="sm" c="var(--mantine-color-text)">{a.text}</Anchor> : <Text size="sm">{a.text}</Text>}>
                  <Text size="xs" c="dimmed" title={exact(a.at)}>{when(a.at)}{a.by ? ` · ${a.by}` : ''}</Text>
                </Timeline.Item>
              ))}
            </Timeline>
          ) : <Text size="sm" c="dimmed">还没有动静。</Text>}
        </Paper>
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="xl">
        <Paper>
          <Group justify="space-between" mb="md">
            <Title order={4}>待补充 <Text span c="dimmed" size="sm" fw={400}>· {data.todo.length} 条</Text></Title>
            <Anchor component={Link} to="/content?todo=1" size="sm">全部 →</Anchor>
          </Group>
          {data.todo.length ? (
            <Table>
              <Table.Tbody>
                {data.todo.slice(0, 6).map((e) => (
                  <Table.Tr key={e.id} onClick={() => navigate(`/content/${encodeURIComponent(e.id)}`)} style={{ cursor: 'pointer' }}>
                    <Table.Td><Group gap="xs" wrap="nowrap"><Text size="sm" fw={500} lineClamp={1}>{e.title}</Text><IssuesBadge issues={e.issues} /></Group><Text size="xs" c="dimmed" lineClamp={1}>{e.issues.map((i) => i.label).join('、')}</Text></Table.Td>
                    <Table.Td w={90}><KindBadge kind={e.kind} /></Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          ) : <Group gap="xs"><IconCheck size={14} /><Text size="sm" c="dimmed">所有条目的必填项都齐了。</Text></Group>}
        </Paper>

        <Paper>
          <Group justify="space-between" mb="md">
            <Title order={4}>收件箱</Title>
            <Anchor component={Link} to="/inbox" size="sm">打开收件箱 →</Anchor>
          </Group>
          {data.inboxItems.length ? (
            <Table>
              <Table.Tbody>
                {data.inboxItems.map((i) => (
                  <Table.Tr key={i.id} onClick={() => navigate('/inbox')} style={{ cursor: 'pointer' }}>
                    <Table.Td><Text size="sm" fw={500} lineClamp={1}>{i.title || i.url.replace(/^https?:\/\/(www\.)?/, '')}</Text><Text size="xs" c="dimmed" lineClamp={1}>{i.url}</Text></Table.Td>
                    <Table.Td w={90}><Badge color={i.status === 'drafted' ? 'accent' : i.status === 'failed' ? 'red' : 'gray'}>{i.status === 'drafted' ? '待审核' : i.status === 'failed' ? '起草失败' : '待起草'}</Badge></Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          ) : <Text size="sm" c="dimmed">收件箱是空的。看到值得收的链接，贴进收件箱让 AI 起草。</Text>}
        </Paper>
      </SimpleGrid>

      <Paper>
        <Group justify="space-between" mb="md">
          <Title order={4}>内容一览</Title>
          <Group gap="lg">
            {[['首页', '/'], ['模型', '/models/'], ['Agent 导航', '/agents/'], ['工具精选', '/tools/']].map(([label, path]) => (
              <Anchor key={path} href={`${status.site}${path}`} target="_blank" rel="noopener" size="sm">{label} ↗</Anchor>
            ))}
          </Group>
        </Group>
        <SimpleGrid cols={{ base: 2, sm: 5 }}>
          {KINDS.map((k) => (
            <UnstyledButton key={k} component={Link} to={`/content?kind=${k}`}>
              <Text size="sm" c="dimmed">{KIND_LABEL[k]}</Text>
              <Text className="num" size="xl" fw={500}>{data.counts[k].active}</Text>
              <Text size="xs" c="dimmed">{[data.counts[k].draft ? `草稿 ${data.counts[k].draft}` : '', data.counts[k].archived ? `归档 ${data.counts[k].archived}` : ''].filter(Boolean).join(' · ') || '全部已发布'}</Text>
            </UnstyledButton>
          ))}
        </SimpleGrid>
      </Paper>
    </Stack>
  );
}
