import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';

function scoreColor(score) {
  if (score > 0) return '#16A34A';
  if (score < 0) return '#DC2626';
  return '#6B7280';
}

function scoreLabel(score) {
  return score > 0 ? `+${score}` : `${score}`;
}

export default function WeightsPage({ session }) {
  const [decks, setDecks] = useState([]);
  const [cardsByDeck, setCardsByDeck] = useState({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data: d } = await supabase.from('decks').select('id, name').order('created_at', { ascending: false });
    const { data: allCards } = await supabase.from('cards').select('*').in('deck_id', (d ?? []).map(x => x.id));
    const grouped = {};
    for (const deck of (d ?? [])) {
      grouped[deck.id] = (allCards ?? []).filter(c => c.deck_id === deck.id);
    }
    setDecks(d ?? []);
    setCardsByDeck(grouped);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleReset(deck) {
    if (!confirm(`Reset all scores for "${deck.name}"? Every card goes back to 0.`)) return;
    const cardIds = (cardsByDeck[deck.id] ?? []).map(c => c.id);
    if (cardIds.length) {
      await supabase.from('cards').update({ acs_score: 0, times_correct: 0, times_incorrect: 0 }).in('id', cardIds);
    }
    load();
  }

  const allCards = Object.values(cardsByDeck).flat();
  const seenCards = allCards.filter(c => (c.times_correct ?? 0) + (c.times_incorrect ?? 0) > 0);
  const positiveCount = seenCards.filter(c => (c.acs_score ?? 0) > 0).length;
  const negativeCount = seenCards.filter(c => (c.acs_score ?? 0) < 0).length;

  if (loading) return <div style={s.loading}>Loading…</div>;

  return (
    <div style={s.page}>
      <h1 style={s.title}>🎯 Card Difficulty</h1>
      <p style={s.sub}>Each card starts at 0. Correct answers add points, wrong answers subtract. ACS Mode shows negative cards most often.</p>

      <div style={s.summaryRow}>
        {[
          { label: 'Total', value: allCards.length, color: '#1A1A2E' },
          { label: 'Positive', value: positiveCount, color: '#16A34A' },
          { label: 'Negative', value: negativeCount, color: '#DC2626' },
          { label: 'Unseen', value: allCards.length - seenCards.length, color: '#6B7280' },
        ].map(item => (
          <div key={item.label} style={s.summaryBox}>
            <p style={{ ...s.summaryNum, color: item.color }}>{item.value}</p>
            <p style={s.summaryLabel}>{item.label}</p>
          </div>
        ))}
      </div>

      {decks.map(deck => {
        const cards = cardsByDeck[deck.id] ?? [];
        if (!cards.length) return null;
        const sorted = [...cards].sort((a, b) => (a.acs_score ?? 0) - (b.acs_score ?? 0));
        return (
          <div key={deck.id} style={s.section}>
            <div style={s.deckHeader}>
              <p style={s.deckName}>{deck.name}</p>
              <button style={s.resetBtn} onClick={() => handleReset(deck)}>Reset</button>
            </div>
            {sorted.map(card => {
              const score = card.acs_score ?? 0;
              const seen = (card.times_correct ?? 0) + (card.times_incorrect ?? 0) > 0;
              const color = scoreColor(score);
              return (
                <div key={card.id} style={s.cardRow}>
                  <div style={s.cardLeft}>
                    <p style={s.cardFront}>{card.front}</p>
                    {seen ? (
                      <p style={s.cardStats}>{card.times_correct ?? 0} correct · {card.times_incorrect ?? 0} wrong</p>
                    ) : (
                      <p style={s.unseenText}>Not studied yet</p>
                    )}
                  </div>
                  <div style={{ ...s.scoreBadge, borderColor: color }}>
                    <p style={{ ...s.scoreNum, color }}>{seen ? scoreLabel(score) : '0'}</p>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}

      {decks.length === 0 && (
        <div style={s.empty}>
          <p style={{ fontSize: 48 }}>🎯</p>
          <p style={{ fontSize: 15, color: '#9CA3AF' }}>No decks yet.</p>
        </div>
      )}
    </div>
  );
}

const s = {
  page: { maxWidth: 760, margin: '0 auto', padding: '36px 24px' },
  title: { fontSize: 26, fontWeight: 900, color: '#1A1A2E', marginBottom: 6 },
  sub: { fontSize: 14, color: '#6B7280', marginBottom: 24, lineHeight: 1.6 },
  loading: { textAlign: 'center', padding: 60, color: '#9CA3AF' },
  summaryRow: { display: 'flex', gap: 12, marginBottom: 32 },
  summaryBox: { flex: 1, background: '#fff', borderRadius: 14, padding: '16px 12px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  summaryNum: { fontSize: 24, fontWeight: 900, marginBottom: 4 },
  summaryLabel: { fontSize: 12, fontWeight: 600, color: '#9CA3AF' },
  section: { marginBottom: 28 },
  deckHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  deckName: { fontSize: 13, fontWeight: 800, color: '#5B4FE9', textTransform: 'uppercase', letterSpacing: '0.8px' },
  resetBtn: { padding: '5px 12px', borderRadius: 8, background: '#FEE2E2', color: '#DC2626', fontSize: 12, fontWeight: 800, border: 'none', cursor: 'pointer' },
  cardRow: { display: 'flex', alignItems: 'center', background: '#fff', borderRadius: 12, padding: '14px 16px', marginBottom: 8, boxShadow: '0 1px 6px rgba(0,0,0,0.05)', gap: 16 },
  cardLeft: { flex: 1 },
  cardFront: { fontSize: 14, fontWeight: 700, color: '#1A1A2E', marginBottom: 4 },
  cardStats: { fontSize: 12, color: '#9CA3AF' },
  unseenText: { fontSize: 12, color: '#9CA3AF', fontStyle: 'italic' },
  scoreBadge: { width: 48, height: 48, borderRadius: 24, border: '2px solid', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  scoreNum: { fontSize: 16, fontWeight: 900 },
  empty: { textAlign: 'center', padding: '60px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 },
};
