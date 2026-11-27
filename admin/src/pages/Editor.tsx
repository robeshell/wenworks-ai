import { Alert, Anchor, Badge, Breadcrumbs, Button, Collapse, Drawer, Grid, Group, JsonInput, List, Modal, MultiSelect, Paper, SegmentedControl, Select, Stack, Text, TextInput, Textarea, Timeline, Title } from '@mantine/core';
import { useDisclosure, useHotkeys } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconDeviceFloppy, IconExternalLink, IconHistory, IconTrash } from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import type { Entry, Localized, Status } from '../../shared/content.mjs';
import { KIND_LABEL, STATUS_LABEL, entryIssues } from '../../shared/content.mjs';
import { api, useApi } from '../api';
import { useShared } from '../App';
import { StatusBadge } from '../components/bits';
import { Bilingual, ExamplesEditor, LinksEditor, VariablesEditor } from '../components/fields';
import { Markdown } from '../components/Markdown';
import { exact, liveUrl, when } from '../format';
import { ImageField } from '../components/ImageField';
import type { FullEntry } from '../types';

type Revision = { id: number; savedAt: string; savedBy: string; entry: Entry };

const Section = ({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) => (
  <Paper>
    <Title order={4}>{title}</Title>
    {hint ? <Text size="xs" c="dimmed" mt={4}>{hint}</Text> : null}
    <Stack gap="md" mt="md">{children}</Stack>
  </Paper>
);

function BodyEditor({ value, onChange }: { value?: Partial<Localized>; onChange: (v: Localized) => void }) {
  const [lang, setLang] = useState<'zh' | 'en'>('zh');
  const [view, setView] = useState<'edit' | 'split' | 'preview'>('split');
  const v = { zh: value?.zh ?? '', en: value?.en ?? '' };
  const editor = <Textarea value={v[lang]} onChange={(e) => onChange({ ...v, [lang]: e.currentTarget.value })} autosize minRows={18} maxRows={40} styles={{ input: { fontFamily: 'var(--mantine-font-family-monospace)', fontSize: 13, lineHeight: 1.6 } }} />;
  return (
    <Stack gap="sm">
      <Group justify="space-between">
        <SegmentedControl size="xs" value={lang} onChange={(x) => setLang(x as 'zh' | 'en')} data={[{ value: 'zh', label: `中文 · ${v.zh.length} 字` }, { value: 'en', label: `English · ${v.en.length}` }]} />
        <SegmentedControl size="xs" value={view} onChange={(x) => setView(x as typeof view)} data={[{ value: 'edit', label: '编辑' }, { value: 'split', label: '并排' }, { value: 'preview', label: '预览' }]} />
      </Group>
      {view === 'edit' ? editor : view === 'preview' ? <Paper bg="#fff"><Markdown text={v[lang]} /></Paper> : (
        <Grid gap="md">
          <Grid.Col span={{ base: 12, lg: 6 }}>{editor}</Grid.Col>
          <Grid.Col span={{ base: 12, lg: 6 }}><Paper bg="#fff" mah={720} style={{ overflow: 'auto' }}><Markdown text={v[lang]} /></Paper></Grid.Col>
        </Grid>
      )}
      <Text size="xs" c="dimmed">正文用 Markdown。网站上中文页面显示中文正文，英文页面显示英文正文；缺一边时会提示只有另一种语言。</Text>
    </Stack>
  );
}

export function Editor() {
  const { id = '' } = useParams();
  const { data, error, setData } = useApi<FullEntry>(`/entries/${encodeURIComponent(id)}`);
  const { status: site, taxonomy } = useShared();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<Entry | null>(null);
  const [saving, setSaving] = useState(false);
  const [history, historyCtl] = useDisclosure();
  const [confirmDelete, deleteCtl] = useDisclosure();
  const [raw, rawCtl] = useDisclosure();
  const [rawText, setRawText] = useState('');
  const revisions = useApi<Revision[]>(history ? `/entries/${encodeURIComponent(id)}/revisions` : null);

  useEffect(() => {
    if (data) setDraft(data);
  }, [data]);
  // The JSON box follows the form, except while it is being typed into.
  useEffect(() => {
    if (draft && !raw) setRawText(JSON.stringify(draft.payload, null, 2));
  }, [draft, raw]);
  const dirty = Boolean(data && draft && JSON.stringify({ ...data, issues: undefined }) !== JSON.stringify({ ...draft, issues: undefined }));
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const save = async () => {
    if (!draft || !dirty) return;
    setSaving(true);
    try {
      const saved = await api<FullEntry>(`/entries/${encodeURIComponent(id)}`, { method: 'PUT', body: draft });
      setData(saved);
      notifications.show({ icon: <IconCheck size={16} />, message: draft.status === 'active' ? '已保存。到「发布」页发布后，网站上才会更新。' : '已保存。' });
    } catch (e) {
      notifications.show({ color: 'red', message: (e as Error).message });
    } finally {
      setSaving(false);
    }
  };
  useHotkeys([['mod+S', () => void save()]], []);

  const issues = useMemo(() => (draft ? entryIssues(draft) : []), [draft]);
  if (error) return <Alert color="red">{error}</Alert>;
  if (!draft) return null;

  const set = (patch: Partial<Entry>) => setDraft({ ...draft, ...patch });
  const setP = (key: string, value: unknown) => setDraft({ ...draft, payload: { ...draft.payload, [key]: value } });
  const p = draft.payload;
  const k = draft.kind;
  const categories = taxonomy.categories.filter((c) => c.blocks.includes(k)).map((c) => ({ value: c.id, label: c.label.zh }));
  const knownTags = taxonomy.tags.map((t) => ({ value: t.id, label: t.label.zh }));
  const tagData = [...knownTags, ...draft.tags.filter((t) => !knownTags.some((x) => x.value === t)).map((t) => ({ value: t, label: `${t}（词表外）` }))];
  const hasUrl = k === 'tool' || k === 'site';
  const hasBody = k === 'skill' || k === 'project';
  const hasImages = k === 'tool' || k === 'site' || 'cover' in p || 'logo' in p;

  const restore = async (rev: Revision) => {
    try {
      const restored = await api<FullEntry>(`/entries/${encodeURIComponent(id)}/revisions/${rev.id}/restore`, { method: 'POST' });
      setData(restored);
      historyCtl.close();
      notifications.show({ message: `已恢复到 ${exact(rev.savedAt)} 之前的版本。` });
    } catch (e) {
      notifications.show({ color: 'red', message: (e as Error).message });
    }
  };
  const remove = async () => {
    try {
      await api(`/entries/${encodeURIComponent(id)}`, { method: 'DELETE' });
      notifications.show({ message: '已删除。' });
      navigate(`/content?kind=${k}`);
    } catch (e) {
      notifications.show({ color: 'red', message: (e as Error).message });
    }
  };

  return (
    <Stack gap="lg">
      <Breadcrumbs separator="/" fz="sm">
        <Anchor component={Link} to="/content" c="dimmed">工具精选</Anchor>
        <Anchor component={Link} to={`/content?kind=${k}`} c="dimmed">{KIND_LABEL[k]}</Anchor>
        <Text size="sm">{data?.title}</Text>
      </Breadcrumbs>
      <div className="page-head" style={{ marginBottom: 0 }}>
        <Group gap="sm">
          <Title order={2}>{draft.title || '未命名'}</Title>
          <StatusBadge status={data!.status} />
          {dirty ? <Badge color="accent" variant="filled">未保存</Badge> : null}
        </Group>
        <Group gap="xs">
          <Button variant="default" leftSection={<IconHistory size={16} />} onClick={historyCtl.open}>修改记录</Button>
          {data!.status === 'active' ? <Button variant="default" component="a" href={liveUrl(site.site, k, data!.slug)} target="_blank" rel="noopener" leftSection={<IconExternalLink size={16} />}>在网站上看</Button> : null}
          {data!.status !== 'active' ? <Button variant="default" color="red" leftSection={<IconTrash size={16} />} onClick={deleteCtl.open}>删除</Button> : null}
          <Button leftSection={<IconDeviceFloppy size={16} />} onClick={save} loading={saving} disabled={!dirty}>保存</Button>
        </Group>
      </div>

      <Grid gap="lg">
        <Grid.Col span={{ base: 12, lg: 8 }}>
          <Stack gap="lg">
            <Section title="基本信息">
              <Grid gap="md">
                <Grid.Col span={{ base: 12, md: 6 }}><TextInput label="标题" value={draft.title} onChange={(e) => set({ title: e.currentTarget.value })} /></Grid.Col>
                <Grid.Col span={{ base: 12, md: 6 }}><TextInput label="地址名" description={k === 'tool' ? '工具没有单独页面，地址名用作锚点' : `网址是 /tools/${k}s/地址名/，发布后尽量不要改`} value={draft.slug} onChange={(e) => set({ slug: e.currentTarget.value })} classNames={{ input: 'num' }} /></Grid.Col>
                {hasUrl ? <Grid.Col span={12}><TextInput label={k === 'tool' ? '官网地址' : '网址'} value={p.url ?? ''} onChange={(e) => setP('url', e.currentTarget.value)} /></Grid.Col> : (
                  <Grid.Col span={12}><TextInput label="来源链接" description="项目仓库、技能主页或原帖地址" value={draft.sourceUrl} onChange={(e) => set({ sourceUrl: e.currentTarget.value })} /></Grid.Col>
                )}
              </Grid>
            </Section>

            <Section title="文案" hint="中英文都要填。网站中文版显示中文，英文版显示英文。">
              {k === 'tool' ? <Bilingual label="一句话判断" hint="卡片上最显眼的那句：为什么收它" value={p.tagline} onChange={(v) => setP('tagline', v)} counter /> : null}
              <Bilingual label="简介" hint={k === 'tool' ? '卡片上的第二行' : '列表和分享卡片上的一句话'} value={p.summary} onChange={(v) => setP('summary', v)} rows={2} />
              {hasUrl ? <Bilingual label="详细说明" hint="展开后看到的说明，可以写两三段" value={p.description} onChange={(v) => setP('description', v)} rows={5} /> : null}
            </Section>

            {hasBody ? <Section title="正文"><BodyEditor value={p.body} onChange={(v) => setP('body', v)} /></Section> : null}

            {k === 'prompt' ? (
              <>
                <Section title="提示词"><Textarea value={p.prompt ?? ''} onChange={(e) => setP('prompt', e.currentTarget.value)} autosize minRows={10} styles={{ input: { fontFamily: 'var(--mantine-font-family-monospace)', fontSize: 13 } }} /></Section>
                <Section title="变量" hint="提示词里用 {变量名} 标出的地方"><VariablesEditor value={p.variables} onChange={(v) => setP('variables', v)} /></Section>
                <Section title="示例"><ExamplesEditor value={p.examples} onChange={(v) => setP('examples', v)} /></Section>
              </>
            ) : null}

            {k !== 'tool' && k !== 'site' ? <Section title="相关链接"><LinksEditor value={p.links} onChange={(v) => setP('links', v)} /></Section> : null}

            <Paper>
              <Group justify="space-between">
                <div><Title order={4}>原始数据</Title><Text size="xs" c="dimmed" mt={4}>表单没覆盖到的字段可以在这里直接改，一般用不到。</Text></div>
                <Button variant="default" size="xs" onClick={rawCtl.toggle}>{raw ? '收起' : '展开'}</Button>
              </Group>
              <Collapse expanded={raw}>
                <JsonInput mt="md" value={rawText} onChange={(text) => { setRawText(text); try { set({ payload: JSON.parse(text) }); } catch { /* keep typing */ } }} autosize minRows={10} maxRows={30} validationError="JSON 格式不对" styles={{ input: { fontSize: 12 } }} />
              </Collapse>
            </Paper>
          </Stack>
        </Grid.Col>

        <Grid.Col span={{ base: 12, lg: 4 }}>
          <Stack gap="lg" style={{ position: 'sticky', top: 72 }}>
            <Section title="状态">
              <SegmentedControl fullWidth value={draft.status} onChange={(v) => set({ status: v as Status })} data={(['draft', 'active', 'archived'] as Status[]).map((s) => ({ value: s, label: STATUS_LABEL[s] }))} />
              <Text size="xs" c="dimmed">
                {draft.status === 'active' ? '保存后到「发布」页发布，网站上就会出现。' : draft.status === 'draft' ? '草稿不会上线。' : '归档后从网站上撤下，数据保留。'}
              </Text>
            </Section>

            <Section title="分类和标签">
              <Select label="分类" data={categories} value={draft.category || null} onChange={(v) => set({ category: v ?? '' })} placeholder="选一个" searchable />
              <MultiSelect label="标签" data={tagData} value={draft.tags} onChange={(v) => set({ tags: v })} searchable placeholder={draft.tags.length ? undefined : '可多选'} />
            </Section>

            {hasImages ? (
              <Section title="图片" hint="上传后记得保存；发布时图片和内容一起上线。">
                <ImageField kind="cover" slug={draft.slug} value={p.cover} onChange={(v) => setP('cover', v)} />
                <ImageField kind="logo" slug={draft.slug} value={p.logo} onChange={(v) => setP('logo', v)} />
              </Section>
            ) : null}

            <Section title={issues.length ? `待补充 · ${issues.length}` : '内容完整'}>
              {issues.length ? <List size="sm" spacing={4}>{issues.map((i) => <List.Item key={i.code}>{i.label}</List.Item>)}</List> : <Text size="sm" c="dimmed">必填项都齐了。</Text>}
            </Section>

            <Paper p="md">
              <Stack gap={4}>
                <Text size="xs" c="dimmed">编号 <span className="num">{draft.id}</span></Text>
                <Text size="xs" c="dimmed">最近保存 {when(data!.updatedAt)}{data!.updatedBy ? `，${data!.updatedBy}` : ''}</Text>
                <Text size="xs" c="dimmed">⌘S / Ctrl+S 保存</Text>
              </Stack>
            </Paper>
          </Stack>
        </Grid.Col>
      </Grid>

      <Drawer opened={history} onClose={historyCtl.close} title="修改记录" position="right" size="md">
        {revisions.data?.length ? (
          <Timeline bulletSize={12} lineWidth={1} color="ink">
            {revisions.data.map((r) => (
              <Timeline.Item key={r.id} title={<Text size="sm" fw={500}>{exact(r.savedAt)}</Text>}>
                <Text size="xs" c="dimmed">{r.savedBy || '—'} 保存前的版本：{r.entry.title} · {STATUS_LABEL[r.entry.status]}</Text>
                <Button size="xs" variant="default" mt={6} onClick={() => restore(r)}>恢复到这个版本</Button>
              </Timeline.Item>
            ))}
          </Timeline>
        ) : <Text size="sm" c="dimmed">{revisions.loading ? '加载中…' : '还没有修改记录。每次保存都会留下保存前的版本。'}</Text>}
      </Drawer>

      <Modal opened={confirmDelete} onClose={deleteCtl.close} title="删除这个条目？">
        <Stack>
          <Text size="sm">「{data!.title}」会从后台删除。删除前的内容会留在修改记录里。</Text>
          <Group justify="flex-end"><Button variant="default" onClick={deleteCtl.close}>取消</Button><Button color="red" onClick={remove}>删除</Button></Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
