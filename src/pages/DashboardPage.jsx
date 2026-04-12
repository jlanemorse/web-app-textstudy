import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';

export default function DashboardPage({ session }) {
  const [decks, setDecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => { loadDecks(); }, []);

  async function loadDecks() {
    const { data } = await supabase.from('decks').select('*, cards(id, acs_score, times_correct, times_incorrect)').eq('user_id', session.user.id).order('created_at', { ascending: false });
    setDecks(data ?? []);
    setLoading(false);
  }

  async function handleNewDeck() {
    const name = prompt('Deck name:');
    if (!name?.trim()) return;
    const { data, error } = await supabase.from('decks').insert({ name: name.trim(), user_id: session.user.id }).select().single();
    if (!error && data) navigate(`/deck/${data.id}`);
  }

  async function handleDeleteDeck(deck) {
    if (!confirm(`Delete "${deck.name}" and all its cards?`)) return;
    await supabase.from('decks').delete().eq('id', deck.id);
    setDecks(prev => prev.filter(d => d.id !== deck.id));
  }

  return (
    <div style={s.content}>
      <div style={s.header}>
        <div>
          <h1 style={s.title}>My Decks</h1>
          <p style={s.sub}>Create and manage your flashcard decks</p>
        </div>
        <button style={s.newBtn} onClick={handleNewDeck}>+ New Deck</button>
      </div>

      {loading ? (
        <div style={s.empty}><span style={{ fontSize: 40 }}>⏳</span></div>
      ) : decks.length === 0 ? (
        <div style={s.empty}>
          <span style={{ fontSize: 48 }}>📭</span>
          <p style={s.emptyText}>No decks yet. Create your first one!</p>
          <button style={s.emptyBtn} onClick={handleNewDeck}>+ Create Deck</button>
        </div>
      ) : (
        <div style={s.grid}>
          {decks.map(deck => {
            const cards = deck.cards ?? [];
            const count = cards.length;
            const seen = cards.filter(c => (c.times_correct ?? 0) + (c.times_incorrect ?? 0) > 0);
            const needsWork = seen.filter(c => (c.acs_score ?? 0) < 0).length;
            const neutral = seen.filter(c => (c.acs_score ?? 0) >= 0 && (c.acs_score ?? 0) < 2).length;
            const knowWell = seen.filter(c => (c.acs_score ?? 0) >= 2).length;
            return (
              <div key={deck.id} style={s.deckCard}>
                <div style={s.deckCardInner} onClick={() => navigate(`/deck/${deck.id}`)}>
                  <h2 style={s.deckName}>{deck.name}</h2>
                  <p style={s.deckMeta}>{count} card{count !== 1 ? 's' : ''}</p>
                  {(needsWork + neutral + knowWell) > 0 && (
                    <div style={s.pillRow}>
                      {needsWork > 0 && <span style={{ ...s.pill, background: '#FEE2E2', color: '#DC2626' }}>⚠ {needsWork} Needs Work</span>}
                      {neutral > 0 && <span style={{ ...s.pill, background: '#F3F4F6', color: '#6B7280' }}>◎ {neutral} Neutral</span>}
                      {knowWell > 0 && <span style={{ ...s.pill, background: '#DCFCE7', color: '#16A34A' }}>✓ {knowWell} Know Well</span>}
                    </div>
                  )}
                </div>
                <div style={s.deckActions}>
                  <button style={s.editBtn} onClick={() => navigate(`/deck/${deck.id}`)}>Edit</button>
                  <button style={s.deleteBtn} onClick={() => handleDeleteDeck(deck)}>Delete</button>
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
  content: { maxWidth: 960, margin: '0 auto', padding: '36px 24px' },
  header: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32 },
  title: { fontSize: 30, fontWeight: 900, color: '#1A1A2E', marginBottom: 4 },
  sub: { fontSize: 14, color: '#6B7280' },
  newBtn: { padding: '12px 24px', borderRadius: 12, background: PURPLE, color: '#fff', fontSize: 15, fontWeight: 800, border: 'none', cursor: 'pointer', boxShadow: '0 4px 14px rgba(91,79,233,0.3)', flexShrink: 0 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 },
  deckCard: { background: '#fff', borderRadius: 18, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.07)', display: 'flex', flexDirection: 'column' },
  deckCardInner: { padding: 24, flex: 1, cursor: 'pointer' },
  deckName: { fontSize: 18, fontWeight: 800, color: '#1A1A2E', marginBottom: 8 },
  deckMeta: { fontSize: 13, color: '#9CA3AF', fontWeight: 600 },
  pillRow: { display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  pill: { borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 700 },
  deckActions: { display: 'flex', borderTop: '1px solid #F3F4F6' },
  editBtn: { flex: 1, padding: '12px 0', fontSize: 13, fontWeight: 700, color: PURPLE, background: 'transparent', border: 'none', borderRight: '1px solid #F3F4F6', cursor: 'pointer' },
  deleteBtn: { flex: 1, padding: '12px 0', fontSize: 13, fontWeight: 700, color: '#EF4444', background: 'transparent', border: 'none', cursor: 'pointer' },
  empty: { textAlign: 'center', padding: '80px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 },
  emptyText: { fontSize: 16, color: '#6B7280' },
  emptyBtn: { padding: '12px 28px', borderRadius: 12, background: PURPLE, color: '#fff', fontSize: 15, fontWeight: 800, border: 'none', cursor: 'pointer' },
};
