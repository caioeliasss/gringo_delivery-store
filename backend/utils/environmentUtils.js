/**
 * Utilitário para verificar ambiente de desenvolvimento
 */

class EnvironmentUtils {
  static isDevelopment() {
    const nodeEnv = (process.env.NODE_ENV || "").trim().toLowerCase();
    const isDev = nodeEnv === "development";
    console.log(
      `is this development? ${isDev}, NODE_ENV: "${process.env.NODE_ENV}" (trimmed: "${nodeEnv}")`
    );
    return isDev;
  }

  static isProduction() {
    const nodeEnv = (process.env.NODE_ENV || "").trim().toLowerCase();
    return nodeEnv === "production";
  }

  static shouldSkipInDevelopment(functionName = "função") {
    if (this.isDevelopment()) {
      console.log(
        `⏭️ [DEV MODE] Pulando execução de ${functionName} em ambiente de desenvolvimento`
      );
      return true;
    }
    return false;
  }

  static logEnvironmentInfo() {
    const env = process.env.NODE_ENV;
    const isDev = this.isDevelopment();

    console.log("=".repeat(50));
    console.log(`🌍 AMBIENTE: ${env.toUpperCase()}`);
    console.log(`🛠️ Modo Desenvolvimento: ${isDev ? "SIM" : "NÃO"}`);
    console.log(`🚀 Modo Produção: ${this.isProduction() ? "SIM" : "NÃO"}`);

    if (isDev) {
      console.log("📋 RECURSOS DESABILITADOS EM DEV:");
      console.log("   • Cron jobs (faturas, cobrança motoboy)");
      console.log("   • iFood polling automático");
      console.log("   • Integração Asaas automática");
      console.log("💡 Para habilitar: NODE_ENV=production");
    } else {
      console.log("✅ TODOS OS RECURSOS HABILITADOS");
    }
    console.log("=".repeat(50));
  }

  static getEnvironmentConfig() {
    return {
      nodeEnv: process.env.NODE_ENV || "development",
      isDevelopment: this.isDevelopment(),
      isProduction: this.isProduction(),
      cronJobsEnabled: !this.isDevelopment(),
      ifoodPollingEnabled: !this.isDevelopment(),
      asaasIntegrationEnabled: !this.isDevelopment(),
    };
  }
}

module.exports = EnvironmentUtils;
