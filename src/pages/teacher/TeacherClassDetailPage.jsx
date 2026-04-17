import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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


export default function TeacherClassDetailPage({ session }) {
  const { classId } = useParams();
  const navigate = useNavigate();
  const [cls, setCls] = useState(null);
  const [students, setStudents] = useState([]);
  const [pushedDecks, setPushedDecks] = useState([]);
  const [myDecks, setMyDecks] = useState([]);
  const [pushedDeckIds, setPushedDeckIds] = useState(new Set());
  const [studentDecks, setStudentDecks] = useState([]);
  const [pushingId, setPushingId] = useState(null);
  const [showPush, setShowPush] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAll(); }, [classId]);

  async function loadAll() {
    setLoading(true);
    const { data: clsData } = await supabase.from('classes').select('*').eq('id', classId).single();
    setCls(clsData);

    const { data: members } = await supabase.from('class_members').select('student_id').eq('class_id', classId);
    const ids = (members ?? []).map(m => m.student_id);

    let profileMap = {};
    if (ids.length) {
      const { data: profiles } = await supabase.from('profiles').select('id, display_name').in('id', ids);
      profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p]));
    }

    const { data: sessions } = ids.length ? await supabase.from('study_sessions')
      .select('*').in('user_id', ids).order('started_at', { ascending: false }) : { data: [] };

    const enriched = (sessions ?? []).map(s => ({
      ...s,
      duration_ms: s.started_at && s.ended_at ? new Date(s.ended_at) - new Date(s.started_at) : 0,
    }));

    const result = ids.map(id => {
      const mySess = enriched.filter(s => s.user_id === id);
      const reviewed = mySess.reduce((sum, s) => sum + (s.cards_reviewed ?? 0), 0);
      const correct = mySess.reduce((sum, s) => sum + (s.cards_correct ?? 0), 0);
      return {
        id,
        name: profileMap[id]?.display_name || id,
        sessions: mySess.length,
        chillSessions: mySess.filter(s => s.mode === 'chill').length,
        powerSessions: mySess.filter(s => s.mode === 'power').length,
        passiveSessions: mySess.filter(s => s.mode === 'passive').length,
        accuracy: reviewed > 0 ? Math.round((correct / reviewed) * 100) : null,
        cardsReviewed: reviewed,
        lastActive: mySess[0]?.started_at ?? null,
      };
    });
    setStudents(result);

    // Pushed decks
    const { data: cdData } = await supabase.from('class_decks').select('deck_id, decks(id, name)').eq('class_id', classId);
    setPushedDecks((cdData ?? []).map(cd => ({ id: cd.deck_id, name: cd.decks?.name })).filter(d => d.name));
    setPushedDeckIds(new Set((cdData ?? []).map(cd => cd.deck_id)));

    // Teacher's own decks
    const { data: myDecksData } = await supabase.from('decks').select('id, name').eq('user_id', session.user.id).order('created_at', { ascending: false });
    setMyDecks(myDecksData ?? []);

    // Student decks (for download status)
    if (ids.length) {
      const { data: stuDecks } = await supabase.from('decks').select('id, name, user_id').in('user_id', ids);
      setStudentDecks(stuDecks ?? []);
    }

    setLoading(false);
  }

  async function handlePush(deckId) {
    setPushingId(deckId);
    await supabase.from('class_decks').upsert({ class_id: classId, deck_id: deckId });
    setPushedDeckIds(prev => new Set([...prev, deckId]));
    setPushingId(null);
  }

  function copyCode() {
    navigator.clipboard.writeText(cls?.code ?? '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) return <p style={{ padding: 60, textAlign: 'center', color: '#9CA3AF' }}>Loading...</p>;

  return (
    <div style={s.page}>
      <button style={s.back} onClick={() => navigate('/teacher/classes')}>← All Classes</button>

      <div style={s.header}>
        <div>
          <h1 style={s.title}>{cls?.name}</h1>
          <div style={s.codeRow}>
            <span style={s.codeLabel}>Join Code:</span>
            <span style={s.code}>{cls?.code}</span>
            <button style={s.copyBtn} onClick={copyCode}>{copied ? '✓ Copied' : 'Copy'}</button>
          </div>
        </div>
        <button style={s.pushBtn} onClick={() => setShowPush(v => !v)}>📤 Push Deck</button>
      </div>

      {showPush && (
        <div style={s.pushPanel}>
          <p style={s.pushTitle}>Push a deck to all students in this class</p>
          <div style={s.pushList}>
            {myDecks.map(d => {
              const pushed = pushedDeckIds.has(d.id);
              return (
                <div key={d.id} style={s.pushItem}>
                  <span style={s.pushName}>{d.name}</span>
                  <button
                    style={{ ...s.pushDeckBtn, ...(pushed ? s.pushDeckBtnDone : {}) }}
                    onClick={() => !pushed && handlePush(d.id)}
                    disabled={pushed || pushingId === d.id}
                  >
                    {pushingId === d.id ? '...' : pushed ? '✓ Pushed' : 'Push'}
                  </button>
                </div>
              );
            })}
            {myDecks.length === 0 && <p style={{ color: '#9CA3AF', fontSize: 13 }}>No decks to push yet.</p>}
          </div>
        </div>
      )}

      <h2 style={s.sectionTitle}>Students ({students.length})</h2>
      {students.length === 0 ? (
        <div style={s.empty}>
          <p style={{ fontSize: 32, marginBottom: 8 }}>👋</p>
          <p style={{ fontWeight: 700, color: '#1A1A2E', marginBottom: 4 }}>No students yet</p>
          <p style={{ fontSize: 13, color: '#6B7280' }}>Share code <strong>{cls?.code}</strong> with your students</p>
        </div>
      ) : (
        <div style={s.studentList}>
          {students.map(st => {
            const myNames = new Set(studentDecks.filter(d => d.user_id === st.id).map(d => d.name));
            return (
              <div key={st.id} className="ts-card" style={s.studentCard} onClick={() => navigate(`/teacher/students/${st.id}`)}>
                <div style={s.studentTop}>
                  <div style={s.studentInfo}>
                    <p style={s.studentName}>{st.name}</p>
                    <p style={s.studentLast}>Last active: {fmtDate(st.lastActive)}</p>
                  </div>
                  <div style={s.statGroup}>
                    <div style={s.stat}><p style={s.statNum}>{st.chillSessions}</p><p style={s.statLabel}>🃏 Chill</p></div>
                    <div style={s.stat}><p style={s.statNum}>{st.powerSessions}</p><p style={s.statLabel}>⚡ Power</p></div>
                    <div style={s.stat}><p style={s.statNum}>{st.passiveSessions}</p><p style={s.statLabel}>⏳ Passive</p></div>
                    <div style={s.stat}>
                      <p style={{ ...s.statNum, color: st.accuracy === null ? '#9CA3AF' : st.accuracy >= 70 ? '#16A34A' : st.accuracy >= 50 ? '#D97706' : '#DC2626' }}>
                        {st.accuracy !== null ? `${st.accuracy}%` : '—'}
                      </p>
                      <p style={s.statLabel}>Accuracy</p>
                    </div>
                    <div style={s.stat}><p style={s.statNum}>{st.cardsReviewed}</p><p style={s.statLabel}>Cards</p></div>
                  </div>
                </div>
                {pushedDecks.length > 0 && (
                  <div style={s.deckChips}>
                    {pushedDecks.map(pd => {
                      const has = myNames.has(pd.name);
                      return <span key={pd.id} style={{ ...s.chip, ...(has ? s.chipYes : s.chipNo) }}>{has ? '✓' : '✗'} {pd.name}</span>;
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const PURPLE = '#5B4FE9';
const s = {
  page: { maxWidth: 960, margin: '0 auto', padding: '36px 24px' },
  back: { fontSize: 14, fontWeight: 700, color: 'rgba(196,181,253,0.9)', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 20, display: 'block' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 },
  title: { fontSize: 28, fontWeight: 900, color: '#fff', marginBottom: 8, textShadow: '0 2px 12px rgba(0,0,0,0.3)' },
  codeRow: { display: 'flex', alignItems: 'center', gap: 10 },
  codeLabel: { fontSize: 13, color: 'rgba(196,181,253,0.8)', fontWeight: 600 },
  code: { fontSize: 20, fontWeight: 900, color: PURPLE, letterSpacing: 3, background: '#EEF2FF', borderRadius: 8, padding: '4px 12px' },
  copyBtn: { fontSize: 12, fontWeight: 700, color: '#fff', background: PURPLE, border: 'none', borderRadius: 8, padding: '5px 12px', cursor: 'pointer' },
  pushBtn: { padding: '11px 20px', borderRadius: 12, background: '#1A1A2E', color: '#fff', fontSize: 14, fontWeight: 800, border: 'none', cursor: 'pointer' },
  pushPanel: { background: '#F8F9FF', borderRadius: 16, padding: 20, marginBottom: 24, border: '1.5px solid #E0E7FF' },
  pushTitle: { fontSize: 13, color: '#6B7280', marginBottom: 14 },
  pushList: { display: 'flex', flexDirection: 'column', gap: 8 },
  pushItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', borderRadius: 10, padding: '12px 16px' },
  pushName: { fontSize: 14, fontWeight: 700, color: '#1A1A2E' },
  pushDeckBtn: { padding: '7px 16px', borderRadius: 8, background: PURPLE, color: '#fff', fontSize: 13, fontWeight: 800, border: 'none', cursor: 'pointer' },
  pushDeckBtnDone: { background: '#D1FAE5', color: '#065F46', cursor: 'default' },
  sectionTitle: { fontSize: 18, fontWeight: 800, color: '#1A1A2E', marginBottom: 14 },
  empty: { background: '#fff', borderRadius: 16, padding: 40, textAlign: 'center' },
  studentList: { display: 'flex', flexDirection: 'column', gap: 12 },
  studentCard: { background: '#fff', borderRadius: 16, padding: '18px 20px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', cursor: 'pointer' },
  studentTop: { display: 'flex', alignItems: 'center', gap: 16, marginBottom: 10 },
  studentInfo: { flex: 1, minWidth: 0 },
  studentName: { fontSize: 15, fontWeight: 800, color: '#1A1A2E', marginBottom: 2 },
  studentLast: { fontSize: 11, color: '#9CA3AF' },
  statGroup: { display: 'flex', gap: 16, flexShrink: 0 },
  stat: { textAlign: 'center' },
  statNum: { fontSize: 16, fontWeight: 800, color: '#1A1A2E' },
  statLabel: { fontSize: 10, color: '#9CA3AF', fontWeight: 600, marginTop: 1 },
  deckChips: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  chip: { fontSize: 12, fontWeight: 700, borderRadius: 20, padding: '3px 10px' },
  chipYes: { background: '#DCFCE7', color: '#16A34A' },
  chipNo: { background: '#FEE2E2', color: '#DC2626' },
};
