import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase';

function generateCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function fmt(ms) {
  if (!ms || ms < 0) return '0m';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function TeacherClassesPage({ session }) {
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');

  useEffect(() => { loadClasses(); }, []);

  async function loadClasses() {
    const { data } = await supabase
      .from('classes')
      .select('*, class_members(count)')
      .eq('teacher_id', session.user.id)
      .order('created_at', { ascending: false });
    setClasses(data ?? []);
    setLoading(false);
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    const { data, error } = await supabase
      .from('classes')
      .insert({ name: newName.trim(), code: generateCode(), teacher_id: session.user.id })
      .select().single();
    if (error) { alert(error.message); return; }
    setClasses(prev => [{ ...data, class_members: [{ count: 0 }] }, ...prev]);
    setNewName(''); setCreating(false);
  }

  async function handleDelete(cls) {
    if (!confirm(`Delete "${cls.name}"?`)) return;
    await supabase.from('classes').delete().eq('id', cls.id);
    setClasses(prev => prev.filter(c => c.id !== cls.id));
  }

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <h1 style={s.title}>My Classes</h1>
          <p style={s.sub}>Create classes and share the join code with your students</p>
        </div>
        <button style={s.newBtn} onClick={() => setCreating(true)}>+ New Class</button>
      </div>

      {creating && (
        <div style={s.createCard}>
          <input
            style={s.input}
            placeholder="Class name (e.g. Biology Period 3)"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setCreating(false); }}
            autoFocus
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={s.cancelBtn} onClick={() => { setCreating(false); setNewName(''); }}>Cancel</button>
            <button style={s.saveBtn} onClick={handleCreate} disabled={!newName.trim()}>Create Class</button>
          </div>
        </div>
      )}

      {loading ? (
        <p style={{ color: '#9CA3AF', textAlign: 'center', padding: 60 }}>Loading...</p>
      ) : classes.length === 0 && !creating ? (
        <div style={s.empty}>
          <p style={{ fontSize: 48, marginBottom: 12 }}>🏫</p>
          <p style={{ fontSize: 18, fontWeight: 800, color: '#1A1A2E', marginBottom: 6 }}>No classes yet</p>
          <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 24 }}>Create a class and share the code with your students</p>
          <button style={s.newBtn} onClick={() => setCreating(true)}>+ Create First Class</button>
        </div>
      ) : (
        <div style={s.grid}>
          {classes.map(cls => {
            const count = cls.class_members?.[0]?.count ?? 0;
            return (
              <div key={cls.id} style={s.classCard} onClick={() => navigate(`/teacher/classes/${cls.id}`)}>
                <div style={s.cardTop}>
                  <p style={s.className}>{cls.name}</p>
                  <div style={s.codePill}>{cls.code}</div>
                </div>
                <p style={s.classMeta}>{count} student{count !== 1 ? 's' : ''}</p>
                <div style={s.cardFooter}>
                  <span style={s.viewLink}>View Students →</span>
                  <button style={s.deleteBtn} onClick={e => { e.stopPropagation(); handleDelete(cls); }}>Delete</button>
                </div>
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
  page: { maxWidth: 900, margin: '0 auto', padding: '36px 24px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 },
  title: { fontSize: 28, fontWeight: 900, color: '#1A1A2E', marginBottom: 4 },
  sub: { fontSize: 14, color: '#6B7280' },
  newBtn: { padding: '11px 22px', borderRadius: 12, background: PURPLE, color: '#fff', fontSize: 14, fontWeight: 800, border: 'none', cursor: 'pointer', flexShrink: 0 },

  createCard: { background: '#fff', borderRadius: 16, padding: 24, marginBottom: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', gap: 14 },
  input: { padding: '12px 14px', borderRadius: 10, border: '1.5px solid #E5E7EB', fontSize: 15, color: '#1A1A2E', outline: 'none', width: '100%', boxSizing: 'border-box' },
  cancelBtn: { padding: '10px 18px', borderRadius: 10, background: 'transparent', color: '#6B7280', fontSize: 14, fontWeight: 700, border: '1.5px solid #E5E7EB', cursor: 'pointer' },
  saveBtn: { padding: '10px 22px', borderRadius: 10, background: PURPLE, color: '#fff', fontSize: 14, fontWeight: 800, border: 'none', cursor: 'pointer' },

  empty: { textAlign: 'center', padding: '60px 20px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 },
  classCard: { background: '#fff', borderRadius: 18, padding: 24, cursor: 'pointer', boxShadow: '0 2px 12px rgba(0,0,0,0.07)', display: 'flex', flexDirection: 'column', gap: 8 },
  cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  className: { fontSize: 18, fontWeight: 800, color: '#1A1A2E', flex: 1 },
  codePill: { background: '#EEF2FF', color: PURPLE, fontSize: 13, fontWeight: 900, padding: '4px 12px', borderRadius: 20, letterSpacing: 2, flexShrink: 0 },
  classMeta: { fontSize: 13, color: '#9CA3AF', fontWeight: 600 },
  cardFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  viewLink: { fontSize: 13, fontWeight: 700, color: PURPLE },
  deleteBtn: { fontSize: 12, fontWeight: 700, color: '#EF4444', background: 'transparent', border: '1.5px solid #FECACA', borderRadius: 8, padding: '5px 10px', cursor: 'pointer' },
};
