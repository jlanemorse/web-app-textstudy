import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '../supabase';

function buildShareLink(deck, cards) {
  const payload = JSON.stringify({ name: deck.name, cards: cards.map(c => ({ front: c.front, back: c.back })) });
  const encoded = btoa(unescape(encodeURIComponent(payload)));
  return `textstudy://import?d=${encoded}`;
}

export default function DeckEditorPage({ session }) {
  const { deckId } = useParams();
  const navigate = useNavigate();

  const [deck, setDeck] = useState(null);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deckName, setDeckName] = useState('');
  const [editingName, setEditingName] = useState(false);

  const [newFront, setNewFront] = useState('');
  const [newBack, setNewBack] = useState('');
  const [addingCard, setAddingCard] = useState(false);

  const [editingCardId, setEditingCardId] = useState(null);
  const [editFront, setEditFront] = useState('');
  const [editBack, setEditBack] = useState('');

  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => { loadDeck(); }, [deckId]);

  async function loadDeck() {
    const [{ data: d }, { data: c }] = await Promise.all([
      supabase.from('decks').select('*').eq('id', deckId).single(),
      supabase.from('cards').select('*').eq('deck_id', deckId).order('created_at'),
    ]);
    if (!d) { navigate('/'); return; }
    setDeck(d);
    setDeckName(d.name);
    setCards(c ?? []);
    setLoading(false);
  }

  async function saveDeckName() {
    if (!deckName.trim() || deckName === deck.name) { setEditingName(false); return; }
    await supabase.from('decks').update({ name: deckName.trim() }).eq('id', deckId);
    setDeck(prev => ({ ...prev, name: deckName.trim() }));
    setEditingName(false);
  }

  async function addCard() {
    if (!newFront.trim() || !newBack.trim()) return;
    const { data } = await supabase.from('cards')
      .insert({ deck_id: deckId, front: newFront.trim(), back: newBack.trim() })
      .select().single();
    if (data) {
      setCards(prev => [...prev, data]);
      setNewFront('');
      setNewBack('');
      setAddingCard(false);
    }
  }

  async function saveCardEdit(cardId) {
    if (!editFront.trim() || !editBack.trim()) return;
    await supabase.from('cards').update({ front: editFront.trim(), back: editBack.trim() }).eq('id', cardId);
    setCards(prev => prev.map(c => c.id === cardId ? { ...c, front: editFront.trim(), back: editBack.trim() } : c));
    setEditingCardId(null);
  }

  async function deleteCard(cardId) {
    if (!confirm('Delete this card?')) return;
    await supabase.from('cards').delete().eq('id', cardId);
    setCards(prev => prev.filter(c => c.id !== cardId));
  }

  function handleCopyLink() {
    const link = buildShareLink(deck, cards);
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontSize: 32 }}>📚</div>;

  const shareLink = buildShareLink(deck, cards);

  return (
    <div style={s.page}>
      <div style={s.content}>
        <div style={s.topBar}>
          <button style={s.backBtn} onClick={() => navigate('/')}>← My Decks</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={s.autoSaveLabel}>✓ Auto-saved</span>
            {cards.length > 0 && <button style={s.shareBtn} onClick={() => setShareOpen(true)}>📱 Send to Phone</button>}
          </div>
        </div>
        {/* Deck title */}
        <div style={s.titleRow}>
          {editingName ? (
            <div style={s.nameEdit}>
              <input
                style={s.nameInput}
                value={deckName}
                onChange={e => setDeckName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveDeckName(); if (e.key === 'Escape') setEditingName(false); }}
                autoFocus
              />
              <button style={s.nameSaveBtn} onClick={saveDeckName}>Save</button>
              <button style={s.nameCancelBtn} onClick={() => setEditingName(false)}>Cancel</button>
            </div>
          ) : (
            <div style={s.nameTitleRow}>
              <h1 style={s.deckTitle}>{deck.name}</h1>
              <button style={s.editNameBtn} onClick={() => setEditingName(true)}>Rename</button>
            </div>
          )}
          <p style={s.cardCount}>{cards.length} card{cards.length !== 1 ? 's' : ''}</p>
        </div>

        {/* Add card */}
        {addingCard ? (
          <div style={s.addCard}>
            <h3 style={s.addCardTitle}>New Card</h3>
            <div style={s.addCardFields}>
              <div style={s.field}>
                <label style={s.label}>Question (Front)</label>
                <textarea
                  style={s.textarea}
                  placeholder="What is the question?"
                  value={newFront}
                  onChange={e => setNewFront(e.target.value)}
                  rows={3}
                  autoFocus
                />
              </div>
              <div style={s.field}>
                <label style={s.label}>Answer (Back)</label>
                <textarea
                  style={s.textarea}
                  placeholder="What is the answer?"
                  value={newBack}
                  onChange={e => setNewBack(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <div style={s.addCardBtns}>
              <button style={s.cancelBtn} onClick={() => { setAddingCard(false); setNewFront(''); setNewBack(''); }}>Cancel</button>
              <button style={s.saveCardBtn} onClick={addCard} disabled={!newFront.trim() || !newBack.trim()}>Add Card</button>
            </div>
          </div>
        ) : (
          <button style={s.addCardOpenBtn} onClick={() => setAddingCard(true)}>+ Add Card</button>
        )}

        {/* Cards list */}
        {cards.length === 0 && !addingCard ? (
          <div style={s.empty}>
            <span style={s.emptyEmoji}>🃏</span>
            <p style={s.emptyText}>No cards yet — add your first one above.</p>
          </div>
        ) : (
          <div style={s.cardsList}>
            {cards.map((card, i) => (
              <div key={card.id} style={s.cardRow}>
                {editingCardId === card.id ? (
                  <div style={s.editForm}>
                    <div style={s.editFields}>
                      <textarea style={s.textarea} value={editFront} onChange={e => setEditFront(e.target.value)} rows={2} autoFocus />
                      <textarea style={s.textarea} value={editBack} onChange={e => setEditBack(e.target.value)} rows={2} />
                    </div>
                    <div style={s.editBtns}>
                      <button style={s.cancelBtn} onClick={() => setEditingCardId(null)}>Cancel</button>
                      <button style={s.saveCardBtn} onClick={() => saveCardEdit(card.id)}>Save</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <span style={s.cardNum}>{i + 1}</span>
                    <div style={s.cardText}>
                      <p style={s.cardFront}>{card.front}</p>
                      <p style={s.cardBack}>{card.back}</p>
                    </div>
                    <div style={s.cardBtns}>
                      <button style={s.cardEditBtn} onClick={() => { setEditingCardId(card.id); setEditFront(card.front); setEditBack(card.back); }}>Edit</button>
                      <button style={s.cardDeleteBtn} onClick={() => deleteCard(card.id)}>✕</button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Share modal */}
      {shareOpen && (
        <div style={s.modalOverlay} onClick={() => setShareOpen(false)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <h2 style={s.modalTitle}>📱 Send to Phone</h2>
            <p style={s.modalSub}>Scan the QR code with your phone's camera, or tap the link on your phone to import this deck into TextStudy.</p>

            <div style={s.qrWrap}>
              <QRCodeSVG value={shareLink} size={200} bgColor="#fff" fgColor="#1A1A2E" />
            </div>

            <p style={s.orText}>— or —</p>

            <button style={s.copyBtn} onClick={handleCopyLink}>
              {copied ? '✓ Copied!' : 'Copy Link'}
            </button>

            <p style={s.modalNote}>
              Open this link on your phone while TextStudy is installed. The deck will import automatically.
            </p>

            <button style={s.modalClose} onClick={() => setShareOpen(false)}>Done</button>
          </div>
        </div>
      )}
    </div>
  );
}

const PURPLE = '#5B4FE9';

const s = {
  page: { minHeight: '100vh', background: '#F4F5F9' },
  nav: { background: '#fff', borderBottom: '1px solid #E5E7EB', padding: '0 32px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 },
  backBtn: { fontSize: 14, fontWeight: 700, color: PURPLE, background: 'transparent', border: 'none', cursor: 'pointer', padding: '8px 0' },
  autoSaveLabel: { fontSize: 12, fontWeight: 600, color: '#16A34A' },
  navRight: { display: 'flex', gap: 12 },
  shareBtn: { padding: '9px 18px', borderRadius: 10, background: PURPLE, color: '#fff', fontSize: 14, fontWeight: 800, boxShadow: '0 3px 10px rgba(91,79,233,0.3)' },

  content: { maxWidth: 760, margin: '0 auto', padding: '32px 24px' },
  topBar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 },

  titleRow: { marginBottom: 24 },
  nameTitleRow: { display: 'flex', alignItems: 'center', gap: 16, marginBottom: 4 },
  deckTitle: { fontSize: 28, fontWeight: 900, color: '#1A1A2E' },
  editNameBtn: { padding: '5px 12px', borderRadius: 8, background: '#F4F5F9', color: '#6B7280', fontSize: 13, fontWeight: 700 },
  nameEdit: { display: 'flex', gap: 10, alignItems: 'center', marginBottom: 4 },
  nameInput: { flex: 1, padding: '10px 14px', borderRadius: 10, border: '1.5px solid #5B4FE9', fontSize: 18, fontWeight: 800, color: '#1A1A2E' },
  nameSaveBtn: { padding: '10px 18px', borderRadius: 10, background: PURPLE, color: '#fff', fontSize: 14, fontWeight: 800 },
  nameCancelBtn: { padding: '10px 14px', borderRadius: 10, background: '#F4F5F9', color: '#6B7280', fontSize: 14, fontWeight: 700 },
  cardCount: { fontSize: 14, color: '#9CA3AF', fontWeight: 600 },

  addCardOpenBtn: { width: '100%', padding: '14px 0', borderRadius: 14, background: '#fff', border: '2px dashed #C7D2FE', color: PURPLE, fontSize: 15, fontWeight: 800, marginBottom: 20, cursor: 'pointer' },

  addCard: { background: '#fff', borderRadius: 18, padding: 24, marginBottom: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.07)', border: '1.5px solid #C7D2FE' },
  addCardTitle: { fontSize: 16, fontWeight: 800, color: '#1A1A2E', marginBottom: 16 },
  addCardFields: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 },
  addCardBtns: { display: 'flex', justifyContent: 'flex-end', gap: 10 },

  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 12, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px' },
  textarea: { padding: '12px 14px', borderRadius: 10, border: '1.5px solid #E5E7EB', fontSize: 14, color: '#1A1A2E', resize: 'vertical', background: '#F9FAFB', lineHeight: 1.5 },

  cancelBtn: { padding: '10px 18px', borderRadius: 10, background: '#F4F5F9', color: '#6B7280', fontSize: 14, fontWeight: 700 },
  saveCardBtn: { padding: '10px 20px', borderRadius: 10, background: PURPLE, color: '#fff', fontSize: 14, fontWeight: 800 },

  empty: { textAlign: 'center', padding: '60px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 },
  emptyEmoji: { fontSize: 48 },
  emptyText: { fontSize: 15, color: '#9CA3AF' },

  cardsList: { display: 'flex', flexDirection: 'column', gap: 10 },
  cardRow: { background: '#fff', borderRadius: 14, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, boxShadow: '0 1px 6px rgba(0,0,0,0.06)' },
  cardNum: { fontSize: 13, fontWeight: 800, color: '#9CA3AF', minWidth: 24, textAlign: 'center' },
  cardText: { flex: 1 },
  cardFront: { fontSize: 15, fontWeight: 700, color: '#1A1A2E', marginBottom: 4 },
  cardBack: { fontSize: 14, color: '#6B7280' },
  cardBtns: { display: 'flex', gap: 8, flexShrink: 0 },
  cardEditBtn: { padding: '6px 14px', borderRadius: 8, background: '#F4F5F9', color: PURPLE, fontSize: 13, fontWeight: 700 },
  cardDeleteBtn: { padding: '6px 10px', borderRadius: 8, background: '#FEF2F2', color: '#EF4444', fontSize: 13, fontWeight: 700 },

  editForm: { flex: 1 },
  editFields: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 },
  editBtns: { display: 'flex', justifyContent: 'flex-end', gap: 8 },

  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 100 },
  modal: { background: '#fff', borderRadius: 24, padding: '36px 32px', maxWidth: 420, width: '100%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' },
  modalTitle: { fontSize: 22, fontWeight: 900, color: '#1A1A2E', marginBottom: 10 },
  modalSub: { fontSize: 14, color: '#6B7280', lineHeight: 1.6, marginBottom: 24 },
  qrWrap: { display: 'inline-block', padding: 16, background: '#fff', borderRadius: 16, border: '2px solid #E5E7EB', marginBottom: 16 },
  orText: { fontSize: 13, color: '#9CA3AF', marginBottom: 16 },
  copyBtn: { padding: '12px 32px', borderRadius: 12, background: PURPLE, color: '#fff', fontSize: 15, fontWeight: 800, width: '100%', marginBottom: 16, boxShadow: '0 4px 14px rgba(91,79,233,0.3)' },
  modalNote: { fontSize: 12, color: '#9CA3AF', lineHeight: 1.6, marginBottom: 24 },
  modalClose: { padding: '10px 24px', borderRadius: 10, background: '#F4F5F9', color: '#6B7280', fontSize: 14, fontWeight: 700 },
};
