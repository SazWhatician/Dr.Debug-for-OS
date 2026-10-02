import React from 'react';

function Sparkline({ data, color, height = 28 }) {
  if (!data || data.length < 2) return null;
  const max = 100;
  const min = 0;
  const width = 140;

  const points = data
    .map((val, idx) => {
      const x = (idx / (data.length - 1)) * width;
      const normalized = Math.min(100, Math.max(0, val));
      const y = height - (normalized / max) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const areaPoints = `${points} ${width},${height} 0,${height}`;

  return (
    <svg width={width} height={height} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#grad-${color})`} />
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

export default function HeaderGauges({ telemetry, isConnected, onOpenConfig, cpuHistory, ramHistory }) {
  const system = telemetry?.system || {};
  const cpuPercent = system.cpu_total_percent !== undefined ? system.cpu_total_percent : 0;
  const ramPercent = system.ram_percent !== undefined ? system.ram_percent : 0;
  const ramUsedGb = system.ram_used_bytes ? (system.ram_used_bytes / (1024 ** 3)).toFixed(1) : '0.0';
  const ramTotalGb = system.ram_total_bytes ? (system.ram_total_bytes / (1024 ** 3)).toFixed(1) : '0.0';
  const anomalyCount = telemetry?.anomaly_alerts?.length || 0;
  const totalProc = telemetry?.total_process_count || 0;

  const getCpuColor = (val) => {
    if (val >= 80) return '#ef4444';
    if (val >= 50) return '#f59e0b';
    return '#00f2fe';
  };

  const getRamColor = (val) => {
    if (val >= 85) return '#ef4444';
    if (val >= 70) return '#f59e0b';
    return '#10b981';
  };

  return (
    <header style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      padding: '18px 24px',
      background: 'var(--bg-surface)',
      backdropFilter: 'blur(24px)',
      borderBottom: '1px solid var(--border-subtle)',
    }}>
      {/* Brand & Action Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, rgba(0, 242, 254, 0.2), rgba(168, 85, 247, 0.2))',
            border: '1px solid rgba(0, 242, 254, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            boxShadow: '0 0 20px rgba(0, 242, 254, 0.15)',
          }}>
            🩺
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
                AI Process Doctor
              </h1>
              <span style={{
                fontSize: '0.62rem',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '6px',
                background: 'rgba(0, 242, 254, 0.1)',
                color: 'var(--accent-cyan)',
                border: '1px solid rgba(0, 242, 254, 0.25)',
              }}>
                WIN32 NT KERNEL
              </span>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Real-Time Process Telemetry, Heuristic Anomaly Triage & Remediation
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.75rem',
            fontFamily: 'var(--font-mono)',
            padding: '5px 12px',
            borderRadius: '20px',
            background: isConnected ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
            border: `1px solid ${isConnected ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
            color: isConnected ? 'var(--accent-green)' : 'var(--accent-rose)',
          }}>
            <span
              className="pulsing-dot"
              style={{ backgroundColor: isConnected ? 'var(--accent-green)' : 'var(--accent-rose)' }}
            />
            {isConnected ? 'LIVE 1Hz STREAM' : 'DISCONNECTED'}
          </div>

          <button className="btn btn-secondary" onClick={onOpenConfig} style={{ fontSize: '0.75rem' }}>
            ⚙️ AI Model Config
          </button>
        </div>
      </div>

      {/* Telemetry Metric Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '12px',
      }}>
        {/* CPU Card with Live Sparkline */}
        <div className="glass-card" style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                Total CPU Load
              </span>
              <div className="mono" style={{ fontSize: '1.4rem', fontWeight: 800, color: getCpuColor(cpuPercent) }}>
                {cpuPercent.toFixed(1)}%
              </div>
            </div>
            <Sparkline data={cpuHistory} color={getCpuColor(cpuPercent)} />
          </div>
          <div style={{ width: '100%', height: '4px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{
              width: `${Math.min(100, Math.max(0, cpuPercent))}%`,
              height: '100%',
              background: getCpuColor(cpuPercent),
              transition: 'width 0.3s ease',
            }} />
          </div>
        </div>

        {/* RAM Card with Live Sparkline */}
        <div className="glass-card" style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                System RAM ({ramUsedGb} / {ramTotalGb} GB)
              </span>
              <div className="mono" style={{ fontSize: '1.4rem', fontWeight: 800, color: getRamColor(ramPercent) }}>
                {ramPercent.toFixed(1)}%
              </div>
            </div>
            <Sparkline data={ramHistory} color={getRamColor(ramPercent)} />
          </div>
          <div style={{ width: '100%', height: '4px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{
              width: `${Math.min(100, Math.max(0, ramPercent))}%`,
              height: '100%',
              background: getRamColor(ramPercent),
              transition: 'width 0.3s ease',
            }} />
          </div>
        </div>

        {/* Active Anomalies */}
        <div className="glass-card" style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
              Active Anomalies
            </span>
            <span className="mono" style={{
              fontSize: '1.25rem',
              fontWeight: 800,
              color: anomalyCount > 0 ? 'var(--accent-rose)' : 'var(--accent-green)',
            }}>
              {anomalyCount}
            </span>
          </div>
          <div style={{ fontSize: '0.75rem', color: anomalyCount > 0 ? 'var(--accent-amber)' : 'var(--text-muted)' }}>
            {anomalyCount > 0 ? `⚠️ ${anomalyCount} process(es) breaching threshold` : '● All processes behaving normally'}
          </div>
        </div>

        {/* Total Process Count */}
        <div className="glass-card" style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
              Monitored Processes
            </span>
            <span className="mono" style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>
              {totalProc}
            </span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
            Kernel Object Table
          </div>
        </div>
      </div>
    </header>
  );
}
