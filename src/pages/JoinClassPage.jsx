import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

export default function JoinClassPage({ session }) {
  const [code, setCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [myClasses, setMyClasses] = useState([]);
  const [message, setMessage] = useState(null); // { type: 'success'|'error', text }

  useEffect(() => { loadMyClasses(); }, []);

  async function loadMyClasses() {
    const { data } = await supabase
      .from('class_members')
      .select('class_id, classes(id, name, code, teacher_id, profiles(display_name))')
      .eq('student_id', session.user.id);
    setMyClasses((data ?? []).map(m => m.classes).filter(Boolean));
  }

  async function handleJoin() {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    setJoining(true);
    setMessage(null);

    const { data: cls } = await supabase
      .from('classes')
      .select('id, name')
      .eq('code', trimmed)
      .single();

    if (!cls) {
      setMessage({ type: 'error', text: 'No class found with that code. Check with your teacher.' });
      setJoining(false);
      return;
    }

    // Check already a member
    const { data: existing } = await supabase
      .from('class_members')
      .select('id')
      .eq('class_id', cls.id)
      .eq('student_id', session.user.id)
      .single();

    if (existing) {
      setMessage({ type: 'error', text: `You're already in "${cls.name}".` });
      setJoining(false);
      return;
    }

    // Ensure student has a profile row so teacher can identify them
    await supabase.from('profiles').upsert({
      id: session.user.id,
      role: 'student',
      display_name: session.user.email,
    }, { onConflict: 'id' });

    const { error } = await supabase
      .from('class_members')
      .insert({ class_id: cls.id, student_id: session.user.id });

    if (error) {
      setMessage({ type: 'error', text: 'Something went wrong. Try again.' });
    } else {
      setMessage({ type: 'success', text: `Joined "${cls.name}"! Your teacher can now see your study progress.` });
      setCode('');
      loadMyClasses();
    }
    setJoining(false);
  }

  async function handleLeave(cls) {
    if (!confirm(`Leave "${cls.name}"?`)) return;
    await supabase
      .from('class_members')
      .delete()
      .eq('class_id', cls.id)
      .eq('student_id', session.user.id);
    setMyClasses(prev => prev.filter(c => c.id !== cls.id));
  }

  return (
    <div style={s.page}>
      <h1 style={s.title}>🏫 My Classes</h1>
      <p style={s.sub}>Enter a code from your teacher to join their class.</p>

      <div style={s.joinCard}>
        <p style={s.joinLabel}>Join a Class</p>
        <div style={s.joinRow}>
          <input
            style={s.input}
            placeholder="Enter class code (e.g. AB12CD)"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && handleJoin()}
            maxLength={8}
            autoCapitalize="characters"
          />
          <button
            style={{ ...s.joinBtn, ...(!code.trim() || joining ? s.joinBtnDisabled : {}) }}
            onClick={handleJoin}
            disabled={!code.trim() || joining}
          >
            {joining ? '...' : 'Join'}
          </button>
        </div>
        {message && (
          <p style={{ ...s.msg, color: message.type === 'success' ? '#16A34A' : '#DC2626' }}>
            {message.text}
          </p>
        )}
      </div>

      {myClasses.length > 0 && (
        <>
          <h2 style={s.sectionTitle}>Enrolled Classes</h2>
          <div style={s.classList}>
            {myClasses.map(cls => (
              <div key={cls.id} style={s.classCard}>
                <div>
                  <p style={s.className}>{cls.name}</p>
                  <p style={s.classTeacher}>Teacher: {cls.profiles?.display_name || 'Your teacher'}</p>
                </div>
                <button style={s.leaveBtn} onClick={() => handleLeave(cls)}>Leave</button>
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
  page: { maxWidth: 560, margin: '0 auto', padding: '36px 24px' },
  title: { fontSize: 26, fontWeight: 900, color: '#1A1A2E', marginBottom: 6 },
  sub: { fontSize: 14, color: '#6B7280', marginBottom: 28 },

  joinCard: { background: '#fff', borderRadius: 16, padding: 24, marginBottom: 32, boxShadow: '0 2px 12px rgba(0,0,0,0.07)' },
  joinLabel: { fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' },
  joinRow: { display: 'flex', gap: 10 },
  input: { flex: 1, padding: '13px 14px', borderRadius: 10, border: '1.5px solid #E5E7EB', fontSize: 16, fontWeight: 700, color: '#1A1A2E', letterSpacing: 3, outline: 'none', textTransform: 'uppercase' },
  joinBtn: { padding: '13px 24px', borderRadius: 10, background: PURPLE, color: '#fff', fontSize: 15, fontWeight: 800, border: 'none', cursor: 'pointer' },
  joinBtnDisabled: { opacity: 0.4, cursor: 'default' },
  msg: { fontSize: 13, fontWeight: 600, marginTop: 12 },

  sectionTitle: { fontSize: 16, fontWeight: 800, color: '#1A1A2E', marginBottom: 12 },
  classList: { display: 'flex', flexDirection: 'column', gap: 10 },
  classCard: { background: '#fff', borderRadius: 14, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' },
  className: { fontSize: 15, fontWeight: 800, color: '#1A1A2E', marginBottom: 3 },
  classTeacher: { fontSize: 12, color: '#9CA3AF' },
  leaveBtn: { fontSize: 12, fontWeight: 700, color: '#EF4444', background: 'transparent', border: '1.5px solid #FECACA', borderRadius: 8, padding: '6px 12px', cursor: 'pointer' },
};
