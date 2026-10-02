import React, { useState, useEffect } from 'react';

export default function DoctorDrawer({ processSummary, onClose, onTriggerRemediate }) {
  const [details, setDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [diagnosis, setDiagnosis] = useState(null);
  const [diagnosing, setDiagnosing] = useState(false);

  useEffect(() => {
    if (!processSummary?.pid) return;

    let isMounted = true;
    setLoadingDetails(true);
    setDetails(null);
    setDiagnosis(null);

    // Fetch deep inspection details
    fetch(`/api/processes/${processSummary.pid}/inspect`)
      .then((res) => (res.ok ? res.json() : { error: 'Failed loading details' }))
      .then((data) => {
        if (isMounted) {
          setDetails(data);
          setLoadingDetails(false);
          // Automatically run initial diagnosis
          runDiagnosis(processSummary, data);
        }
      })
      .catch(() => {
        if (isMounted) setLoadingDetails(false);
      });

    return () => {
      isMounted = false;
    };
  }, [processSummary?.pid]);

  const runDiagnosis = (proc, deepDetails) => {
    setDiagnosing(true);
    const payload = {
      pid: proc.pid,
      name: proc.name,
      cpu_percent: proc.cpu_percent,
      ram_mb: proc.ram_mb,
      threads: proc.threads,
      handles: proc.handles,
      is_hung: deepDetails?.is_hung || proc.is_hung,
      anomalies: proc.anomalies ? proc.anomalies.map((t) => ({ type: t })) : [],
      cmdline: deepDetails?.cmdline,
      exe: deepDetails?.exe,
    };

    fetch('/api/doctor/diagnose', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then((res) => res.json())
      .then((data) => {
        setDiagnosis(data);
        setDiagnosing(false);
      })
      .catch(() => {
        setDiagnosing(false);
      });
  };

  if (!processSummary) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(5, 8, 15, 0.65)',
        backdropFilter: 'blur(6px)',
        zIndex: 900,
        display: 'flex',
        justifyContent: 'flex-end',
      }}
      onClick={onClose}
    >
      <div
        className="drawer-slide"
        style={{
          width: '540px',
          maxWidth: '100%',
          height: '100%',
          background: 'var(--bg-base)',
          borderLeft: '1px solid var(--border-subtle)',
          boxShadow: '-8px 0 32px rgba(0, 0, 0, 0.6)',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          padding: '24px',
          gap: '20px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.4rem' }}>🩺</span>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>AI Doctor Diagnosis</h2>
            </div>
            <p className="mono" style={{ fontSize: '0.85rem', color: 'var(--accent-cyan)' }}>
              {processSummary.name} (PID: {processSummary.pid})
            </p>
          </div>
          <button className="btn btn-secondary" onClick={onClose} style={{ padding: '4px 10px' }}>
            ✕ Close
          </button>
        </div>

        {/* AI Doctor Diagnosis Card */}
        <div
          className="glass-card"
          style={{
            padding: '18px',
            border: '1px solid rgba(179, 136, 255, 0.3)',
            background: 'linear-gradient(135deg, rgba(179, 136, 255, 0.08) 0%, rgba(0, 240, 255, 0.04) 100%)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-purple)', letterSpacing: '0.05em' }}>
              EXPERT TRIAGE ASSESSMENT
            </span>
            {diagnosing ? (
              <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)' }}>Thinking...</span>
            ) : diagnosis ? (
              <span style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '4px',
                background: diagnosis.severity === 'CRITICAL' ? 'rgba(255, 23, 68, 0.2)' : 'rgba(0, 230, 118, 0.2)',
                color: diagnosis.severity === 'CRITICAL' ? 'var(--accent-rose)' : 'var(--accent-green)',
                border: `1px solid ${diagnosis.severity === 'CRITICAL' ? 'rgba(255, 23, 68, 0.4)' : 'rgba(0, 230, 118, 0.4)'}`,
              }}>
                {diagnosis.severity}
              </span>
            ) : null}
          </div>

          {diagnosing ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Synthesizing telemetric metrics and thread state...</p>
          ) : diagnosis ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Root Cause:</span>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginTop: '2px', lineHeight: 1.4 }}>
                  {diagnosis.root_cause}
                </p>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Recommended Strategy:</span>
                <p style={{ fontSize: '0.85rem', color: 'var(--accent-cyan)', marginTop: '2px' }}>
                  {diagnosis.recommended_action} — {diagnosis.rationale}
                </p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                <span>Engine: {diagnosis.provider}</span>
                <span>Confidence: {(diagnosis.confidence * 100).toFixed(0)}%</span>
              </div>
            </div>
          ) : (
            <button className="btn btn-primary" onClick={() => runDiagnosis(processSummary, details)}>
              Run Doctor Diagnosis
            </button>
          )}
        </div>

        {/* Supervised Remediation Actions */}
        <div className="glass-card" style={{ padding: '18px' }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '12px', letterSpacing: '0.05em' }}>
            SUPERVISED REMEDIATION
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <button
              className="btn btn-warning"
              onClick={() => onTriggerRemediate(processSummary, 'SUSPEND', details)}
            >
              ⏸️ Suspend
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => onTriggerRemediate(processSummary, 'RESUME', details)}
            >
              ▶️ Resume
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => onTriggerRemediate(processSummary, 'GRACEFUL_CLOSE', details)}
            >
              🚪 Graceful Close
            </button>
            <button
              className="btn btn-danger"
              onClick={() => onTriggerRemediate(processSummary, 'FORCE_KILL', details)}
            >
              ⛔ Force Kill
            </button>
            <button
              className="btn btn-secondary"
              style={{ gridColumn: 'span 2' }}
              onClick={() => onTriggerRemediate(processSummary, 'SET_PRIORITY', details, 'IDLE')}
            >
              📉 Demote Priority to IDLE
            </button>
          </div>
        </div>

        {/* Deep Telemetry Metadata */}
        <div className="glass-card" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
            WIN32 PROCESS INTERNALS
          </h3>

          {loadingDetails ? (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Loading process inspect data...</p>
          ) : details ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem' }}>
              <div>
                <span style={{ color: 'var(--text-dim)' }}>Executable Path: </span>
                <span className="mono" style={{ color: 'var(--text-main)', wordBreak: 'break-all' }}>
                  {details.exe || 'N/A'}
                </span>
              </div>
              <div>
                <span style={{ color: 'var(--text-dim)' }}>Command Line: </span>
                <span className="mono" style={{ color: 'var(--text-main)', wordBreak: 'break-all' }}>
                  {details.cmdline || 'N/A'}
                </span>
              </div>
              <div>
                <span style={{ color: 'var(--text-dim)' }}>Parent Process: </span>
                <span className="mono" style={{ color: 'var(--text-main)' }}>
                  {details.parent ? `${details.parent.name} (PID ${details.parent.pid})` : 'None / Exited'}
                </span>
              </div>
              <div>
                <span style={{ color: 'var(--text-dim)' }}>GUI Message Queue: </span>
                <span style={{ color: details.is_hung ? 'var(--accent-rose)' : 'var(--accent-green)', fontWeight: 600 }}>
                  {details.is_hung ? '❄️ Hung / Unresponsive (>5s)' : '● Responsive'}
                </span>
              </div>
              {details.connections && details.connections.length > 0 && (
                <div>
                  <span style={{ color: 'var(--text-dim)' }}>Network Sockets: </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '4px' }}>
                    {details.connections.map((c, i) => (
                      <span key={i} className="mono" style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)' }}>
                        {c.laddr} ➔ {c.raddr || '*'} [{c.status}]
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
