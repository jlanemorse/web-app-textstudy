import { useState } from 'react';
import { supabase } from '../supabase';

export default function AuthPage() {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student'); // 'student' | 'teacher'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) { setError(error.message); }
      else {
        // Set role at signup time — never overwrite later
        if (data?.user) {
          await supabase.from('profiles').upsert({ id: data.user.id, role, display_name: email }, { onConflict: 'id' });
        }
        setSuccess('Account created! Check your email to confirm, then log in.');
      }
    }
    setLoading(false);
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logo}>📚</div>
        <h1 style={s.title}>TextStudy</h1>
        <p style={s.sub}>Create flashcard decks on any device, study on your phone.</p>

        <div style={s.tabs}>
          <button style={{ ...s.tab, ...(mode === 'login' ? s.tabActive : {}) }} onClick={() => { setMode('login'); setError(''); setSuccess(''); }}>Log In</button>
          <button style={{ ...s.tab, ...(mode === 'signup' ? s.tabActive : {}) }} onClick={() => { setMode('signup'); setError(''); setSuccess(''); }}>Sign Up</button>
        </div>

        <form onSubmit={handleSubmit} style={s.form}>
          <input
            style={s.input}
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <input
            style={s.input}
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />
          {mode === 'signup' && (
            <div style={s.roleRow}>
              <button type="button" style={{ ...s.roleBtn, ...(role === 'student' ? s.roleBtnActive : {}) }} onClick={() => setRole('student')}>🎓 Student</button>
              <button type="button" style={{ ...s.roleBtn, ...(role === 'teacher' ? s.roleBtnActive : {}) }} onClick={() => setRole('teacher')}>👩‍🏫 Teacher</button>
            </div>
          )}
          {error && <p style={s.error}>{error}</p>}
          {success && <p style={s.successMsg}>{success}</p>}
          <button style={s.btn} type="submit" disabled={loading}>
            {loading ? '...' : mode === 'login' ? 'Log In' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
}

const PURPLE = '#5B4FE9';

const s = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: '#F4F5F9' },
  card: { background: '#fff', borderRadius: 24, padding: '40px 36px', width: '100%', maxWidth: 420, boxShadow: '0 8px 40px rgba(0,0,0,0.1)', textAlign: 'center' },
  logo: { fontSize: 48, marginBottom: 8 },
  title: { fontSize: 28, fontWeight: 900, color: '#1A1A2E', marginBottom: 6 },
  sub: { fontSize: 14, color: '#6B7280', marginBottom: 28, lineHeight: 1.5 },
  tabs: { display: 'flex', background: '#F4F5F9', borderRadius: 12, padding: 4, marginBottom: 24 },
  tab: { flex: 1, padding: '10px 0', borderRadius: 10, fontSize: 14, fontWeight: 700, color: '#6B7280', background: 'transparent', border: 'none', cursor: 'pointer', transition: 'all 0.15s' },
  tabActive: { background: '#fff', color: PURPLE, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  form: { display: 'flex', flexDirection: 'column', gap: 12 },
  input: { padding: '13px 16px', borderRadius: 12, border: '1.5px solid #E5E7EB', fontSize: 15, color: '#1A1A2E', background: '#F9FAFB', transition: 'border-color 0.15s' },
  btn: { padding: '14px 0', borderRadius: 12, background: PURPLE, color: '#fff', fontSize: 15, fontWeight: 800, border: 'none', cursor: 'pointer', marginTop: 4, boxShadow: '0 4px 14px rgba(91,79,233,0.35)', transition: 'opacity 0.15s' },
  roleRow: { display: 'flex', gap: 10 },
  roleBtn: { flex: 1, padding: '11px 0', borderRadius: 12, border: '2px solid #E5E7EB', background: '#F9FAFB', fontSize: 14, fontWeight: 700, color: '#6B7280', cursor: 'pointer' },
  roleBtnActive: { border: '2px solid #5B4FE9', background: '#EEF2FF', color: '#5B4FE9' },
  error: { color: '#DC2626', fontSize: 13, textAlign: 'left' },
  successMsg: { color: '#16A34A', fontSize: 13, textAlign: 'left' },
};
