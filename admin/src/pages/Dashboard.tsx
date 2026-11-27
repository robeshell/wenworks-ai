import { Alert, Anchor, Button, Group, Paper, SimpleGrid, Stack, Table, Text, Title } from '@mantine/core';
import { IconCloudUpload, IconPlus } from '@tabler/icons-react';
import { Link, useNavigate } from 'react-router';
import { KIND_LABEL, KINDS } from '../../shared/content.mjs';
import { useApi } from '../api';
import { useShared } from '../App';
import { IssuesBadge, KindBadge, StatusBadge } from '../components/bits';
import { NewEntryButton } from '../components/NewEntry';
import { exact, when } from '../format';
import type { Overview } from '../types';

function Stat({ label, value, note, accent }: { label: string; value: string | number; note?: string; accent?: boolean }) {
  return (
    <Paper style={accent ? { borderTop: '3px solid var(--accent)' } : undefined}>
      <Text size="sm" c="dimmed">{label}</Text>
      <div className="stat-value" style={{ marginTop: 8 }}>{value}</div>
      {note ? <Text size="xs" c="dimmed" mt={8}>{note}</Text> : null}
    </Paper>
  );
}

export function Dashboard() {
  const { data } = useApi<Overview>('/overview');
  const { status } = useShared();
  const navigate = useNavigate();
  if (!data) return null;
  const sum = (s: 'active' | 'draft' | 'archived') => KINDS.reduce((n, k) => n + data.counts[k][s], 0);
  return (
    <Stack gap="xl">
      <div className="page-head">
        <div>
          <Title order={2}>工作台</Title>
          <Text c="dimmed" size="sm" mt={4}>工具精选的内容概况、待处理的事和最近的修改。</Text>
        </div>
        <Group>
          <NewEntryButton />
          <Button component={Link} to="/publish" variant="default" leftSection={<IconCloudUpload size={16} />}>发布</Button>
        </Group>
      </div>

      {!status.githubToken ? (
        <Alert color="accent" title="还不能发布">还没有配置 GitHub 令牌，可以先编辑，配置后才能发布到网站。详见「设置」。</Alert>
      ) : null}

      <SimpleGrid cols={{ base: 2, md: 4 }}>
        <Stat label="已发布" value={sum('active')} note={`共 ${data.total} 条，含草稿和归档`} accent />
        <Stat label="草稿" value={sum('draft')} note="还没上线" />
        <Stat label="待补充" value={data.todo.length} note="缺封面、缺分类、缺英文等" />
        <Stat label="上次发布" value={data.lastPublish ? when(data.lastPublish.published_at) : '—'} note={data.lastPublish ? `之后改过 ${data.editedSinceLastPublish} 条` : '后台还没有发布过'} />
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="xl">
        <Paper>
          <Group justify="space-between" mb="md"><Title order={4}>各板块</Title><Anchor component={Link} to="/content" size="sm">全部条目 →</Anchor></Group>
          <Table>
            <Table.Thead><Table.Tr><Table.Th>板块</Table.Th><Table.Th ta="right">已发布</Table.Th><Table.Th ta="right">草稿</Table.Th><Table.Th ta="right">归档</Table.Th></Table.Tr></Table.Thead>
            <Table.Tbody>
              {KINDS.map((k) => (
                <Table.Tr key={k} onClick={() => navigate(`/content?kind=${k}`)} style={{ cursor: 'pointer' }}>
                  <Table.Td>{KIND_LABEL[k]}</Table.Td>
                  <Table.Td ta="right" className="num">{data.counts[k].active}</Table.Td>
                  <Table.Td ta="right" className="num">{data.counts[k].draft}</Table.Td>
                  <Table.Td ta="right" className="num">{data.counts[k].archived}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Paper>

        <Paper>
          <Group justify="space-between" mb="md"><Title order={4}>最近修改</Title></Group>
          <Table>
            <Table.Tbody>
              {data.recent.map((e) => (
                <Table.Tr key={e.id} onClick={() => navigate(`/content/${encodeURIComponent(e.id)}`)} style={{ cursor: 'pointer' }}>
                  <Table.Td><Text size="sm" fw={500} lineClamp={1}>{e.title}</Text></Table.Td>
                  <Table.Td w={90}><KindBadge kind={e.kind} /></Table.Td>
                  <Table.Td w={90}><StatusBadge status={e.status} /></Table.Td>
                  <Table.Td w={110} ta="right"><Text size="xs" c="dimmed" title={exact(e.updatedAt)}>{when(e.updatedAt)}</Text></Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Paper>
      </SimpleGrid>

      <Paper>
        <Group justify="space-between" mb="md">
          <Title order={4}>待处理 <Text span c="dimmed" size="sm" fw={400}>· {data.todo.length} 条需要补充</Text></Title>
          <Anchor component={Link} to="/content?todo=1" size="sm">在列表里看 →</Anchor>
        </Group>
        {data.todo.length ? (
          <Table>
            <Table.Thead><Table.Tr><Table.Th>条目</Table.Th><Table.Th>板块</Table.Th><Table.Th>缺什么</Table.Th></Table.Tr></Table.Thead>
            <Table.Tbody>
              {data.todo.slice(0, 12).map((e) => (
                <Table.Tr key={e.id} onClick={() => navigate(`/content/${encodeURIComponent(e.id)}`)} style={{ cursor: 'pointer' }}>
                  <Table.Td><Group gap="xs" wrap="nowrap"><Text size="sm" fw={500}>{e.title}</Text><IssuesBadge issues={e.issues} /></Group></Table.Td>
                  <Table.Td w={100}><KindBadge kind={e.kind} /></Table.Td>
                  <Table.Td><Text size="sm" c="dimmed">{e.issues.map((i) => i.label).join('、')}</Text></Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        ) : (
          <Group gap="xs"><IconPlus size={14} /><Text size="sm" c="dimmed">没有需要补充的条目。</Text></Group>
        )}
      </Paper>
    </Stack>
  );
}
