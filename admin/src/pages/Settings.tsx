import { Badge, Group, Paper, SimpleGrid, Stack, Table, Text, Title } from '@mantine/core';
import { KIND_LABEL, type Kind } from '../../shared/content.mjs';
import { useShared } from '../App';
import { AiSettings } from '../components/AiSettings';

const Ok = ({ ok, yes, no }: { ok: boolean; yes: string; no: string }) => <Badge color={ok ? 'teal' : 'accent'}>{ok ? yes : no}</Badge>;

export function Settings() {
  const { status, taxonomy, me } = useShared();
  return (
    <Stack gap="xl">
      <div className="page-head"><div><Title order={2}>设置</Title><Text c="dimmed" size="sm" mt={4}>连接状态和分类词表。</Text></div></div>
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl">
        <Paper>
          <Title order={4} mb="md">连接</Title>
          <Table>
            <Table.Tbody>
              <Table.Tr><Table.Td w={140}>登录</Table.Td><Table.Td><Group gap="xs"><Ok ok={status.access || status.dev} yes={status.dev ? '本地开发' : 'Cloudflare Access'} no="未配置" /><Text size="sm" c="dimmed">{me}</Text></Group></Table.Td></Table.Tr>
              <Table.Tr><Table.Td>发布到仓库</Table.Td><Table.Td><Group gap="xs"><Ok ok={status.githubToken} yes="已配置令牌" no="缺 GITHUB_TOKEN" /><Text size="sm" c="dimmed" className="num">{status.repo} · {status.branch}</Text></Group></Table.Td></Table.Tr>
              <Table.Tr><Table.Td>AI 起草</Table.Td><Table.Td><Ok ok={status.openrouter} yes="已配置 OpenRouter" no="缺 OPENROUTER_API_KEY" /></Table.Td></Table.Tr>
              <Table.Tr><Table.Td>网站</Table.Td><Table.Td><Text component="a" href={status.site} target="_blank" rel="noopener" size="sm">{status.site}</Text></Table.Td></Table.Tr>
            </Table.Tbody>
          </Table>
          <Text size="xs" c="dimmed" mt="md">密钥（GITHUB_TOKEN、OPENROUTER_API_KEY）在 Cloudflare 后台 Workers → wenworks-admin → Settings → Variables and Secrets 里配置，类型选 Secret，不会出现在后台页面和代码里。</Text>
        </Paper>
        <AiSettings />
        <Paper>
          <Title order={4} mb="md">数据从哪来、到哪去</Title>
          <Stack gap="xs">
            <Text size="sm">后台的内容存在 Cloudflare D1 数据库里。保存只改数据库，网站不会变。</Text>
            <Text size="sm">在「发布」页发布时，后台把已发布的内容生成网站读取的文件，提交到仓库；网站随后自动构建上线。仓库里因此保留着每次发布的完整内容，也就是一份备份。</Text>
            <Text size="sm">每次保存前的版本都留在条目的「修改记录」里，可以恢复。</Text>
          </Stack>
        </Paper>
      </SimpleGrid>
      <Paper>
        <Title order={4}>分类</Title>
        <Text size="xs" c="dimmed" mt={4} mb="md">每个条目只选一个分类；能选哪些取决于板块。词表来自仓库的 data/taxonomy.json，后台编辑词表在后续版本加上。</Text>
        <Table>
          <Table.Thead><Table.Tr><Table.Th>分类</Table.Th><Table.Th>编号</Table.Th><Table.Th>用于</Table.Th><Table.Th>说明</Table.Th></Table.Tr></Table.Thead>
          <Table.Tbody>
            {taxonomy.categories.map((c) => (
              <Table.Tr key={c.id}><Table.Td>{c.label.zh}</Table.Td><Table.Td className="num"><Text size="sm" c="dimmed">{c.id}</Text></Table.Td><Table.Td><Text size="sm">{c.blocks.map((b) => KIND_LABEL[b as Kind] ?? b).join('、')}</Text></Table.Td><Table.Td><Text size="xs" c="dimmed">{c.hint}</Text></Table.Td></Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Paper>
      <Paper>
        <Title order={4} mb="md">标签</Title>
        <Table>
          <Table.Thead><Table.Tr><Table.Th>标签</Table.Th><Table.Th>编号</Table.Th><Table.Th>说明</Table.Th></Table.Tr></Table.Thead>
          <Table.Tbody>
            {taxonomy.tags.map((t) => <Table.Tr key={t.id}><Table.Td>{t.label.zh}</Table.Td><Table.Td className="num"><Text size="sm" c="dimmed">{t.id}</Text></Table.Td><Table.Td><Text size="xs" c="dimmed">{t.hint}</Text></Table.Td></Table.Tr>)}
          </Table.Tbody>
        </Table>
      </Paper>
    </Stack>
  );
}
