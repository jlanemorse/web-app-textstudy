import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase';

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const diff = Date.now() - d;
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return d.toLocaleDateString();
}

export default function TeacherStudentsPage({ session }) {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);

    // Get all classes this teacher owns
    const { data: classes } = await supabase.from('classes').select('id').eq('teacher_id', session.user.id);
    const classIds = (classes ?? []).map(c => c.id);

    if (!classIds.length) { setStudents([]); setLoading(false); return; }

    // Get all unique student IDs across all classes
    const { data: members } = await supabase.from('class_members').select('student_id, class_id').in('class_id', classIds);
    const memberRows = members ?? [];

    // Deduplicate student IDs
    const idSet = new Set(memberRows.map(m => m.student_id));
    const ids = [...idSet];

    if (!ids.length) { setStudents([]); setLoading(false); return; }

    // Load profiles
    const { data: profiles } = await supabase.from('profiles').select('id, display_name').in('id', ids);
    const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p]));

    // Load sessions
    const { data: sessions } = await supabase.from('study_sessions')
      .select('*').in('user_id', ids).order('started_at', { ascending: false });

    const enriched = (sessions ?? []).map(s => ({
      ...s,
      duration_ms: s.started_at && s.ended_at ? new Date(s.ended_at) - new Date(s.started_at) : 0,
    }));

    // Load class names for display
    const { data: classRows } = await supabase.from('classes').select('id, name').in('id', classIds);
    const classNameMap = Object.fromEntries((classRows ?? []).map(c => [c.id, c.name]));

    // Build student → class names map
    const studentClasses = {};
    for (const m of memberRows) {
      if (!studentClasses[m.student_id]) studentClasses[m.student_id] = [];
      const name = classNameMap[m.class_id];
      if (name && !studentClasses[m.student_id].includes(name)) {
        studentClasses[m.student_id].push(name);
      }
    }

    const result = ids.map(id => {
      const mySess = enriched.filter(s => s.user_id === id);
      const reviewed = mySess.reduce((sum, s) => sum + (s.cards_reviewed ?? 0), 0);
      const correct = mySess.reduce((sum, s) => sum + (s.cards_correct ?? 0), 0);
      return {
        id,
        name: profileMap[id]?.display_name || '(No name)',
        sessions: mySess.length,
        chillSessions: mySess.filter(s => s.mode === 'chill').length,
        powerSessions: mySess.filter(s => s.mode === 'power').length,
        passiveSessions: mySess.filter(s => s.mode === 'passive').length,
        accuracy: reviewed > 0 ? Math.round((correct / reviewed) * 100) : null,
        cardsReviewed: reviewed,
        lastActive: mySess[0]?.started_at ?? null,
        classes: studentClasses[id] ?? [],
      };
    });

    setStudents(result.sort((a, b) => a.name.localeCompare(b.name)));
    setLoading(false);
  }

  const filtered = students.filter(st =>
    st.name.toLowerCase().includes(search.toLowerCase()) ||
    st.classes.some(c => c.toLowerCase().includes(search.toLowerCase()))
  );

  if (loading) return <p style={{ padding: 60, textAlign: 'center', color: '#9CA3AF' }}>Loading...</p>;

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <h1 style={s.title}>All Students</h1>
          <p style={s.sub}>{students.length} student{students.length !== 1 ? 's' : ''} across all your classes</p>
        </div>
      </div>

      <input
        style={s.search}
        placeholder="Search by name or class..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      {filtered.length === 0 ? (
        <div style={s.empty}>
          <p style={{ fontSize: 32, marginBottom: 8 }}>👥</p>
          <p style={{ fontWeight: 700, color: '#1A1A2E', marginBottom: 4 }}>
            {students.length === 0 ? 'No students yet' : 'No matches'}
          </p>
          <p style={{ fontSize: 13, color: '#6B7280' }}>
            {students.length === 0 ? 'Students will appear here once they join a class' : 'Try a different search'}
          </p>
        </div>
      ) : (
        <div style={s.list}>
          {filtered.map(st => (
            <div key={st.id} className="ts-card" style={s.card} onClick={() => navigate(`/teacher/students/${st.id}`)}>
              <div style={s.cardTop}>
                <div style={s.info}>
                  <p style={s.name}>{st.name}</p>
                  <div style={s.classTags}>
                    {st.classes.map(c => <span key={c} style={s.classTag}>{c}</span>)}
                  </div>
                </div>
                <div style={s.stats}>
                  <div style={s.stat}>
                    <p style={s.statNum}>{st.chillSessions}</p>
                    <p style={s.statLabel}>🃏 Chill</p>
                  </div>
                  <div style={s.stat}>
                    <p style={s.statNum}>{st.powerSessions}</p>
                    <p style={s.statLabel}>⚡ Power</p>
                  </div>
                  <div style={s.stat}>
                    <p style={s.statNum}>{st.passiveSessions}</p>
                    <p style={s.statLabel}>⏳ Passive</p>
                  </div>
                  <div style={s.stat}>
                    <p style={{
                      ...s.statNum,
                      color: st.accuracy === null ? '#9CA3AF' : st.accuracy >= 70 ? '#16A34A' : st.accuracy >= 50 ? '#D97706' : '#DC2626'
                    }}>
                      {st.accuracy !== null ? `${st.accuracy}%` : '—'}
                    </p>
                    <p style={s.statLabel}>Accuracy</p>
                  </div>
                  <div style={s.stat}>
                    <p style={s.statNum}>{st.cardsReviewed}</p>
                    <p style={s.statLabel}>Cards</p>
                  </div>
                </div>
              </div>
              <p style={s.lastActive}>Last active: {fmtDate(st.lastActive)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const PURPLE = '#5B4FE9';
const s = {
  page: { maxWidth: 960, margin: '0 auto', padding: '36px 24px' },
  header: { marginBottom: 20 },
  title: { fontSize: 28, fontWeight: 900, color: '#fff', marginBottom: 4, textShadow: '0 2px 12px rgba(0,0,0,0.3)' },
  sub: { fontSize: 14, color: 'rgba(196,181,253,0.8)' },
  search: {
    width: '100%', boxSizing: 'border-box', padding: '12px 16px',
    borderRadius: 12, border: '1.5px solid #E5E7EB', fontSize: 14,
    color: '#1A1A2E', outline: 'none', marginBottom: 20, background: '#fff',
  },
  empty: { background: '#fff', borderRadius: 16, padding: 40, textAlign: 'center' },
  list: { display: 'flex', flexDirection: 'column', gap: 10 },
  card: {
    background: '#fff', borderRadius: 16, padding: '16px 20px',
    boxShadow: '0 1px 6px rgba(0,0,0,0.06)', cursor: 'pointer',
  },
  cardTop: { display: 'flex', alignItems: 'center', gap: 16, marginBottom: 6 },
  info: { flex: 1, minWidth: 0 },
  name: { fontSize: 15, fontWeight: 800, color: '#1A1A2E', marginBottom: 4 },
  classTags: { display: 'flex', flexWrap: 'wrap', gap: 4 },
  classTag: {
    fontSize: 11, fontWeight: 700, background: '#EEF2FF', color: PURPLE,
    borderRadius: 20, padding: '2px 8px',
  },
  stats: { display: 'flex', gap: 16, flexShrink: 0 },
  stat: { textAlign: 'center' },
  statNum: { fontSize: 16, fontWeight: 800, color: '#1A1A2E' },
  statLabel: { fontSize: 10, color: '#9CA3AF', fontWeight: 600, marginTop: 1 },
  lastActive: { fontSize: 11, color: '#9CA3AF' },
};
