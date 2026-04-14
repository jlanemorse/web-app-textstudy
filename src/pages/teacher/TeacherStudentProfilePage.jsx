import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase';

function fmt(ms) {
  if (!ms) return '0m';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function buildWeekChart(sessions) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const label = d.toLocaleDateString('en-US', { weekday: 'short' });
    const dateStr = d.toISOString().slice(0, 10);
    return { label, count: sessions.filter(s => s.started_at?.slice(0, 10) === dateStr).length };
  });
}

function GoalBar({ label, current, target, unit = '', color }) {
  const pct = Math.min((current / target) * 100, 100);
  const met = current >= target;
  return (
    <div style={sg.goalRow}>
      <div style={sg.goalTop}>
        <span style={sg.goalLabel}>{label}</span>
        <span style={{ ...sg.goalVal, color: met ? '#16A34A' : '#1A1A2E' }}>{current}{unit} / {target}{unit}</span>
      </div>
      <div style={sg.goalBar}>
        <div style={{ ...sg.goalFill, width: `${pct}%`, background: met ? '#16A34A' : PURPLE }} />
      </div>
    </div>
  );
}

const sg = {
  goalRow: { marginBottom: 14 },
  goalTop: { display: 'flex', justifyContent: 'space-between', marginBottom: 6 },
  goalLabel: { fontSize: 14, fontWeight: 600, color: '#374151' },
  goalVal: { fontSize: 14, fontWeight: 800 },
  goalBar: { height: 8, background: '#F3F4F6', borderRadius: 4 },
  goalFill: { height: 8, borderRadius: 4, transition: 'width 0.3s' },
};

export default function TeacherStudentProfilePage({ session }) {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const [studentName, setStudentName] = useState('');
  const [sessions, setSessions] = useState([]);
  const [goal, setGoal] = useState(null);
  const [missedCards, setMissedCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingGoal, setEditingGoal] = useState(false);
  const [draft, setDraft] = useState({ sessions_per_day: '', sessions_per_week: '', accuracy_target: '', notes: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadData(); }, [studentId]);

  async function loadData() {
    setLoading(true);
    const [{ data: profile }, { data: sessData }, { data: goalData }, { data: cardResults }] = await Promise.all([
      supabase.from('profiles').select('display_name').eq('id', studentId).single(),
      supabase.from('study_sessions').select('*').eq('user_id', studentId).order('started_at', { ascending: false }),
      supabase.from('student_goals').select('*').eq('teacher_id', session.user.id).eq('student_id', studentId).single(),
      supabase.from('card_results').select('card_id, correct, cards(front, back)').eq('user_id', studentId),
    ]);

    setStudentName(profile?.display_name || studentId);

    const enriched = (sessData ?? []).map(s => ({
      ...s, duration_ms: s.started_at && s.ended_at ? new Date(s.ended_at) - new Date(s.started_at) : 0,
    }));
    setSessions(enriched);

    if (goalData) {
      setGoal(goalData);
      setDraft({
        sessions_per_day: String(goalData.sessions_per_day ?? ''),
        sessions_per_week: String(goalData.sessions_per_week ?? ''),
        accuracy_target: String(goalData.accuracy_target ?? ''),
        notes: goalData.notes ?? '',
      });
    }

    const missed = {};
    for (const r of cardResults ?? []) {
      if (!r.correct && r.cards) {
        if (!missed[r.card_id]) missed[r.card_id] = { front: r.cards.front, back: r.cards.back, count: 0 };
        missed[r.card_id].count++;
      }
    }
    setMissedCards(Object.values(missed).sort((a, b) => b.count - a.count).slice(0, 8));
    setLoading(false);
  }

  async function saveGoal() {
    setSaving(true);
    const payload = {
      teacher_id: session.user.id, student_id: studentId,
      sessions_per_day: draft.sessions_per_day ? parseInt(draft.sessions_per_day) : null,
      sessions_per_week: draft.sessions_per_week ? parseInt(draft.sessions_per_week) : null,
      accuracy_target: draft.accuracy_target ? parseInt(draft.accuracy_target) : null,
      notes: draft.notes.trim() || null,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabase.from('student_goals').upsert(payload, { onConflict: 'teacher_id,student_id' }).select().single();
    if (error) alert(error.message);
    else { setGoal(data); setEditingGoal(false); }
    setSaving(false);
  }

  if (loading) return <p style={{ padding: 60, textAlign: 'center', color: '#9CA3AF' }}>Loading...</p>;

  const totalReviewed = sessions.reduce((s, r) => s + (r.cards_reviewed ?? 0), 0);
  const totalCorrect = sessions.reduce((s, r) => s + (r.cards_correct ?? 0), 0);
  const accuracy = totalReviewed > 0 ? Math.round((totalCorrect / totalReviewed) * 100) : null;
  const chillMs = sessions.filter(s => s.mode === 'chill').reduce((sum, s) => sum + s.duration_ms, 0);
  const powerMs = sessions.filter(s => s.mode === 'power').reduce((sum, s) => sum + s.duration_ms, 0);
  const weekChart = buildWeekChart(sessions);
  const maxCount = Math.max(...weekChart.map(d => d.count), 1);
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
  const thisWeekSessions = sessions.filter(s => new Date(s.started_at) >= weekAgo);
  const todayStr = new Date().toISOString().slice(0, 10);
  const todaySessions = sessions.filter(s => s.started_at?.slice(0, 10) === todayStr);

  return (
    <div style={s.page}>
      <button style={s.back} onClick={() => navigate(-1)}>← Back</button>
      <h1 style={s.name}>{studentName}</h1>

      {/* Summary stats */}
      <div style={s.statsGrid}>
        {[
          { label: 'Total Sessions', value: sessions.length },
          { label: '🃏 Chill', value: sessions.filter(s => s.mode === 'chill').length },
          { label: '⚡ Power', value: sessions.filter(s => s.mode === 'power').length },
          { label: '⏳ Passive', value: sessions.filter(s => s.mode === 'passive').length },
          { label: 'Cards Reviewed', value: totalReviewed },
          { label: 'Accuracy', value: accuracy !== null ? `${accuracy}%` : '—', color: accuracy === null ? '#9CA3AF' : accuracy >= 70 ? '#16A34A' : accuracy >= 50 ? '#D97706' : '#DC2626' },
          { label: 'Chill Time', value: fmt(chillMs) },
          { label: 'Power Time', value: fmt(powerMs) },
          { label: 'This Week', value: thisWeekSessions.length },
          { label: 'Today', value: todaySessions.length },
        ].map(item => (
          <div key={item.label} style={s.statCard}>
            <p style={{ ...s.statNum, ...(item.color ? { color: item.color } : {}) }}>{item.value}</p>
            <p style={s.statLabel}>{item.label}</p>
          </div>
        ))}
      </div>

      {/* Weekly chart */}
      <h2 style={s.sectionTitle}>Activity This Week</h2>
      <div style={s.chartCard}>
        {weekChart.map((day, i) => (
          <div key={i} style={s.chartCol}>
            <p style={s.chartCount}>{day.count > 0 ? day.count : ''}</p>
            <div style={s.barWrap}>
              <div style={{ ...s.bar, height: Math.max((day.count / maxCount) * 100, day.count > 0 ? 8 : 2), background: day.count > 0 ? PURPLE : '#E5E7EB' }} />
            </div>
            <p style={s.chartLabel}>{day.label}</p>
          </div>
        ))}
      </div>

      {/* Goals */}
      <div style={s.sectionRow}>
        <h2 style={s.sectionTitle}>Goals</h2>
        <button style={s.editGoalBtn} onClick={() => setEditingGoal(v => !v)}>
          {editingGoal ? 'Cancel' : goal ? 'Edit Goals' : '+ Set Goals'}
        </button>
      </div>

      {editingGoal ? (
        <div style={s.card}>
          <div style={s.goalFields}>
            {[
              { key: 'sessions_per_day', label: 'Sessions per day', placeholder: 'e.g. 2' },
              { key: 'sessions_per_week', label: 'Sessions per week', placeholder: 'e.g. 10' },
              { key: 'accuracy_target', label: 'Accuracy target (%)', placeholder: 'e.g. 75' },
            ].map(f => (
              <div key={f.key} style={s.goalField}>
                <label style={s.goalFieldLabel}>{f.label}</label>
                <input
                  style={s.goalInput}
                  type="number"
                  placeholder={f.placeholder}
                  value={draft[f.key]}
                  onChange={e => setDraft(prev => ({ ...prev, [f.key]: e.target.value }))}
                />
              </div>
            ))}
          </div>
          <label style={s.goalFieldLabel}>Note to student</label>
          <textarea
            style={s.notesInput}
            placeholder="e.g. Focus on vocab decks this week"
            value={draft.notes}
            onChange={e => setDraft(prev => ({ ...prev, notes: e.target.value }))}
            rows={3}
          />
          <button style={s.saveGoalBtn} onClick={saveGoal} disabled={saving}>
            {saving ? '...' : 'Save Goals'}
          </button>
        </div>
      ) : goal ? (
        <div style={s.card}>
          {goal.sessions_per_day && <GoalBar label="Sessions / day" current={todaySessions.length} target={goal.sessions_per_day} />}
          {goal.sessions_per_week && <GoalBar label="Sessions / week" current={thisWeekSessions.length} target={goal.sessions_per_week} />}
          {goal.accuracy_target && <GoalBar label="Accuracy target" current={accuracy ?? 0} target={goal.accuracy_target} unit="%" />}
          {goal.notes && (
            <div style={s.notesDisplay}>
              <p style={s.notesLabel}>📝 Note to student</p>
              <p style={s.notesText}>{goal.notes}</p>
            </div>
          )}
        </div>
      ) : (
        <div style={{ ...s.card, color: '#9CA3AF', fontSize: 14, textAlign: 'center', padding: '24px' }}>
          No goals set yet. Click "+ Set Goals" to add them.
        </div>
      )}

      {/* Most missed cards */}
      {missedCards.length > 0 && (
        <>
          <h2 style={s.sectionTitle}>Most Missed Cards</h2>
          <div style={s.card}>
            {missedCards.map((card, i) => (
              <div key={i} style={{ ...s.missedRow, ...(i < missedCards.length - 1 ? s.missedBorder : {}) }}>
                <div style={s.missedBadge}>{card.count}✗</div>
                <div>
                  <p style={s.missedFront}>{card.front}</p>
                  <p style={s.missedBack}>{card.back}</p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Recent sessions */}
      {sessions.length > 0 && (
        <>
          <h2 style={s.sectionTitle}>Recent Sessions</h2>
          <div style={s.card}>
            {sessions.slice(0, 15).map((sess, i) => (
              <div key={i} style={{ ...s.sessRow, ...(i < Math.min(sessions.length, 15) - 1 ? s.sessBorder : {}) }}>
                <div style={s.sessModeIcon}>
                  {sess.mode === 'chill' ? '🃏' : sess.mode === 'power' ? '⚡' : '⏳'}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={s.sessDeck}>{sess.deck_name || 'Unknown deck'}</p>
                  <p style={s.sessDate}>{fmtDate(sess.started_at)} · {fmt(sess.duration_ms)}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={s.sessCards}>{sess.cards_reviewed} cards</p>
                  {sess.cards_reviewed > 0 && (
                    <p style={{ ...s.sessAcc, color: Math.round((sess.cards_correct / sess.cards_reviewed) * 100) >= 70 ? '#16A34A' : '#DC2626' }}>
                      {Math.round((sess.cards_correct / sess.cards_reviewed) * 100)}%
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const PURPLE = '#5B4FE9';
const s = {
  page: { maxWidth: 960, margin: '0 auto', padding: '36px 24px' },
  back: { fontSize: 14, fontWeight: 700, color: PURPLE, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 20, display: 'block' },
  name: { fontSize: 30, fontWeight: 900, color: '#1A1A2E', marginBottom: 24 },

  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 12, marginBottom: 28 },
  statCard: { background: '#fff', borderRadius: 14, padding: '16px 12px', textAlign: 'center', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' },
  statNum: { fontSize: 22, fontWeight: 900, color: PURPLE, marginBottom: 4 },
  statLabel: { fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px' },

  sectionTitle: { fontSize: 18, fontWeight: 800, color: '#1A1A2E', marginBottom: 14 },
  sectionRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  editGoalBtn: { fontSize: 14, fontWeight: 700, color: PURPLE, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 },

  chartCard: { background: '#fff', borderRadius: 18, padding: '20px 24px', display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end', marginBottom: 28, boxShadow: '0 1px 6px rgba(0,0,0,0.06)', height: 160 },
  chartCol: { display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 },
  chartCount: { fontSize: 12, fontWeight: 700, color: PURPLE, marginBottom: 4, minHeight: 18 },
  barWrap: { flex: 1, display: 'flex', alignItems: 'flex-end', marginBottom: 8 },
  bar: { width: 24, borderRadius: 4, minHeight: 2 },
  chartLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: 600 },

  card: { background: '#fff', borderRadius: 18, padding: '20px 24px', marginBottom: 28, boxShadow: '0 1px 6px rgba(0,0,0,0.06)' },
  goalFields: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 16 },
  goalField: { display: 'flex', flexDirection: 'column', gap: 6 },
  goalFieldLabel: { fontSize: 12, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 },
  goalInput: { padding: '10px 12px', borderRadius: 10, border: '1.5px solid #E5E7EB', fontSize: 15, color: '#1A1A2E', outline: 'none' },
  notesInput: { width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #E5E7EB', fontSize: 14, color: '#1A1A2E', outline: 'none', resize: 'vertical', marginBottom: 16, boxSizing: 'border-box', fontFamily: 'inherit' },
  saveGoalBtn: { padding: '12px 28px', borderRadius: 12, background: PURPLE, color: '#fff', fontSize: 14, fontWeight: 800, border: 'none', cursor: 'pointer' },
  notesDisplay: { borderTop: '1px solid #F3F4F6', paddingTop: 14, marginTop: 4 },
  notesLabel: { fontSize: 12, fontWeight: 700, color: '#6B7280', marginBottom: 6 },
  notesText: { fontSize: 14, color: '#374151', lineHeight: 1.6 },

  missedRow: { display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0' },
  missedBorder: { borderBottom: '1px solid #F3F4F6' },
  missedBadge: { fontSize: 12, fontWeight: 800, color: '#DC2626', background: '#FEE2E2', borderRadius: 8, padding: '4px 10px', flexShrink: 0 },
  missedFront: { fontSize: 14, fontWeight: 700, color: '#1A1A2E', marginBottom: 2 },
  missedBack: { fontSize: 13, color: '#6B7280' },

  sessRow: { display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0' },
  sessBorder: { borderBottom: '1px solid #F3F4F6' },
  sessModeIcon: { fontSize: 20, width: 36, textAlign: 'center', flexShrink: 0 },
  sessDeck: { fontSize: 14, fontWeight: 700, color: '#1A1A2E', marginBottom: 2 },
  sessDate: { fontSize: 12, color: '#9CA3AF' },
  sessCards: { fontSize: 13, fontWeight: 700, color: '#374151' },
  sessAcc: { fontSize: 12, fontWeight: 700 },
};
