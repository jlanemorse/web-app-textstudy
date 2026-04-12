import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';

function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5); }

function buildAcsDeck(cards) {
  const deck = [];
  for (const card of cards) {
    const score = card.acs_score ?? 0;
    const slots = score >= 2 ? 1 : score >= 0 ? 2 : 3;
    for (let i = 0; i < slots; i++) deck.push(card);
  }
  return shuffle(deck);
}

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

async function updateCardScore(cardId, correct, speedTier = null) {
  const { data } = await supabase.from('cards').select('acs_score, times_correct, times_incorrect').eq('id', cardId).single();
  if (!data) return;
  const scoreChange = correct ? (speedTier === 'fast' ? 2 : 1) : -1;
  await supabase.from('cards').update({
    acs_score: (data.acs_score ?? 0) + scoreChange,
    times_correct: (data.times_correct ?? 0) + (correct ? 1 : 0),
    times_incorrect: (data.times_incorrect ?? 0) + (correct ? 0 : 1),
  }).eq('id', cardId);
}

// ── Progress dots ─────────────────────────────────────────────────────────────
function ProgressDots({ results, total }) {
  const dots = Array.from({ length: total }, (_, i) => results[i] ?? 'pending');
  const maxVisible = 40;
  const visible = dots.slice(0, maxVisible);
  return (
    <div style={pd.wrap}>
      {visible.map((r, i) => (
        <div key={i} style={{ ...pd.dot, background: r === 'correct' ? '#22C55E' : r === 'wrong' ? '#EF4444' : '#E5E7EB' }} />
      ))}
      {total > maxVisible && <span style={pd.more}>+{total - maxVisible}</span>}
    </div>
  );
}
const pd = {
  wrap: { display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 16 },
  dot: { width: 10, height: 10, borderRadius: 3 },
  more: { fontSize: 11, color: '#9CA3AF', alignSelf: 'center' },
};

// ── Deck picker ───────────────────────────────────────────────────────────────
function DeckPicker({ onStart, pausedSession, onResume, onWrongReviewFromPaused, onTogglePausedAcs }) {
  const [decks, setDecks] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [mode, setMode] = useState('chill');
  const [format, setFormat] = useState('flip');
  const [acsEnabled, setAcsEnabled] = useState(false);
  const [cardOrder, setCardOrder] = useState('random');

  useEffect(() => {
    supabase.from('decks').select('id, name, cards(count)').order('created_at', { ascending: false }).then(({ data }) => setDecks(data ?? []));
  }, []);

  return (
    <div style={s.page}>
      <h1 style={s.title}>🎮 Study</h1>
      <p style={s.sub}>Pick a deck and a mode to start studying.</p>

      {pausedSession && (
        <div style={s.resumeCard}>
          <div style={s.resumeTop}>
            <div>
              <p style={s.resumeTitle}>📌 Session In Progress</p>
              <p style={s.resumeDeck}>{pausedSession.deckName}</p>
              <p style={s.resumeMeta}>{pausedSession.mode === 'chill' ? '🃏 Chill' : '⚡ Power'} · {pausedSession.format === 'flip' ? 'Know/Don\'t Know' : 'Multiple Choice'}</p>
            </div>
            <div style={s.resumeScore}>
              <p style={s.resumeScoreNum}>{pausedSession.results.filter(r => r === 'correct').length} / {pausedSession.results.length}</p>
              <p style={s.resumeScoreLabel}>answered</p>
            </div>
          </div>
          <ProgressDots results={pausedSession.results} total={pausedSession.cards.length} />
          <div style={s.resumeAcsRow}>
            <span style={s.resumeAcsLabel}>Adaptive Card Selection</span>
            <div style={{ ...s.acsToggle, background: pausedSession.acsEnabled ? '#5B4FE9' : '#4B5563' }} onClick={onTogglePausedAcs}>
              <div style={{ ...s.acsThumb, transform: pausedSession.acsEnabled ? 'translateX(22px)' : 'translateX(2px)' }} />
            </div>
          </div>
          <div style={s.resumeBtns}>
            {pausedSession.wrongIds?.length > 0 && (
              <button style={s.resumeWrongBtn} onClick={onWrongReviewFromPaused}>
                📋 Wrong Answer Review ({pausedSession.wrongIds.length})
              </button>
            )}
            <button style={s.resumeBtn} onClick={onResume}>Resume Session →</button>
          </div>
        </div>
      )}

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
          <button style={{ ...s.modeBtn, ...(mode === 'chill' ? s.modeBtnActive : {}) }} onClick={() => setMode('chill')}>
            <span style={s.modeEmoji}>🃏</span>
            <span style={s.modeLabel}>Chill Study</span>
            <span style={s.modeSub}>Relaxed, go at your own pace</span>
          </button>
          <button style={{ ...s.modeBtn, ...(mode === 'power' ? s.modeBtnActive : {}) }} onClick={() => setMode('power')}>
            <span style={s.modeEmoji}>⚡</span>
            <span style={s.modeLabel}>Power Study</span>
            <span style={s.modeSub}>Timed — answer fast for bonus ACS points</span>
          </button>
        </div>
      </div>

      <div style={s.section}>
        <label style={s.label}>Question Format</label>
        <div style={s.formatRow}>
          <button style={{ ...s.formatBtn, ...(format === 'flip' ? s.formatBtnActive : {}) }} onClick={() => setFormat('flip')}>
            Know / Don't Know
          </button>
          <button style={{ ...s.formatBtn, ...(format === 'mc' ? s.formatBtnActive : {}) }} onClick={() => setFormat('mc')}>
            Multiple Choice
          </button>
        </div>
      </div>

      <div style={s.section}>
        <label style={s.label}>Card Order</label>
        <div style={s.formatRow}>
          <button style={{ ...s.formatBtn, ...(cardOrder === 'random' ? s.formatBtnActive : {}) }} onClick={() => setCardOrder('random')}>
            🔀 Random
          </button>
          <button style={{ ...s.formatBtn, ...(cardOrder === 'inorder' ? s.formatBtnActive : {}) }} onClick={() => setCardOrder('inorder')}>
            📋 In Order
          </button>
        </div>
      </div>

      <div style={s.acsRow}>
        <div>
          <p style={s.acsTitle}>Adaptive Card Selection</p>
          <p style={s.acsSub}>Shows cards you get wrong more often</p>
        </div>
        <div style={{ ...s.acsToggle, background: acsEnabled ? '#5B4FE9' : '#D1D5DB' }} onClick={() => setAcsEnabled(v => !v)}>
          <div style={{ ...s.acsThumb, transform: acsEnabled ? 'translateX(22px)' : 'translateX(2px)' }} />
        </div>
      </div>

      <button style={{ ...s.startBtn, ...(!selectedId ? s.startBtnDisabled : {}) }} onClick={() => {
        const deck = decks.find(d => d.id === selectedId);
        onStart(selectedId, deck?.name ?? '', mode, format, acsEnabled, cardOrder);
      }} disabled={!selectedId}>
        Start Studying
      </button>
    </div>
  );
}

// ── Chill Study session ───────────────────────────────────────────────────────
function ChillSession({ cards, allCards, format, onDone, onBack, initialState }) {
  const [idx, setIdx] = useState(initialState?.idx ?? 0);
  const [flipped, setFlipped] = useState(false);
  const [choices, setChoices] = useState(() => format === 'mc' ? buildChoices(cards[initialState?.idx ?? 0], allCards) : null);
  const [selected, setSelected] = useState(null);
  const [correctCount, setCorrectCount] = useState(initialState?.correctCount ?? 0);
  const [wrongIds, setWrongIds] = useState(initialState?.wrongIds ?? []);
  const [results, setResults] = useState(initialState?.results ?? []);

  const card = cards[idx];

  function advance(newWrongIds, newCorrect) {
    if (idx + 1 >= cards.length) {
      onDone({ correctCount: newCorrect, total: cards.length, wrongIds: newWrongIds, allCards });
    } else {
      setIdx(i => i + 1);
      setFlipped(false);
      setSelected(null);
      if (format === 'mc') setChoices(buildChoices(cards[idx + 1], allCards));
    }
  }

  async function handleFlipAnswer(correct) {
    await updateCardScore(card.id, correct);
    const newWrongIds = !correct && !wrongIds.includes(card.id) ? [...wrongIds, card.id] : wrongIds;
    const newCorrect = correctCount + (correct ? 1 : 0);
    const newResults = [...results, correct ? 'correct' : 'wrong'];
    if (!correct) setWrongIds(newWrongIds);
    if (correct) setCorrectCount(newCorrect);
    setResults(newResults);
    advance(newWrongIds, newCorrect);
  }

  async function handleMCSelect(choice) {
    if (selected) return;
    setSelected(choice.id);
    const correct = choice.correct;
    await updateCardScore(card.id, correct);
    const newWrongIds = !correct && !wrongIds.includes(card.id) ? [...wrongIds, card.id] : wrongIds;
    const newCorrect = correctCount + (correct ? 1 : 0);
    const newResults = [...results, correct ? 'correct' : 'wrong'];
    if (!correct) setWrongIds(newWrongIds);
    if (correct) setCorrectCount(newCorrect);
    setResults(newResults);
  }

  function handleNext() {
    if (idx + 1 >= cards.length) {
      onDone({ correctCount, total: cards.length, wrongIds, allCards });
      return;
    }
    setIdx(i => i + 1);
    setSelected(null);
    setChoices(buildChoices(cards[idx + 1], allCards));
  }

  return (
    <div style={s.sessionWrap}>
      <div style={s.sessionHeader}>
        <button style={s.backBtn} onClick={() => { if (window.confirm('Leave this session?')) onBack({ idx, correctCount, wrongIds, results }); }}>← Back</button>
        <span style={s.sessionProgress}>{idx + 1} / {cards.length}</span>
      </div>
      <ProgressDots results={results} total={cards.length} />
      <div style={s.progressBar}><div style={{ ...s.progressFill, width: `${(idx / cards.length) * 100}%` }} /></div>

      {format === 'flip' ? (
        <>
          <div style={{ ...s.flashCard, marginTop: 20 }} onClick={() => !flipped && setFlipped(true)}>
            <p style={s.cardSide}>{flipped ? 'ANSWER' : 'QUESTION'}</p>
            <p style={s.cardText}>{flipped ? card.back : card.front}</p>
            {!flipped && <p style={s.tapHint}>Click to reveal answer</p>}
          </div>
          {flipped && (
            <div style={s.answerRow}>
              <button style={s.missedBtn} onClick={() => handleFlipAnswer(false)}>✗ Don't Know</button>
              <button style={s.gotItBtn} onClick={() => handleFlipAnswer(true)}>✓ Know It</button>
            </div>
          )}
        </>
      ) : (
        <>
          <div style={{ ...s.questionCard, marginTop: 20 }}>
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
                return <button key={choice.id} style={style} onClick={() => handleMCSelect(choice)}>{choice.text}</button>;
              })}
            </div>
          ) : <p style={{ color: '#9CA3AF', textAlign: 'center' }}>Need at least 4 cards for multiple choice.</p>}
          {selected && <button style={s.nextBtn} onClick={handleNext}>{idx + 1 < cards.length ? 'Next →' : 'Finish'}</button>}
        </>
      )}
    </div>
  );
}

// ── Power Study session ───────────────────────────────────────────────────────
const POWER_TIME = 5;

function PowerSession({ cards, allCards, format, onDone, onBack, initialState }) {
  const [idx, setIdx] = useState(initialState?.idx ?? 0);
  const [flipped, setFlipped] = useState(false);
  const [choices, setChoices] = useState(() => format === 'mc' ? buildChoices(cards[initialState?.idx ?? 0], allCards) : null);
  const [selected, setSelected] = useState(null);
  const [timeLeft, setTimeLeft] = useState(POWER_TIME);
  const [correctCount, setCorrectCount] = useState(initialState?.correctCount ?? 0);
  const [wrongIds, setWrongIds] = useState(initialState?.wrongIds ?? []);
  const [results, setResults] = useState(initialState?.results ?? []);
  const timerRef = useRef(null);
  const startTimeRef = useRef(Date.now());

  useEffect(() => {
    startTimeRef.current = Date.now();
    setTimeLeft(POWER_TIME);
    setTimerRunning(true);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 0.1) { clearInterval(timerRef.current); return 0; }
        return +(t - 0.1).toFixed(1);
      });
    }, 100);
    return () => clearInterval(timerRef.current);
  }, [idx]);

  useEffect(() => {
    if (timeLeft === 0 && selected === null && !flipped) handleAnswer(null);
  }, [timeLeft]);

  function speedTier() {
    const elapsed = (Date.now() - startTimeRef.current) / 1000;
    if (elapsed < 2) return 'fast';
    if (elapsed < 4) return 'medium';
    return 'slow';
  }

  function handleFlip() {
    if (flipped) return;
    clearInterval(timerRef.current);
    setTimerRunning(false);
    setFlipped(true);
  }

  async function handleAnswer(choice) {
    if (selected !== null) return;
    clearInterval(timerRef.current);
    const correct = choice?.correct ?? false;
    const tier = correct ? speedTier() : null;
    const choiceId = choice?.id ?? 'timeout';
    setSelected(choiceId);
    await updateCardScore(cards[idx].id, correct, tier);
    const newWrongIds = !correct && !wrongIds.includes(cards[idx].id) ? [...wrongIds, cards[idx].id] : wrongIds;
    const newCorrect = correctCount + (correct ? 1 : 0);
    const newResults = [...results, correct ? 'correct' : 'wrong'];
    if (!correct) setWrongIds(newWrongIds);
    if (correct) setCorrectCount(newCorrect);
    setResults(newResults);

    setTimeout(() => {
      if (idx + 1 >= cards.length) {
        onDone({ correctCount: newCorrect, total: cards.length, wrongIds: newWrongIds, allCards });
        return;
      }
      setIdx(i => i + 1);
      setFlipped(false);
      setSelected(null);
      if (format === 'mc') setChoices(buildChoices(cards[idx + 1], allCards));
    }, 1000);
  }

  const timerPct = (timeLeft / POWER_TIME) * 100;
  const timerColor = timeLeft > 3 ? '#22C55E' : timeLeft > 1.5 ? '#F59E0B' : '#EF4444';
  const card = cards[idx];

  return (
    <div style={s.sessionWrap}>
      <div style={s.sessionHeader}>
        <button style={s.backBtn} onClick={() => { if (window.confirm('Leave this session?')) onBack({ idx, correctCount, wrongIds, results }); }}>← Back</button>
        <div style={s.powerTopRight}>
          <span style={{ ...s.timerText, color: timerColor }}>⚡ {timeLeft.toFixed(1)}s</span>
          <span style={s.sessionProgress}>{idx + 1} / {cards.length}</span>
        </div>
      </div>
      <ProgressDots results={results} total={cards.length} />
      <div style={s.progressBar}><div style={{ ...s.progressFill, width: `${(idx / cards.length) * 100}%` }} /></div>
      <div style={{ ...s.timerBar, marginTop: 6 }}><div style={{ ...s.timerFill, width: `${timerPct}%`, background: timerColor }} /></div>

      {format === 'flip' ? (
        <>
          <div style={{ ...s.flashCard, marginTop: 16 }} onClick={handleFlip}>
            <p style={s.cardSide}>{flipped ? 'ANSWER' : 'QUESTION'}</p>
            <p style={s.cardText}>{flipped ? card.back : card.front}</p>
            {!flipped && <p style={s.tapHint}>Click to reveal — timer stops on flip</p>}
          </div>
          {flipped && selected === null && (
            <div style={s.answerRow}>
              <button style={s.missedBtn} onClick={() => handleAnswer(null)}>✗ Don't Know</button>
              <button style={s.gotItBtn} onClick={() => handleAnswer({ correct: true })}>✓ Know It</button>
            </div>
          )}
          {selected !== null && (
            <p style={{ textAlign: 'center', fontSize: 13, color: '#9CA3AF', marginTop: 12 }}>
              {selected !== 'timeout' && choices?.find?.(c => c.correct && c.id === selected)
                ? (speedTier() === 'fast' ? '⚡ Fast! +2 points' : '✓ Correct! +1 point')
                : selected === 'timeout' ? "⏰ Time's up! -1 point" : '✗ Wrong. -1 point'}
            </p>
          )}
        </>
      ) : (
        <>
          <div style={{ ...s.questionCard, marginTop: 16 }}>
            <p style={s.cardSide}>QUESTION</p>
            <p style={s.cardText}>{card.front}</p>
          </div>
          {choices ? (
            <div style={s.choicesList}>
              {choices.map(choice => {
                let style = s.choiceBtn;
                if (selected !== null) {
                  if (choice.correct) style = { ...s.choiceBtn, ...s.choiceCorrect };
                  else if (choice.id === selected) style = { ...s.choiceBtn, ...s.choiceWrong };
                  else style = { ...s.choiceBtn, opacity: 0.4 };
                }
                return (
                  <button key={choice.id} style={style} onClick={() => handleAnswer(choice)} disabled={selected !== null}>
                    {choice.text}
                  </button>
                );
              })}
            </div>
          ) : <p style={{ color: '#9CA3AF', textAlign: 'center' }}>Need at least 4 cards for multiple choice.</p>}
          {selected !== null && (
            <p style={{ textAlign: 'center', fontSize: 13, color: '#9CA3AF', marginTop: 8 }}>
              {choices?.find(c => c.correct && c.id === selected)
                ? (speedTier() === 'fast' ? '⚡ Fast! +2 points' : '✓ Correct! +1 point')
                : selected === 'timeout' ? "⏰ Time's up! -1 point" : '✗ Wrong. -1 point'}
            </p>
          )}
        </>
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
  const [results, setResults] = useState([]);
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
      <div style={s.sessionHeader}>
        <span style={{ ...s.sessionProgress, color: '#EF4444' }}>Wrong Answer Review</span>
        <span style={{ ...s.sessionProgress, color: '#EF4444' }}>{idx + 1} / {cards.length}</span>
      </div>
      <ProgressDots results={results} total={cards.length} />
      <div style={{ ...s.progressBar, background: '#FECACA' }}><div style={{ ...s.progressFill, width: `${(idx / cards.length) * 100}%`, background: '#EF4444' }} /></div>
      <div style={{ ...s.questionCard, marginTop: 16, borderLeftColor: '#EF4444' }}>
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
            return (
              <button key={choice.id} style={style} onClick={() => {
                if (!selected) {
                  setSelected(choice.id);
                  setResults(r => [...r, choice.correct ? 'correct' : 'wrong']);
                }
              }}>{choice.text}</button>
            );
          })}
        </div>
      ) : <p style={{ color: '#9CA3AF', textAlign: 'center', marginTop: 20 }}>Not enough cards for choices.</p>}
      {selected && <button style={{ ...s.nextBtn, background: '#EF4444' }} onClick={handleNext}>{idx + 1 < cards.length ? 'Next →' : 'Finish'}</button>}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function StudyPage() {
  const [phase, setPhase] = useState('pick');
  const [sessionCards, setSessionCards] = useState([]);
  const [allCards, setAllCards] = useState([]);
  const [mode, setMode] = useState('chill');
  const [format, setFormat] = useState('flip');
  const [result, setResult] = useState(null);
  const [pausedSession, setPausedSession] = useState(null);
  const [resumeState, setResumeState] = useState(null);
  const [deckName, setDeckName] = useState('');
  const [acsEnabled, setAcsEnabled] = useState(false);

  async function handleStart(deckId, selectedDeckName, selectedMode, selectedFormat, acs, cardOrder) {
    const { data } = await supabase.from('cards').select('*').eq('deck_id', deckId).order('created_at');
    if (!data?.length) { alert('This deck has no cards yet.'); return; }
    const cards = acs ? buildAcsDeck(data) : cardOrder === 'inorder' ? data : shuffle(data);
    setAllCards(data);
    setSessionCards(cards);
    setMode(selectedMode);
    setFormat(selectedFormat);
    setDeckName(selectedDeckName);
    setAcsEnabled(acs);
    setPausedSession(null);
    setResumeState(null);
    setPhase('session');
  }

  function handleBack(sessionState) {
    setPausedSession({ ...sessionState, cards: sessionCards, allCards, mode, format, deckName, acsEnabled });
    setResumeState(sessionState);
    setPhase('pick');
  }

  function handleResume() { setPhase('session'); }

  function handleWrongReviewFromPaused() {
    setResult({ wrongIds: pausedSession.wrongIds, allCards: pausedSession.allCards, correctCount: pausedSession.correctCount, total: pausedSession.cards.length });
    setPhase('wrong');
  }

  function handleTogglePausedAcs() {
    setPausedSession(prev => ({ ...prev, acsEnabled: !prev.acsEnabled }));
  }

  function handleDone(r) { setPausedSession(null); setResumeState(null); setResult(r); setPhase('done'); }

  if (phase === 'pick') return <DeckPicker onStart={handleStart} pausedSession={pausedSession} onResume={handleResume} onWrongReviewFromPaused={handleWrongReviewFromPaused} onTogglePausedAcs={handleTogglePausedAcs} />;
  if (phase === 'done') return <DoneScreen result={result} onRestart={() => setPhase('pick')} onWrongReview={() => setPhase('wrong')} />;
  if (phase === 'wrong') {
    const wrongCards = result.wrongIds.map(id => result.allCards.find(c => c.id === id)).filter(Boolean);
    return <WrongReview cards={wrongCards} allCards={result.allCards} onDone={() => setPhase('pick')} />;
  }
  if (mode === 'chill') return <ChillSession cards={sessionCards} allCards={allCards} format={format} onDone={handleDone} onBack={handleBack} initialState={resumeState} />;
  return <PowerSession cards={sessionCards} allCards={allCards} format={format} onDone={handleDone} onBack={handleBack} initialState={resumeState} />;
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

  formatRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  formatBtn: { padding: '12px 0', borderRadius: 12, border: '1.5px solid #E5E7EB', background: '#fff', fontSize: 14, fontWeight: 700, color: '#374151', cursor: 'pointer' },
  formatBtnActive: { borderColor: PURPLE, background: '#EEF2FF', color: PURPLE },

  acsRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', borderRadius: 14, padding: '16px 18px', marginBottom: 20, border: '1.5px solid #E5E7EB' },
  acsTitle: { fontSize: 14, fontWeight: 700, color: '#1A1A2E', marginBottom: 2 },
  acsSub: { fontSize: 12, color: '#9CA3AF' },
  acsToggle: { width: 48, height: 26, borderRadius: 13, cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 },
  acsThumb: { position: 'absolute', top: 3, width: 20, height: 20, borderRadius: 10, background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.2)', transition: 'transform 0.2s' },

  startBtn: { width: '100%', padding: '16px 0', borderRadius: 14, background: PURPLE, color: '#fff', fontSize: 16, fontWeight: 800, border: 'none', cursor: 'pointer', boxShadow: '0 4px 16px rgba(91,79,233,0.35)' },
  startBtnDisabled: { opacity: 0.4, boxShadow: 'none' },

  resumeCard: { background: '#1A1A2E', borderRadius: 18, padding: '18px 20px', marginBottom: 24, border: '1.5px solid #5B4FE9' },
  resumeTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  resumeTitle: { fontSize: 12, fontWeight: 800, color: '#A5B4FC', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 4 },
  resumeDeck: { fontSize: 17, fontWeight: 800, color: '#fff', marginBottom: 2 },
  resumeMeta: { fontSize: 12, color: '#6B7280' },
  resumeScore: { textAlign: 'right' },
  resumeScoreNum: { fontSize: 22, fontWeight: 900, color: '#fff' },
  resumeScoreLabel: { fontSize: 11, color: '#6B7280' },
  resumeAcsRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  resumeAcsLabel: { fontSize: 12, fontWeight: 600, color: '#9CA3AF' },
  resumeBtns: { display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 },
  resumeBtn: { width: '100%', padding: '12px 0', borderRadius: 12, background: '#5B4FE9', color: '#fff', fontSize: 14, fontWeight: 800, border: 'none', cursor: 'pointer' },
  resumeWrongBtn: { width: '100%', padding: '12px 0', borderRadius: 12, background: '#7F1D1D', color: '#FCA5A5', fontSize: 14, fontWeight: 800, border: 'none', cursor: 'pointer' },

  sessionWrap: { maxWidth: 600, margin: '0 auto', padding: '24px 24px' },
  sessionHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  backBtn: { fontSize: 14, fontWeight: 700, color: PURPLE, background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px 0' },
  sessionProgress: { fontSize: 14, fontWeight: 700, color: PURPLE },
  powerTopRight: { display: 'flex', alignItems: 'center', gap: 16 },
  timerText: { fontSize: 16, fontWeight: 900 },

  progressBar: { height: 6, background: '#E5E7EB', borderRadius: 4 },
  progressFill: { height: 6, background: PURPLE, borderRadius: 4, transition: 'width 0.3s' },
  timerBar: { height: 5, background: '#E5E7EB', borderRadius: 4 },
  timerFill: { height: 5, borderRadius: 4, transition: 'width 0.1s linear' },

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
