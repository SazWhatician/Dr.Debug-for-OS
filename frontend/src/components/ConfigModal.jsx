import React, { useState, useEffect } from 'react';

export default function ConfigModal({ onClose }) {
  const [provider, setProvider] = useState('offline');
  const [geminiKey, setGeminiKey] = useState('');
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434');
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    fetch('/api/config')
      .then((res) => res.json())
      .then((data) => {
        if (data.provider) setProvider(data.provider);
        if (data.ollama_url) setOllamaUrl(data.ollama_url);
      })
      .catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setStatusMsg('');
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: provider,
          gemini_api_key: geminiKey,
          ollama_url: ollamaUrl,
        }),
      });
      if (res.ok) {
        setStatusMsg('Settings saved successfully!');
        setTimeout(onClose, 800);
      } else {
        setStatusMsg('Failed to save settings.');
      }
    } catch {
      setStatusMsg('Error communicating with backend.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="glass-card"
        style={{
          width: '460px',
          maxWidth: '90%',
          padding: '24px',
          background: 'var(--bg-base)',
          border: '1px solid var(--border-subtle)',
          boxShadow: '0 0 32px rgba(0, 0, 0, 0.8)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.25rem' }}>⚙️</span>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>AI Doctor Intelligence Settings</h3>
          </div>
          <button className="btn btn-secondary" onClick={onClose} style={{ padding: '4px 8px' }}>
            ✕
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.85rem' }}>
          <div>
            <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '6px' }}>Diagnostic Engine Mode</label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                background: 'rgba(10, 16, 30, 0.8)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-main)',
                fontFamily: 'var(--font-ui)',
                outline: 'none',
              }}
            >
              <option value="offline">Built-in Offline Heuristics (Fast, 100% Local, Zero Keys)</option>
              <option value="gemini">Google Gemini API (Cloud LLM Reasoning)</option>
              <option value="ollama">Local Ollama (Offline LLM Private Server)</option>
            </select>
          </div>

          {provider === 'gemini' && (
            <div>
              <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '6px' }}>Gemini API Key</label>
              <input
                type="password"
                placeholder="AIzaSy..."
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  background: 'rgba(10, 16, 30, 0.8)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-main)',
                  fontFamily: 'var(--font-mono)',
                  outline: 'none',
                }}
              />
            </div>
          )}

          {provider === 'ollama' && (
            <div>
              <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '6px' }}>Ollama Base URL</label>
              <input
                type="text"
                value={ollamaUrl}
                onChange={(e) => setOllamaUrl(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  background: 'rgba(10, 16, 30, 0.8)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-main)',
                  fontFamily: 'var(--font-mono)',
                  outline: 'none',
                }}
              />
            </div>
          )}
        </div>

        {statusMsg && (
          <div style={{ fontSize: '0.8rem', color: 'var(--accent-green)' }}>
            {statusMsg}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </div>
    </div>
  );
}
