import React, { useState } from 'react';

export default function RemediateModal({ pendingAction, onConfirm, onCancel }) {
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  if (!pendingAction) return null;

  const { proc, action, details, priority } = pendingAction;

  const handleExecute = async () => {
    setSubmitting(true);
    setFeedback(null);
    try {
      const payload = {
        pid: proc.pid,
        process_name: proc.name,
        action: action,
        priority: priority || 'NORMAL',
        expected_create_time: proc.create_time,
        user_confirmed: confirmed,
      };

      const res = await fetch('/api/doctor/remediate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setFeedback({ success: false, message: data.detail || 'Action failed.' });
      } else {
        setFeedback({ success: true, message: data.message || 'Action executed successfully.' });
        setTimeout(() => {
          onConfirm();
        }, 1200);
      }
    } catch (err) {
      setFeedback({ success: false, message: 'Network or server error.' });
    } finally {
      setSubmitting(false);
    }
  };

  const getActionColor = () => {
    if (action === 'FORCE_KILL') return 'var(--accent-rose)';
    if (action === 'SUSPEND') return 'var(--accent-amber)';
    return 'var(--accent-cyan)';
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div
        className="glass-card"
        style={{
          width: '460px',
          maxWidth: '90%',
          padding: '24px',
          background: 'var(--bg-base)',
          border: `1px solid ${getActionColor()}`,
          boxShadow: `0 0 32px rgba(0, 0, 0, 0.8)`,
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '1.5rem' }}>⚠️</span>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Confirm Supervised Action</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Security Guardrail Verification</p>
          </div>
        </div>

        <div style={{
          padding: '12px 16px',
          borderRadius: '8px',
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid var(--border-subtle)',
          fontSize: '0.85rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        }}>
          <div>
            <span style={{ color: 'var(--text-dim)' }}>Action: </span>
            <span className="mono" style={{ color: getActionColor(), fontWeight: 700 }}>
              {action} {priority ? `(${priority})` : ''}
            </span>
          </div>
          <div>
            <span style={{ color: 'var(--text-dim)' }}>Target Process: </span>
            <span className="mono" style={{ color: 'var(--text-main)', fontWeight: 600 }}>
              {proc.name} (PID: {proc.pid})
            </span>
          </div>
          {details?.exe && (
            <div>
              <span style={{ color: 'var(--text-dim)' }}>Path: </span>
              <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', wordBreak: 'break-all' }}>
                {details.exe}
              </span>
            </div>
          )}
        </div>

        {feedback && (
          <div style={{
            padding: '10px 14px',
            borderRadius: '6px',
            fontSize: '0.8rem',
            background: feedback.success ? 'rgba(0, 230, 118, 0.1)' : 'rgba(255, 23, 68, 0.1)',
            border: `1px solid ${feedback.success ? 'rgba(0, 230, 118, 0.3)' : 'rgba(255, 23, 68, 0.3)'}`,
            color: feedback.success ? 'var(--accent-green)' : 'var(--accent-rose)',
          }}>
            {feedback.message}
          </div>
        )}

        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', cursor: 'pointer', userSelect: 'none' }}>
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            style={{ width: '16px', height: '16px', accentColor: 'var(--accent-cyan)' }}
          />
          <span>I understand this will directly affect this running process.</span>
        </label>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
          <button className="btn btn-secondary" onClick={onCancel} disabled={submitting}>
            Cancel
          </button>
          <button
            className={`btn ${action === 'FORCE_KILL' ? 'btn-danger' : 'btn-primary'}`}
            disabled={!confirmed || submitting}
            onClick={handleExecute}
          >
            {submitting ? 'Executing...' : 'Confirm & Execute'}
          </button>
        </div>
      </div>
    </div>
  );
}
