const nodemailer = require("nodemailer");
const Admin = require("../models/Admin");
const SupportTeam = require("../models/SupportTeam");

class EmailService {
  constructor() {
    this.transporter = null;
    this.initTransporter();
  }

  initTransporter() {
    // Configuração do transporter - você pode usar Gmail, SendGrid, AWS SES, etc.
    // Para Gmail, você precisará ativar "App Passwords" na conta Google
    this.transporter = nodemailer.createTransport({
      service: "gmail", // ou outro provedor
      auth: {
        user: process.env.EMAIL_USER, // seu email
        pass: process.env.EMAIL_PASS, // sua senha de app ou senha
      },
    });

    // Configuração alternativa para outros provedores SMTP
    /*
    this.transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    */
  }

  async sendEmail(to, subject, htmlContent, textContent = null) {
    try {
      if (!this.transporter) {
        throw new Error("Transporter de email não inicializado");
      }

      const mailOptions = {
        from: `"Gringo Delivery" <${process.env.EMAIL_USER}>`,
        to: Array.isArray(to) ? to.join(", ") : to,
        subject,
        html: htmlContent,
        text: textContent || htmlContent.replace(/<[^>]*>/g, ""), // Remove HTML tags para texto
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log("✅ Email enviado:", info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error("❌ Erro ao enviar email:", error);
      return { success: false, error: error.message };
    }
  }

  async getSupportEmails() {
    try {
      const supportEmails = await SupportTeam.find({}, "email name");
      return supportEmails.map((admin) => ({
        email: admin.email,
        name: admin.name,
      }));
    } catch (error) {
      console.error("❌ Erro ao buscar emails de suporte:", error);
      return [];
    }
  }

  async notifySupportOccurrence(occurrence) {
    try {
      const subject = `🔔 Nova Ocorrência - ${occurrence.type}`;
      const htmlContent = `
        <div style="font-family: Arial, sans-serif;">
          <h2>🔔 Nova Ocorrência Recebida</h2>
          <p><strong>ID:</strong> ${occurrence._id}</p>
          <p><strong>Tipo:</strong> ${occurrence.type}</p>
          <p><strong>Status:</strong> ${occurrence.status}</p>
          <p><strong>Descrição:</strong> ${occurrence.description}</p>
        </div>
      `;

      const adminEmails = await this.getAdminEmails();
      const supportEmails = await this.getSupportEmails();
      const emailPromises = adminEmails.map((admin) =>
        this.sendEmail(admin.email, subject, htmlContent)
      );

      await Promise.all(emailPromises);
      console.log("✅ Notificações enviadas para os administradores");
    } catch (error) {
      console.error("❌ Erro ao notificar administradores:", error);
    }
  }

  async getAdminEmails() {
    try {
      const admins = await Admin.find({}, "email name");
      return admins.map((admin) => ({
        email: admin.email,
        name: admin.name,
      }));
    } catch (error) {
      console.error("❌ Erro ao buscar emails dos admins:", error);
      return [];
    }
  }

  async notifyAdminsNewStoreRegistration(storeData) {
    try {
      const admins = await this.getAdminEmails();

      if (admins.length === 0) {
        console.warn("⚠️ Nenhum administrador encontrado para notificar");
        return { success: false, message: "Nenhum administrador encontrado" };
      }

      const adminEmails = admins.map((admin) => admin.email);

      const subject = "🆕 Novo Cadastro de Estabelecimento - Gringo Delivery";

      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c3e50;">🆕 Novo Estabelecimento Cadastrado</h2>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #495057; margin-top: 0;">Informações do Estabelecimento:</h3>
            
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #6c757d;">Nome do Negócio:</td>
                <td style="padding: 8px 0;">${
                  storeData.businessName || "Não informado"
                }</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #6c757d;">Nome de Exibição:</td>
                <td style="padding: 8px 0;">${
                  storeData.displayName || "Não informado"
                }</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #6c757d;">Email:</td>
                <td style="padding: 8px 0;">${
                  storeData.email || "Não informado"
                }</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #6c757d;">Telefone:</td>
                <td style="padding: 8px 0;">${
                  storeData.phone || "Não informado"
                }</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #6c757d;">CNPJ:</td>
                <td style="padding: 8px 0;">${
                  storeData.cnpj || "Não informado"
                }</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #6c757d;">Endereço:</td>
                <td style="padding: 8px 0;">
                  ${
                    storeData.address
                      ? `${storeData.address.address || ""}, ${
                          storeData.address.bairro || ""
                        }, ${storeData.address.cidade || ""} - ${
                          storeData.address.cep || ""
                        }`
                      : "Não informado"
                  }
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #6c757d;">Data de Cadastro:</td>
                <td style="padding: 8px 0;">${new Date().toLocaleString(
                  "pt-BR"
                )}</td>
              </tr>
            </table>
          </div>

          <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0; color: #856404;">
              <strong>⚠️ Ação Necessária:</strong> 
              Este estabelecimento precisa ter seu CNPJ aprovado para começar a receber pedidos.
            </p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <p style="color: #6c757d;">
              Acesse o painel administrativo para revisar e aprovar este cadastro.
            </p>
          </div>

          <hr style="border: none; border-top: 1px solid #e9ecef; margin: 30px 0;">
          
          <p style="font-size: 12px; color: #6c757d; text-align: center;">
            Este é um email automático d    o sistema Gringo Delivery.<br>
            Não responda este email.
          </p>
        </div>
      `;

      const result = await this.sendEmail(adminEmails, subject, htmlContent);

      if (result.success) {
        console.log(
          `📧 Email de novo cadastro enviado para ${adminEmails.length} administradores`
        );
      }

      return result;
    } catch (error) {
      console.error("❌ Erro ao notificar admins sobre novo cadastro:", error);
      return { success: false, error: error.message };
    }
  }

  async notifyUserAccessLiberation(user) {
    const email = user.email;
    const subject = "Acesso Liberado";
    const htmlContent = `
      <div>
        <h1>Olá ${user.businessName},</h1>
        <p>Seu acesso foi liberado com sucesso!</p>
      </div>
    `;

    const result = await this.sendEmail([email], subject, htmlContent);

    if (result.success) {
      console.log(`📧 Email de liberação de acesso enviado para ${email}`);
    }

    return result;
  }

  async notifyUserAccessReproval(user) {
    const email = user.email;
    const subject = "Acesso Restringido";
    const htmlContent = `
      <div>
        <h1>Olá ${user.businessName},</h1>
        <p>Seu acesso foi restringido.</p>
      </div>
    `;

    const result = await this.sendEmail([email], subject, htmlContent);

    if (result.success) {
      console.log(`📧 Email de reprovação de acesso enviado para ${email}`);
    }

    return result;
  }

  // Método para testar a configuração de email
  async testEmailConfiguration() {
    try {
      if (!this.transporter) {
        throw new Error("Transporter não inicializado");
      }

      await this.transporter.verify();
      console.log("✅ Configuração de email verificada com sucesso");
      return { success: true, message: "Configuração de email válida" };
    } catch (error) {
      console.error("❌ Erro na configuração de email:", error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new EmailService();
