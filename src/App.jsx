import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabase';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import DeckEditorPage from './pages/DeckEditorPage';

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = loading

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  if (session === undefined) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div style={{ fontSize: 32 }}>📚</div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/auth" element={session ? <Navigate to="/" replace /> : <AuthPage />} />
      <Route path="/" element={session ? <DashboardPage session={session} /> : <Navigate to="/auth" replace />} />
      <Route path="/deck/:deckId" element={session ? <DeckEditorPage session={session} /> : <Navigate to="/auth" replace />} />
      <Route path="/deck/new" element={session ? <DeckEditorPage session={session} isNew /> : <Navigate to="/auth" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
