import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { getApiKey, generateCards } from '../lib/claude';
import ApiKeyBanner from '../components/ApiKeyBanner';
import CardReviewEditor from '../components/CardReviewEditor';

export default function PasteTextPage({ session }) {
  const [decks, setDecks] = useState([]);
  const [selectedDeckId, setSelectedDeckId] = useState('');
  const [newDeckName, setNewDeckName] = useState('');
  const [showNewDeck, setShowNewDeck] = useState(false);

  const [pasteText, setPasteText] = useState('');
  const [instructions, setInstructions] = useState('');

  const [step, setStep] = useState('setup');
  const [cards, setCards] = useState([]);
  const [apiKey, setApiKey] = useState(getApiKey());

  useEffect(() => { loadDecks(); }, []);

  async function loadDecks() {
    const { data } = await supabase.from('decks').select('id, name').order('created_at', { ascending: false });
    setDecks(data ?? []);
  }

  async function handleCreateDeck() {
    if (!newDeckName.trim()) return;
    const { data } = await supabase.from('decks').insert({ name: newDeckName.trim(), user_id: session.user.id }).select().single();
    if (data) { setDecks(prev => [data, ...prev]); setSelectedDeckId(data.id); setNewDeckName(''); setShowNewDeck(false); }
  }

  async function handleGenerate() {
    if (!pasteText.trim() || !selectedDeckId || !apiKey) return;
    setStep('generating');
    try {
      const raw = await generateCards({ topic: 'the provided source material', instructions, pasteText, apiKey });
      setCards(raw.map((c, i) => ({ _id: String(i), front: c.front ?? '', back: c.back ?? '' })));
      setStep('review');
    } catch (e) {
      alert(`Generation failed: ${e.message}`);
      setStep('setup');
    }
  }

  async function handleSave() {
    const toSave = cards.filter(c => c.front.trim() && c.back.trim());
    if (!toSave.length) return;
    await supabase.from('cards').insert(toSave.map(c => ({ deck_id: selectedDeckId, front: c.front.trim(), back: c.back.trim() })));
    const deck = decks.find(d => d.id === selectedDeckId);
    alert(`✅ ${toSave.length} cards saved to "${deck?.name}"!`);
    setStep('setup'); setPasteText(''); setInstructions(''); setCards([]);
  }

  if (step === 'generating') return (
    <div style={s.loading}>
      <div style={s.loadingEmoji}>📋</div>
      <p style={s.loadingTitle}>Reading your text…</p>
      <p style={s.loadingSub}>Claude is turning your content into flashcards</p>
    </div>
  );

  if (step === 'review') return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <h1 style={s.title}>✨ {cards.length} cards generated</h1>
          <p style={s.sub}>Edit or remove any before saving</p>
        </div>
        <div style={s.headerBtns}>
          <button style={s.backBtn} onClick={() => setStep('setup')}>← Adjust</button>
          <button style={s.saveBtn} onClick={handleSave}>Save {cards.filter(c=>c.front.trim()&&c.back.trim()).length} Cards</button>
        </div>
      </div>
      <CardReviewEditor
        cards={cards}
        onChange={(id, field, val) => setCards(prev => prev.map(c => c._id === id ? { ...c, [field]: val } : c))}
        onRemove={id => setCards(prev => prev.filter(c => c._id !== id))}
      />
    </div>
  );

  return (
    <div style={s.page}>
      <h1 style={s.title}>📋 Paste Text</h1>
      <p style={s.sub}>Copy text from a webpage, textbook, or document and paste it here. Claude will turn it into flashcards automatically.</p>

      <ApiKeyBanner onKey={setApiKey} />

      <div style={s.section}>
        <label style={s.label}>Paste your text here *</label>
        <p style={s.fieldSub}>Copy from a webpage, PDF, textbook, lecture notes — anything. Paste the whole thing.</p>
        <textarea
          style={{ ...s.textarea, minHeight: 220 }}
          placeholder="Paste your text here... Claude will read it and create the best possible flashcards from the content."
          value={pasteText}
          onChange={e => setPasteText(e.target.value)}
        />
        {pasteText.length > 0 && <p style={s.charCount}>{pasteText.length.toLocaleString()} characters pasted</p>}
      </div>

      <div style={s.section}>
        <label style={s.label}>Instructions (optional)</label>
        <textarea style={s.textarea} rows={3} placeholder={'e.g. "Focus on definitions only"\n"Make 15 cards"\n"Ignore examples, focus on key concepts"'} value={instructions} onChange={e => setInstructions(e.target.value)} />
      </div>

      <div style={s.section}>
        <label style={s.label}>Save to Deck *</label>
        {showNewDeck ? (
          <div style={s.newDeckRow}>
            <input style={s.input} placeholder="Deck name..." value={newDeckName} onChange={e => setNewDeckName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreateDeck()} autoFocus />
            <button style={s.saveBtn} onClick={handleCreateDeck}>Create</button>
            <button style={s.backBtn} onClick={() => setShowNewDeck(false)}>Cancel</button>
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

      <button style={{ ...s.genBtn, ...(!pasteText.trim() || !selectedDeckId || !apiKey ? s.genBtnDisabled : {}) }} onClick={handleGenerate} disabled={!pasteText.trim() || !selectedDeckId || !apiKey}>
        ✨ Generate Flashcards from Text
      </button>
    </div>
  );
}

const PURPLE = '#5B4FE9';
const s = {
  page: { maxWidth: 760, margin: '0 auto', padding: '36px 24px' },
  title: { fontSize: 26, fontWeight: 900, color: '#1A1A2E', marginBottom: 6 },
  sub: { fontSize: 14, color: '#6B7280', marginBottom: 28, lineHeight: 1.6 },
  section: { marginBottom: 22 },
  label: { display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' },
  fieldSub: { fontSize: 12, color: '#9CA3AF', marginBottom: 10 },
  textarea: { width: '100%', padding: '12px 14px', borderRadius: 12, border: '1.5px solid #E5E7EB', fontSize: 14, color: '#1A1A2E', resize: 'vertical', background: '#F9FAFB', lineHeight: 1.6, fontFamily: 'inherit' },
  input: { flex: 1, padding: '10px 14px', borderRadius: 10, border: '1.5px solid #E5E7EB', fontSize: 14, color: '#1A1A2E', background: '#F9FAFB', fontFamily: 'inherit' },
  charCount: { fontSize: 12, color: '#9CA3AF', marginTop: 6, textAlign: 'right' },
  newDeckRow: { display: 'flex', gap: 10, marginBottom: 10 },
  newDeckBtn: { padding: '9px 18px', borderRadius: 10, background: '#F4F5F9', border: '1.5px dashed #C7D2FE', fontSize: 14, fontWeight: 700, color: PURPLE, cursor: 'pointer', marginBottom: 10 },
  deckList: { display: 'flex', flexDirection: 'column', gap: 6 },
  deckOption: { padding: '11px 16px', borderRadius: 10, border: '1.5px solid #E5E7EB', fontSize: 14, fontWeight: 600, color: '#374151', background: '#fff', cursor: 'pointer', textAlign: 'left' },
  deckOptionActive: { borderColor: PURPLE, background: '#EEF2FF', color: PURPLE },
  genBtn: { width: '100%', padding: '16px 0', borderRadius: 14, background: PURPLE, color: '#fff', fontSize: 16, fontWeight: 800, border: 'none', cursor: 'pointer', marginTop: 8, boxShadow: '0 4px 16px rgba(91,79,233,0.35)' },
  genBtnDisabled: { opacity: 0.4, boxShadow: 'none' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  headerBtns: { display: 'flex', gap: 10, flexShrink: 0 },
  saveBtn: { padding: '10px 20px', borderRadius: 10, background: PURPLE, color: '#fff', fontSize: 14, fontWeight: 800, border: 'none', cursor: 'pointer' },
  backBtn: { padding: '10px 16px', borderRadius: 10, background: '#F4F5F9', color: '#6B7280', fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer' },
  loading: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 16 },
  loadingEmoji: { fontSize: 56 },
  loadingTitle: { fontSize: 22, fontWeight: 800, color: '#1A1A2E' },
  loadingSub: { fontSize: 14, color: '#6B7280' },
};
