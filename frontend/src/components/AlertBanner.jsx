import React from 'react';

export default function AlertBanner({ alerts, onSelectProcess }) {
  if (!alerts || alerts.length === 0) return null;

  return (
    <div style={{
      margin: '16px 24px 0 24px',
      padding: '16px',
      borderRadius: '12px',
      background: 'linear-gradient(135deg, rgba(255, 23, 68, 0.12) 0%, rgba(255, 171, 0, 0.06) 100%)',
      border: '1px solid rgba(255, 23, 68, 0.35)',
      boxShadow: '0 8px 32px rgba(255, 23, 68, 0.12)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '1.2rem' }}>🚨</span>
          <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--accent-rose)', letterSpacing: '0.02em' }}>
            CRITICAL ANOMALIES DETECTED ({alerts.length})
          </h2>
        </div>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Real-time heuristic evaluation
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {alerts.map((alert) => (
          <div
            key={alert.id || alert.pid}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              borderRadius: '8px',
              background: 'rgba(10, 15, 28, 0.65)',
              border: `1px solid ${alert.severity === 'CRITICAL' ? 'rgba(255, 23, 68, 0.3)' : 'rgba(255, 171, 0, 0.3)'}`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '4px',
                background: alert.severity === 'CRITICAL' ? 'rgba(255, 23, 68, 0.2)' : 'rgba(255, 171, 0, 0.2)',
                color: alert.severity === 'CRITICAL' ? 'var(--accent-rose)' : 'var(--accent-amber)',
                border: `1px solid ${alert.severity === 'CRITICAL' ? 'rgba(255, 23, 68, 0.5)' : 'rgba(255, 171, 0, 0.5)'}`,
              }}>
                {alert.type}
              </span>
              <span className="mono" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                {alert.name} <span style={{ color: 'var(--text-dim)' }}>(PID {alert.pid})</span>
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {alert.message}
              </span>
            </div>

            <button
              className="btn btn-primary"
              style={{ padding: '4px 12px', fontSize: '0.75rem' }}
              onClick={() => onSelectProcess({ pid: alert.pid, name: alert.name })}
            >
              🩺 Diagnose
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
