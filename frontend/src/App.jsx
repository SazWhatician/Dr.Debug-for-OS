import React, { useState, useEffect, useRef } from 'react';
import HeaderGauges from './components/HeaderGauges';
import AlertBanner from './components/AlertBanner';
import ProcessTable from './components/ProcessTable';
import DoctorDrawer from './components/DoctorDrawer';
import RemediateModal from './components/RemediateModal';
import ConfigModal from './components/ConfigModal';

export default function App() {
  const [telemetry, setTelemetry] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [selectedProcess, setSelectedProcess] = useState(null);
  const [pendingRemediation, setPendingRemediation] = useState(null);
  const [showConfig, setShowConfig] = useState(false);
  const [cpuHistory, setCpuHistory] = useState([]);
  const [ramHistory, setRamHistory] = useState([]);
  const wsRef = useRef(null);

  const updateTelemetryData = (data) => {
    setTelemetry(data);
    if (data?.system) {
      const cpu = data.system.cpu_total_percent || 0;
      const ram = data.system.ram_percent || 0;
      setCpuHistory((prev) => [...prev.slice(-24), cpu]);
      setRamHistory((prev) => [...prev.slice(-24), ram]);
    }
  };

  useEffect(() => {
    // Initial REST load
    fetch('/api/processes')
      .then((res) => res.json())
      .then((data) => updateTelemetryData(data))
      .catch(() => {});

    // Setup live WebSocket
    let shouldReconnect = true;
    const connectWs = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/telemetry`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          updateTelemetryData(data);
        } catch {}
      };

      ws.onclose = () => {
        setIsConnected(false);
        if (shouldReconnect) {
          setTimeout(connectWs, 1500);
        }
      };

      ws.onerror = () => {
        ws.close();
      };
    };

    connectWs();

    return () => {
      shouldReconnect = false;
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  const handleSelectProcess = (proc) => {
    setSelectedProcess(proc);
  };

  const handleTriggerRemediate = (proc, action, details, priority) => {
    setPendingRemediation({ proc, action, details, priority });
  };

  const handleQuickAction = (proc, action) => {
    setPendingRemediation({ proc, action, details: null, priority: 'NORMAL' });
  };

  const handleRemediateSuccess = () => {
    setPendingRemediation(null);
    setSelectedProcess(null);
    fetch('/api/processes')
      .then((res) => res.json())
      .then((data) => updateTelemetryData(data))
      .catch(() => {});
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <HeaderGauges
        telemetry={telemetry}
        isConnected={isConnected}
        onOpenConfig={() => setShowConfig(true)}
        cpuHistory={cpuHistory}
        ramHistory={ramHistory}
      />

      <AlertBanner
        alerts={telemetry?.anomaly_alerts}
        onSelectProcess={handleSelectProcess}
      />

      <main style={{ flex: 1 }}>
        <ProcessTable
          processes={telemetry?.top_processes}
          onSelectProcess={handleSelectProcess}
          onQuickAction={handleQuickAction}
          selectedPid={selectedProcess?.pid}
        />
      </main>

      {/* AI Doctor Drawer */}
      {selectedProcess && (
        <DoctorDrawer
          processSummary={selectedProcess}
          onClose={() => setSelectedProcess(null)}
          onTriggerRemediate={handleTriggerRemediate}
        />
      )}

      {/* Supervised Remediation Confirmation Modal */}
      {pendingRemediation && (
        <RemediateModal
          pendingAction={pendingRemediation}
          onConfirm={handleRemediateSuccess}
          onCancel={() => setPendingRemediation(null)}
        />
      )}

      {/* AI Config Modal */}
      {showConfig && (
        <ConfigModal onClose={() => setShowConfig(false)} />
      )}
    </div>
  );
}
