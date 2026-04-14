import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabase';
import Layout from './components/Layout';
import TeacherLayout from './components/TeacherLayout';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import DeckEditorPage from './pages/DeckEditorPage';
import GeneratePage from './pages/GeneratePage';
import PasteTextPage from './pages/PasteTextPage';
import QuizletImportPage from './pages/QuizletImportPage';
import StudyPage from './pages/StudyPage';
import WeightsPage from './pages/WeightsPage';
import PresetDecksPage from './pages/PresetDecksPage';
import JoinClassPage from './pages/JoinClassPage';
import StudentClassesPage from './pages/StudentClassesPage';
import TeacherClassesPage from './pages/teacher/TeacherClassesPage';
import TeacherClassDetailPage from './pages/teacher/TeacherClassDetailPage';
import TeacherStudentsPage from './pages/teacher/TeacherStudentsPage';
import TeacherStudentProfilePage from './pages/teacher/TeacherStudentProfilePage';
import TeacherDecksPage from './pages/teacher/TeacherDecksPage';
import TeacherCreatePage from './pages/teacher/TeacherCreatePage';

export default function App() {
  const [session, setSession] = useState(undefined);
  const [role, setRole] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user?.id) { setRole(null); return; }
    supabase.from('profiles').select('role').eq('id', session.user.id).single()
      .then(({ data }) => setRole(data?.role ?? 'student'));
  }, [session]);

  if (session === undefined || (session && role === null)) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontSize: 40 }}>📚</div>;
  }

  if (!session) {
    return (
      <Routes>
        <Route path="*" element={<AuthPage />} />
      </Routes>
    );
  }

  if (role === 'teacher') {
    return (
      <TeacherLayout session={session}>
        <Routes>
          <Route path="/teacher/classes" element={<TeacherClassesPage session={session} />} />
          <Route path="/teacher/classes/:classId" element={<TeacherClassDetailPage session={session} />} />
          <Route path="/teacher/students" element={<TeacherStudentsPage session={session} />} />
          <Route path="/teacher/students/:studentId" element={<TeacherStudentProfilePage session={session} />} />
          <Route path="/teacher/decks" element={<TeacherDecksPage session={session} />} />
          <Route path="/teacher/decks/:deckId" element={<DeckEditorPage session={session} />} />
          <Route path="/teacher/create" element={<TeacherCreatePage session={session} />} />
          <Route path="/teacher/create/generate" element={<GeneratePage session={session} />} />
          <Route path="/teacher/create/paste" element={<PasteTextPage session={session} />} />
          <Route path="/teacher/create/quizlet" element={<QuizletImportPage session={session} />} />
          <Route path="/teacher/create/presets" element={<PresetDecksPage session={session} />} />
          <Route path="*" element={<Navigate to="/teacher/classes" replace />} />
        </Routes>
      </TeacherLayout>
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
        <Route path="/classes" element={<StudentClassesPage session={session} />} />
        <Route path="/join" element={<JoinClassPage session={session} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
