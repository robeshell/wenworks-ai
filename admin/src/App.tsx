import { Center, Loader } from '@mantine/core';
import { createContext, useContext } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { useApi } from './api';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Editor } from './pages/Editor';
import { Entries } from './pages/Entries';
import { Inbox } from './pages/Inbox';
import { Must } from './pages/agents/Must';
import { Paths } from './pages/agents/Paths';
import { Tables } from './pages/agents/Tables';
import { Picks } from './pages/Picks';
import { Publish } from './pages/Publish';
import { Settings } from './pages/Settings';
import type { Status_, Taxonomy } from './types';

type Shared = { status: Status_; taxonomy: Taxonomy; me: string };
const SharedContext = createContext<Shared | null>(null);
export const useShared = () => useContext(SharedContext)!;

export function App() {
  const status = useApi<Status_>('/status');
  const taxonomy = useApi<Taxonomy>('/taxonomy');
  const me = useApi<{ email: string }>('/me');
  const error = status.error || taxonomy.error || me.error;
  if (error) return <Center h="100vh" p="xl">{error}</Center>;
  if (!status.data || !taxonomy.data || !me.data) return <Center h="100vh"><Loader color="ink" size="sm" /></Center>;
  return (
    <SharedContext.Provider value={{ status: status.data, taxonomy: taxonomy.data, me: me.data.email }}>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/content" element={<Entries />} />
          <Route path="/content/:id" element={<Editor />} />
          <Route path="/inbox" element={<Inbox />} />
          <Route path="/picks" element={<Picks />} />
          <Route path="/agents/must" element={<Must />} />
          <Route path="/agents/paths" element={<Paths />} />
          <Route path="/agents/tables" element={<Tables />} />
          <Route path="/publish" element={<Publish />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </SharedContext.Provider>
  );
}
