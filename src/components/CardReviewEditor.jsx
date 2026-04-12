// Shared review/edit UI after AI generates cards — used by Generate and Paste pages
export default function CardReviewEditor({ cards, onChange, onRemove }) {
  return (
    <div style={s.list}>
      {cards.map((card, i) => (
        <div key={card._id} style={s.card}>
          <div style={s.cardTop}>
            <span style={s.num}>Card {i + 1}</span>
            <button style={s.remove} onClick={() => onRemove(card._id)}>✕ Remove</button>
          </div>
          <div style={s.fields}>
            <div style={s.field}>
              <label style={s.label}>QUESTION</label>
              <textarea style={s.ta} value={card.front} rows={2} onChange={e => onChange(card._id, 'front', e.target.value)} />
            </div>
            <div style={s.field}>
              <label style={s.label}>ANSWER</label>
              <textarea style={s.ta} value={card.back} rows={2} onChange={e => onChange(card._id, 'back', e.target.value)} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

const s = {
  list: { display: 'flex', flexDirection: 'column', gap: 12 },
  card: { background: '#fff', borderRadius: 14, padding: 18, border: '1.5px solid #E5E7EB', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' },
  cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  num: { fontSize: 12, fontWeight: 800, color: '#5B4FE9', textTransform: 'uppercase', letterSpacing: '0.5px' },
  remove: { fontSize: 12, fontWeight: 700, color: '#EF4444', background: 'transparent', border: 'none', cursor: 'pointer' },
  fields: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  field: { display: 'flex', flexDirection: 'column', gap: 5 },
  label: { fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px' },
  ta: { padding: '10px 12px', borderRadius: 8, border: '1.5px solid #E5E7EB', fontSize: 14, color: '#1A1A2E', resize: 'vertical', background: '#F9FAFB', lineHeight: 1.5, fontFamily: 'inherit' },
};
