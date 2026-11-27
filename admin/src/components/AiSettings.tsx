import { Badge, Button, Group, Paper, Select, Stack, Text, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useEffect, useMemo, useState } from 'react';
import { api, useApi } from '../api';

type Model = { id: string; name: string; prompt: number; completion: number; context: number };
const price = (n: number) => (n ? `$${n < 1 ? n.toFixed(2) : n.toFixed(1)}` : '免费');

export function AiSettings() {
  const ai = useApi<{ model: string; keyConfigured: boolean }>('/settings/ai');
  const models = useApi<Model[]>('/models');
  const [model, setModel] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (ai.data) setModel(ai.data.model || null);
  }, [ai.data]);
  const options = useMemo(
    () => (models.data ?? []).map((m) => ({ value: m.id, label: `${m.name}　输入 ${price(m.prompt)} / 输出 ${price(m.completion)} 每百万 token` })),
    [models.data],
  );
  const chosen = models.data?.find((m) => m.id === model);
  const save = async () => {
    setBusy(true);
    try {
      await api('/settings/ai', { method: 'PUT', body: { model } });
      notifications.show({ message: `起草会用 ${model}。` });
      ai.reload();
    } catch (e) {
      notifications.show({ color: 'red', message: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };
  return (
    <Paper>
      <Title order={4} mb="md">AI 起草</Title>
      <Stack gap="md">
        <Group gap="xs">
          <Text size="sm" w={110}>OpenRouter 密钥</Text>
          <Badge color={ai.data?.keyConfigured ? 'teal' : 'accent'}>{ai.data?.keyConfigured ? '已配置' : '缺 OPENROUTER_API_KEY'}</Badge>
        </Group>
        <Select
          label="模型"
          description="收件箱里每起草一条调用一次。正文较长，单条大约用几千到一万多 token。"
          placeholder={models.loading ? '正在读取 OpenRouter 的模型列表…' : '搜模型名，比如 claude、gpt、gemini'}
          data={options}
          value={model}
          onChange={setModel}
          searchable
          nothingFoundMessage="没有找到"
          limit={50}
          maxDropdownHeight={360}
        />
        {chosen ? <Text size="xs" c="dimmed" className="num">{chosen.id} · 上下文 {Math.round(chosen.context / 1000)}K</Text> : null}
        {models.error ? <Text size="xs" c="red">{models.error}</Text> : null}
        <Group>
          <Button onClick={save} loading={busy} disabled={!model || model === ai.data?.model}>保存</Button>
        </Group>
      </Stack>
    </Paper>
  );
}
