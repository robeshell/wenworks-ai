import { ActionIcon, Button, Grid, Group, Select, Stack, Text, TextInput, Textarea } from '@mantine/core';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import type { Localized } from '../../shared/content.mjs';

/** A bilingual field: Chinese and English side by side. */
export function Bilingual({ label, hint, value, onChange, rows = 1, counter }: { label: string; hint?: string; value?: Partial<Localized>; onChange: (v: Localized) => void; rows?: number; counter?: boolean }) {
  const v = { zh: value?.zh ?? '', en: value?.en ?? '' };
  const field = (lang: 'zh' | 'en', name: string) => {
    const props = {
      label: <Group gap={6} component="span">{name}{counter ? <Text span size="xs" c="dimmed" className="num">{v[lang].length} 字</Text> : null}</Group>,
      value: v[lang],
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange({ ...v, [lang]: e.currentTarget.value }),
    };
    return rows > 1 ? <Textarea {...props} autosize minRows={rows} maxRows={rows * 3} /> : <TextInput {...props} />;
  };
  return (
    <div>
      <Text size="sm" fw={500}>{label}</Text>
      {hint ? <Text size="xs" c="dimmed" mb={6}>{hint}</Text> : null}
      <Grid gap="md">
        <Grid.Col span={{ base: 12, md: 6 }}>{field('zh', '中文')}</Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}>{field('en', 'English')}</Grid.Col>
      </Grid>
    </div>
  );
}

type Link_ = { label: string; url: string; kind?: string };
const LINK_KINDS = [
  { value: 'official', label: '官网' },
  { value: 'docs', label: '文档' },
  { value: 'repository', label: '代码仓库' },
  { value: 'reference', label: '参考' },
  { value: 'other', label: '其他' },
];

export function LinksEditor({ value, onChange }: { value?: Link_[]; onChange: (v: Link_[]) => void }) {
  const list = value ?? [];
  const set = (i: number, patch: Partial<Link_>) => onChange(list.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  return (
    <Stack gap="xs">
      {list.map((l, i) => (
        <Group key={i} gap="xs" wrap="nowrap" align="flex-end">
          <TextInput label={i === 0 ? '名称' : undefined} value={l.label} onChange={(e) => set(i, { label: e.currentTarget.value })} w={180} />
          <TextInput label={i === 0 ? '地址' : undefined} value={l.url} onChange={(e) => set(i, { url: e.currentTarget.value })} style={{ flex: 1 }} />
          <Select label={i === 0 ? '类型' : undefined} data={LINK_KINDS} value={l.kind ?? 'other'} onChange={(k) => set(i, { kind: k ?? 'other' })} w={120} allowDeselect={false} />
          <ActionIcon variant="subtle" color="gray" size="lg" onClick={() => onChange(list.filter((_, j) => j !== i))} aria-label="删除链接"><IconTrash size={16} /></ActionIcon>
        </Group>
      ))}
      <Group><Button variant="default" size="xs" leftSection={<IconPlus size={14} />} onClick={() => onChange([...list, { label: '', url: '', kind: 'official' }])}>加一个链接</Button></Group>
    </Stack>
  );
}

type Var = { name: string; description: string; example?: string };
export function VariablesEditor({ value, onChange }: { value?: Var[]; onChange: (v: Var[]) => void }) {
  const list = value ?? [];
  const set = (i: number, patch: Partial<Var>) => onChange(list.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  return (
    <Stack gap="xs">
      {list.map((x, i) => (
        <Group key={i} gap="xs" wrap="nowrap" align="flex-end">
          <TextInput label={i === 0 ? '变量名' : undefined} value={x.name} onChange={(e) => set(i, { name: e.currentTarget.value })} w={150} />
          <TextInput label={i === 0 ? '说明' : undefined} value={x.description} onChange={(e) => set(i, { description: e.currentTarget.value })} style={{ flex: 1 }} />
          <TextInput label={i === 0 ? '示例' : undefined} value={x.example ?? ''} onChange={(e) => set(i, { example: e.currentTarget.value })} w={180} />
          <ActionIcon variant="subtle" color="gray" size="lg" onClick={() => onChange(list.filter((_, j) => j !== i))} aria-label="删除变量"><IconTrash size={16} /></ActionIcon>
        </Group>
      ))}
      <Group><Button variant="default" size="xs" leftSection={<IconPlus size={14} />} onClick={() => onChange([...list, { name: '', description: '' }])}>加一个变量</Button></Group>
    </Stack>
  );
}

type Example = { input: string; output: string };
export function ExamplesEditor({ value, onChange }: { value?: Example[]; onChange: (v: Example[]) => void }) {
  const list = value ?? [];
  const set = (i: number, patch: Partial<Example>) => onChange(list.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  return (
    <Stack gap="sm">
      {list.map((x, i) => (
        <Grid key={i} gap="xs" align="flex-end">
          <Grid.Col span={{ base: 12, md: 5.5 }}><Textarea label={`示例 ${i + 1} · 输入`} value={x.input} onChange={(e) => set(i, { input: e.currentTarget.value })} autosize minRows={2} /></Grid.Col>
          <Grid.Col span={{ base: 12, md: 5.5 }}><Textarea label="输出" value={x.output} onChange={(e) => set(i, { output: e.currentTarget.value })} autosize minRows={2} /></Grid.Col>
          <Grid.Col span={{ base: 12, md: 1 }}><ActionIcon variant="subtle" color="gray" size="lg" onClick={() => onChange(list.filter((_, j) => j !== i))} aria-label="删除示例"><IconTrash size={16} /></ActionIcon></Grid.Col>
        </Grid>
      ))}
      <Group><Button variant="default" size="xs" leftSection={<IconPlus size={14} />} onClick={() => onChange([...list, { input: '', output: '' }])}>加一个示例</Button></Group>
    </Stack>
  );
}
