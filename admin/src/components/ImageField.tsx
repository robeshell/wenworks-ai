import { Button, FileButton, Group, Stack, Text, TextInput } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconUpload } from '@tabler/icons-react';
import { useState } from 'react';
import { upload } from '../api';
import { assetUrl } from '../format';

async function sha10(blob: Blob) {
  const digest = await crypto.subtle.digest('SHA-1', await blob.arrayBuffer());
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 10);
}

/** Draws an image file into a canvas no wider than `maxWidth` and encodes it. */
async function reencode(file: File, maxWidth: number, type: 'image/webp' | 'image/png', quality = 0.82): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxWidth / bitmap.width);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
  if (!blob) throw new Error('浏览器没能压缩这张图片。');
  return blob;
}

/**
 * Cover: any image, resized to at most 1440px wide and saved as webp under /covers/<slug>-<hash>.webp.
 * Logo: svg kept as is, other images resized to at most 256px and saved as png under /logos/<slug>.
 */
export function ImageField({ kind, slug, value, onChange }: { kind: 'cover' | 'logo'; slug: string; value?: string; onChange: (path: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [bust, setBust] = useState(0);
  const pick = async (file: File | null) => {
    if (!file) return;
    setBusy(true);
    try {
      let blob: Blob;
      let path: string;
      if (kind === 'cover') {
        blob = await reencode(file, 1440, 'image/webp');
        path = `/covers/${slug}-${await sha10(blob)}.webp`;
      } else if (file.type === 'image/svg+xml') {
        blob = file;
        path = `/logos/${slug}.svg`;
      } else {
        blob = await reencode(file, 256, 'image/png');
        path = `/logos/${slug}.png`;
      }
      const r = await upload(`/assets${path}`, blob);
      onChange(path);
      setBust(Date.now());
      notifications.show({ message: `已上传（${Math.round(r.size / 1024)} KB），保存后发布即可上线。` });
    } catch (e) {
      notifications.show({ color: 'red', message: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };
  const src = assetUrl('', value);
  return (
    <Stack gap={6}>
      <Group justify="space-between" align="flex-end">
        <Text size="sm" fw={500}>{kind === 'cover' ? '封面' : 'Logo'}</Text>
        <FileButton onChange={pick} accept={kind === 'cover' ? 'image/png,image/jpeg,image/webp' : 'image/png,image/jpeg,image/webp,image/svg+xml'}>
          {(props) => <Button {...props} size="xs" variant="default" leftSection={<IconUpload size={14} />} loading={busy} disabled={!slug}>{value ? '换一张' : '上传'}</Button>}
        </FileButton>
      </Group>
      {src ? (
        <img src={`${src}${bust ? `?v=${bust}` : ''}`} alt="" style={{ maxWidth: kind === 'cover' ? '100%' : 64, border: '1px solid var(--line)', background: '#f5f5f5' }} />
      ) : (
        <Text size="xs" c="dimmed">{kind === 'cover' ? '还没有封面。建议用官网首屏截图，16:9，会自动压成不超过 1440 宽的 webp。' : '还没有 Logo。正方形最好，svg 或 png。'}</Text>
      )}
      <TextInput size="xs" value={value ?? ''} onChange={(e) => onChange(e.currentTarget.value)} placeholder={kind === 'cover' ? '/covers/xxx.webp' : '/logos/xxx.png'} classNames={{ input: 'num' }} aria-label={`${kind} 路径`} />
    </Stack>
  );
}
