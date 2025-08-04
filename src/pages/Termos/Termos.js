import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  CircularProgress,
  Alert,
  Divider,
  AppBar,
  Toolbar,
  IconButton,
} from "@mui/material";
import { ArrowBack as ArrowBackIcon } from "@mui/icons-material";
import { useAuth } from "../../contexts/AuthContext";
import { getUserProfile, getMotoboyByFirebaseUid } from "../../services/api";

const Termos = () => {
  const { type } = useParams(); // 'driver' ou 'store'
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  const [contractText, setContractText] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        if (currentUser) {
          let response;

          if (type === "driver") {
            // Para drivers, buscar dados do motoboy usando o Firebase UID
            const firebaseUid = currentUser.uid;
            console.log("Firebase UID do driver:", firebaseUid);
            response = await getMotoboyByFirebaseUid(firebaseUid);
            console.log("Dados do motoboy:", response.data);
          } else {
            // Para estabelecimentos, usar a função padrão
            response = await getUserProfile();
            console.log("Dados do usuário:", response.data);
          }

          setUserProfile(response.data);
        }
      } catch (error) {
        console.error("Erro ao carregar dados do usuário:", error);
        setError("Não foi possível carregar os dados do usuário");
      }
    };

    fetchUserData();
  }, [currentUser, type]);

  useEffect(() => {
    const loadContract = async () => {
      try {
        let contractContent = "";

        if (type === "driver") {
          // Contrato para motoboy
          contractContent = `TERMO DE USO DA PLATAFORMA GRINGO DELIVERY

GRINGO DELIVERY LTDA, pessoa jurídica de direito privado, inscrita no CNPJ n.º 55.742.346/0001-57, com sede na Avenida Oscar Chiarelli Filho, n.º 243, Bairro Residencial Ype, Cidade de Mogi-Guaçu, Estado de São Paulo, CEP 13846-770, e o Usuário (motoboy cadastrante pode ser dados pessoais ou ID), identificado por {{NOME_USUARIO}}, CPF {{CPF_USUARIO}}, {{RG_USUARIO}} e {{ENDERECO_USUARIO}}, celebram o presente Termo de Uso, que passa a reger a utilização da plataforma Gringo Delivery, conforme as cláusulas e condições abaixo:

1. INTRODUÇÃO
Este Termo de Uso estabelece as regras e condições para a utilização da plataforma Gringo Delivery por motoboys cadastrados, sendo essencial sua leitura e aceitação antes da adesão ao sistema.
A Gringo Delivery atua exclusivamente como intermediadora de entregas, organizando as solicitações e conectando motoboys a demandas de transporte. Não há qualquer vínculo empregatício entre as partes.

2. POLÍTICA DE PRIVACIDADE E USO DE DADOS
2.1. A Gringo Delivery poderá coletar, armazenar e utilizar dados pessoais dos motoboys, incluindo informações bancárias e de identificação, exclusivamente para operacionalização dos serviços.
2.2. A Gringo Delivery não compartilhará dados pessoais dos motoboys com terceiros sem consentimento, salvo determinação legal ou exigência governamental.

3. REGRAS SOBRE CANCELAMENTO DE CORRIDAS
3.1. O motoboy poderá cancelar uma entrega sem penalidade, desde que o faça dentro do prazo estipulado no aplicativo.
3.2. Cancelamentos excessivos e sem justificativa poderão resultar em advertências, bloqueios temporários ou até mesmo exclusão da plataforma.

4. LIMITAÇÃO DE RESPONSABILIDADE
4.1. A Gringo Delivery não se responsabiliza por:
- Problemas mecânicos no veículo do motoboy;
- Erros no funcionamento do GPS ou falhas na conexão de internet;
- Multas de trânsito ou penalidades aplicadas ao motoboy durante a prestação do serviço;
- Questões meteorológicas que possam impactar o transporte.
- Quaisquer erros que não estejam vinculados a indicação da corrida ou da oferta de entrega.
4.2. Reclamações de clientes sobre atrasos, danos ao produto ou erros na entrega devem ser solucionadas diretamente pelo motoboy, sem qualquer interferência ou responsabilidade da Gringo Delivery.

5. CONDIÇÕES PARA USO DO APLICATIVO
5.1. É proibido o uso indevido do app, incluindo:
- Fraudes no cadastro ou alteração de dados falsos;
- Repasse de corridas para terceiros não cadastrados;
- Uso do aplicativo para qualquer finalidade que extrapole a intermediação de entregas.
5.2. O motoboy deve utilizar seu próprio telefone e conexão de internet, sem que a Gringo Delivery tenha qualquer obrigação de fornecer suporte técnico.

6. REGRAS PARA DESATIVAÇÃO DO PERFIL
6.1. O motoboy pode solicitar a exclusão de sua conta, desde que não possua pendências financeiras ou entregas em andamento.
6.2. A Gringo Delivery poderá desativar perfis nas seguintes situações:
• Inatividade prolongada, sem justificativa;
• Fraudes, irregularidades ou descumprimento reiterado das regras;
• Violação grave de conduta, que comprometa a integridade da plataforma.

7. USO DE MATERIAIS DA PLATAFORMA
7.1. É proibido o uso indevido da marca, logo, imagens ou textos da Gringo Delivery sem autorização expressa.
7.2. O aplicativo não pode ser utilizado para finalidades que extrapolem a intermediação de entregas, sendo vetada qualquer modificação ou cópia de seu conteúdo.

8. DA NATUREZA DA RELAÇÃO ENTRE AS PARTES
8.1. Não há vínculo empregatício entre a Gringo Delivery e os motoboys cadastrados, que atuam como prestadores de serviço autônomos.
8.2. Preferencialmente, o motoboy deve estar cadastrado como MEI (Microempreendedor Individual) ou outra empresa cadastrada. Caso opte por receber pagamentos via CPF, será responsável por impostos e tributos aplicáveis.
8.3. Se houver determinação oficial do governo para o recolhimento de impostos ou tributos devidos pelo motoboy, a Gringo Delivery poderá realizar o recolhimento conforme a legislação vigente, sem assumir qualquer responsabilidade adicional.

9. DAS SOLICITAÇÕES DE SERVIÇO
9.1. A plataforma Gringo Delivery apenas repassa e organiza as demandas de serviço, não sendo parte da entrega em si.
9.2. O motoboy tem total liberdade para aceitar ou recusar qualquer solicitação de entrega disponibilizada no aplicativo.

10. DA RESPONSABILIDADE DO MOTOBOY
10.1. O motoboy será exclusivamente responsável pelo serviço prestado, incluindo:
- Atrasos na entrega, após retirar o produto ou mercadoria do estabelecimento;
- Erros operacionais ou danos à mercadoria ou produto;
- Reclamações de clientes relacionadas ao transporte e entrega.
10.2. A Gringo Delivery não responde por prejuízos decorrentes da prestação do serviço ou no percurso.

11. PENALIDADES E EXCLUSÃO DA PLATAFORMA
11.1. O motoboy poderá ser removido da plataforma nos seguintes casos:
- Acúmulo de 3 notificações por irregularidades;
- Prática de crimes ou atos graves que a Gringo Delivery considerar inaceitáveis;
- Violação grave da política de uso do aplicativo.

12. SOLUÇÃO DE CONFLITOS E ARBITRAGEM
12.1. Qualquer disputa relacionada ao uso da plataforma deverá ser resolvida preferencialmente na via administrativa, evitando processos judiciais prolongados.
12.2. Caso seja necessária uma ação legal, fica eleito o foro da Comarca de Mogi-Guaçu, Estado de São Paulo, com exclusão de qualquer outro.

13. DISPOSIÇÕES FINAIS
13.1. A aceitação deste Termo de Uso implica concordância integral com as disposições aqui estabelecidas.
13.2. A Gringo Delivery reserva-se o direito de alterar este Termo, mediante aviso prévio na plataforma ou email.

Mogi-Guaçu, Estado de São Paulo, {{DATA_ATUAL}}.
GRINGO DELIVERY LTDA`;
        } else if (type === "store") {
          // Contrato para estabelecimento
          contractContent = `CONTRATO DE PRESTAÇÃO DE SERVIÇOS

Pelo presente instrumento particular, de um lado, {{NOME_ESTABELECIMENTO}}, pessoa jurídica cadastrada no CNPJ n.º {{CNPJ_ESTABELECIMENTO}}, sediada na {{ENDERECO_ESTABELECIMENTO}}, doravante denominada CONTRATANTE.
Do outro lado, GRINGO DELIVERY LTDA, pessoa jurídica de direito privado, inscrita no CNPJ sob o n.º 55.742.346/0001-57, com sede na Avenida Oscar Chiarelli Filho, n.º 243, Bairro Residencial Ype, Cidade de Mogi-Guaçu, Estado de São Paulo, CEP 13846-770, doravante denominada CONTRATADA, têm entre si justo e acordado o presente Contrato de Prestação de Serviços, que será regido pelas cláusulas e condições a seguir:

CLÁUSULA PRIMEIRA – DO OBJETO
1. O presente contrato tem por objeto a prestação de serviços de entrega, indicação e ou intermediação pela CONTRATADA, por meio de sua plataforma de entregas, utilizando-se de motoboys terceirizados para a prestação dos serviços da CONTRATANTE aos seus clientes.

CLÁUSULA SEGUNDA – DO VALOR DOS SERVIÇOS
2.1. A CONTRATANTE pagará à CONTRATADA o valor mensal de R$ {{VALOR_MENSAL}} pelos serviços supracitados, que será pago todo dia 05 através da chave pix da Contratada ou mediante outra forma de pagamento previamente informada.
2.2. Além do valor mensal, será cobrada uma taxa de R$ {{TAXA_MOTOBOY}} por cada acionamento de motoboy, pago semanalmente, salvo acordo diferente entre as partes.
2.3. Em caso de atraso no pagamento, a CONTRATANTE estará sujeita a juros diários de 0,3% e multa de 2%, além de correção monetária.
2.4. O inadimplemento de 3 mensalidades consecutivas dará direito à CONTRATADA de rescindir o contrato e cobrar os valores pendentes.
2.5. Em situações de alta demanda, condições climáticas adversas ou eventos de caso fortuito ou força maior, a CONTRATADA poderá ajustar temporariamente o valor dos acionamentos, informando a CONTRATANTE com antecedência razoável.
2.6. Os valores mensais poderão ser reajustados mediante aviso prévio de 30 dias em caso de aumento de custos operacionais ou econômicos fora do controle da CONTRATADA.

CLÁUSULA TERCEIRA – DA PROTEÇÃO CONTRA CONCORRÊNCIA E CONTRATAÇÃO DIRETA
3.1. A CONTRATANTE compromete-se a não contratar diretamente nenhum dos motoboys cadastrados na plataforma da CONTRATADA, salvo mediante autorização expressa e por escrito da CONTRATADA.
3.2. Durante a vigência deste contrato e por um período de 12 (doze) meses após o término, a CONTRATANTE compromete-se a não aderir ou contratar os serviços de plataformas concorrentes sem antes comunicar a CONTRATADA, com antecedência mínima de 90 (noventa) dias, para permitir uma nova negociação.
3.3. A CONTRATANTE poderá aderir a outras empresas de entrega para atender a sua demanda.

CLÁUSULA QUARTA – DO PRAZO E RESCISÃO
4.1. O presente contrato vigorará por prazo indeterminado, podendo ser rescindido por qualquer das partes mediante aviso prévio por escrito de, no mínimo, 30 (trinta) dias.
4.2. A rescisão unilateral por qualquer das partes sem a observância do prazo de aviso prévio implicará no pagamento de multa diária no valor da mensalidade vigente à época quanto aos dias restantes.

CLÁUSULA QUINTA – DA PROTEÇÃO DAS INFORMAÇÕES
5.1. As partes concordam em manter confidenciais todas as informações comerciais, operacionais e financeiras obtidas no curso da execução deste contrato. As informações compartilhadas entre as partes serão protegidas nos termos de um Acordo de Confidencialidade em anexo a este contrato.
5.2. As partes comprometem-se a não divulgar ou compartilhar tais informações, bem como quaisquer dados confidenciais ou de mercado das empresas com terceiros sem o consentimento prévio e por escrito da outra parte, sob pena de responsabilização civil e penal, seguindo os termos da LGPD.

CLÁUSULA SEXTA – DA RESPONSABILIDADE DOS ENTREGADORES
6.1. A CONTRATADA não será responsável por eventuais problemas decorrentes das entregas, tais como atrasos, erros de entrega ou reclamações dos clientes, sendo que toda a responsabilidade por esses fatos será exclusiva dos motoboys que realizarem o serviço.
6.2. Eventuais reclamações ou ações judiciais decorrentes de falhas nas entregas realizadas serão de inteira responsabilidade dos motoboys, sem que haja qualquer responsabilização direta da CONTRATADA.
6.3. A CONTRATANTE poderá solicitar informações ou determinar restrições a determinados entregadores por eventuais problemas, desde que comunicado à CONTRATADA com antecedência de 1 dia, para fins de gestão dos prestadores de serviços.

CLÁUSULA SÉTIMA – DA LIMITAÇÃO DE RESPONSABILIDADE
7.1. A CONTRATADA não será responsável por lucros cessantes ou qualquer perda financeira decorrente de atrasos, falhas na entrega ou no pedido causados por fatores externos, como trânsito intenso, condições climáticas adversas ou eventos de força maior, instabilidade de sistema de terceiros, etc.

CLÁUSULA OITAVA – DA PROTEÇÃO À PROPRIEDADE INTELECTUAL
8.1. A CONTRATANTE compromete-se a não utilizar o nome, logotipo, marca, estratégia comercial, logística ou qualquer outra propriedade intelectual da CONTRATADA em materiais externos ou internos sem autorização prévia por escrito.

CLÁUSULA NONA – DA REVISÃO PERIÓDICA
9.1. As partes poderão revisar as taxas e condições contratuais a cada 12 meses, considerando ajustes de mercado e custos operacionais, mediante aviso prévio de 30 dias.

CLÁUSULA DÉCIMA – DAS DISPOSIÇÕES GERAIS
10.1. As alterações ao presente contrato serão válidas somente quando acordadas por escrito entre as partes.
10.2. Fica eleito o foro da Comarca de Mogi-Guaçu para dirimir quaisquer controvérsias, com renúncia a qualquer outro foro.

E por estarem de acordo, as partes assinam o presente contrato de forma eletrônica, com a presença de duas testemunhas abaixo identificadas.

{{DATA_ATUAL}}
Mogi-Guaçu, Estado de São Paulo.

ACORDO DE CONFIDENCIALIDADE (NDA)

As partes, já devidamente qualificadas no presente resolvem celebrar o presente Acordo de Confidencialidade, mediante as cláusulas e condições a seguir estipuladas:

CLÁUSULA PRIMEIRA – DO OBJETO
1.1. O presente acordo tem por objeto a proteção de todas as informações confidenciais trocadas entre as partes durante o período de vigência do relacionamento comercial, seja em formato físico, eletrônico ou verbal.

CLÁUSULA SEGUNDA – DAS INFORMAÇÕES CONFIDENCIAIS
2.1. Para os fins deste acordo, consideram-se Informações Confidenciais todas as informações de natureza técnica, comercial, financeira ou operacional, incluindo, mas não se limitando a:
• Planos de negócios e estratégias de mercado;
• Dados de clientes, fornecedores e parceiros;
• Informações financeiras e contábeis;
• Propriedade intelectual, incluindo segredos comerciais, know-how e fórmulas;
• Informações relacionadas aos sistemas e processos internos da PARTE DIVULGADORA.

2.2. As informações serão consideradas confidenciais independentemente de serem ou não identificadas expressamente como tal no momento de sua divulgação.

CLÁUSULA TERCEIRA – OBRIGAÇÕES DAS PARTES
As partes se comprometem-se a:
a) Manter a confidencialidade de todas as informações confidenciais recebidas, não divulgando, transferindo ou permitindo o acesso de tais informações a terceiros sem o prévio consentimento por escrito da Parte Divulgadora;
b) Utilizar as Informações Confidenciais exclusivamente para os fins específicos acordados entre as partes, no âmbito da prestação de serviços;
c) Adotar todas as medidas necessárias para garantir que seus funcionários, colaboradores e terceiros que eventualmente tenham acesso às informações confidenciais respeitem os termos deste acordo;
d) Restituir ou destruir todas as Informações Confidenciais recebidas, a critério da PARTE DIVULGADORA, em até 30 (trinta) dias após o término do relacionamento comercial entre as partes.

CLÁUSULA QUARTA – DAS EXCLUSÕES
4.1. Não serão consideradas Informações Confidenciais aquelas que:
a) Já eram de conhecimento público antes de sua divulgação pela PARTE DIVULGADORA;
b) Tornarem-se de domínio público por meios que não envolvam violação deste acordo por parte da PARTE RECEBEDORA;
c) Já eram conhecidas pela PARTE RECEBEDORA, desde que tal conhecimento possa ser comprovado documentalmente;
d) Forem divulgadas à PARTE RECEBEDORA por terceiros que não tenham obrigações de confidencialidade com a PARTE DIVULGADORA.

CLÁUSULA QUINTA – DO PRAZO DE VIGÊNCIA
5.1. O presente acordo entrará em vigor na data de sua assinatura e permanecerá válido por todo o período de relacionamento comercial entre as partes, estendendo-se por um prazo de 2 (dois) anos após o término de tal relacionamento.
5.2. A obrigação de confidencialidade estabelecida neste contrato persistirá mesmo após o término ou rescisão do vínculo comercial entre as partes.

CLÁUSULA SEXTA – DAS PENALIDADES
6.1. A violação de qualquer disposição deste acordo pela PARTE RECEBEDORA resultará na obrigação de indenizar a PARTE DIVULGADORA por todos os danos diretos e indiretos, perdas e prejuízos que possam advir de tal violação, inclusive lucros cessantes, além de outras medidas judiciais cabíveis.

CLÁUSULA SÉTIMA – DA RESCISÃO
7.1. Este acordo poderá ser rescindido por qualquer das partes mediante notificação por escrito com 30 (trinta) dias de antecedência.
7.2. A rescisão do presente acordo não exime a PARTE RECEBEDORA das obrigações de confidencialidade previstas na Cláusula Quinta.

CLÁUSULA OITAVA – DAS DISPOSIÇÕES GERAIS
8.1. Este acordo não cria qualquer vínculo empregatício, societário, associativo ou de representação entre as partes, sendo cada uma delas responsável por suas respectivas atividades.
8.2. Nenhuma das partes poderá ceder ou transferir os direitos e obrigações deste acordo a terceiros sem o consentimento prévio e por escrito da outra parte.
8.3. Qualquer alteração a este acordo deverá ser formalizada por meio de aditivo contratual assinado por ambas as partes.
8.4. Fica eleito o foro da Comarca de Mogi-Guaçu, com exclusão de qualquer outro, por mais privilegiado que seja, para dirimir eventuais litígios oriundos deste acordo.

E, por estarem justas e acordadas, as partes assinam o presente Acordo de Confidencialidade com a firma de 2 (duas) testemunhas.`;
        } else {
          setError("Tipo de contrato inválido");
          setLoading(false);
          return;
        }

        setContractText(contractContent);
        setLoading(false);
      } catch (error) {
        console.error("Erro ao carregar contrato:", error);
        setError("Erro ao carregar os termos de serviço");
        setLoading(false);
      }
    };

    loadContract();
  }, [type]);

  const formatContractWithUserData = (contractText, userData, type) => {
    if (!userData) return contractText;

    let formattedContract = contractText;
    const currentDate = new Date().toLocaleDateString("pt-BR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Substituições comuns
    formattedContract = formattedContract.replace(
      /{{DATA_ATUAL}}/g,
      currentDate
    );

    if (type === "driver") {
      // Substituições para motoboy
      formattedContract = formattedContract.replace(
        /{{NOME_USUARIO}}/g,
        userData.name || "Nome não informado"
      );
      formattedContract = formattedContract.replace(
        /{{CPF_USUARIO}}/g,
        userData.cpf || "CPF não informado"
      );
      formattedContract = formattedContract.replace(
        /{{RG_USUARIO}}/g,
        userData.rg || "RG não informado"
      );
      formattedContract = formattedContract.replace(
        /{{ENDERECO_USUARIO}}/g,
        userData.address || "Endereço não informado"
      );
    } else if (type === "store") {
      // Substituições para estabelecimento
      const formatAddress = (address) => {
        if (!address) return "Endereço não informado";
        if (typeof address === "string") return address;

        const parts = [];
        if (address.address) parts.push(address.address);
        if (address.number) parts.push(`n.º ${address.number}`);
        if (address.neighborhood) parts.push(address.neighborhood);
        if (address.city) parts.push(address.city);
        if (address.state) parts.push(address.state);
        if (address.zipCode) parts.push(`CEP ${address.zipCode}`);

        return parts.length > 0 ? parts.join(", ") : "Endereço não informado";
      };

      formattedContract = formattedContract.replace(
        /{{NOME_ESTABELECIMENTO}}/g,
        userData.businessName ||
          userData.displayName ||
          "Estabelecimento não informado"
      );
      formattedContract = formattedContract.replace(
        /{{CNPJ_ESTABELECIMENTO}}/g,
        userData.cnpj || "CNPJ não informado"
      );
      formattedContract = formattedContract.replace(
        /{{ENDERECO_ESTABELECIMENTO}}/g,
        formatAddress(userData.address)
      );

      // Substituições de valores de billing
      formattedContract = formattedContract.replace(
        /{{VALOR_MENSAL}}/g,
        userData.billingOptions?.monthlyFee || "valor não informado"
      );
      formattedContract = formattedContract.replace(
        /{{TAXA_MOTOBOY}}/g,
        userData.billingOptions?.motoBoyFee || "valor não informado"
      );
    }

    return formattedContract;
  };

  const getPageTitle = () => {
    if (type === "driver") {
      return "Termos de Uso - Motoboy";
    } else if (type === "store") {
      return "Contrato de Prestação de Serviços - Estabelecimento";
    }
    return "Termos de Serviço";
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant="outlined" onClick={handleGoBack}>
          Voltar
        </Button>
      </Container>
    );
  }

  const formattedContract = formatContractWithUserData(
    contractText,
    userProfile,
    type
  );

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      {/* AppBar */}
      <AppBar position="sticky" sx={{ bgcolor: "primary.main" }}>
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={handleGoBack}
            sx={{ mr: 2 }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {getPageTitle()}
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 4, textAlign: "center" }}>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: "bold" }}>
            {getPageTitle()}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Última atualização: {new Date().toLocaleDateString("pt-BR")}
          </Typography>
        </Box>

        {/* Informações do usuário */}
        {userProfile && (
          <Paper
            sx={{
              p: 3,
              mb: 4,
              bgcolor: "primary.light",
              color: "primary.contrastText",
            }}
          >
            <Typography variant="h6" gutterBottom>
              Informações do Usuário
            </Typography>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                gap: 2,
              }}
            >
              {type === "driver" ? (
                <>
                  <Typography>
                    <strong>Nome:</strong> {userProfile.name || "Não informado"}
                  </Typography>
                  <Typography>
                    <strong>CPF:</strong> {userProfile.cpf || "Não informado"}
                  </Typography>
                  <Typography>
                    <strong>Email:</strong>{" "}
                    {userProfile.email || "Não informado"}
                  </Typography>
                  <Typography>
                    <strong>Telefone:</strong>{" "}
                    {userProfile.phoneNumber || "Não informado"}
                  </Typography>
                </>
              ) : (
                <>
                  <Typography>
                    <strong>Estabelecimento:</strong>{" "}
                    {userProfile.businessName ||
                      userProfile.displayName ||
                      "Não informado"}
                  </Typography>
                  <Typography>
                    <strong>CNPJ:</strong> {userProfile.cnpj || "Não informado"}
                  </Typography>
                  <Typography>
                    <strong>Email:</strong>{" "}
                    {userProfile.email || "Não informado"}
                  </Typography>
                  <Typography>
                    <strong>Telefone:</strong>{" "}
                    {userProfile.phone || "Não informado"}
                  </Typography>
                </>
              )}
            </Box>
          </Paper>
        )}

        {/* Contrato */}
        <Paper sx={{ p: 4 }}>
          <Typography
            variant="body1"
            component="pre"
            sx={{
              whiteSpace: "pre-wrap",
              lineHeight: 1.6,
              fontFamily: "monospace",
              fontSize: "14px",
            }}
          >
            {formattedContract}
          </Typography>
        </Paper>

        {/* Footer com botões */}
        <Box sx={{ mt: 4, display: "flex", justifyContent: "center", gap: 2 }}>
          <Button variant="outlined" onClick={handleGoBack} size="large">
            Voltar
          </Button>
          <Button
            variant="contained"
            onClick={() => window.print()}
            size="large"
          >
            Imprimir/Salvar PDF
          </Button>
        </Box>

        {/* Disclaimer */}
        <Box sx={{ mt: 4, p: 2, bgcolor: "warning.light", borderRadius: 1 }}>
          <Typography variant="body2" color="warning.contrastText">
            <strong>Importante:</strong> Este documento foi gerado
            automaticamente com base nos dados cadastrados em sua conta.
            Verifique se todas as informações estão corretas antes de
            prosseguir. Em caso de dúvidas, entre em contato com nosso suporte.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default Termos;
