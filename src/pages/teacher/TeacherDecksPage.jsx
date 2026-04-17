import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase';

export default function TeacherDecksPage({ session }) {
  const navigate = useNavigate();
  const [decks, setDecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');

  // Push modal state
  const [pushDeck, setPushDeck] = useState(null); // deck being pushed
  const [classes, setClasses] = useState([]);
  const [pushedClassIds, setPushedClassIds] = useState(new Set());
  const [pushing, setPushing] = useState(null);

  useEffect(() => { loadDecks(); }, []);

  async function loadDecks() {
    const { data } = await supabase.from('decks').select('*, cards(count)')
      .eq('user_id', session.user.id).order('created_at', { ascending: false });
    setDecks(data ?? []);
    setLoading(false);
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    const { data, error } = await supabase.from('decks')
      .insert({ name: newName.trim(), user_id: session.user.id })
      .select('*, cards(count)').single();
    if (error) { alert(error.message); return; }
    setDecks(prev => [data, ...prev]);
    setNewName(''); setCreating(false);
  }

  async function handleDelete(deck) {
    if (!confirm(`Delete "${deck.name}"?`)) return;
    await supabase.from('cards').delete().eq('deck_id', deck.id);
    await supabase.from('decks').delete().eq('id', deck.id);
    setDecks(prev => prev.filter(d => d.id !== deck.id));
  }

  async function openPushModal(e, deck) {
    e.stopPropagation();
    setPushDeck(deck);
    const { data: classRows } = await supabase
      .from('classes').select('id, name').eq('teacher_id', session.user.id).order('created_at', { ascending: false });
    setClasses(classRows ?? []);
    if (classRows?.length) {
      const { data: cdRows } = await supabase
        .from('class_decks').select('class_id').eq('deck_id', deck.id)
        .in('class_id', classRows.map(c => c.id));
      setPushedClassIds(new Set((cdRows ?? []).map(cd => cd.class_id)));
    } else {
      setPushedClassIds(new Set());
    }
  }

  async function handlePush(classId) {
    setPushing(classId);
    await supabase.from('class_decks').upsert({ class_id: classId, deck_id: pushDeck.id });
    setPushedClassIds(prev => new Set([...prev, classId]));
    setPushing(null);
  }

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <h1 style={s.title}>My Decks</h1>
          <p style={s.sub}>Create decks and push them to your classes</p>
        </div>
        <button className="ts-btn" style={s.newBtn} onClick={() => setCreating(true)}>+ New Deck</button>
      </div>

      {creating && (
        <div style={s.createCard}>
          <input
            style={s.input}
            placeholder="Deck name"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setCreating(false); }}
            autoFocus
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={s.cancelBtn} onClick={() => { setCreating(false); setNewName(''); }}>Cancel</button>
            <button style={s.saveBtn} onClick={handleCreate} disabled={!newName.trim()}>Create</button>
          </div>
        </div>
      )}

      {loading ? (
        <p style={{ color: '#9CA3AF', textAlign: 'center', padding: 60 }}>Loading...</p>
      ) : decks.length === 0 && !creating ? (
        <div style={s.empty}>
          <p style={{ fontSize: 48, marginBottom: 12 }}>🗂️</p>
          <p style={{ fontSize: 18, fontWeight: 800, color: '#1A1A2E', marginBottom: 6 }}>No decks yet</p>
          <p style={{ fontSize: 14, color: 'rgba(196,181,253,0.8)', marginBottom: 24 }}>Create decks and push them to your classes</p>
          <button style={s.newBtn} onClick={() => setCreating(true)}>+ Create First Deck</button>
        </div>
      ) : (
        <div style={s.grid}>
          {decks.map(d => {
            const count = d.cards?.[0]?.count ?? 0;
            return (
              <div key={d.id} className="ts-card" style={s.deckCard} onClick={() => navigate(`/teacher/decks/${d.id}`)}>
                <p style={s.deckName}>{d.name}</p>
                <p style={s.deckMeta}>{count} card{count !== 1 ? 's' : ''}</p>
                <div style={s.cardFooter}>
                  <span style={s.editLink}>Edit Cards →</span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button style={s.pushBtn} onClick={e => openPushModal(e, d)}>📤 Push</button>
                    <button style={s.deleteBtn} onClick={e => { e.stopPropagation(); handleDelete(d); }}>Delete</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Push modal */}
      {pushDeck && (
        <div style={s.overlay} onClick={() => setPushDeck(null)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <h2 style={s.modalTitle}>📤 Push to Class</h2>
            <p style={s.modalSub}>Students in the selected class will be able to add <strong>"{pushDeck.name}"</strong> to their decks.</p>
            {classes.length === 0 ? (
              <p style={{ color: '#9CA3AF', fontSize: 14, marginBottom: 24 }}>No classes yet. Create one from the Classes tab.</p>
            ) : (
              <div style={s.classList}>
                {classes.map(cls => {
                  const pushed = pushedClassIds.has(cls.id);
                  return (
                    <div key={cls.id} style={s.classRow}>
                      <span style={s.classRowName}>{cls.name}</span>
                      <button
                        style={{ ...s.classPushBtn, ...(pushed ? s.classPushBtnDone : {}) }}
                        onClick={() => !pushed && handlePush(cls.id)}
                        disabled={pushed || pushing === cls.id}
                      >
                        {pushing === cls.id ? '...' : pushed ? '✓ Pushed' : 'Push'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            <button style={s.doneBtn} onClick={() => setPushDeck(null)}>Done</button>
          </div>
        </div>
      )}
    </div>
  );
}

const PURPLE = '#5B4FE9';
const s = {
  page: { maxWidth: 900, margin: '0 auto', padding: '36px 24px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 },
  title: { fontSize: 28, fontWeight: 900, color: '#fff', marginBottom: 4, textShadow: '0 2px 12px rgba(0,0,0,0.3)' },
  sub: { fontSize: 14, color: 'rgba(196,181,253,0.8)' },
  newBtn: { padding: '11px 22px', borderRadius: 12, background: PURPLE, color: '#fff', fontSize: 14, fontWeight: 800, border: 'none', cursor: 'pointer', flexShrink: 0 },
  createCard: { background: '#fff', borderRadius: 16, padding: 24, marginBottom: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', gap: 14 },
  input: { padding: '12px 14px', borderRadius: 10, border: '1.5px solid #E5E7EB', fontSize: 15, color: '#1A1A2E', outline: 'none', width: '100%', boxSizing: 'border-box' },
  cancelBtn: { padding: '10px 18px', borderRadius: 10, background: 'transparent', color: '#6B7280', fontSize: 14, fontWeight: 700, border: '1.5px solid #E5E7EB', cursor: 'pointer' },
  saveBtn: { padding: '10px 22px', borderRadius: 10, background: PURPLE, color: '#fff', fontSize: 14, fontWeight: 800, border: 'none', cursor: 'pointer' },
  empty: { textAlign: 'center', padding: '60px 20px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 },
  deckCard: { background: '#fff', borderRadius: 18, padding: 24, cursor: 'pointer', boxShadow: '0 2px 12px rgba(0,0,0,0.07)', display: 'flex', flexDirection: 'column', gap: 8 },
  deckName: { fontSize: 17, fontWeight: 800, color: '#1A1A2E' },
  deckMeta: { fontSize: 13, color: '#9CA3AF', fontWeight: 600 },
  cardFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  editLink: { fontSize: 13, fontWeight: 700, color: PURPLE },
  pushBtn: { fontSize: 12, fontWeight: 700, color: '#fff', background: '#1A1A2E', border: 'none', borderRadius: 8, padding: '5px 10px', cursor: 'pointer' },
  deleteBtn: { fontSize: 12, fontWeight: 700, color: '#EF4444', background: 'transparent', border: '1.5px solid #FECACA', borderRadius: 8, padding: '5px 10px', cursor: 'pointer' },

  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 100 },
  modal: { background: '#fff', borderRadius: 24, padding: '32px 28px', maxWidth: 420, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' },
  modalTitle: { fontSize: 20, fontWeight: 900, color: '#1A1A2E', marginBottom: 8 },
  modalSub: { fontSize: 14, color: '#6B7280', lineHeight: 1.5, marginBottom: 20 },
  classList: { display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 },
  classRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F4F5F9', borderRadius: 12, padding: '12px 16px' },
  classRowName: { fontSize: 15, fontWeight: 700, color: '#1A1A2E' },
  classPushBtn: { padding: '7px 18px', borderRadius: 8, background: PURPLE, color: '#fff', fontSize: 13, fontWeight: 800, border: 'none', cursor: 'pointer' },
  classPushBtnDone: { background: '#D1FAE5', color: '#065F46', cursor: 'default' },
  doneBtn: { width: '100%', padding: '12px 0', borderRadius: 12, background: '#F4F5F9', color: '#6B7280', fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer' },
};
