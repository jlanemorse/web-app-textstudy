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
          <span style={s.logoIcon}>📚</span>
          <div>
            <div style={s.logo}>TextStudy</div>
            <div style={s.roleBadge}>Teacher</div>
          </div>
        </div>
        <nav style={s.nav}>
          {NAV.map(item => {
            const active = pathname.startsWith(item.path);
            return (
              <button
                key={item.path}
                className={`ts-nav-item${active ? ' active' : ''}`}
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
              <span style={s.nameAvatar}>{(displayName || session?.user?.email || '?')[0].toUpperCase()}</span>
              <span style={s.nameText}>{displayName || session?.user?.email || '—'}</span>
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

const s = {
  shell: { display: 'flex', minHeight: '100vh' },
  sidebar: {
    width: 228,
    background: 'linear-gradient(180deg, #1E1C3A 0%, #1A1A2E 100%)',
    borderRight: '1px solid rgba(91,79,233,0.2)',
    display: 'flex', flexDirection: 'column', padding: '20px 10px',
    position: 'sticky', top: 0, height: '100vh', flexShrink: 0,
    boxShadow: '2px 0 24px rgba(0,0,0,0.25)',
  },
  logoWrap: { display: 'flex', alignItems: 'center', gap: 10, padding: '4px 10px', marginBottom: 24 },
  logoIcon: { fontSize: 22 },
  logo: { fontSize: 15, fontWeight: 900, color: '#fff', letterSpacing: '-0.2px' },
  roleBadge: { display: 'inline-block', background: 'linear-gradient(135deg, #7268F2, #5B4FE9)', color: '#fff', fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 20, letterSpacing: '0.8px', textTransform: 'uppercase', boxShadow: '0 2px 6px rgba(91,79,233,0.4)' },
  nav: { display: 'flex', flexDirection: 'column', gap: 2, flex: 1 },
  navEmoji: { fontSize: 16 },
  sidebarBottom: { borderTop: '1px solid rgba(91,79,233,0.15)', paddingTop: 14, paddingLeft: 4, paddingRight: 4 },
  nameBtn: { display: 'flex', alignItems: 'center', gap: 8, width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', padding: '8px 8px', borderRadius: 10, marginBottom: 6 },
  nameAvatar: { width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg, #7268F2, #5B4FE9)', color: '#fff', fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(91,79,233,0.4)' },
  nameText: { flex: 1, fontSize: 13, fontWeight: 700, color: '#9CA3AF', textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  namePencil: { fontSize: 11, color: '#4B5563', flexShrink: 0 },
  nameInput: { width: '100%', fontSize: 13, padding: '7px 10px', borderRadius: 8, border: '1.5px solid #5B4FE9', marginBottom: 8, outline: 'none', boxSizing: 'border-box', background: '#2D2B4E', color: '#fff', boxShadow: '0 0 0 3px rgba(91,79,233,0.2)' },
  signOut: { fontSize: 13, fontWeight: 600, color: '#6B7280', background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: 8 },
  main: { flex: 1, minHeight: '100vh', overflowY: 'auto', background: 'transparent' },
};
