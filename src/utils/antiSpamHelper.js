// src/utils/antiSpamHelper.js
// Sistema de proteção contra spam de chamadas para APIs

class AntiSpamHelper {
  constructor() {
    this.callHistory = new Map();
    this.defaultCooldown = 5000; // 5 segundos padrão
    this.maxCallsPerMinute = 10; // Máximo de chamadas por minuto
  }

  // Verificar se uma função pode ser executada
  canExecute(functionName, customCooldown = null) {
    const now = Date.now();
    const cooldown = customCooldown || this.defaultCooldown;

    if (!this.callHistory.has(functionName)) {
      this.callHistory.set(functionName, {
        lastCall: 0,
        callsInLastMinute: [],
        blocked: false,
      });
    }

    const history = this.callHistory.get(functionName);

    // Limpar chamadas antigas (mais de 1 minuto)
    history.callsInLastMinute = history.callsInLastMinute.filter(
      (time) => now - time < 60000
    );

    // Verificar se está em cooldown
    if (now - history.lastCall < cooldown) {
      const remainingTime = Math.ceil(
        (cooldown - (now - history.lastCall)) / 1000
      );
      console.warn(`⏳ ${functionName} em cooldown. Aguarde ${remainingTime}s`);
      return false;
    }

    // Verificar limite por minuto
    if (history.callsInLastMinute.length >= this.maxCallsPerMinute) {
      console.warn(
        `🚫 ${functionName} atingiu limite de ${this.maxCallsPerMinute} chamadas por minuto`
      );
      history.blocked = true;
      return false;
    }

    return true;
  }

  // Registrar execução de uma função
  recordExecution(functionName) {
    const now = Date.now();

    if (!this.callHistory.has(functionName)) {
      this.callHistory.set(functionName, {
        lastCall: 0,
        callsInLastMinute: [],
        blocked: false,
      });
    }

    const history = this.callHistory.get(functionName);
    history.lastCall = now;
    history.callsInLastMinute.push(now);
    history.blocked = false;

    console.log(
      `✅ ${functionName} executado. Calls na última hora: ${history.callsInLastMinute.length}`
    );
  }

  // Criar wrapper para função com proteção anti-spam
  wrap(functionName, originalFunction, cooldown = null) {
    return async (...args) => {
      if (!this.canExecute(functionName, cooldown)) {
        return null; // ou retornar resultado em cache
      }

      try {
        const result = await originalFunction.apply(this, args);
        this.recordExecution(functionName);
        return result;
      } catch (error) {
        console.error(`Erro em ${functionName}:`, error);
        throw error;
      }
    };
  }

  // Obter estatísticas
  getStats() {
    const stats = {};

    for (const [functionName, history] of this.callHistory) {
      stats[functionName] = {
        lastCall: new Date(history.lastCall).toISOString(),
        callsInLastMinute: history.callsInLastMinute.length,
        blocked: history.blocked,
        timeSinceLastCall: Date.now() - history.lastCall,
      };
    }

    return stats;
  }

  // Limpar histórico
  clear() {
    this.callHistory.clear();
    console.log("🗑️ Histórico anti-spam limpo");
  }

  // Configurar limites
  configure(options = {}) {
    if (options.defaultCooldown) this.defaultCooldown = options.defaultCooldown;
    if (options.maxCallsPerMinute)
      this.maxCallsPerMinute = options.maxCallsPerMinute;
  }
}

export default new AntiSpamHelper();
