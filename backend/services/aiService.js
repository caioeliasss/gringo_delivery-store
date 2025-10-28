const axios = require("axios");

/**
 * Serviço de IA para gerar respostas automáticas para ocorrências
 */
class AIService {
  constructor() {
    // Você pode usar OpenAI, Google Gemini, Anthropic, ou qualquer outra API
    // Para demonstração, vou usar uma implementação que pode ser facilmente adaptada
    this.apiKey = process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY;
    this.provider = process.env.AI_PROVIDER || "openai"; // 'openai', 'gemini', 'anthropic'
  }

  /**
   * Gera uma resposta de IA baseada na descrição da ocorrência
   * @param {string} description - Descrição da ocorrência
   * @param {string} type - Tipo da ocorrência
   * @returns {Promise<string>} - Resposta gerada pela IA
   */
  async generateOccurrenceResponse(description, type = "OUTRO") {
    try {
      // Se não houver API key configurada, retorna uma resposta padrão
      if (!this.apiKey) {
        return this.generateDefaultResponse(description, type);
      }

      // Contexto específico para o sistema de delivery
      const systemPrompt = this.buildSystemPrompt(type);
      const userPrompt = `Ocorrência reportada: ${description}`;

      switch (this.provider) {
        case "openai":
          return await this.callOpenAI(systemPrompt, userPrompt);
        case "gemini":
          return await this.callGemini(systemPrompt, userPrompt);
        case "anthropic":
          return await this.callAnthropic(systemPrompt, userPrompt);
        default:
          return this.generateDefaultResponse(description, type);
      }
    } catch (error) {
      console.error("Erro ao gerar resposta da IA:", error);
      return this.generateDefaultResponse(description, type);
    }
  }

  /**
   * Constrói o prompt do sistema baseado no tipo de ocorrência
   */
  buildSystemPrompt(type) {
    const basePrompt = `Você é o GringoBot, uma assistente de atendimento ao cliente especializada da Gringo Delivery, focada em resolver problemas de entrega de comida.

CONTEXTO: Você está respondendo a uma ocorrência reportada por um cliente/usuário do sistema de delivery.

PERSONALIDADE E TOM:
- Empática, calorosa e genuinamente preocupada
- Profissional mas humana e acessível
- Proativa em oferecer soluções
- Transparente sobre processos e prazos
- Confiável e reasseguradora

DIRETRIZES DE RESPOSTA:
- Use português brasileiro natural e fluido
- Seja específica com tempos e próximos passos
- Ofereça alternativas quando possível
- Demonstre que entende a frustração do cliente
- Inclua informações de acompanhamento quando relevante
- LIMITE RIGOROSO: máximo 380 palavras (seja concisa e objetiva)
- Evite linguagem muito técnica ou corporativa
- Personalize a resposta baseada no contexto da ocorrência
- Priorize as informações mais importantes se precisar encurtar

ESTRUTURA SUGERIDA:
1. Reconhecimento empático do problema
2. Explicação clara do que será feito
3. Próximos passos específicos com prazos
4. Como o cliente pode acompanhar ou entrar em contato`;

    const typeSpecificPrompts = {
      CLIENTE: `FOCO: Experiência e satisfação do cliente
- Investigue a causa raiz do problema
- Ofereça compensação apropriada quando necessário  
- Demonstre como evitaremos problemas similares no futuro
- Inclua formas de contato direto para casos complexos`,

      ENTREGA: `FOCO: Logística e rastreamento de pedidos
- Forneça status atual específico quando possível
- Explique fatores que podem afetar entregas (trânsito, clima, etc.)
- Ofereça alternativas como retirada no local
- Inclua estimativas realistas de tempo de resolução`,

      PAGAMENTO: `FOCO: Segurança financeira e transparência
- Tranquilize sobre proteção de dados e segurança das transações
- Explique claramente processos de reembolso com prazos específicos
- Ofereça canais diretos para questões financeiras urgentes
- Seja transparente sobre taxas e políticas de cobrança`,

      PRODUTO: `FOCO: Qualidade alimentar e satisfação
- Demonstre preocupação com saúde e satisfação
- Explique processo de comunicação com restaurantes
- Ofereça opções de substituição, reembolso ou desconto
- Inclua como reportar problemas similares no futuro`,

      ESTABELECIMENTO: `FOCO: Parceria e qualidade dos estabelecimentos
- Explique como monitoramos nossos parceiros
- Demonstre que o feedback será compartilhado com o restaurante
- Ofereça alternativas de estabelecimentos similares
- Inclua como a situação será acompanhada`,

      PEDIDO: `FOCO: Gestão de pedidos e modificações
- Forneça status detalhado do pedido quando possível
- Explique políticas de modificação e cancelamento
- Ofereça soluções para problemas específicos do pedido
- Inclua opções de acompanhamento em tempo real`,

      MOTOBOY: `FOCO: Qualidade do serviço de entrega
- Demonstre que levamos a conduta profissional a sério
- Explique processo de feedback e treinamento contínuo
- Assegure que a situação será investigada apropriadamente
- Inclua como reportar problemas futuros diretamente`,

      ENTREGADOR: `FOCO: Profissionalismo na entrega
- Similar ao motoboy, mas com foco em aspectos de atendimento
- Demonstre compromisso com qualidade do serviço
- Explique medidas para garantir profissionalismo
- Ofereça canais para feedback contínuo`,

      APP: `FOCO: Usabilidade e soluções técnicas
- Forneça soluções práticas e imediatas quando possível
- Sugira alternativas (site web, contato telefônico)
- Explique quando atualizações ou correções serão disponibilizadas
- Inclua passos de troubleshooting específicos`,

      EVENTO: `FOCO: Comunicação sobre situações especiais
- Explique claramente o impacto do evento no serviço
- Forneça estimativas realistas de normalização
- Ofereça alternativas durante o período afetado
- Demonstre preparação para eventos futuros similares`,

      ATENDIMENTO: `FOCO: Melhoria da experiência de suporte
- Reconheça falhas no atendimento anterior
- Ofereça escalação para supervisão quando necessário
- Demonstre compromisso com melhoria contínua
- Inclua formas de feedback direto sobre o atendimento`,
    };

    return `${basePrompt}\n\nTipo de ocorrência: ${type}\n${
      typeSpecificPrompts[type] || typeSpecificPrompts["OUTRO"]
    }`;
  }

  /**
   * Chama a API da OpenAI
   */
  async callOpenAI(systemPrompt, userPrompt) {
    // Usar o melhor modelo disponível (GPT-4 ou o modelo mais recente)
    // Modelos disponíveis em ordem de preferência:
    const models = [
      "gpt-4o", // GPT-4 Omni (mais recente e eficiente)
      "gpt-4-turbo", // GPT-4 Turbo (rápido e avançado)
      "gpt-4", // GPT-4 padrão
      "gpt-3.5-turbo", // Fallback para GPT-3.5
    ];

    const selectedModel = process.env.OPENAI_MODEL || models[0];

    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: selectedModel,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 300, // Limitando para máximo 300 palavras
        temperature: 0.7,
        top_p: 0.9, // Melhor qualidade de resposta
        frequency_penalty: 0.1, // Evita repetições
        presence_penalty: 0.1, // Incentiva variedade
      },
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data.choices[0].message.content.trim();
  }

  /**
   * Chama a API do Google Gemini
   */
  async callGemini(systemPrompt, userPrompt) {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${this.apiKey}`,
      {
        contents: [
          {
            parts: [
              {
                text: `${systemPrompt}\n\n${userPrompt}`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 350,
        },
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    return response.data.candidates[0].content.parts[0].text.trim();
  }

  /**
   * Chama a API da Anthropic
   */
  async callAnthropic(systemPrompt, userPrompt) {
    const response = await axios.post(
      "https://api.anthropic.com/v1/messages",
      {
        model: "claude-3-sonnet-20240229",
        max_tokens: 350,
        messages: [
          {
            role: "user",
            content: `${systemPrompt}\n\n${userPrompt}`,
          },
        ],
      },
      {
        headers: {
          "x-api-key": this.apiKey,
          "Content-Type": "application/json",
          "anthropic-version": "2023-06-01",
        },
      }
    );

    return response.data.content[0].text.trim();
  }

  /**
   * Gera uma resposta padrão quando a IA não está disponível
   */
  generateDefaultResponse(description, type) {
    const defaultResponses = {
      CLIENTE:
        "Obrigado por entrar em contato conosco. Entendemos sua preocupação e nossa equipe de atendimento irá analisar seu caso em breve. Estamos comprometidos em resolver sua situação da melhor forma possível.",

      ENTREGA:
        "Recebemos sua ocorrência sobre entrega. Nossa equipe de logística está verificando o status do seu pedido e em breve você receberá uma atualização sobre a situação. Pedimos desculpas por qualquer inconveniente.",

      PAGAMENTO:
        "Sua questão sobre pagamento foi registrada com segurança. Nossa equipe financeira irá revisar sua solicitação e entrar em contato em até 24 horas. Todos os seus dados estão protegidos.",

      PRODUTO:
        "Lamentamos qualquer problema com seu produto. Nossa equipe irá verificar com o restaurante parceiro e trabalhar para uma solução adequada, que pode incluir substituição ou reembolso.",

      ESTABELECIMENTO:
        "Registramos sua ocorrência sobre o estabelecimento. Iremos entrar em contato com nosso parceiro para verificar a situação e garantir que os padrões de qualidade sejam mantidos.",

      PEDIDO:
        "Sua solicitação sobre o pedido foi recebida. Nossa equipe está verificando os detalhes e você receberá uma atualização em breve sobre o status ou próximos passos.",

      MOTOBOY:
        "Agradecemos seu feedback sobre nosso entregador. Levamos a qualidade do serviço muito a sério e sua ocorrência será investigada adequadamente.",

      ENTREGADOR:
        "Sua avaliação sobre o serviço de entrega foi registrada. Nossa equipe de qualidade irá revisar o caso para garantir a excelência do nosso atendimento.",

      APP: "Identificamos um problema técnico relatado. Nossa equipe de desenvolvimento está trabalhando para resolver questões do aplicativo. Tente reiniciar o app ou entre em contato se o problema persistir.",

      EVENTO:
        "Registramos sua ocorrência relacionada a eventos especiais. Nossa equipe está ciente dos impactos e trabalhando para minimizar inconvenientes durante períodos de alta demanda.",

      ATENDIMENTO:
        "Sua experiência de atendimento é muito importante para nós. Nossa supervisão irá revisar seu caso para garantir que você receba o suporte adequado.",

      OUTRO:
        "Sua ocorrência foi registrada e nossa equipe de suporte irá analisar sua situação em detalhes. Entraremos em contato em breve com uma resposta adequada.",
    };

    return defaultResponses[type] || defaultResponses["OUTRO"];
  }

  /**
   * Analisa a prioridade da ocorrência baseada na descrição
   */
  analyzePriority(description, type) {
    const highPriorityKeywords = [
      "urgente",
      "emergência",
      "grave",
      "problema sério",
      "não funciona",
      "perdido",
      "roubado",
      "acidente",
      "emergencial",
      "crítico",
    ];

    const mediumPriorityTypes = ["PAGAMENTO", "ENTREGA", "PRODUTO"];

    const descriptionLower = description.toLowerCase();
    const hasHighPriorityKeyword = highPriorityKeywords.some((keyword) =>
      descriptionLower.includes(keyword)
    );

    if (hasHighPriorityKeyword || mediumPriorityTypes.includes(type)) {
      return "ALTA";
    } else if (["CLIENTE", "ESTABELECIMENTO", "PEDIDO"].includes(type)) {
      return "MÉDIA";
    } else {
      return "BAIXA";
    }
  }
}

module.exports = new AIService();
