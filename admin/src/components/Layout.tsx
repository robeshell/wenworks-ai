import { AppShell, Badge, Burger, Group, NavLink, ScrollArea, Text, UnstyledButton } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconCloudUpload, IconExternalLink, IconHome, IconInbox, IconLayoutDashboard, IconSettings, IconStack2 } from '@tabler/icons-react';
import { useApi } from '../api';
import type { Overview } from '../types';
import type { ReactNode } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router';
import { KIND_LABEL, KINDS } from '../../shared/content.mjs';
import { useShared } from '../App';

function Item({ to, label, icon, active, onClick, right }: { to: string; label: string; icon?: ReactNode; active: boolean; onClick: () => void; right?: ReactNode }) {
  return <NavLink component={Link} to={to} label={label} leftSection={icon} rightSection={right} active={active} onClick={onClick} className="nav-link" variant="subtle" color="ink" />;
}

export function Layout({ children }: { children: ReactNode }) {
  const [opened, { toggle, close }] = useDisclosure();
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const { me, status } = useShared();
  const kind = pathname === '/content' ? params.get('kind') : null;
  // Inbox count for the badge; refreshed whenever the page changes.
  const overview = useApi<Overview>(`/overview?at=${encodeURIComponent(pathname)}`);
  const inbox = overview.data?.inbox ?? 0;
  return (
    <AppShell header={{ height: 52 }} navbar={{ width: 232, breakpoint: 'sm', collapsed: { mobile: !opened } }} padding="xl">
      <AppShell.Header withBorder>
        <Group h="100%" px="md" justify="space-between" wrap="nowrap">
          <Group gap="sm" wrap="nowrap">
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" aria-label="菜单" />
            <UnstyledButton component={Link} to="/" onClick={close}>
              <Text fw={600} size="sm">Wenworks AI <Text span c="dimmed" size="sm" fw={400}>管理后台</Text></Text>
            </UnstyledButton>
            {status.dev ? <Text size="xs" c="accent.6" className="num">本地开发</Text> : null}
          </Group>
          <Group gap="lg" wrap="nowrap">
            <Text component="a" href={status.site} target="_blank" rel="noopener" size="sm" c="dimmed" visibleFrom="xs">
              <Group gap={4} component="span" wrap="nowrap">打开网站 <IconExternalLink size={14} /></Group>
            </Text>
            <Text size="sm" c="dimmed" visibleFrom="sm">{me}</Text>
          </Group>
        </Group>
      </AppShell.Header>
      <AppShell.Navbar withBorder>
        <ScrollArea>
          <div className="nav-group">概览</div>
          <Item to="/" label="工作台" icon={<IconLayoutDashboard size={18} stroke={1.5} />} active={pathname === '/'} onClick={close} />
          <div className="nav-group">收录</div>
          <Item to="/inbox" label="收件箱" icon={<IconInbox size={18} stroke={1.5} />} active={pathname === '/inbox'} onClick={close} right={inbox ? <Badge size="sm" color="accent" variant="filled">{inbox}</Badge> : undefined} />
          <div className="nav-group">工具精选</div>
          <Item to="/content" label="全部条目" icon={<IconStack2 size={18} stroke={1.5} />} active={pathname === '/content' && !kind} onClick={close} />
          {KINDS.map((k) => (
            <Item key={k} to={`/content?kind=${k}`} label={KIND_LABEL[k]} icon={<span style={{ width: 18 }} />} active={kind === k} onClick={close} />
          ))}
          <div className="nav-group">首页</div>
          <Item to="/picks" label="值得看的讨论" icon={<IconHome size={18} stroke={1.5} />} active={pathname === '/picks'} onClick={close} />
          <div className="nav-group">上线</div>
          <Item to="/publish" label="发布" icon={<IconCloudUpload size={18} stroke={1.5} />} active={pathname === '/publish'} onClick={close} />
          <div className="nav-group">系统</div>
          <Item to="/settings" label="设置" icon={<IconSettings size={18} stroke={1.5} />} active={pathname === '/settings'} onClick={close} />
        </ScrollArea>
      </AppShell.Navbar>
      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
}
