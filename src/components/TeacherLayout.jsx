import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabase';

const NAV = [
  { path: '/teacher/classes',  emoji: '🏫', label: 'Classes' },
  { path: '/teacher/students', emoji: '👥', label: 'Students' },
  { path: '/teacher/decks',    emoji: '🗂️', label: 'My Decks' },
  { path: '/teacher/create',   emoji: '✨', label: 'Create Decks' },
];

export default function TeacherLayout({ children, session }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [displayName, setDisplayName] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');

  useEffect(() => {
    if (!session?.user?.id) return;
    supabase.from('profiles').select('display_name').eq('id', session.user.id).single()
      .then(({ data }) => { if (data?.display_name) setDisplayName(data.display_name); });
  }, [session]);

  async function saveName() {
    const trimmed = nameDraft.trim();
    setEditingName(false);
    if (!trimmed || trimmed === displayName) return;
    setDisplayName(trimmed);
    await supabase.from('profiles').upsert({ id: session.user.id, display_name: trimmed }, { onConflict: 'id', ignoreDuplicates: false });
  }

  return (
    <div style={s.shell}>
      <aside style={s.sidebar}>
        <div style={s.logoWrap}>
          <div style={s.logo}>📚 TextStudy</div>
          <div style={s.roleBadge}>Teacher</div>
        </div>
        <nav style={s.nav}>
          {NAV.map(item => {
            const active = pathname.startsWith(item.path);
            return (
              <button
                key={item.path}
                style={{ ...s.navItem, ...(active ? s.navItemActive : {}) }}
                onClick={() => navigate(item.path)}
              >
                <span style={s.navEmoji}>{item.emoji}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
        <div style={s.sidebarBottom}>
          {editingName ? (
            <input
              style={s.nameInput}
              value={nameDraft}
              onChange={e => setNameDraft(e.target.value)}
              onBlur={saveName}
              onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false); }}
              autoFocus
              placeholder="Your name"
            />
          ) : (
            <button style={s.nameBtn} onClick={() => { setNameDraft(displayName); setEditingName(true); }}>
              {displayName || session?.user?.email || '—'}
              <span style={s.namePencil}>✎</span>
            </button>
          )}
          <button style={s.signOut} onClick={() => supabase.auth.signOut()}>Sign Out</button>
        </div>
      </aside>
      <main style={s.main}>{children}</main>
    </div>
  );
}

const PURPLE = '#5B4FE9';
const s = {
  shell: { display: 'flex', minHeight: '100vh' },
  sidebar: {
    width: 220, background: '#1A1A2E', borderRight: '1px solid #2D2B4E',
    display: 'flex', flexDirection: 'column', padding: '24px 12px',
    position: 'sticky', top: 0, height: '100vh', flexShrink: 0,
  },
  logoWrap: { padding: '0 8px', marginBottom: 28 },
  logo: { fontSize: 16, fontWeight: 900, color: '#fff', marginBottom: 6 },
  roleBadge: { display: 'inline-block', background: '#5B4FE9', color: '#fff', fontSize: 10, fontWeight: 800, padding: '2px 10px', borderRadius: 20, letterSpacing: '0.5px', textTransform: 'uppercase' },
  nav: { display: 'flex', flexDirection: 'column', gap: 4, flex: 1 },
  navItem: {
    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
    borderRadius: 10, fontSize: 14, fontWeight: 600, color: '#9CA3AF',
    background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left',
  },
  navItemActive: { background: 'rgba(91,79,233,0.2)', color: '#A5B4FC', fontWeight: 700 },
  navEmoji: { fontSize: 16 },
  sidebarBottom: { borderTop: '1px solid #2D2B4E', paddingTop: 16, paddingLeft: 8 },
  nameBtn: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#9CA3AF', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 8, maxWidth: '100%', textAlign: 'left', wordBreak: 'break-all' },
  namePencil: { fontSize: 11, color: '#4B5563', flexShrink: 0 },
  nameInput: { width: '100%', fontSize: 13, padding: '6px 8px', borderRadius: 8, border: '1.5px solid #5B4FE9', marginBottom: 8, outline: 'none', boxSizing: 'border-box', background: '#2D2B4E', color: '#fff' },
  signOut: { fontSize: 13, fontWeight: 700, color: '#6B7280', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 },
  main: { flex: 1, minHeight: '100vh', overflowY: 'auto', background: '#F4F5F9' },
};
