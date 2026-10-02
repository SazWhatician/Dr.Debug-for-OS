import React from 'react';

export default function HeaderGauges({ telemetry, isConnected, onOpenConfig }) {
  const system = telemetry?.system || {};
  const cpuPercent = system.cpu_total_percent !== undefined ? system.cpu_total_percent : 0;
  const ramPercent = system.ram_percent !== undefined ? system.ram_percent : 0;
  const ramUsedGb = system.ram_used_bytes ? (system.ram_used_bytes / (1024 ** 3)).toFixed(1) : 0;
  const ramTotalGb = system.ram_total_bytes ? (system.ram_total_bytes / (1024 ** 3)).toFixed(1) : 0;
  const anomalyCount = telemetry?.anomaly_alerts?.length || 0;
  const totalProc = telemetry?.total_process_count || 0;

  const getCpuColor = (val) => {
    if (val >= 80) return 'var(--accent-rose)';
    if (val >= 50) return 'var(--accent-amber)';
    return 'var(--accent-cyan)';
  };

  const getRamColor = (val) => {
    if (val >= 85) return 'var(--accent-rose)';
    if (val >= 70) return 'var(--accent-amber)';
    return 'var(--accent-green)';
  };

  return (
    <header style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      padding: '20px 24px',
      background: 'var(--bg-surface)',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid var(--border-subtle)',
    }}>
      {/* Top Bar: Brand, Status, Config */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.2), rgba(179, 136, 255, 0.2))',
            border: '1px solid rgba(0, 240, 255, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            boxShadow: '0 0 16px rgba(0, 240, 255, 0.15)',
          }}>
            🩺
          </div>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '8px' }}>
              AI Process Doctor
              <span style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: '12px', background: 'rgba(0, 240, 255, 0.1)', color: 'var(--accent-cyan)', border: '1px solid rgba(0, 240, 255, 0.3)' }}>
                WIN32 KERNEL COCKPIT
              </span>
            </h1>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Real-Time Diagnostics & Supervised Remediation</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {/* Connection state */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.8rem',
            padding: '4px 12px',
            borderRadius: '20px',
            background: isConnected ? 'rgba(0, 230, 118, 0.08)' : 'rgba(255, 23, 68, 0.08)',
            border: `1px solid ${isConnected ? 'rgba(0, 230, 118, 0.3)' : 'rgba(255, 23, 68, 0.3)'}`,
            color: isConnected ? 'var(--accent-green)' : 'var(--accent-rose)',
          }}>
            <span
              className="pulsing-dot"
              style={{ backgroundColor: isConnected ? 'var(--accent-green)' : 'var(--accent-rose)' }}
            />
            {isConnected ? 'LIVE 1Hz TELEMETRY' : 'CONNECTING...'}
          </div>

          {/* Config Button */}
          <button className="btn btn-secondary" onClick={onOpenConfig} style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
            ⚙️ AI Settings
          </button>
        </div>
      </div>

      {/* Metric Telemetry Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '14px',
      }}>
        {/* CPU Load Card */}
        <div className="glass-card" style={{ padding: '14px 18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total CPU Load</span>
            <span className="mono" style={{ fontSize: '1.25rem', fontWeight: 700, color: getCpuColor(cpuPercent) }}>
              {cpuPercent.toFixed(1)}%
            </span>
          </div>
          <div style={{ width: '100%', height: '6px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{
              width: `${Math.min(100, Math.max(0, cpuPercent))}%`,
              height: '100%',
              background: getCpuColor(cpuPercent),
              transition: 'width 0.4s ease',
              boxShadow: `0 0 8px ${getCpuColor(cpuPercent)}`,
            }} />
          </div>
        </div>

        {/* RAM Usage Card */}
        <div className="glass-card" style={{ padding: '14px 18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>RAM Allocation</span>
            <span className="mono" style={{ fontSize: '1.25rem', fontWeight: 700, color: getRamColor(ramPercent) }}>
              {ramPercent.toFixed(1)}%
            </span>
          </div>
          <div style={{ width: '100%', height: '6px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '3px', overflow: 'hidden', marginBottom: '6px' }}>
            <div style={{
              width: `${Math.min(100, Math.max(0, ramPercent))}%`,
              height: '100%',
              background: getRamColor(ramPercent),
              transition: 'width 0.4s ease',
              boxShadow: `0 0 8px ${getRamColor(ramPercent)}`,
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
            <span>{ramUsedGb} GB Used</span>
            <span>{ramTotalGb} GB Total</span>
          </div>
        </div>

        {/* Anomalies Card */}
        <div className="glass-card" style={{ padding: '14px 18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Anomalies</span>
            <span className="mono" style={{
              fontSize: '1.25rem',
              fontWeight: 700,
              color: anomalyCount > 0 ? 'var(--accent-rose)' : 'var(--accent-green)',
            }}>
              {anomalyCount}
            </span>
          </div>
          <div style={{ fontSize: '0.75rem', color: anomalyCount > 0 ? 'var(--accent-amber)' : 'var(--text-muted)' }}>
            {anomalyCount > 0 ? '⚠️ Immediate attention recommended' : '✅ System running within normal thresholds'}
          </div>
        </div>

        {/* Process Count Card */}
        <div className="glass-card" style={{ padding: '14px 18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Processes</span>
            <span className="mono" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>
              {totalProc}
            </span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
            Win32 Process Table
          </div>
        </div>
      </div>
    </header>
  );
}
