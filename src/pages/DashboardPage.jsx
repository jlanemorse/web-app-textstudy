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
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <h1 style={s.title}>My Decks</h1>
          <p style={s.sub}>Create and manage your flashcard decks</p>
        </div>
        <button className="ts-btn" style={s.newBtn} onClick={handleNewDeck}>+ New Deck</button>
      </div>

      {loading ? (
        <div style={s.empty}><span style={{ fontSize: 40 }}>⏳</span></div>
      ) : decks.length === 0 ? (
        <div style={s.empty}>
          <span style={{ fontSize: 56 }}>📭</span>
          <p style={s.emptyTitle}>No decks yet</p>
          <p style={s.emptySub}>Create your first deck to get started</p>
          <button className="ts-btn" style={s.emptyBtn} onClick={handleNewDeck}>+ Create Deck</button>
        </div>
      ) : (
        <div style={s.grid}>
          {decks.map((deck, idx) => {
            const cards = deck.cards ?? [];
            const count = cards.length;
            const seen = cards.filter(c => (c.times_correct ?? 0) + (c.times_incorrect ?? 0) > 0);
            const needsWork = seen.filter(c => (c.acs_score ?? 0) < 0).length;
            const neutral = seen.filter(c => (c.acs_score ?? 0) >= 0 && (c.acs_score ?? 0) < 2).length;
            const knowWell = seen.filter(c => (c.acs_score ?? 0) >= 2).length;
            const pct = seen.length > 0 ? Math.round((knowWell / seen.length) * 100) : null;
            return (
              <div key={deck.id} className="ts-card" style={s.deckCard}>
                <div style={s.deckCardInner} onClick={() => navigate(`/deck/${deck.id}`)}>
                  <div style={{ ...s.deckTopAccent, background: ACCENT_COLORS[idx % ACCENT_COLORS.length] }} />
                  <h2 style={s.deckName}>{deck.name}</h2>
                  <p style={s.deckMeta}>{count} card{count !== 1 ? 's' : ''}</p>
                  {(needsWork + neutral + knowWell) > 0 && (
                    <>
                      <div style={s.progressBar}>
                        <div style={{ ...s.progressFill, width: `${pct}%` }} />
                      </div>
                      <div style={s.pillRow}>
                        {needsWork > 0 && <span style={{ ...s.pill, background: '#FEE2E2', color: '#DC2626' }}>⚠ {needsWork}</span>}
                        {neutral > 0 && <span style={{ ...s.pill, background: '#F3F4F6', color: '#6B7280' }}>◎ {neutral}</span>}
                        {knowWell > 0 && <span style={{ ...s.pill, background: '#DCFCE7', color: '#16A34A' }}>✓ {knowWell}</span>}
                      </div>
                    </>
                  )}
                </div>
                <div style={s.deckActions}>
                  <button style={s.editBtn} onClick={() => navigate(`/deck/${deck.id}`)}>Edit Cards →</button>
                  <button className="ts-btn-danger" style={s.deleteBtn} onClick={() => handleDeleteDeck(deck)}>Delete</button>
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
const ACCENT_COLORS = [
  'linear-gradient(90deg, #5B4FE9, #818CF8)',
  'linear-gradient(90deg, #EC4899, #F472B6)',
  'linear-gradient(90deg, #10B981, #34D399)',
  'linear-gradient(90deg, #F59E0B, #FCD34D)',
  'linear-gradient(90deg, #3B82F6, #60A5FA)',
  'linear-gradient(90deg, #8B5CF6, #A78BFA)',
  'linear-gradient(90deg, #EF4444, #F87171)',
  'linear-gradient(90deg, #14B8A6, #2DD4BF)',
];
const s = {
  page: { maxWidth: 960, margin: '0 auto', padding: '36px 24px' },
  header: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32 },
  title: { fontSize: 30, fontWeight: 900, color: '#fff', marginBottom: 4, textShadow: '0 2px 12px rgba(0,0,0,0.3)' },
  sub: { fontSize: 14, color: 'rgba(196,181,253,0.8)' },
  newBtn: { padding: '12px 24px', fontSize: 15, cursor: 'pointer', flexShrink: 0 },

  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 18 },
  deckCard: { display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  deckTopAccent: { height: 3, marginBottom: 16, borderRadius: 2 },
  deckCardInner: { padding: '20px 22px 12px', flex: 1, cursor: 'pointer' },
  deckName: { fontSize: 18, fontWeight: 800, color: '#1A1A2E', marginBottom: 6, lineHeight: 1.3 },
  deckMeta: { fontSize: 13, color: '#9CA3AF', fontWeight: 600, marginBottom: 12 },
  progressBar: { height: 5, background: '#F3F4F6', borderRadius: 99, marginBottom: 10, overflow: 'hidden' },
  progressFill: { height: '100%', background: `linear-gradient(90deg, #34D399, #16A34A)`, borderRadius: 99, transition: 'width 0.4s ease' },
  pillRow: { display: 'flex', flexWrap: 'wrap', gap: 5 },
  pill: { borderRadius: 20, padding: '3px 9px', fontSize: 12, fontWeight: 700 },

  deckActions: { display: 'flex', borderTop: '1px solid #F3F4F6', marginTop: 4 },
  editBtn: { flex: 1, padding: '12px 0', fontSize: 13, fontWeight: 700, color: PURPLE, background: 'transparent', border: 'none', borderRight: '1px solid #F3F4F6', cursor: 'pointer', transition: 'background 0.15s', borderRadius: '0 0 0 18px' },
  deleteBtn: { padding: '12px 16px', fontSize: 13, fontWeight: 700, color: '#EF4444', background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: '0 0 18px 0' },

  empty: { textAlign: 'center', padding: '80px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 },
  emptyTitle: { fontSize: 20, fontWeight: 800, color: '#1A1A2E' },
  emptySub: { fontSize: 14, color: '#9CA3AF' },
  emptyBtn: { padding: '12px 28px', fontSize: 15, cursor: 'pointer', marginTop: 4 },
};
