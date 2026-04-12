import { useState } from 'react';
import { getApiKey, saveApiKey } from '../lib/claude';

export default function ApiKeyBanner({ onKey }) {
  const [input, setInput] = useState('');
  const [saved, setSaved] = useState(!!getApiKey());

  function handleSave() {
    const t = input.trim();
    if (!t.startsWith('sk-ant-')) { alert('Anthropic API keys start with "sk-ant-"'); return; }
    saveApiKey(t);
    setSaved(true);
    setInput('');
    onKey?.(t);
  }

  if (saved) {
    return (
      <div style={s.saved}>
        <span>🔑 API key saved</span>
        <button style={s.change} onClick={() => setSaved(false)}>Change</button>
      </div>
    );
  }

  return (
    <div style={s.banner}>
      <p style={s.title}>🔑 Anthropic API Key required</p>
      <p style={s.sub}>Get a free key at <strong>console.anthropic.com</strong> — stored in your browser only.</p>
      <div style={s.row}>
        <input style={s.input} type="password" placeholder="sk-ant-..." value={input} onChange={e => setInput(e.target.value)} />
        <button style={s.btn} onClick={handleSave}>Save</button>
      </div>
    </div>
  );
}

const s = {
  banner: { background: '#EEF2FF', border: '1.5px solid #C7D2FE', borderRadius: 14, padding: '16px 20px', marginBottom: 24 },
  title: { fontSize: 15, fontWeight: 800, color: '#3730A3', marginBottom: 4 },
  sub: { fontSize: 13, color: '#6B7280', marginBottom: 12 },
  row: { display: 'flex', gap: 10 },
  input: { flex: 1, padding: '10px 14px', borderRadius: 10, border: '1.5px solid #C7D2FE', fontSize: 14, background: '#fff' },
  btn: { padding: '10px 20px', borderRadius: 10, background: '#5B4FE9', color: '#fff', fontSize: 14, fontWeight: 700 },
  saved: { display: 'flex', alignItems: 'center', gap: 12, background: '#F0FDF4', border: '1.5px solid #86EFAC', borderRadius: 12, padding: '10px 16px', marginBottom: 24, fontSize: 14, fontWeight: 600, color: '#15803D' },
  change: { fontSize: 13, fontWeight: 700, color: '#5B4FE9', background: 'transparent', border: 'none', cursor: 'pointer', marginLeft: 'auto' },
};
