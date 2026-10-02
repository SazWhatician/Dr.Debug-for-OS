import React, { useState, useMemo } from 'react';

export default function ProcessTable({ processes, onSelectProcess, selectedPid }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [sortField, setSortField] = useState('cpu_percent');
  const [sortAsc, setSortAsc] = useState(false);

  const filteredProcesses = useMemo(() => {
    let list = processes || [];

    // Filter by type
    if (filterType === 'ANOMALIES') {
      list = list.filter((p) => (p.anomalies && p.anomalies.length > 0) || p.is_hung);
    } else if (filterType === 'HIGH_CPU') {
      list = list.filter((p) => p.cpu_percent >= 20.0);
    } else if (filterType === 'HIGH_RAM') {
      list = list.filter((p) => p.ram_mb >= 500.0);
    } else if (filterType === 'HUNG') {
      list = list.filter((p) => p.is_hung);
    }

    // Search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          String(p.pid).includes(term)
      );
    }

    // Sort
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
    <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Controls: Search & Filter Pills */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[
            { id: 'ALL', label: 'All Processes' },
            { id: 'ANOMALIES', label: '⚠️ Anomalies Only' },
            { id: 'HIGH_CPU', label: '⚡ High CPU (>20%)' },
            { id: 'HIGH_RAM', label: '💾 High RAM (>500MB)' },
            { id: 'HUNG', label: '❄️ Hung Windows' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                border: '1px solid',
                borderColor: filterType === tab.id ? 'var(--accent-cyan)' : 'var(--border-subtle)',
                background: filterType === tab.id ? 'rgba(0, 240, 255, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                color: filterType === tab.id ? 'var(--accent-cyan)' : 'var(--text-muted)',
                transition: 'all 0.15s ease',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search input */}
        <div style={{ position: 'relative', minWidth: '260px' }}>
          <input
            type="text"
            placeholder="🔍 Search process or PID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 14px',
              borderRadius: '8px',
              background: 'rgba(10, 16, 30, 0.8)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-main)',
              fontSize: '0.85rem',
              fontFamily: 'var(--font-mono)',
              outline: 'none',
            }}
          />
        </div>
      </div>

      {/* Process Table Card */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto', maxHeight: 'calc(100vh - 360px)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid var(--border-subtle)', userSelect: 'none' }}>
                <th onClick={() => handleSort('pid')} style={{ padding: '12px 16px', cursor: 'pointer', color: 'var(--text-muted)' }}>
                  PID {sortField === 'pid' ? (sortAsc ? '▲' : '▼') : ''}
                </th>
                <th onClick={() => handleSort('name')} style={{ padding: '12px 16px', cursor: 'pointer', color: 'var(--text-muted)' }}>
                  Process Name {sortField === 'name' ? (sortAsc ? '▲' : '▼') : ''}
                </th>
                <th onClick={() => handleSort('cpu_percent')} style={{ padding: '12px 16px', cursor: 'pointer', color: 'var(--text-muted)' }}>
                  CPU % {sortField === 'cpu_percent' ? (sortAsc ? '▲' : '▼') : ''}
                </th>
                <th onClick={() => handleSort('ram_bytes')} style={{ padding: '12px 16px', cursor: 'pointer', color: 'var(--text-muted)' }}>
                  RAM (MB) {sortField === 'ram_bytes' ? (sortAsc ? '▲' : '▼') : ''}
                </th>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>Memory Slope</th>
                <th onClick={() => handleSort('threads')} style={{ padding: '12px 16px', cursor: 'pointer', color: 'var(--text-muted)' }}>
                  Threads {sortField === 'threads' ? (sortAsc ? '▲' : '▼') : ''}
                </th>
                <th onClick={() => handleSort('handles')} style={{ padding: '12px 16px', cursor: 'pointer', color: 'var(--text-muted)' }}>
                  Handles {sortField === 'handles' ? (sortAsc ? '▲' : '▼') : ''}
                </th>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>Health Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--text-muted)' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredProcesses.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-dim)' }}>
                    No processes matching filters.
                  </td>
                </tr>
              ) : (
                filteredProcesses.map((p) => {
                  const isSelected = selectedPid === p.pid;
                  const isHung = p.is_hung;
                  const hasAnomalies = p.anomalies && p.anomalies.length > 0;
                  const isHighCpu = p.cpu_percent >= 50.0;

                  return (
                    <tr
                      key={p.pid}
                      onClick={() => onSelectProcess(p)}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                        background: isSelected
                          ? 'rgba(0, 240, 255, 0.12)'
                          : isHung
                          ? 'rgba(255, 23, 68, 0.08)'
                          : 'transparent',
                        cursor: 'pointer',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.background = 'var(--bg-hover)';
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) e.currentTarget.style.background = isHung ? 'rgba(255, 23, 68, 0.08)' : 'transparent';
                      }}
                    >
                      <td className="mono" style={{ padding: '10px 16px', color: 'var(--accent-cyan)' }}>
                        {p.pid}
                      </td>
                      <td style={{ padding: '10px 16px', fontWeight: 600 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span>{p.name}</span>
                          {isHung && (
                            <span style={{ fontSize: '0.65rem', background: 'rgba(255, 23, 68, 0.2)', color: 'var(--accent-rose)', border: '1px solid rgba(255, 23, 68, 0.4)', borderRadius: '4px', padding: '1px 6px' }}>
                              FROZEN
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="mono" style={{
                        padding: '10px 16px',
                        fontWeight: isHighCpu ? 700 : 400,
                        color: isHighCpu ? 'var(--accent-rose)' : p.cpu_percent >= 20 ? 'var(--accent-amber)' : 'var(--text-main)',
                      }}>
                        {p.cpu_percent}%
                      </td>
                      <td className="mono" style={{ padding: '10px 16px' }}>
                        {p.ram_mb} MB
                      </td>
                      <td className="mono" style={{
                        padding: '10px 16px',
                        color: p.memory_slope_kb_s > 500 ? 'var(--accent-amber)' : 'var(--text-dim)',
                      }}>
                        {p.memory_slope_kb_s > 0 ? `+${p.memory_slope_kb_s} KB/s` : `${p.memory_slope_kb_s} KB/s`}
                      </td>
                      <td className="mono" style={{ padding: '10px 16px', color: 'var(--text-dim)' }}>
                        {p.threads}
                      </td>
                      <td className="mono" style={{ padding: '10px 16px', color: p.handles > 5000 ? 'var(--accent-amber)' : 'var(--text-dim)' }}>
                        {p.handles}
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        {isHung ? (
                          <span style={{ color: 'var(--accent-rose)', fontWeight: 600 }}>❄️ Not Responding</span>
                        ) : hasAnomalies ? (
                          <span style={{ color: 'var(--accent-amber)', fontWeight: 600 }}>⚠️ {p.anomalies.join(', ')}</span>
                        ) : (
                          <span style={{ color: 'var(--accent-green)' }}>● Healthy</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                        <button
                          className="btn btn-primary"
                          style={{ padding: '3px 10px', fontSize: '0.75rem' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectProcess(p);
                          }}
                        >
                          Inspect ➔
                        </button>
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
