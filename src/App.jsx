import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabase';
import Layout from './components/Layout';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import DeckEditorPage from './pages/DeckEditorPage';
import GeneratePage from './pages/GeneratePage';
import PasteTextPage from './pages/PasteTextPage';
import QuizletImportPage from './pages/QuizletImportPage';
import StudyPage from './pages/StudyPage';
import WeightsPage from './pages/WeightsPage';
import PresetDecksPage from './pages/PresetDecksPage';

export default function App() {
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  if (session === undefined) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontSize: 40 }}>📚</div>;
  }

  if (!session) {
    return (
      <Routes>
        <Route path="*" element={<AuthPage />} />
      </Routes>
    );
  }

  return (
    <Layout session={session}>
      <Routes>
        <Route path="/" element={<DashboardPage session={session} />} />
        <Route path="/deck/:deckId" element={<DeckEditorPage session={session} />} />
        <Route path="/generate" element={<GeneratePage session={session} />} />
        <Route path="/paste" element={<PasteTextPage session={session} />} />
        <Route path="/quizlet" element={<QuizletImportPage session={session} />} />
        <Route path="/study" element={<StudyPage session={session} />} />
        <Route path="/weights" element={<WeightsPage session={session} />} />
        <Route path="/presets" element={<PresetDecksPage session={session} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
