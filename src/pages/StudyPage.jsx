import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5); }

function buildChoices(card, allCards) {
  const others = shuffle(allCards.filter(c => c.id !== card.id && c.back !== card.back));
  const distractors = others.slice(0, 3);
  if (distractors.length < 3) return null;
  return shuffle([
    { id: card.id, text: card.back, correct: true },
    { id: distractors[0].id + '_a', text: distractors[0].back, correct: false },
    { id: distractors[1].id + '_b', text: distractors[1].back, correct: false },
    { id: distractors[2].id + '_c', text: distractors[2].back, correct: false },
  ]);
}

async function updateCardScore(cardId, correct) {
  const { data } = await supabase.from('cards').select('acs_score, times_correct, times_incorrect').eq('id', cardId).single();
  if (!data) return;
  await supabase.from('cards').update({
    acs_score: (data.acs_score ?? 0) + (correct ? 1 : -1),
    times_correct: (data.times_correct ?? 0) + (correct ? 1 : 0),
    times_incorrect: (data.times_incorrect ?? 0) + (correct ? 0 : 1),
  }).eq('id', cardId);
}

// ── Deck picker ───────────────────────────────────────────────────────────────
function DeckPicker({ onStart }) {
  const [decks, setDecks] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [mode, setMode] = useState('flashcard');

  useEffect(() => {
    supabase.from('decks').select('id, name, cards(count)').order('created_at', { ascending: false }).then(({ data }) => setDecks(data ?? []));
  }, []);

  return (
    <div style={s.page}>
      <h1 style={s.title}>🎮 Study</h1>
      <p style={s.sub}>Pick a deck and a mode to start studying.</p>

      <div style={s.section}>
        <label style={s.label}>Choose a Deck</label>
        <div style={s.deckList}>
          {decks.map(d => {
            const count = d.cards?.[0]?.count ?? 0;
            return (
              <button key={d.id} style={{ ...s.deckOption, ...(selectedId === d.id ? s.deckOptionActive : {}) }} onClick={() => setSelectedId(d.id)}>
                <span>{d.name}</span>
                <span style={s.deckCount}>{count} cards</span>
                {selectedId === d.id && <span style={s.check}>✓</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div style={s.section}>
        <label style={s.label}>Mode</label>
        <div style={s.modeRow}>
          <button style={{ ...s.modeBtn, ...(mode === 'flashcard' ? s.modeBtnActive : {}) }} onClick={() => setMode('flashcard')}>
            <span style={s.modeEmoji}>🃏</span>
            <span style={s.modeLabel}>Flashcards</span>
            <span style={s.modeSub}>Flip to reveal, mark Got It or Missed It</span>
          </button>
          <button style={{ ...s.modeBtn, ...(mode === 'multiplechoice' ? s.modeBtnActive : {}) }} onClick={() => setMode('multiplechoice')}>
            <span style={s.modeEmoji}>🔢</span>
            <span style={s.modeLabel}>Multiple Choice</span>
            <span style={s.modeSub}>4 options, tap the correct answer</span>
          </button>
        </div>
      </div>

      <button style={{ ...s.startBtn, ...(!selectedId ? s.startBtnDisabled : {}) }} onClick={() => onStart(selectedId, mode)} disabled={!selectedId}>
        Start Studying
      </button>
    </div>
  );
}

// ── Flashcard session ─────────────────────────────────────────────────────────
function FlashcardSession({ cards, onDone }) {
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongIds, setWrongIds] = useState([]);

  const card = cards[idx];

  async function handleAnswer(correct) {
    await updateCardScore(card.id, correct);
    if (!correct) setWrongIds(prev => [...prev, card.id]);
    if (correct) setCorrectCount(c => c + 1);
    if (idx + 1 >= cards.length) {
      onDone({ correctCount: correctCount + (correct ? 1 : 0), total: cards.length, wrongIds: correct ? wrongIds : [...wrongIds, card.id], allCards: cards });
    } else {
      setIdx(i => i + 1);
      setFlipped(false);
    }
  }

  return (
    <div style={s.sessionWrap}>
      <div style={s.sessionTop}>
        <span style={s.sessionProgress}>{idx + 1} / {cards.length}</span>
        <div style={s.progressBar}><div style={{ ...s.progressFill, width: `${(idx / cards.length) * 100}%` }} /></div>
      </div>

      <div style={s.flashCard} onClick={() => setFlipped(true)}>
        <p style={s.cardSide}>{flipped ? 'ANSWER' : 'QUESTION'}</p>
        <p style={s.cardText}>{flipped ? card.back : card.front}</p>
        {!flipped && <p style={s.tapHint}>Click to reveal answer</p>}
      </div>

      {flipped ? (
        <div style={s.answerRow}>
          <button style={s.missedBtn} onClick={() => handleAnswer(false)}>✗ Missed It</button>
          <button style={s.gotItBtn} onClick={() => handleAnswer(true)}>✓ Got It</button>
        </div>
      ) : null}
    </div>
  );
}

// ── Multiple choice session ────────────────────────────────────────────────────
function MCSession({ cards, onDone }) {
  const [idx, setIdx] = useState(0);
  const [choices, setChoices] = useState(() => buildChoices(cards[0], cards));
  const [selected, setSelected] = useState(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongIds, setWrongIds] = useState([]);

  const card = cards[idx];

  async function handleSelect(choice) {
    if (selected) return;
    setSelected(choice.id);
    const correct = choice.correct;
    await updateCardScore(card.id, correct);
    if (!correct) setWrongIds(prev => [...prev, card.id]);
    if (correct) setCorrectCount(c => c + 1);
  }

  function handleNext() {
    const nextIdx = idx + 1;
    if (nextIdx >= cards.length) {
      onDone({ correctCount, total: cards.length, wrongIds, allCards: cards });
      return;
    }
    setIdx(nextIdx);
    setChoices(buildChoices(cards[nextIdx], cards));
    setSelected(null);
  }

  if (!choices) return (
    <div style={s.sessionWrap}>
      <p style={{ textAlign: 'center', color: '#6B7280', marginTop: 40 }}>Not enough cards for multiple choice — need at least 4 in this deck.</p>
    </div>
  );

  return (
    <div style={s.sessionWrap}>
      <div style={s.sessionTop}>
        <span style={s.sessionProgress}>{idx + 1} / {cards.length}</span>
        <div style={s.progressBar}><div style={{ ...s.progressFill, width: `${(idx / cards.length) * 100}%` }} /></div>
      </div>

      <div style={s.questionCard}>
        <p style={s.cardSide}>QUESTION</p>
        <p style={s.cardText}>{card.front}</p>
      </div>

      <div style={s.choicesList}>
        {choices.map(choice => {
          let style = s.choiceBtn;
          if (selected) {
            if (choice.correct) style = { ...s.choiceBtn, ...s.choiceCorrect };
            else if (choice.id === selected) style = { ...s.choiceBtn, ...s.choiceWrong };
            else style = { ...s.choiceBtn, opacity: 0.4 };
          }
          return (
            <button key={choice.id} style={style} onClick={() => handleSelect(choice)}>
              {choice.text}
            </button>
          );
        })}
      </div>

      {selected && (
        <button style={s.nextBtn} onClick={handleNext}>
          {idx + 1 < cards.length ? 'Next →' : 'Finish'}
        </button>
      )}
    </div>
  );
}

// ── Done screen ───────────────────────────────────────────────────────────────
function DoneScreen({ result, onRestart, onWrongReview }) {
  const pct = Math.round((result.correctCount / result.total) * 100);
  return (
    <div style={s.doneWrap}>
      <p style={s.doneEmoji}>{pct >= 80 ? '🎉' : pct >= 50 ? '💪' : '📚'}</p>
      <h2 style={s.doneTitle}>Session Complete!</h2>
      <p style={s.doneScore}>{result.correctCount} / {result.total}</p>
      <p style={s.donePct}>{pct}% correct</p>
      <div style={s.doneBtns}>
        <button style={s.restartBtn} onClick={onRestart}>Study Again</button>
        {result.wrongIds.length > 0 && (
          <button style={s.wrongBtn} onClick={onWrongReview}>
            📋 Review {result.wrongIds.length} Wrong Answer{result.wrongIds.length !== 1 ? 's' : ''}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Wrong answer review ───────────────────────────────────────────────────────
function WrongReview({ cards, allCards, onDone }) {
  const [idx, setIdx] = useState(0);
  const [choices, setChoices] = useState(() => buildChoices(cards[0], allCards));
  const [selected, setSelected] = useState(null);
  const [done, setDone] = useState(false);

  if (done) return (
    <div style={s.doneWrap}>
      <p style={s.doneEmoji}>📖</p>
      <h2 style={s.doneTitle}>Review Complete</h2>
      <p style={{ fontSize: 15, color: '#6B7280', marginBottom: 32 }}>Reviewed {cards.length} missed card{cards.length !== 1 ? 's' : ''}.</p>
      <button style={s.restartBtn} onClick={onDone}>Done</button>
    </div>
  );

  const card = cards[idx];

  function handleNext() {
    if (idx + 1 >= cards.length) { setDone(true); return; }
    setIdx(i => i + 1);
    setChoices(buildChoices(cards[idx + 1], allCards));
    setSelected(null);
  }

  return (
    <div style={s.sessionWrap}>
      <div style={s.sessionTop}>
        <span style={{ ...s.sessionProgress, color: '#EF4444' }}>Wrong Answer Review · {idx + 1} / {cards.length}</span>
        <div style={{ ...s.progressBar, background: '#FECACA' }}><div style={{ ...s.progressFill, width: `${(idx / cards.length) * 100}%`, background: '#EF4444' }} /></div>
      </div>
      <div style={{ ...s.questionCard, borderLeftColor: '#EF4444' }}>
        <p style={s.cardSide}>QUESTION</p>
        <p style={s.cardText}>{card.front}</p>
      </div>
      {choices ? (
        <div style={s.choicesList}>
          {choices.map(choice => {
            let style = s.choiceBtn;
            if (selected) {
              if (choice.correct) style = { ...s.choiceBtn, ...s.choiceCorrect };
              else if (choice.id === selected) style = { ...s.choiceBtn, ...s.choiceWrong };
              else style = { ...s.choiceBtn, opacity: 0.4 };
            }
            return <button key={choice.id} style={style} onClick={() => { if (!selected) setSelected(choice.id); }}>{choice.text}</button>;
          })}
        </div>
      ) : <p style={{ color: '#9CA3AF', textAlign: 'center', marginTop: 20 }}>Not enough cards for choices.</p>}
      {selected && <button style={{ ...s.nextBtn, background: '#EF4444' }} onClick={handleNext}>{idx + 1 < cards.length ? 'Next →' : 'Finish'}</button>}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function StudyPage() {
  const [phase, setPhase] = useState('pick'); // pick | session | done | wrong
  const [sessionCards, setSessionCards] = useState([]);
  const [mode, setMode] = useState('flashcard');
  const [result, setResult] = useState(null);

  async function handleStart(deckId, selectedMode) {
    const { data } = await supabase.from('cards').select('*').eq('deck_id', deckId);
    if (!data?.length) { alert('This deck has no cards yet.'); return; }
    setSessionCards(shuffle(data));
    setMode(selectedMode);
    setPhase('session');
  }

  function handleDone(r) { setResult(r); setPhase('done'); }

  if (phase === 'pick') return <DeckPicker onStart={handleStart} />;
  if (phase === 'done') return <DoneScreen result={result} onRestart={() => setPhase('pick')} onWrongReview={() => setPhase('wrong')} />;
  if (phase === 'wrong') {
    const wrongCards = result.wrongIds.map(id => result.allCards.find(c => c.id === id)).filter(Boolean);
    return <WrongReview cards={wrongCards} allCards={result.allCards} onDone={() => setPhase('pick')} />;
  }
  if (mode === 'flashcard') return <FlashcardSession cards={sessionCards} onDone={handleDone} />;
  return <MCSession cards={sessionCards} onDone={handleDone} />;
}

const PURPLE = '#5B4FE9';
const GREEN = '#22C55E';
const RED = '#EF4444';

const s = {
  page: { maxWidth: 600, margin: '0 auto', padding: '36px 24px' },
  title: { fontSize: 26, fontWeight: 900, color: '#1A1A2E', marginBottom: 6 },
  sub: { fontSize: 14, color: '#6B7280', marginBottom: 28 },
  section: { marginBottom: 24 },
  label: { display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' },
  deckList: { display: 'flex', flexDirection: 'column', gap: 8 },
  deckOption: { display: 'flex', alignItems: 'center', gap: 10, padding: '13px 16px', borderRadius: 12, border: '1.5px solid #E5E7EB', fontSize: 14, fontWeight: 600, color: '#374151', background: '#fff', cursor: 'pointer', textAlign: 'left' },
  deckOptionActive: { borderColor: PURPLE, background: '#EEF2FF', color: PURPLE },
  deckCount: { marginLeft: 'auto', fontSize: 12, color: '#9CA3AF', fontWeight: 600 },
  check: { fontSize: 16, color: PURPLE },
  modeRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  modeBtn: { display: 'flex', flexDirection: 'column', gap: 4, padding: '18px 16px', borderRadius: 14, border: '1.5px solid #E5E7EB', background: '#fff', cursor: 'pointer', textAlign: 'left' },
  modeBtnActive: { borderColor: PURPLE, background: '#EEF2FF' },
  modeEmoji: { fontSize: 24, marginBottom: 4 },
  modeLabel: { fontSize: 15, fontWeight: 700, color: '#1A1A2E' },
  modeSub: { fontSize: 12, color: '#9CA3AF', lineHeight: 1.4 },
  startBtn: { width: '100%', padding: '16px 0', borderRadius: 14, background: PURPLE, color: '#fff', fontSize: 16, fontWeight: 800, border: 'none', cursor: 'pointer', boxShadow: '0 4px 16px rgba(91,79,233,0.35)' },
  startBtnDisabled: { opacity: 0.4, boxShadow: 'none' },

  sessionWrap: { maxWidth: 600, margin: '0 auto', padding: '36px 24px' },
  sessionTop: { marginBottom: 24 },
  sessionProgress: { fontSize: 14, fontWeight: 700, color: PURPLE, display: 'block', marginBottom: 8 },
  progressBar: { height: 6, background: '#E5E7EB', borderRadius: 4 },
  progressFill: { height: 6, background: PURPLE, borderRadius: 4, transition: 'width 0.3s' },

  flashCard: { background: '#fff', borderRadius: 20, padding: 36, minHeight: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', cursor: 'pointer', marginBottom: 24, textAlign: 'center' },
  questionCard: { background: '#fff', borderRadius: 20, padding: 28, minHeight: 140, display: 'flex', flexDirection: 'column', justifyContent: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', marginBottom: 16, borderLeft: `4px solid ${PURPLE}` },
  cardSide: { fontSize: 11, fontWeight: 800, color: '#9CA3AF', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 12 },
  cardText: { fontSize: 20, fontWeight: 700, color: '#1A1A2E', lineHeight: 1.4 },
  tapHint: { fontSize: 13, color: '#9CA3AF', marginTop: 16 },

  answerRow: { display: 'flex', gap: 12 },
  missedBtn: { flex: 1, padding: '16px 0', borderRadius: 14, background: '#FFF1F2', border: '2px solid #FECACA', color: RED, fontSize: 16, fontWeight: 800, cursor: 'pointer' },
  gotItBtn: { flex: 1, padding: '16px 0', borderRadius: 14, background: '#F0FFF4', border: '2px solid #86EFAC', color: GREEN, fontSize: 16, fontWeight: 800, cursor: 'pointer' },

  choicesList: { display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 },
  choiceBtn: { padding: '16px 18px', borderRadius: 12, border: '2px solid #E5E7EB', background: '#fff', fontSize: 15, fontWeight: 600, color: '#1A1A2E', cursor: 'pointer', textAlign: 'left', transition: 'all 0.1s' },
  choiceCorrect: { background: '#D1FAE5', borderColor: '#6EE7B7', color: '#065F46' },
  choiceWrong: { background: '#FEE2E2', borderColor: '#FCA5A5', color: '#991B1B' },
  nextBtn: { width: '100%', padding: '14px 0', borderRadius: 12, background: PURPLE, color: '#fff', fontSize: 15, fontWeight: 800, border: 'none', cursor: 'pointer' },

  doneWrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 40, textAlign: 'center' },
  doneEmoji: { fontSize: 64, marginBottom: 16 },
  doneTitle: { fontSize: 28, fontWeight: 900, color: '#1A1A2E', marginBottom: 8 },
  doneScore: { fontSize: 52, fontWeight: 900, color: PURPLE, marginBottom: 4 },
  donePct: { fontSize: 18, color: '#6B7280', marginBottom: 36 },
  doneBtns: { display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 320 },
  restartBtn: { padding: '14px 0', borderRadius: 12, background: PURPLE, color: '#fff', fontSize: 15, fontWeight: 800, border: 'none', cursor: 'pointer' },
  wrongBtn: { padding: '14px 0', borderRadius: 12, background: '#1E1B4B', color: '#fff', fontSize: 15, fontWeight: 800, border: 'none', cursor: 'pointer' },
};
