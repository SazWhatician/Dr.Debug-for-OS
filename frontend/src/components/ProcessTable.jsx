import React, { useState, useMemo } from 'react';

export default function ProcessTable({ processes, onSelectProcess, onQuickAction, selectedPid }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [sortField, setSortField] = useState('cpu_percent');
  const [sortAsc, setSortAsc] = useState(false);

  const filteredProcesses = useMemo(() => {
    let list = processes || [];

    if (filterType === 'ANOMALIES') {
      list = list.filter((p) => (p.anomalies && p.anomalies.length > 0) || p.is_hung);
    } else if (filterType === 'HIGH_CPU') {
      list = list.filter((p) => p.cpu_percent >= 15.0);
    } else if (filterType === 'HIGH_RAM') {
      list = list.filter((p) => p.ram_mb >= 500.0);
    } else if (filterType === 'HUNG') {
      list = list.filter((p) => p.is_hung);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          String(p.pid).includes(term)
      );
    }

    return [...list].sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];
      if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
      }
      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [processes, searchTerm, filterType, sortField, sortAsc]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  return (
    <div style={{ padding: '18px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Controls: Search & Filter Pills */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {[
            { id: 'ALL', label: 'All Processes' },
            { id: 'ANOMALIES', label: '⚠️ Anomalies' },
            { id: 'HIGH_CPU', label: '⚡ High CPU (>15%)' },
            { id: 'HIGH_RAM', label: '💾 High RAM (>500MB)' },
            { id: 'HUNG', label: '❄️ Frozen / Hung' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              style={{
                padding: '5px 12px',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                border: '1px solid',
                borderColor: filterType === tab.id ? 'var(--accent-cyan)' : 'var(--border-subtle)',
                background: filterType === tab.id ? 'rgba(0, 242, 254, 0.14)' : 'rgba(255, 255, 255, 0.02)',
                color: filterType === tab.id ? 'var(--accent-cyan)' : 'var(--text-muted)',
                transition: 'all 0.15s ease',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div style={{ position: 'relative', width: '280px' }}>
          <input
            type="text"
            placeholder="Filter by name or PID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '7px 12px',
              borderRadius: '8px',
              background: 'rgba(7, 12, 22, 0.9)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-main)',
              fontSize: '0.8rem',
              fontFamily: 'var(--font-mono)',
              outline: 'none',
            }}
          />
        </div>
      </div>

      {/* Table Card */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto', maxHeight: 'calc(100vh - 340px)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid var(--border-subtle)', userSelect: 'none' }}>
                <th onClick={() => handleSort('pid')} style={{ padding: '10px 14px', cursor: 'pointer', color: 'var(--text-dim)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  PID {sortField === 'pid' ? (sortAsc ? '▲' : '▼') : ''}
                </th>
                <th onClick={() => handleSort('name')} style={{ padding: '10px 14px', cursor: 'pointer', color: 'var(--text-dim)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  Process Name {sortField === 'name' ? (sortAsc ? '▲' : '▼') : ''}
                </th>
                <th onClick={() => handleSort('cpu_percent')} style={{ padding: '10px 14px', cursor: 'pointer', color: 'var(--text-dim)', fontSize: '0.75rem', textTransform: 'uppercase', minWidth: '130px' }}>
                  CPU Load {sortField === 'cpu_percent' ? (sortAsc ? '▲' : '▼') : ''}
                </th>
                <th onClick={() => handleSort('ram_bytes')} style={{ padding: '10px 14px', cursor: 'pointer', color: 'var(--text-dim)', fontSize: '0.75rem', textTransform: 'uppercase', minWidth: '130px' }}>
                  RAM Working Set {sortField === 'ram_bytes' ? (sortAsc ? '▲' : '▼') : ''}
                </th>
                <th style={{ padding: '10px 14px', color: 'var(--text-dim)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  Slope (30s)
                </th>
                <th onClick={() => handleSort('threads')} style={{ padding: '10px 14px', cursor: 'pointer', color: 'var(--text-dim)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  Threads {sortField === 'threads' ? (sortAsc ? '▲' : '▼') : ''}
                </th>
                <th onClick={() => handleSort('handles')} style={{ padding: '10px 14px', cursor: 'pointer', color: 'var(--text-dim)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  Handles {sortField === 'handles' ? (sortAsc ? '▲' : '▼') : ''}
                </th>
                <th style={{ padding: '10px 14px', color: 'var(--text-dim)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  Health
                </th>
                <th style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--text-dim)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredProcesses.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ padding: '36px', textAlign: 'center', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                    No running processes matching the selected filter.
                  </td>
                </tr>
              ) : (
                filteredProcesses.map((p) => {
                  const isSelected = selectedPid === p.pid;
                  const isHung = p.is_hung;
                  const hasAnomalies = p.anomalies && p.anomalies.length > 0;
                  const cpuPercent = p.cpu_percent || 0;
                  const isHighCpu = cpuPercent >= 50;

                  return (
                    <tr
                      key={p.pid}
                      onClick={() => onSelectProcess(p)}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
                        background: isSelected
                          ? 'rgba(0, 242, 254, 0.12)'
                          : isHung
                          ? 'rgba(239, 68, 68, 0.08)'
                          : 'transparent',
                        cursor: 'pointer',
                        transition: 'background 0.12s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.background = 'var(--bg-card-hover)';
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) e.currentTarget.style.background = isHung ? 'rgba(239, 68, 68, 0.08)' : 'transparent';
                      }}
                    >
                      {/* PID */}
                      <td className="mono" style={{ padding: '9px 14px', color: 'var(--accent-cyan)', fontSize: '0.78rem' }}>
                        {p.pid}
                      </td>

                      {/* Process Name */}
                      <td style={{ padding: '9px 14px', fontWeight: 600 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ color: 'var(--text-main)' }}>{p.name}</span>
                          {isHung && (
                            <span style={{
                              fontSize: '0.62rem',
                              fontFamily: 'var(--font-mono)',
                              background: 'rgba(239, 68, 68, 0.2)',
                              color: 'var(--accent-rose)',
                              border: '1px solid rgba(239, 68, 68, 0.5)',
                              borderRadius: '4px',
                              padding: '1px 6px',
                            }}>
                              FROZEN
                            </span>
                          )}
                        </div>
                      </td>

                      {/* CPU Load with Mini Bar */}
                      <td style={{ padding: '9px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="mono" style={{
                            fontSize: '0.8rem',
                            fontWeight: isHighCpu ? 700 : 500,
                            color: isHighCpu ? 'var(--accent-rose)' : cpuPercent >= 20 ? 'var(--accent-amber)' : 'var(--text-main)',
                            minWidth: '42px',
                          }}>
                            {cpuPercent}%
                          </span>
                          <div style={{ width: '60px', height: '4px', background: 'rgba(255, 255, 255, 0.06)', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{
                              width: `${Math.min(100, cpuPercent)}%`,
                              height: '100%',
                              background: isHighCpu ? 'var(--accent-rose)' : cpuPercent >= 20 ? 'var(--accent-amber)' : 'var(--accent-cyan)',
                            }} />
                          </div>
                        </div>
                      </td>

                      {/* RAM MB */}
                      <td style={{ padding: '9px 14px' }}>
                        <span className="mono" style={{ fontSize: '0.8rem', color: p.ram_mb > 1000 ? 'var(--accent-amber)' : 'var(--text-main)' }}>
                          {p.ram_mb} MB
                        </span>
                      </td>

                      {/* Memory Slope */}
                      <td className="mono" style={{ padding: '9px 14px', fontSize: '0.75rem' }}>
                        <span style={{
                          color: p.memory_slope_kb_s > 500 ? 'var(--accent-amber)' : 'var(--text-dim)',
                        }}>
                          {p.memory_slope_kb_s > 0 ? `+${p.memory_slope_kb_s} KB/s` : `${p.memory_slope_kb_s} KB/s`}
                        </span>
                      </td>

                      {/* Threads */}
                      <td className="mono" style={{ padding: '9px 14px', color: 'var(--text-dim)', fontSize: '0.78rem' }}>
                        {p.threads}
                      </td>

                      {/* Handles */}
                      <td className="mono" style={{ padding: '9px 14px', color: p.handles > 5000 ? 'var(--accent-amber)' : 'var(--text-dim)', fontSize: '0.78rem' }}>
                        {p.handles}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '9px 14px' }}>
                        {isHung ? (
                          <span style={{ color: 'var(--accent-rose)', fontWeight: 600, fontSize: '0.75rem' }}>❄️ Hung</span>
                        ) : hasAnomalies ? (
                          <span style={{ color: 'var(--accent-amber)', fontWeight: 600, fontSize: '0.75rem' }}>⚠️ {p.anomalies.join(', ')}</span>
                        ) : (
                          <span style={{ color: 'var(--accent-green)', fontSize: '0.75rem' }}>● Normal</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '9px 14px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '4px' }}>
                          <button
                            className="btn btn-primary"
                            style={{ padding: '2px 8px', fontSize: '0.72rem' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectProcess(p);
                            }}
                          >
                            Inspect
                          </button>
                          <button
                            className="btn btn-secondary"
                            style={{ padding: '2px 8px', fontSize: '0.72rem' }}
                            title="Suspend process"
                            onClick={(e) => {
                              e.stopPropagation();
                              onQuickAction(p, 'SUSPEND');
                            }}
                          >
                            ⏸️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
