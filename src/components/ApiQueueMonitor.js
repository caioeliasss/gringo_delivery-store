import React, { useState, useEffect } from "react";
import {
  getApiQueueStats,
  clearApiQueue,
  configureApiQueue,
} from "../services/api";

const ApiQueueMonitor = () => {
  const [queueStats, setQueueStats] = useState({
    queueLength: 0,
    activeRequests: 0,
    processing: false,
  });
  const [config, setConfig] = useState({
    maxConcurrent: 3,
    minDelay: 100,
    retryAttempts: 3,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setQueueStats(getApiQueueStats());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleConfigChange = (field, value) => {
    const newConfig = { ...config, [field]: parseInt(value) };
    setConfig(newConfig);
    configureApiQueue(newConfig);
  };

  const handleClearQueue = () => {
    clearApiQueue();
    setQueueStats(getApiQueueStats());
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 10,
        right: 10,
        background: "white",
        border: "1px solid #ccc",
        padding: "10px",
        borderRadius: "5px",
        fontSize: "12px",
        zIndex: 9999,
      }}
    >
      <h4>Monitor da Fila de API</h4>

      <div>
        <strong>Status:</strong>
        <div>Fila: {queueStats.queueLength} requisições</div>
        <div>Ativas: {queueStats.activeRequests}</div>
        <div>Processando: {queueStats.processing ? "Sim" : "Não"}</div>
      </div>

      <div style={{ marginTop: "10px" }}>
        <strong>Configuração:</strong>
        <div>
          <label>
            Max Simultâneas:
            <input
              type="number"
              value={config.maxConcurrent}
              onChange={(e) =>
                handleConfigChange("maxConcurrent", e.target.value)
              }
              style={{ width: "50px", marginLeft: "5px" }}
            />
          </label>
        </div>
        <div>
          <label>
            Delay (ms):
            <input
              type="number"
              value={config.minDelay}
              onChange={(e) => handleConfigChange("minDelay", e.target.value)}
              style={{ width: "60px", marginLeft: "5px" }}
            />
          </label>
        </div>
        <div>
          <label>
            Tentativas:
            <input
              type="number"
              value={config.retryAttempts}
              onChange={(e) =>
                handleConfigChange("retryAttempts", e.target.value)
              }
              style={{ width: "50px", marginLeft: "5px" }}
            />
          </label>
        </div>
      </div>

      <button
        onClick={handleClearQueue}
        style={{
          marginTop: "10px",
          background: "#ff4444",
          color: "white",
          border: "none",
          padding: "5px 10px",
          borderRadius: "3px",
          cursor: "pointer",
        }}
      >
        Limpar Fila
      </button>

      {queueStats.queueLength > 10 && (
        <div style={{ color: "orange", marginTop: "5px" }}>
          ⚠️ Fila com muitas requisições
        </div>
      )}

      {queueStats.queueLength > 50 && (
        <div style={{ color: "red", marginTop: "5px" }}>
          🚨 Fila sobrecarregada!
        </div>
      )}
    </div>
  );
};

export default ApiQueueMonitor;
