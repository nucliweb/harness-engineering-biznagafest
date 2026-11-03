import { conference } from '@agenda/core';
import { Layout } from '@agenda/ui';
import { Route, Routes } from 'react-router';
import { SchedulePage } from './pages/SchedulePage';
import { TalkPage } from './pages/TalkPage';

export function App() {
  return (
    <Layout title={conference.name}>
      <Routes>
        <Route path="/" element={<SchedulePage />} />
        <Route path="/talks/:id" element={<TalkPage />} />
        <Route path="*" element={<p>Page not found.</p>} />
      </Routes>
    </Layout>
  );
}
