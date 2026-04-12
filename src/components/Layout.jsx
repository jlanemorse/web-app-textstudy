import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabase';

const NAV = [
  { path: '/',          emoji: '📚', label: 'My Decks' },
  { path: '/generate',  emoji: '🤖', label: 'AI Generate' },
  { path: '/paste',     emoji: '📋', label: 'Paste Text' },
  { path: '/quizlet',   emoji: '🌐', label: 'Quizlet Import' },
  { path: '/presets',   emoji: '📦', label: 'Preset Decks' },
  { path: '/weights',   emoji: '🎯', label: 'Card Difficulty' },
  { path: '/study',     emoji: '🎮', label: 'Study' },
];

export default function Layout({ children, session }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  return (
    <div style={s.shell}>
      <aside style={s.sidebar}>
        <div style={s.logo}>📚 TextStudy</div>
        <nav style={s.nav}>
          {NAV.map(item => {
            const active = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path));
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
          <p style={s.email}>{session?.user?.email}</p>
          <button style={s.signOut} onClick={handleSignOut}>Sign Out</button>
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
    width: 220, background: '#fff', borderRight: '1px solid #E5E7EB',
    display: 'flex', flexDirection: 'column', padding: '24px 12px',
    position: 'sticky', top: 0, height: '100vh', flexShrink: 0,
  },
  logo: { fontSize: 16, fontWeight: 900, color: '#1A1A2E', padding: '0 8px', marginBottom: 28 },
  nav: { display: 'flex', flexDirection: 'column', gap: 4, flex: 1 },
  navItem: {
    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
    borderRadius: 10, fontSize: 14, fontWeight: 600, color: '#6B7280',
    background: 'transparent', border: 'none', cursor: 'pointer',
    textAlign: 'left', transition: 'all 0.12s',
  },
  navItemActive: { background: '#EEF2FF', color: PURPLE, fontWeight: 700 },
  navEmoji: { fontSize: 16 },
  sidebarBottom: { borderTop: '1px solid #F3F4F6', paddingTop: 16, paddingLeft: 8 },
  email: { fontSize: 12, color: '#9CA3AF', marginBottom: 8, wordBreak: 'break-all' },
  signOut: { fontSize: 13, fontWeight: 700, color: '#6B7280', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 },
  main: { flex: 1, minHeight: '100vh', overflowY: 'auto' },
};
