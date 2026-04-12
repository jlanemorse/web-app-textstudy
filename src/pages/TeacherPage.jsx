import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(ms) {
  if (!ms || ms < 0) return '0m';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  return d.toLocaleDateString();
}

function generateCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StudentRow({ student, sessions, decks, pushedDecks, studentDecks, onExpand, expanded }) {
  const mySessions = sessions.filter(s => s.user_id === student.id);
  const chillMs = mySessions.filter(s => s.mode === 'chill')
    .reduce((sum, s) => sum + (s.duration_ms ?? 0), 0);
  const powerMs = mySessions.filter(s => s.mode === 'power')
    .reduce((sum, s) => sum + (s.duration_ms ?? 0), 0);
  const totalReviewed = mySessions.reduce((sum, s) => sum + (s.cards_reviewed ?? 0), 0);
  const totalCorrect = mySessions.reduce((sum, s) => sum + (s.cards_correct ?? 0), 0);
  const accuracy = totalReviewed > 0 ? Math.round((totalCorrect / totalReviewed) * 100) : null;
  const lastActive = mySessions.length > 0
    ? mySessions.sort((a, b) => new Date(b.started_at) - new Date(a.started_at))[0].started_at
    : null;

  // Per-deck breakdown
  const deckMap = {};
  for (const s of mySessions) {
    const key = s.deck_id ?? s.deck_name ?? 'Unknown';
    const name = s.deck_name ?? decks.find(d => d.id === s.deck_id)?.name ?? 'Unknown Deck';
    if (!deckMap[key]) deckMap[key] = { name, chill: 0, power: 0, reviewed: 0, correct: 0, sessions: 0 };
    deckMap[key].sessions += 1;
    deckMap[key].reviewed += s.cards_reviewed ?? 0;
    deckMap[key].correct += s.cards_correct ?? 0;
    if (s.mode === 'chill') deckMap[key].chill += s.duration_ms ?? 0;
    if (s.mode === 'power') deckMap[key].power += s.duration_ms ?? 0;
  }
  const deckRows = Object.values(deckMap);

  return (
    <div style={sr.wrap}>
      <div style={sr.row} onClick={onExpand}>
        <div style={sr.nameCol}>
          <p style={sr.name}>{student.display_name || student.email || 'Unknown'}</p>
          <p style={sr.lastActive}>{lastActive ? fmtDate(lastActive) : 'Never studied'}</p>
        </div>
        <div style={sr.stat}>
          <p style={sr.statNum}>{mySessions.filter(s => s.mode === 'chill').length}</p>
          <p style={sr.statLabel}>🃏 Chill</p>
        </div>
        <div style={sr.stat}>
          <p style={sr.statNum}>{mySessions.filter(s => s.mode === 'power').length}</p>
          <p style={sr.statLabel}>⚡ Power</p>
        </div>
        <div style={sr.stat}>
          <p style={sr.statNum}>{mySessions.filter(s => s.mode === 'passive').length}</p>
          <p style={sr.statLabel}>⏳ Passive</p>
        </div>
        <div style={sr.stat}>
          <p style={sr.statNum}>{fmt(chillMs)}</p>
          <p style={sr.statLabel}>Chill Time</p>
        </div>
        <div style={sr.stat}>
          <p style={sr.statNum}>{fmt(powerMs)}</p>
          <p style={sr.statLabel}>Power Time</p>
        </div>
        <div style={sr.stat}>
          <p style={{ ...sr.statNum, color: accuracy === null ? '#9CA3AF' : accuracy >= 70 ? '#16A34A' : accuracy >= 50 ? '#D97706' : '#DC2626' }}>
            {accuracy !== null ? `${accuracy}%` : '—'}
          </p>
          <p style={sr.statLabel}>Accuracy</p>
        </div>
        <div style={sr.stat}>
          <p style={sr.statNum}>{totalReviewed}</p>
          <p style={sr.statLabel}>Cards Seen</p>
        </div>
        <span style={{ ...sr.chevron, transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>▾</span>
      </div>

      {expanded && (
        <div style={sr.expanded}>
          {pushedDecks.length > 0 && (
            <div style={sr.downloadedSection}>
              <p style={sr.downloadedTitle}>📥 Pushed Decks</p>
              <div style={sr.downloadedList}>
                {pushedDecks.map(pd => {
                  const myNames = new Set((studentDecks ?? []).filter(d => d.user_id === student.id).map(d => d.name));
                  const has = myNames.has(pd.name);
                  return (
                    <span key={pd.id} style={{ ...sr.downloadedChip, ...(has ? sr.chipYes : sr.chipNo) }}>
                      {has ? '✓' : '✗'} {pd.name}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
          {deckRows.length === 0 ? (
            <p style={sr.noDecks}>No sessions yet.</p>
          ) : (
            <table style={sr.table}>
              <thead>
                <tr>
                  {['Deck', 'Sessions', '🃏 Chill Time', '⚡ Power Time', 'Cards Seen', 'Accuracy'].map(h => (
                    <th key={h} style={sr.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {deckRows.map((d, i) => {
                  const acc = d.reviewed > 0 ? Math.round((d.correct / d.reviewed) * 100) : null;
                  return (
                    <tr key={i} style={i % 2 === 0 ? sr.trEven : {}}>
                      <td style={sr.td}>{d.name}</td>
                      <td style={sr.tdNum}>{d.sessions}</td>
                      <td style={sr.tdNum}>{fmt(d.chill)}</td>
                      <td style={sr.tdNum}>{fmt(d.power)}</td>
                      <td style={sr.tdNum}>{d.reviewed}</td>
                      <td style={{ ...sr.tdNum, color: acc === null ? '#9CA3AF' : acc >= 70 ? '#16A34A' : acc >= 50 ? '#D97706' : '#DC2626', fontWeight: 800 }}>
                        {acc !== null ? `${acc}%` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

const sr = {
  wrap: { background: '#fff', borderRadius: 14, marginBottom: 8, overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' },
  row: { display: 'flex', alignItems: 'center', padding: '14px 18px', cursor: 'pointer' },
  nameCol: { flex: 1, minWidth: 0, paddingRight: 12 },
  name: { fontSize: 14, fontWeight: 700, color: '#1A1A2E', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  lastActive: { fontSize: 11, color: '#9CA3AF' },
  stat: { width: COL_W, flexShrink: 0, textAlign: 'center' },
  statNum: { fontSize: 15, fontWeight: 800, color: '#1A1A2E' },
  statLabel: { fontSize: 10, color: '#9CA3AF', fontWeight: 600, marginTop: 1 },
  chevron: { fontSize: 18, color: '#9CA3AF', transition: 'transform 0.2s', flexShrink: 0, width: 20, textAlign: 'center' },
  expanded: { borderTop: '1px solid #F3F4F6', padding: '12px 18px', background: '#FAFAFA', overflowX: 'auto' },
  noDecks: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', padding: '12px 0' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { textAlign: 'left', padding: '6px 12px', fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #E5E7EB' },
  td: { padding: '8px 12px', color: '#374151', fontWeight: 600 },
  tdNum: { padding: '8px 12px', color: '#374151', fontWeight: 700, textAlign: 'center' },
  trEven: { background: '#F9FAFB' },
  downloadedSection: { marginBottom: 14 },
  downloadedTitle: { fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 },
  downloadedList: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  downloadedChip: { fontSize: 12, fontWeight: 700, borderRadius: 20, padding: '4px 12px' },
  chipYes: { background: '#DCFCE7', color: '#16A34A' },
  chipNo: { background: '#FEE2E2', color: '#DC2626' },
};

// ── Class Detail View ─────────────────────────────────────────────────────────

function ClassDetail({ cls, session, onBack }) {
  const [members, setMembers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [decks, setDecks] = useState([]);
  const [pushedDecksList, setPushedDecksList] = useState([]);
  const [studentDecks, setStudentDecks] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [pushingDeckId, setPushingDeckId] = useState(null);
  const [pushedDeckIds, setPushedDeckIds] = useState(new Set());
  const [myDecks, setMyDecks] = useState([]);
  const [showPushPanel, setShowPushPanel] = useState(false);

  useEffect(() => { loadData(); }, [cls.id]);

  async function loadData() {
    setLoading(true);
    // Get member IDs
    const { data: membersData } = await supabase
      .from('class_members')
      .select('student_id')
      .eq('class_id', cls.id);

    const studentIds = (membersData ?? []).map(m => m.student_id);

    // Fetch profiles separately (may be missing for some students)
    let profileMap = {};
    if (studentIds.length > 0) {
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', studentIds);
      for (const p of profilesData ?? []) profileMap[p.id] = p;
    }

    // Build member list — fall back to user id if no profile
    const memberProfiles = studentIds.map(id => ({
      id,
      display_name: profileMap[id]?.display_name || id,
    }));
    setMembers(memberProfiles);

    // Get sessions for all students
    if (studentIds.length > 0) {
      const { data: sessData } = await supabase
        .from('study_sessions')
        .select('*')
        .in('user_id', studentIds)
        .order('started_at', { ascending: false });

      // Compute duration_ms from started_at / ended_at
      const enriched = (sessData ?? []).map(s => ({
        ...s,
        duration_ms: s.started_at && s.ended_at
          ? new Date(s.ended_at) - new Date(s.started_at)
          : 0,
      }));
      setSessions(enriched);
    }

    // Get pushed decks for this class (with names)
    const { data: classDecksData } = await supabase
      .from('class_decks')
      .select('deck_id, decks(id, name)')
      .eq('class_id', cls.id);
    setPushedDecksList((classDecksData ?? []).map(cd => ({ id: cd.deck_id, name: cd.decks?.name })).filter(d => d.name));

    // Get all decks belonging to students in this class
    if (studentIds.length > 0) {
      const { data: stuDecksData } = await supabase
        .from('decks')
        .select('id, name, user_id')
        .in('user_id', studentIds);
      setStudentDecks(stuDecksData ?? []);
    }

    // Get teacher's decks
    const { data: myDecksData } = await supabase
      .from('decks')
      .select('id, name')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });
    setMyDecks(myDecksData ?? []);

    // Get already-pushed decks
    const { data: pushedData } = await supabase
      .from('class_decks')
      .select('deck_id')
      .eq('class_id', cls.id);
    setPushedDeckIds(new Set((pushedData ?? []).map(d => d.deck_id)));

    // All decks referenced in sessions (for name lookup)
    const { data: allDecks } = await supabase.from('decks').select('id, name');
    setDecks(allDecks ?? []);

    setLoading(false);
  }

  async function handlePushDeck(deckId) {
    setPushingDeckId(deckId);
    await supabase.from('class_decks').upsert({ class_id: cls.id, deck_id: deckId });
    setPushedDeckIds(prev => new Set([...prev, deckId]));
    setPushingDeckId(null);
  }

  function copyCode() {
    navigator.clipboard.writeText(cls.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Summary stats
  const totalSessions = sessions.length;
  const totalCards = sessions.reduce((s, r) => s + (r.cards_reviewed ?? 0), 0);
  const totalCorrect = sessions.reduce((s, r) => s + (r.cards_correct ?? 0), 0);
  const overallAccuracy = totalCards > 0 ? Math.round((totalCorrect / totalCards) * 100) : null;
  const chillMs = sessions.filter(s => s.mode === 'chill').reduce((sum, s) => sum + s.duration_ms, 0);
  const powerMs = sessions.filter(s => s.mode === 'power').reduce((sum, s) => sum + s.duration_ms, 0);

  return (
    <div style={s.page}>
      <button style={s.backBtn} onClick={onBack}>← All Classes</button>
      <div style={s.classHeader}>
        <div>
          <h1 style={s.title}>{cls.name}</h1>
          <div style={s.codeRow}>
            <span style={s.codeLabel}>Join Code:</span>
            <span style={s.code}>{cls.code}</span>
            <button style={s.copyBtn} onClick={copyCode}>{copied ? '✓ Copied' : 'Copy'}</button>
          </div>
        </div>
        <button style={s.pushBtn} onClick={() => setShowPushPanel(v => !v)}>
          📤 Push Deck to Class
        </button>
      </div>

      {showPushPanel && (
        <div style={s.pushPanel}>
          <p style={s.pushPanelTitle}>Push a deck — all students in this class will see it in their app</p>
          <div style={s.pushList}>
            {myDecks.map(d => (
              <div key={d.id} style={s.pushItem}>
                <span style={s.pushDeckName}>{d.name}</span>
                <button
                  style={{ ...s.pushDeckBtn, ...(pushedDeckIds.has(d.id) ? s.pushDeckBtnDone : {}) }}
                  onClick={() => !pushedDeckIds.has(d.id) && handlePushDeck(d.id)}
                  disabled={pushedDeckIds.has(d.id) || pushingDeckId === d.id}
                >
                  {pushingDeckId === d.id ? '...' : pushedDeckIds.has(d.id) ? '✓ Pushed' : 'Push'}
                </button>
              </div>
            ))}
            {myDecks.length === 0 && <p style={{ color: '#9CA3AF', fontSize: 13 }}>No decks to push yet.</p>}
          </div>
        </div>
      )}

      {/* Summary row */}
      <div style={s.summaryRow}>
        {[
          { label: 'Students', value: members.length },
          { label: 'Total Sessions', value: totalSessions },
          { label: 'Cards Reviewed', value: totalCards },
          { label: 'Overall Accuracy', value: overallAccuracy !== null ? `${overallAccuracy}%` : '—' },
          { label: '🃏 Chill Time', value: fmt(chillMs) },
          { label: '⚡ Power Time', value: fmt(powerMs) },
        ].map(item => (
          <div key={item.label} style={s.summaryCard}>
            <p style={s.summaryNum}>{item.value}</p>
            <p style={s.summaryLabel}>{item.label}</p>
          </div>
        ))}
      </div>

      <h2 style={s.sectionTitle}>Students</h2>
      {loading ? (
        <p style={{ color: '#9CA3AF', textAlign: 'center', padding: 40 }}>Loading...</p>
      ) : members.length === 0 ? (
        <div style={s.emptyStudents}>
          <p style={{ fontSize: 32, marginBottom: 8 }}>👋</p>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#1A1A2E', marginBottom: 4 }}>No students yet</p>
          <p style={{ fontSize: 13, color: '#6B7280' }}>Share the join code <strong>{cls.code}</strong> with your students</p>
        </div>
      ) : (
        <>
          <div style={s.studentTableHeader}>
            <div style={s.thName}>Student</div>
            <div style={s.thStat}>🃏 Chill</div>
            <div style={s.thStat}>⚡ Power</div>
            <div style={s.thStat}>⏳ Passive</div>
            <div style={s.thStat}>Chill Time</div>
            <div style={s.thStat}>Power Time</div>
            <div style={s.thStat}>Accuracy</div>
            <div style={s.thStat}>Cards Seen</div>
            <div style={{ width: 20 }} />
          </div>
          {members.map(member => (
            <StudentRow
              key={member.id}
              student={member}
              sessions={sessions}
              decks={decks}
              pushedDecks={pushedDecksList}
              studentDecks={studentDecks}
              expanded={expandedId === member.id}
              onExpand={() => setExpandedId(expandedId === member.id ? null : member.id)}
            />
          ))}
        </>
      )}
    </div>
  );
}

// ── Main Teacher Page ─────────────────────────────────────────────────────────

export default function TeacherPage({ session }) {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newClassName, setNewClassName] = useState('');

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    const { data: clsData } = await supabase
      .from('classes')
      .select('*, class_members(count)')
      .eq('teacher_id', session.user.id);
    setClasses(clsData ?? []);
    setLoading(false);
  }

  async function handleCreateClass() {
    if (!newClassName.trim()) return;
    const code = generateCode();

    // Ensure profile row exists before inserting class
    await supabase.from('profiles').upsert({
      id: session.user.id,
      role: 'teacher',
      display_name: session.user.email,
    }, { onConflict: 'id' });

    const { data, error } = await supabase
      .from('classes')
      .insert({ name: newClassName.trim(), code, teacher_id: session.user.id })
      .select()
      .single();

    if (error) {
      alert('Could not create class: ' + error.message);
      return;
    }
    if (data) {
      setClasses(prev => [{ ...data, class_members: [{ count: 0 }] }, ...prev]);
      setNewClassName('');
      setCreating(false);
    }
  }

  if (selectedClass) {
    return <ClassDetail cls={selectedClass} session={session} onBack={() => setSelectedClass(null)} />;
  }

  return (
    <div style={s.page}>
      <div style={s.headerRow}>
        <div>
          <h1 style={s.title}>👩‍🏫 Teacher Dashboard</h1>
          <p style={s.sub}>Manage your classes and track student progress</p>
        </div>
        <button style={s.createBtn} onClick={() => setCreating(true)}>+ New Class</button>
      </div>

      {creating && (
        <div style={s.createCard}>
          <p style={s.createTitle}>New Class</p>
          <input
            style={s.input}
            placeholder="Class name (e.g. Biology Period 3)"
            value={newClassName}
            onChange={e => setNewClassName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreateClass()}
            autoFocus
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={s.createSaveBtn} onClick={handleCreateClass} disabled={!newClassName.trim()}>Create Class</button>
            <button style={s.cancelBtn} onClick={() => { setCreating(false); setNewClassName(''); }}>Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <p style={{ color: '#9CA3AF', textAlign: 'center', padding: 60 }}>Loading...</p>
      ) : classes.length === 0 && !creating ? (
        <div style={s.empty}>
          <p style={{ fontSize: 48, marginBottom: 12 }}>🏫</p>
          <p style={{ fontSize: 18, fontWeight: 800, color: '#1A1A2E', marginBottom: 6 }}>No classes yet</p>
          <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 24 }}>Create a class to start tracking your students</p>
          <button style={s.createBtn} onClick={() => setCreating(true)}>+ Create First Class</button>
        </div>
      ) : (
        <div style={s.classGrid}>
          {classes.map(cls => {
            const studentCount = cls.class_members?.[0]?.count ?? 0;
            return (
              <div key={cls.id} style={s.classCard} onClick={() => setSelectedClass(cls)}>
                <p style={s.className}>{cls.name}</p>
                <p style={s.classCode}>Code: <strong>{cls.code}</strong></p>
                <p style={s.classStudents}>{studentCount} student{studentCount !== 1 ? 's' : ''}</p>
                <div style={s.classArrow}>View →</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const PURPLE = '#5B4FE9';
const COL_W = 82;
const s = {
  page: { maxWidth: 900, margin: '0 auto', padding: '36px 24px' },
  backBtn: { fontSize: 14, fontWeight: 700, color: PURPLE, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 20, display: 'block' },
  title: { fontSize: 26, fontWeight: 900, color: '#1A1A2E', marginBottom: 4 },
  sub: { fontSize: 14, color: '#6B7280' },
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 },
  createBtn: { padding: '11px 22px', borderRadius: 12, background: PURPLE, color: '#fff', fontSize: 14, fontWeight: 800, border: 'none', cursor: 'pointer', flexShrink: 0 },

  createCard: { background: '#fff', borderRadius: 16, padding: 24, marginBottom: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', gap: 14 },
  createTitle: { fontSize: 16, fontWeight: 800, color: '#1A1A2E' },
  input: { padding: '12px 14px', borderRadius: 10, border: '1.5px solid #E5E7EB', fontSize: 15, color: '#1A1A2E', outline: 'none', width: '100%', boxSizing: 'border-box' },
  createSaveBtn: { padding: '11px 22px', borderRadius: 10, background: PURPLE, color: '#fff', fontSize: 14, fontWeight: 800, border: 'none', cursor: 'pointer' },
  cancelBtn: { padding: '11px 18px', borderRadius: 10, background: 'transparent', color: '#6B7280', fontSize: 14, fontWeight: 700, border: '1.5px solid #E5E7EB', cursor: 'pointer' },

  empty: { textAlign: 'center', padding: '60px 20px' },
  classGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 },
  classCard: { background: '#fff', borderRadius: 18, padding: 24, cursor: 'pointer', boxShadow: '0 2px 12px rgba(0,0,0,0.07)', transition: 'box-shadow 0.15s', display: 'flex', flexDirection: 'column', gap: 6 },
  className: { fontSize: 18, fontWeight: 800, color: '#1A1A2E' },
  classCode: { fontSize: 13, color: '#6B7280' },
  classStudents: { fontSize: 13, color: '#9CA3AF', fontWeight: 600 },
  classArrow: { marginTop: 12, fontSize: 13, fontWeight: 700, color: PURPLE },

  classHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 },
  codeRow: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 },
  codeLabel: { fontSize: 13, color: '#6B7280', fontWeight: 600 },
  code: { fontSize: 18, fontWeight: 900, color: PURPLE, letterSpacing: 3, background: '#EEF2FF', borderRadius: 8, padding: '4px 12px' },
  copyBtn: { fontSize: 12, fontWeight: 700, color: '#fff', background: PURPLE, border: 'none', borderRadius: 8, padding: '5px 12px', cursor: 'pointer' },
  pushBtn: { padding: '11px 20px', borderRadius: 12, background: '#1A1A2E', color: '#fff', fontSize: 14, fontWeight: 800, border: 'none', cursor: 'pointer', flexShrink: 0 },

  pushPanel: { background: '#F8F9FF', borderRadius: 16, padding: 20, marginBottom: 24, border: '1.5px solid #E0E7FF' },
  pushPanelTitle: { fontSize: 13, color: '#6B7280', marginBottom: 14 },
  pushList: { display: 'flex', flexDirection: 'column', gap: 8 },
  pushItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', borderRadius: 10, padding: '12px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' },
  pushDeckName: { fontSize: 14, fontWeight: 700, color: '#1A1A2E' },
  pushDeckBtn: { padding: '7px 16px', borderRadius: 8, background: PURPLE, color: '#fff', fontSize: 13, fontWeight: 800, border: 'none', cursor: 'pointer' },
  pushDeckBtnDone: { background: '#D1FAE5', color: '#065F46', cursor: 'default' },

  summaryRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 12, marginBottom: 28 },
  summaryCard: { background: '#fff', borderRadius: 14, padding: '16px 12px', textAlign: 'center', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' },
  summaryNum: { fontSize: 22, fontWeight: 900, color: PURPLE, marginBottom: 4 },
  summaryLabel: { fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px' },

  sectionTitle: { fontSize: 16, fontWeight: 800, color: '#1A1A2E', marginBottom: 10 },
  emptyStudents: { background: '#fff', borderRadius: 16, padding: 40, textAlign: 'center', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' },
  studentTableHeader: { display: 'flex', alignItems: 'center', padding: '0 18px', marginBottom: 6 },
  thName: { flex: 1, fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px', paddingRight: 12 },
  thStat: { width: COL_W, flexShrink: 0, fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center', whiteSpace: 'nowrap' },
};
