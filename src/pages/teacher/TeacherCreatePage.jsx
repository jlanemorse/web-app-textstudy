import { useNavigate } from 'react-router-dom';

const OPTIONS = [
  { id: 'generate', emoji: '🤖', label: 'AI Generate', sub: 'Let AI make cards from a topic or text' },
  { id: 'paste',    emoji: '📋', label: 'Paste Text',  sub: 'Paste notes and generate cards instantly' },
  { id: 'quizlet',  emoji: '🌐', label: 'Quizlet Import', sub: 'Paste a Quizlet link to import a set' },
  { id: 'presets',  emoji: '📦', label: 'Preset Decks', sub: 'Add a ready-made deck instantly' },
];

export default function TeacherCreatePage() {
  const navigate = useNavigate();

  return (
    <div style={s.page}>
      <h1 style={s.title}>Create Decks</h1>
      <p style={s.sub}>Choose how you want to build your deck</p>
      <div style={s.grid}>
        {OPTIONS.map(opt => (
          <button key={opt.id} className="ts-card" style={s.card} onClick={() => navigate(`/teacher/create/${opt.id}`)}>
            <span style={s.emoji}>{opt.emoji}</span>
            <p style={s.label}>{opt.label}</p>
            <p style={s.optSub}>{opt.sub}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

const s = {
  page: { maxWidth: 800, margin: '0 auto', padding: '36px 24px' },
  title: { fontSize: 28, fontWeight: 900, color: '#fff', marginBottom: 6, textShadow: '0 2px 12px rgba(0,0,0,0.3)' },
  sub: { fontSize: 14, color: 'rgba(196,181,253,0.8)', marginBottom: 32 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 },
  card: {
    background: '#fff', borderRadius: 18, padding: 28, textAlign: 'left',
    border: '1.5px solid #E5E7EB', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    display: 'flex', flexDirection: 'column', gap: 6,
    transition: 'box-shadow 0.15s',
  },
  emoji: { fontSize: 32, marginBottom: 4 },
  label: { fontSize: 16, fontWeight: 800, color: '#1A1A2E' },
  optSub: { fontSize: 13, color: '#9CA3AF', lineHeight: 1.4 },
};
