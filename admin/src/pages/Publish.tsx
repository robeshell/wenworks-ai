import { Alert, Anchor, Badge, Button, Group, List, Modal, Paper, Stack, Table, Text, TextInput, Title, Tooltip } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconArrowBackUp, IconCloudUpload, IconRefresh } from '@tabler/icons-react';
import { useState } from 'react';
import { Link } from 'react-router';
import type { Kind } from '../../shared/content.mjs';
import { api, useApi } from '../api';
import { useShared } from '../App';
import { KindBadge } from '../components/bits';
import { exact, when } from '../format';

type Plan = { head: string; changes: { path: string; change: 'added' | 'modified' | 'removed'; entries: { id: string; title: string; kind: Kind }[] }[] };
type Record_ = { id: number; published_at: string; published_by: string; commit_sha: string; message: string; files: { path: string; change: string }[]; blockedBy: number[] };
type Rollback = { record: { id: number; sha: string; message: string }; entries: number; drafted: number; picks: boolean; editorial: boolean; images: number };

const CHANGE = { added: ['新增', 'teal'], modified: ['修改', 'blue'], removed: ['删除', 'red'] } as const;
const short = (path: string) => path.replace(/^sites\/tools\//, '');
const fileNote = (path: string) => (path.endsWith('tools.json') ? '工具板块的全部条目' : path.endsWith('route-aliases.json') ? '旧地址跳转' : '');

export function Publish() {
  const { status } = useShared();
  const plan = useApi<Plan>(status.githubToken ? '/publish' : null);
  const history = useApi<Record_[]>('/publishes');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirm, confirmCtl] = useDisclosure();
  const [undo, setUndo] = useState<Record_ | null>(null);
  const [undoing, setUndoing] = useState(false);
  const rollback = async () => {
    if (!undo) return;
    setUndoing(true);
    try {
      const r = await api<Rollback>(`/publishes/${undo.id}/rollback`, { method: 'POST' });
      const parts = [r.entries ? `${r.entries} 条内容恢复` : '', r.drafted ? `${r.drafted} 条退回草稿` : '', r.picks ? '首页推荐恢复' : '', r.editorial ? 'Agent 导航内容恢复' : '', r.images ? `${r.images} 张图片恢复` : ''].filter(Boolean);
      notifications.show({ autoClose: 8000, title: '已在后台恢复', message: `${parts.join('，') || '内容和现在一致，没有需要恢复的'}。确认下面的改动后点发布，网站就回到那次发布之前的样子。` });
      setMessage(`回退：${r.record.message || `发布 ${r.record.sha.slice(0, 7)}`}`);
      setUndo(null);
      plan.reload();
      history.reload();
    } catch (e) {
      notifications.show({ color: 'red', autoClose: 10000, message: (e as Error).message });
    } finally {
      setUndoing(false);
    }
  };
  const changes = plan.data?.changes ?? [];

  const publish = async () => {
    setBusy(true);
    try {
      const r = await api<{ sha: string; files: number; url: string }>('/publish', { method: 'POST', body: { message, head: plan.data?.head } });
      confirmCtl.close();
      setMessage('');
      notifications.show({ autoClose: 8000, title: '已发布', message: `提交了 ${r.files} 个文件。网站会自动重新构建，大约 3 分钟后上线。` });
      plan.reload();
      history.reload();
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
          <Title order={2}>发布</Title>
          <Text c="dimmed" size="sm" mt={4}>把后台里的改动写回仓库（{status.repo} 的 {status.branch} 分支），网站随后自动重新构建上线。</Text>
        </div>
        <Button variant="default" leftSection={<IconRefresh size={16} />} onClick={plan.reload} loading={plan.loading} disabled={!status.githubToken}>重新检查</Button>
      </div>

      {!status.githubToken ? <Alert color="accent" title="还不能发布">还没有配置 GitHub 令牌。在 Cloudflare 里给 wenworks-admin 加一个名为 GITHUB_TOKEN 的密钥后，这里就能用了。</Alert> : null}
      {plan.error ? <Alert color="red" title="检查失败">{plan.error}</Alert> : null}

      {status.githubToken ? (
        <Paper>
          <Group justify="space-between" mb="md">
            <Title order={4}>待发布的改动 <Text span c="dimmed" size="sm" fw={400}>· {plan.data ? `${changes.length} 个文件` : '检查中…'}</Text></Title>
          </Group>
          {plan.data && !changes.length ? <Text size="sm" c="dimmed">网站上的内容和后台一致，没有需要发布的改动。</Text> : null}
          {changes.length ? (
            <>
              <Table>
                <Table.Thead><Table.Tr><Table.Th w={80}>改动</Table.Th><Table.Th>文件</Table.Th><Table.Th>涉及条目</Table.Th></Table.Tr></Table.Thead>
                <Table.Tbody>
                  {changes.map((c) => (
                    <Table.Tr key={c.path}>
                      <Table.Td><Badge color={CHANGE[c.change][1]}>{CHANGE[c.change][0]}</Badge></Table.Td>
                      <Table.Td><Text size="sm" className="num">{short(c.path)}</Text>{fileNote(c.path) ? <Text size="xs" c="dimmed">{fileNote(c.path)}</Text> : null}</Table.Td>
                      <Table.Td>{c.entries.map((e) => <Group key={e.id} gap="xs"><Anchor component={Link} to={`/content/${encodeURIComponent(e.id)}`} size="sm">{e.title}</Anchor><KindBadge kind={e.kind} /></Group>)}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
              <Group mt="lg" align="flex-end">
                <TextInput label="这次改了什么（可选）" placeholder="比如：新收录 3 个开源项目" value={message} onChange={(e) => setMessage(e.currentTarget.value)} style={{ flex: 1 }} />
                <Button leftSection={<IconCloudUpload size={16} />} onClick={confirmCtl.open}>发布 {changes.length} 个文件</Button>
              </Group>
            </>
          ) : null}
        </Paper>
      ) : null}

      <Paper>
        <Title order={4} mb="md">发布记录</Title>
        {history.data?.length ? (
          <Table>
            <Table.Thead><Table.Tr><Table.Th>时间</Table.Th><Table.Th>说明</Table.Th><Table.Th>文件</Table.Th><Table.Th>发布人</Table.Th><Table.Th>提交</Table.Th><Table.Th w={100} /></Table.Tr></Table.Thead>
            <Table.Tbody>
              {history.data.map((r) => (
                <Table.Tr key={r.id}>
                  <Table.Td><Text size="sm" title={exact(r.published_at)}>{when(r.published_at)}</Text></Table.Td>
                  <Table.Td><Text size="sm">{r.message || '—'}</Text></Table.Td>
                  <Table.Td className="num">{r.files.length}</Table.Td>
                  <Table.Td><Text size="sm" c="dimmed">{r.published_by}</Text></Table.Td>
                  <Table.Td><Anchor href={`https://github.com/${status.repo}/commit/${r.commit_sha}`} target="_blank" rel="noopener" size="sm" className="num">{r.commit_sha.slice(0, 7)}</Anchor></Table.Td>
                  <Table.Td>
                    <Tooltip label={r.blockedBy.length ? '之后的发布也改过这些文件，先回退最近的那次' : '把这次发布改过的文件恢复到发布之前'} withArrow>
                      <span><Button size="xs" variant="default" leftSection={<IconArrowBackUp size={14} />} disabled={!status.githubToken || r.blockedBy.length > 0} onClick={() => setUndo(r)}>回退</Button></span>
                    </Tooltip>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        ) : <Text size="sm" c="dimmed">后台还没有发布过。</Text>}
      </Paper>

      <Modal opened={Boolean(undo)} onClose={() => setUndo(null)} title="回退这次发布？" size="lg">
        {undo ? (
          <Stack>
            <Text size="sm">{exact(undo.published_at)} 的发布{undo.message ? `「${undo.message}」` : ''}改过下面这些文件。后台会把它们恢复成那次发布之前的内容（每条都留修改记录，可以再改回来），然后由你在这一页确认发布。</Text>
            <List size="sm" spacing={2}>{undo.files.map((f) => <List.Item key={f.path}><span className="num">{short(f.path)}</span> <Text span size="xs" c="dimmed">（{CHANGE[f.change as keyof typeof CHANGE]?.[0] ?? f.change}）</Text></List.Item>)}</List>
            <Text size="xs" c="dimmed">那次发布新上线的条目会退回草稿；新加的图片留在仓库里不删。如果这些文件现在有还没发布的改动，会先提示你处理，不会直接覆盖。</Text>
            <Group justify="flex-end"><Button variant="default" onClick={() => setUndo(null)}>取消</Button><Button color="accent" onClick={rollback} loading={undoing}>恢复到发布之前</Button></Group>
          </Stack>
        ) : null}
      </Modal>

      <Modal opened={confirm} onClose={confirmCtl.close} title="发布到网站？">
        <Stack>
          <Text size="sm">会往 {status.repo} 的 {status.branch} 分支提交 {changes.length} 个文件，网站随后自动重新构建，大约 3 分钟后上线。每次发布都有记录，需要时可以在 GitHub 上回退。</Text>
          <Group justify="flex-end"><Button variant="default" onClick={confirmCtl.close}>取消</Button><Button onClick={publish} loading={busy}>发布</Button></Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
