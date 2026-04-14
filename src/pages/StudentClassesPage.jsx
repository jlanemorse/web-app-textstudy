import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

export default function StudentClassesPage({ session }) {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(null);

  useEffect(() => { loadClasses(); }, []);

  async function loadClasses() {
    setLoading(true);

    const { data: memberData } = await supabase
      .from('class_members').select('class_id').eq('student_id', session.user.id);
    const classIds = (memberData ?? []).map(m => m.class_id);

    if (!classIds.length) { setClasses([]); setLoading(false); return; }

    const { data: classRows } = await supabase
      .from('classes').select('id, name, code, teacher_id').in('id', classIds);

    const teacherIds = [...new Set((classRows ?? []).map(c => c.teacher_id).filter(Boolean))];
    let teacherMap = {};
    if (teacherIds.length) {
      const { data: profiles } = await supabase.from('profiles').select('id, display_name').in('id', teacherIds);
      teacherMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p.display_name]));
    }

    const { data: classDecksData } = await supabase
      .from('class_decks').select('class_id, deck_id, decks(id, name, cards(count))').in('class_id', classIds);

    const { data: myDecks } = await supabase
      .from('decks').select('name').eq('user_id', session.user.id);
    const myDeckNames = new Set((myDecks ?? []).map(d => d.name));

    const result = (classRows ?? []).map(cls => ({
      ...cls,
      teacherName: teacherMap[cls.teacher_id] || 'Your Teacher',
      pushedDecks: (classDecksData ?? [])
        .filter(cd => cd.class_id === cls.id && cd.decks)
        .map(cd => ({ ...cd.decks, alreadyAdded: myDeckNames.has(cd.decks.name), cardCount: cd.decks.cards?.[0]?.count ?? 0 })),
    }));

    setClasses(result);
    setLoading(false);
  }

  async function handleAdd(deck) {
    setAdding(deck.id);
    const { data: newDeck } = await supabase.from('decks')
      .insert({ name: deck.name, user_id: session.user.id }).select().single();
    if (newDeck) {
      const { data: cards } = await supabase.from('cards').select('front, back, hint').eq('deck_id', deck.id);
      if (cards?.length) {
        await supabase.from('cards').insert(cards.map(c => ({ deck_id: newDeck.id, front: c.front, back: c.back, hint: c.hint ?? '' })));
      }
    }
    setAdding(null);
    loadClasses();
  }

  if (loading) return <p style={{ padding: 60, textAlign: 'center', color: '#9CA3AF' }}>Loading...</p>;

  return (
    <div style={s.page}>
      <h1 style={s.title}>My Classes</h1>
      <p style={s.sub}>Decks pushed by your teacher will appear here</p>

      {classes.length === 0 ? (
        <div style={s.empty}>
          <p style={{ fontSize: 40, marginBottom: 12 }}>🏫</p>
          <p style={{ fontWeight: 700, color: '#1A1A2E', marginBottom: 6 }}>No classes yet</p>
          <p style={{ fontSize: 13, color: '#6B7280' }}>Ask your teacher for a join code, then use Join a Class in the sidebar</p>
        </div>
      ) : (
        <div style={s.classList}>
          {classes.map(cls => (
            <div key={cls.id} style={s.classCard}>
              <div style={s.classHeader}>
                <div>
                  <p style={s.className}>{cls.name}</p>
                  <p style={s.teacherName}>👩‍🏫 {cls.teacherName}</p>
                </div>
                <span style={s.codePill}>{cls.code}</span>
              </div>

              {cls.pushedDecks.length === 0 ? (
                <p style={s.noDecks}>No decks pushed yet</p>
              ) : (
                <div style={s.deckList}>
                  <p style={s.deckListLabel}>PUSHED DECKS</p>
                  {cls.pushedDecks.map(deck => (
                    <div key={deck.id} style={s.deckRow}>
                      <div>
                        <p style={s.deckName}>{deck.name}</p>
                        <p style={s.deckMeta}>{deck.cardCount} card{deck.cardCount !== 1 ? 's' : ''}</p>
                      </div>
                      <button
                        style={{ ...s.addBtn, ...(deck.alreadyAdded ? s.addBtnDone : {}) }}
                        onClick={() => !deck.alreadyAdded && handleAdd(deck)}
                        disabled={deck.alreadyAdded || adding === deck.id}
                      >
                        {adding === deck.id ? '...' : deck.alreadyAdded ? '✓ Added' : '+ Add'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const PURPLE = '#5B4FE9';
const s = {
  page: { maxWidth: 800, margin: '0 auto', padding: '36px 24px' },
  title: { fontSize: 28, fontWeight: 900, color: '#1A1A2E', marginBottom: 4 },
  sub: { fontSize: 14, color: '#6B7280', marginBottom: 28 },
  empty: { background: '#fff', borderRadius: 16, padding: 48, textAlign: 'center' },
  classList: { display: 'flex', flexDirection: 'column', gap: 20 },
  classCard: { background: '#fff', borderRadius: 18, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' },
  classHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  className: { fontSize: 20, fontWeight: 800, color: '#1A1A2E', marginBottom: 4 },
  teacherName: { fontSize: 13, color: '#6B7280', fontWeight: 600 },
  codePill: { background: '#EEF2FF', color: PURPLE, fontSize: 13, fontWeight: 900, padding: '4px 12px', borderRadius: 20, letterSpacing: 2, flexShrink: 0 },
  noDecks: { fontSize: 13, color: '#9CA3AF', fontStyle: 'italic' },
  deckList: {},
  deckListLabel: { fontSize: 11, fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.5px', marginBottom: 10 },
  deckRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderTop: '1px solid #F3F4F6' },
  deckName: { fontSize: 15, fontWeight: 700, color: '#1A1A2E', marginBottom: 2 },
  deckMeta: { fontSize: 12, color: '#9CA3AF' },
  addBtn: { padding: '8px 18px', borderRadius: 10, background: PURPLE, color: '#fff', fontSize: 13, fontWeight: 800, border: 'none', cursor: 'pointer', flexShrink: 0 },
  addBtnDone: { background: '#D1FAE5', color: '#065F46', cursor: 'default' },
};
