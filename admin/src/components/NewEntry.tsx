import { Button, Modal, Select, Stack, Text, TextInput } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconPlus } from '@tabler/icons-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import type { Kind } from '../../shared/content.mjs';
import { KIND_LABEL, KINDS } from '../../shared/content.mjs';
import { api } from '../api';
import { slugify } from '../format';

const EMPTY: Record<Kind, Record<string, unknown>> = {
  tool: { tagline: { zh: '', en: '' }, summary: { zh: '', en: '' }, description: { zh: '', en: '' }, url: '' },
  site: { summary: { zh: '', en: '' }, description: { zh: '', en: '' }, url: '' },
  skill: { summary: { zh: '', en: '' }, body: { zh: '', en: '' }, links: [] },
  project: { summary: { zh: '', en: '' }, body: { zh: '', en: '' }, links: [] },
  prompt: { summary: { zh: '', en: '' }, prompt: '', variables: [], examples: [], links: [] },
};

export function NewEntryButton({ kind: initial }: { kind?: Kind }) {
  const [opened, { open, close }] = useDisclosure();
  const [kind, setKind] = useState<Kind>(initial ?? 'tool');
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const create = async () => {
    setBusy(true);
    try {
      const entry = await api<{ id: string }>('/entries', { method: 'POST', body: { kind, title, slug, payload: EMPTY[kind] } });
      close();
      navigate(`/content/${encodeURIComponent(entry.id)}`);
    } catch (e) {
      notifications.show({ color: 'red', message: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <Button leftSection={<IconPlus size={16} />} onClick={() => { setKind(initial ?? 'tool'); setTitle(''); setSlug(''); setTouched(false); open(); }}>新建条目</Button>
      <Modal opened={opened} onClose={close} title="新建条目">
        <Stack>
          <Select label="板块" data={KINDS.map((k) => ({ value: k, label: KIND_LABEL[k] }))} value={kind} onChange={(v) => v && setKind(v as Kind)} allowDeselect={false} />
          <TextInput label="标题" placeholder="比如 ChatGPT" value={title} onChange={(e) => { setTitle(e.currentTarget.value); if (!touched) setSlug(slugify(e.currentTarget.value)); }} data-autofocus />
          <TextInput label="地址名" description="出现在网址里，只能用小写字母、数字和连字符，发布后尽量不要改" value={slug} onChange={(e) => { setTouched(true); setSlug(e.currentTarget.value); }} />
          <Text size="xs" c="dimmed">新条目先存成草稿，填好内容、设为「已发布」并发布后才会上线。</Text>
          <Button onClick={create} loading={busy} disabled={!title.trim() || !slug.trim()}>创建并编辑</Button>
        </Stack>
      </Modal>
    </>
  );
}
