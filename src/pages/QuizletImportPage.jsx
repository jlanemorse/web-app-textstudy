import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

function tryParseCardArray(arr) {
  if (!arr.length) return [];
  if (arr[0]?.cardSides) {
    const cards = arr.map(i => {
      const front = i.cardSides?.find(s => /word/i.test(s.label));
      const back  = i.cardSides?.find(s => /def/i.test(s.label));
      return { front: front?.media?.[0]?.plainText ?? front?.media?.[0]?.text ?? '', back: back?.media?.[0]?.plainText ?? back?.media?.[0]?.text ?? '' };
    }).filter(c => c.front && c.back);
    if (cards.length) return cards;
  }
  if (arr[0]?.word !== undefined || arr[0]?.term !== undefined) {
    return arr.map(t => ({ front: t.word ?? t.term ?? '', back: t.definition ?? '' })).filter(c => c.front && c.back);
  }
  return [];
}

function findCardArrays(value, results = []) {
  if (Array.isArray(value)) {
    const cards = tryParseCardArray(value);
    if (cards.length) results.push(cards);
    value.forEach(item => findCardArrays(item, results));
  } else if (value && typeof value === 'object') {
    Object.values(value).forEach(v => findCardArrays(v, results));
  } else if (typeof value === 'string' && value.length > 100) {
    try { findCardArrays(JSON.parse(value), results); } catch {}
  }
  return results;
}

function parseQuizletHtml(html) {
  const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!match) throw new Error('Could not find card data in the page.');
  const nextData = JSON.parse(match[1]);
  const allArrays = findCardArrays(nextData);
  if (!allArrays.length) throw new Error('No cards found. The set may be private or the link may be incorrect.');
  return allArrays.reduce((best, arr) => arr.length > best.length ? arr : best, []);
}

export default function QuizletImportPage({ session }) {
  const [decks, setDecks] = useState([]);
  const [selectedDeckId, setSelectedDeckId] = useState('');
  const [newDeckName, setNewDeckName] = useState('');
  const [showNewDeck, setShowNewDeck] = useState(false);
  const [url, setUrl] = useState('');
  const [parsedCards, setParsedCards] = useState(null);
  const [fetching, setFetching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { loadDecks(); }, []);

  async function loadDecks() {
    const { data } = await supabase.from('decks').select('id, name').eq('user_id', session.user.id).order('created_at', { ascending: false });
    setDecks(data ?? []);
  }

  async function handleCreateDeck() {
    if (!newDeckName.trim()) return;
    const { data } = await supabase.from('decks').insert({ name: newDeckName.trim(), user_id: session.user.id }).select().single();
    if (data) { setDecks(prev => [data, ...prev]); setSelectedDeckId(data.id); setNewDeckName(''); setShowNewDeck(false); }
  }

  async function handleFetch() {
    setError('');
    setParsedCards(null);
    if (!url.trim() || !url.includes('quizlet.com')) {
      setError('Please enter a valid Quizlet URL.');
      return;
    }
    setFetching(true);
    try {
      const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url.trim())}`;
      const res = await fetch(proxyUrl);
      if (!res.ok) throw new Error('Failed to load the page. Make sure the set is public.');
      const html = await res.text();
      const cards = parseQuizletHtml(html);
      setParsedCards(cards);
    } catch (e) {
      setError(e.message);
    }
    setFetching(false);
  }

  async function handleImport() {
    if (!parsedCards?.length || !selectedDeckId) return;
    setSaving(true);
    await supabase.from('cards').insert(parsedCards.map(c => ({ deck_id: selectedDeckId, front: c.front, back: c.back })));
    const deck = decks.find(d => d.id === selectedDeckId);
    alert(`✅ ${parsedCards.length} cards imported into "${deck?.name}"!`);
    setUrl(''); setParsedCards(null); setSaving(false);
  }

  return (
    <div style={s.page}>
      <h1 style={s.title}>🌐 Import from Quizlet</h1>
      <p style={s.sub}>Paste a link to any public Quizlet set and we'll pull the cards in automatically.</p>

      <div style={s.inputRow}>
        <input
          style={s.urlInput}
          placeholder="https://quizlet.com/123456/set-name/"
          value={url}
          onChange={e => { setUrl(e.target.value); setParsedCards(null); setError(''); }}
          onKeyDown={e => e.key === 'Enter' && handleFetch()}
        />
        <button
          className="ts-btn"
          style={{ ...s.fetchBtn, ...(fetching ? s.fetchBtnLoading : {}) }}
          onClick={handleFetch}
          disabled={fetching || !url.trim()}
        >
          {fetching ? 'Loading…' : 'Fetch Cards'}
        </button>
      </div>

      {error && <p style={s.error}>⚠ {error}</p>}

      {parsedCards && (
        <div style={s.found}>
          <p style={s.foundText}>✅ Found <strong>{parsedCards.length} cards</strong></p>
          <div style={s.previewList}>
            {parsedCards.slice(0, 5).map((c, i) => (
              <div key={i} style={s.previewCard}>
                <span style={s.previewFront}>{c.front}</span>
                <span style={s.previewArrow}>→</span>
                <span style={s.previewBack}>{c.back}</span>
              </div>
            ))}
            {parsedCards.length > 5 && <p style={s.moreText}>…and {parsedCards.length - 5} more</p>}
          </div>

          <div style={s.section}>
            <label style={s.label}>Save to Deck</label>
            {showNewDeck ? (
              <div style={s.newDeckRow}>
                <input style={s.input} placeholder="Deck name..." value={newDeckName} onChange={e => setNewDeckName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreateDeck()} autoFocus />
                <button style={s.importBtn} onClick={handleCreateDeck}>Create</button>
                <button style={s.cancelBtn} onClick={() => setShowNewDeck(false)}>Cancel</button>
              </div>
            ) : (
              <button style={s.newDeckBtn} onClick={() => setShowNewDeck(true)}>+ New Deck</button>
            )}
            <div style={s.deckList}>
              {decks.map(d => (
                <button key={d.id} style={{ ...s.deckOption, ...(selectedDeckId === d.id ? s.deckOptionActive : {}) }} onClick={() => setSelectedDeckId(d.id)}>
                  {d.name} {selectedDeckId === d.id && '✓'}
                </button>
              ))}
            </div>
          </div>

          <button style={{ ...s.importBtn, ...(!selectedDeckId ? s.disabled : {}) }} onClick={handleImport} disabled={!selectedDeckId || saving}>
            {saving ? 'Importing…' : `Import ${parsedCards.length} Cards`}
          </button>
        </div>
      )}
    </div>
  );
}

const PURPLE = '#5B4FE9';
const s = {
  page: { maxWidth: 760, margin: '0 auto', padding: '36px 24px' },
  title: { fontSize: 26, fontWeight: 900, color: '#fff', marginBottom: 6, textShadow: '0 2px 12px rgba(0,0,0,0.3)' },
  sub: { fontSize: 14, color: 'rgba(196,181,253,0.8)', marginBottom: 24 },
  inputRow: { display: 'flex', gap: 10, marginBottom: 12 },
  urlInput: { flex: 1, padding: '13px 16px', borderRadius: 12, border: '1.5px solid #E5E7EB', fontSize: 14, color: '#1A1A2E', background: '#fff', outline: 'none', fontFamily: 'inherit' },
  fetchBtn: { padding: '13px 24px', borderRadius: 12, background: PURPLE, color: '#fff', fontSize: 14, fontWeight: 800, border: 'none', cursor: 'pointer', flexShrink: 0 },
  fetchBtnLoading: { opacity: 0.6 },
  error: { fontSize: 14, color: '#DC2626', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 14px', marginBottom: 16 },
  found: { background: '#fff', borderRadius: 16, padding: 24, border: '1.5px solid #E5E7EB', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' },
  foundText: { fontSize: 16, fontWeight: 700, color: '#1A1A2E', marginBottom: 14 },
  previewList: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 },
  previewCard: { display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', background: '#F9FAFB', borderRadius: 10, fontSize: 13 },
  previewFront: { flex: 1, fontWeight: 600, color: '#1A1A2E' },
  previewArrow: { color: '#9CA3AF', flexShrink: 0 },
  previewBack: { flex: 1, color: '#6B7280' },
  moreText: { fontSize: 13, color: '#9CA3AF', textAlign: 'center' },
  section: { marginBottom: 20 },
  label: { display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' },
  newDeckRow: { display: 'flex', gap: 10, marginBottom: 10 },
  newDeckBtn: { padding: '9px 18px', borderRadius: 10, background: '#F4F5F9', border: '1.5px dashed #C7D2FE', fontSize: 14, fontWeight: 700, color: PURPLE, cursor: 'pointer', marginBottom: 10 },
  deckList: { display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 },
  deckOption: { padding: '11px 16px', borderRadius: 10, border: '1.5px solid #E5E7EB', fontSize: 14, fontWeight: 600, color: '#374151', background: '#fff', cursor: 'pointer', textAlign: 'left' },
  deckOptionActive: { borderColor: PURPLE, background: '#EEF2FF', color: PURPLE },
  input: { flex: 1, padding: '10px 14px', borderRadius: 10, border: '1.5px solid #E5E7EB', fontSize: 14, color: '#1A1A2E', background: '#F9FAFB', fontFamily: 'inherit' },
  importBtn: { width: '100%', padding: '14px 0', borderRadius: 12, background: PURPLE, color: '#fff', fontSize: 15, fontWeight: 800, border: 'none', cursor: 'pointer' },
  cancelBtn: { padding: '10px 16px', borderRadius: 10, background: '#F4F5F9', color: '#6B7280', fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer' },
  disabled: { opacity: 0.4 },
};
