import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

export default function JoinClassPage({ session }) {
  const [code, setCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [myClasses, setMyClasses] = useState([]);
  const [pushedDecks, setPushedDecks] = useState([]); // { deck, className }
  const [addedDeckIds, setAddedDeckIds] = useState(new Set());
  const [adding, setAdding] = useState(null);
  const [message, setMessage] = useState(null);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    const { data: memberData } = await supabase
      .from('class_members')
      .select('class_id')
      .eq('student_id', session.user.id);

    const classIds = (memberData ?? []).map(m => m.class_id);
    if (classIds.length === 0) { setMyClasses([]); setPushedDecks([]); return; }

    const { data: classData } = await supabase
      .from('classes')
      .select('id, name, code')
      .in('id', classIds);
    setMyClasses(classData ?? []);

    // Load decks pushed to any of the student's classes
    const { data: classDecksData } = await supabase
      .from('class_decks')
      .select('deck_id, class_id, decks(id, name, cards(id))')
      .in('class_id', classIds);

    // Check which decks the student already has
    const { data: myDecks } = await supabase
      .from('decks')
      .select('id, name')
      .eq('user_id', session.user.id);
    const myDeckNames = new Set((myDecks ?? []).map(d => d.name));

    const classMap = Object.fromEntries((classData ?? []).map(c => [c.id, c.name]));
    const decks = (classDecksData ?? [])
      .filter(cd => cd.decks)
      .map(cd => ({
        deck: cd.decks,
        classId: cd.class_id,
        className: classMap[cd.class_id] ?? 'Unknown Class',
        alreadyAdded: myDeckNames.has(cd.decks.name),
      }));
    setPushedDecks(decks);
    setAddedDeckIds(new Set(decks.filter(d => d.alreadyAdded).map(d => d.deck.id)));
  }

  async function handleAddDeck(item) {
    setAdding(item.deck.id);
    // Copy the deck to the student's account
    const { data: newDeck } = await supabase
      .from('decks')
      .insert({ name: item.deck.name, user_id: session.user.id })
      .select()
      .single();

    if (newDeck) {
      // Fetch full cards from the teacher's deck
      const { data: cards } = await supabase
        .from('cards')
        .select('front, back, hint')
        .eq('deck_id', item.deck.id);

      if (cards?.length) {
        await supabase.from('cards').insert(
          cards.map(c => ({ deck_id: newDeck.id, front: c.front, back: c.back, hint: c.hint ?? '' }))
        );
      }
      setAddedDeckIds(prev => new Set([...prev, item.deck.id]));
    }
    setAdding(null);
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
      loadAll();
    }
    setJoining(false);
  }

  async function handleLeave(cls) {
    if (!confirm(`Leave "${cls.name}"?`)) return;
    await supabase.from('class_members').delete().eq('class_id', cls.id).eq('student_id', session.user.id);
    loadAll();
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

      {pushedDecks.length > 0 && (
        <>
          <h2 style={s.sectionTitle}>📤 Decks From Your Teacher</h2>
          <p style={s.sectionSub}>Add these to your deck collection to study them.</p>
          <div style={s.deckList}>
            {pushedDecks.map(item => {
              const added = addedDeckIds.has(item.deck.id);
              return (
                <div key={item.deck.id} style={s.deckCard}>
                  <div>
                    <p style={s.deckName}>{item.deck.name}</p>
                    <p style={s.deckMeta}>{item.deck.cards?.length ?? 0} cards · from {item.className}</p>
                  </div>
                  <button
                    style={{ ...s.addBtn, ...(added ? s.addBtnDone : {}) }}
                    onClick={() => !added && handleAddDeck(item)}
                    disabled={added || adding === item.deck.id}
                  >
                    {adding === item.deck.id ? '...' : added ? '✓ Added' : '+ Add to My Decks'}
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}

      {myClasses.length > 0 && (
        <>
          <h2 style={{ ...s.sectionTitle, marginTop: pushedDecks.length > 0 ? 32 : 0 }}>Enrolled Classes</h2>
          <div style={s.classList}>
            {myClasses.map(cls => (
              <div key={cls.id} style={s.classCard}>
                <div>
                  <p style={s.className}>{cls.name}</p>
                  <p style={s.classCode}>Code: {cls.code}</p>
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
  page: { maxWidth: 600, margin: '0 auto', padding: '36px 24px' },
  title: { fontSize: 26, fontWeight: 900, color: '#1A1A2E', marginBottom: 6 },
  sub: { fontSize: 14, color: '#6B7280', marginBottom: 28 },

  joinCard: { background: '#fff', borderRadius: 16, padding: 24, marginBottom: 32, boxShadow: '0 2px 12px rgba(0,0,0,0.07)' },
  joinLabel: { fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' },
  joinRow: { display: 'flex', gap: 10 },
  input: { flex: 1, padding: '13px 14px', borderRadius: 10, border: '1.5px solid #E5E7EB', fontSize: 16, fontWeight: 700, color: '#1A1A2E', letterSpacing: 3, outline: 'none', textTransform: 'uppercase' },
  joinBtn: { padding: '13px 24px', borderRadius: 10, background: PURPLE, color: '#fff', fontSize: 15, fontWeight: 800, border: 'none', cursor: 'pointer' },
  joinBtnDisabled: { opacity: 0.4, cursor: 'default' },
  msg: { fontSize: 13, fontWeight: 600, marginTop: 12 },

  sectionTitle: { fontSize: 16, fontWeight: 800, color: '#1A1A2E', marginBottom: 6 },
  sectionSub: { fontSize: 13, color: '#6B7280', marginBottom: 14 },

  deckList: { display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 },
  deckCard: { background: '#fff', borderRadius: 14, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', gap: 16 },
  deckName: { fontSize: 15, fontWeight: 800, color: '#1A1A2E', marginBottom: 3 },
  deckMeta: { fontSize: 12, color: '#9CA3AF' },
  addBtn: { padding: '9px 16px', borderRadius: 10, background: PURPLE, color: '#fff', fontSize: 13, fontWeight: 800, border: 'none', cursor: 'pointer', flexShrink: 0 },
  addBtnDone: { background: '#D1FAE5', color: '#065F46', cursor: 'default' },

  classList: { display: 'flex', flexDirection: 'column', gap: 10 },
  classCard: { background: '#fff', borderRadius: 14, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' },
  className: { fontSize: 15, fontWeight: 800, color: '#1A1A2E', marginBottom: 3 },
  classCode: { fontSize: 12, color: '#9CA3AF' },
  leaveBtn: { fontSize: 12, fontWeight: 700, color: '#EF4444', background: 'transparent', border: '1.5px solid #FECACA', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', flexShrink: 0 },
};
