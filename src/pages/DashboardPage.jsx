import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';

export default function DashboardPage({ session }) {
  const [decks, setDecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => { loadDecks(); }, []);

  async function loadDecks() {
    const { data } = await supabase
      .from('decks')
      .select('*, cards(count)')
      .order('created_at', { ascending: false });
    setDecks(data ?? []);
    setLoading(false);
  }

  async function handleNewDeck() {
    const name = prompt('Deck name:');
    if (!name?.trim()) return;
    const { data, error } = await supabase
      .from('decks')
      .insert({ name: name.trim(), user_id: session.user.id })
      .select()
      .single();
    if (!error && data) navigate(`/deck/${data.id}`);
  }

  async function handleDeleteDeck(deck) {
    if (!confirm(`Delete "${deck.name}" and all its cards?`)) return;
    await supabase.from('decks').delete().eq('id', deck.id);
    setDecks(prev => prev.filter(d => d.id !== deck.id));
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  return (
    <div style={s.page}>
      {/* Nav */}
      <nav style={s.nav}>
        <span style={s.navLogo}>📚 TextStudy</span>
        <div style={s.navRight}>
          <span style={s.navEmail}>{session.user.email}</span>
          <button style={s.signOutBtn} onClick={handleSignOut}>Sign Out</button>
        </div>
      </nav>

      <div style={s.content}>
        <div style={s.header}>
          <div>
            <h1 style={s.title}>My Decks</h1>
            <p style={s.sub}>Create and manage your flashcard decks</p>
          </div>
          <button style={s.newBtn} onClick={handleNewDeck}>+ New Deck</button>
        </div>

        {loading ? (
          <div style={s.empty}><span style={s.emptyEmoji}>⏳</span></div>
        ) : decks.length === 0 ? (
          <div style={s.empty}>
            <span style={s.emptyEmoji}>📭</span>
            <p style={s.emptyText}>No decks yet. Create your first one!</p>
            <button style={s.emptyBtn} onClick={handleNewDeck}>+ Create Deck</button>
          </div>
        ) : (
          <div style={s.grid}>
            {decks.map(deck => {
              const count = deck.cards?.[0]?.count ?? 0;
              return (
                <div key={deck.id} style={s.deckCard}>
                  <div style={s.deckCardInner} onClick={() => navigate(`/deck/${deck.id}`)}>
                    <h2 style={s.deckName}>{deck.name}</h2>
                    <p style={s.deckMeta}>{count} card{count !== 1 ? 's' : ''}</p>
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
    </div>
  );
}

const PURPLE = '#5B4FE9';

const s = {
  page: { minHeight: '100vh', background: '#F4F5F9' },
  nav: { background: '#fff', borderBottom: '1px solid #E5E7EB', padding: '0 32px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 },
  navLogo: { fontSize: 18, fontWeight: 900, color: '#1A1A2E' },
  navRight: { display: 'flex', alignItems: 'center', gap: 16 },
  navEmail: { fontSize: 13, color: '#6B7280' },
  signOutBtn: { padding: '7px 14px', borderRadius: 8, background: '#F4F5F9', color: '#6B7280', fontSize: 13, fontWeight: 700 },
  content: { maxWidth: 960, margin: '0 auto', padding: '36px 24px' },
  header: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32 },
  title: { fontSize: 30, fontWeight: 900, color: '#1A1A2E', marginBottom: 4 },
  sub: { fontSize: 14, color: '#6B7280' },
  newBtn: { padding: '12px 24px', borderRadius: 12, background: PURPLE, color: '#fff', fontSize: 15, fontWeight: 800, boxShadow: '0 4px 14px rgba(91,79,233,0.3)', flexShrink: 0 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 },
  deckCard: { background: '#fff', borderRadius: 18, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.07)', display: 'flex', flexDirection: 'column' },
  deckCardInner: { padding: 24, flex: 1, cursor: 'pointer' },
  deckName: { fontSize: 18, fontWeight: 800, color: '#1A1A2E', marginBottom: 8 },
  deckMeta: { fontSize: 13, color: '#9CA3AF', fontWeight: 600 },
  deckActions: { display: 'flex', borderTop: '1px solid #F3F4F6' },
  editBtn: { flex: 1, padding: '12px 0', fontSize: 13, fontWeight: 700, color: PURPLE, background: 'transparent', borderRight: '1px solid #F3F4F6' },
  deleteBtn: { flex: 1, padding: '12px 0', fontSize: 13, fontWeight: 700, color: '#EF4444', background: 'transparent' },
  empty: { textAlign: 'center', padding: '80px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 },
  emptyEmoji: { fontSize: 56 },
  emptyText: { fontSize: 16, color: '#6B7280' },
  emptyBtn: { padding: '12px 28px', borderRadius: 12, background: PURPLE, color: '#fff', fontSize: 15, fontWeight: 800 },
};
