const Travel = require("../models/Travel");
const Motoboy = require("../models/Motoboy");

class TravelService {
  // Função para calcular o novo score baseado na velocidade e dados da viagem
  calculateScoreUpdate(velocidade, distance, minutesDiff, customerCount) {
    try {
      // Validações iniciais
      if (distance <= 0 || minutesDiff <= 0) {
        console.warn(
          `Valores inválidos: distance=${distance}, minutesDiff=${minutesDiff}`
        );
        return { rating: 0, isValid: false };
      }

      // Validar se velocidade é um número válido
      if (!isFinite(velocidade) || isNaN(velocidade)) {
        console.error(`Velocidade inválida: ${velocidade}`);
        return { rating: 0, isValid: false };
      }

      // Fórmula dinâmica de avaliação baseada na velocidade
      const velocidadeReferencia = 0.15; // km/min considerada como padrão (9 km/h)
      const fatorEscala = 3.0; // Ajusta a sensibilidade da curva

      const rating =
        0.3 *
        Math.tanh(
          (fatorEscala * (velocidade - velocidadeReferencia)) /
            velocidadeReferencia
        );

      const finalRating = Math.max(-0.3, Math.min(0.3, rating));

      return {
        rating: finalRating,
        isValid: true,
        velocidade,
        distance,
        minutesDiff,
        customerCount,
      };
    } catch (error) {
      console.error(`Erro no cálculo do score: ${error.message}`);
      return { rating: 0, isValid: false };
    }
  }

  // Função para atualizar o score do motoboy no banco de dados
  async updateMotoboyScore(motoboyId, scoreCalculation, travel) {
    try {
      const motoboyScore = await Motoboy.findById(motoboyId).select("score");
      const currentScore = parseFloat(motoboyScore?.score) || 0;

      let newScore;
      const {
        rating,
        isValid,
        velocidade,
        distance,
        minutesDiff,
        customerCount,
      } = scoreCalculation;

      if (!isValid) {
        // Se não temos dados válidos, aplicar rating neutro
        newScore = currentScore;
        console.warn(`Aplicado rating neutro para viagem com dados inválidos`);
      } else {
        // Calcular novo score
        if (currentScore + rating >= 5) {
          newScore = 5;
        } else {
          newScore = rating + currentScore;
        }

        // Validar score final antes de salvar
        if (!isFinite(newScore) || isNaN(newScore)) {
          console.error(`Score final inválido: ${newScore}`);
          throw new Error("Erro no cálculo do score final");
        }
      }

      // Atualizar motoboy no banco
      const updatedMotoboy = await Motoboy.findByIdAndUpdate(
        motoboyId,
        {
          score: newScore,
          isAvailable: true,
          race: { active: false },
        },
        { new: true }
      );

      // Log detalhado apenas se os dados são válidos
      if (isValid) {
        console.warn(
          `motoboy atualizado: ${
            updatedMotoboy.name
          }, nova score: ${newScore.toFixed(
            3
          )}, finalRating da viagem: ${rating.toFixed(
            3
          )}, velocidade: ${velocidade.toFixed(
            3
          )} km/min, distance: ${distance} km, tempo: ${minutesDiff.toFixed(
            2
          )} min, clientes: ${customerCount}`
        );
      }

      return updatedMotoboy;
    } catch (error) {
      console.error(`Erro ao atualizar score do motoboy: ${error.message}`);
      throw error;
    }
  }
  // Métodos do serviço de viagens
  async updateTravelStatus(id, status) {
    try {
      let travel;
      console.warn(`Atualizando status da viagem ${id} para ${status}`);
      if (status === "em_entrega") {
        // Lógica para quando a viagem está em entrega
        travel = await Travel.findByIdAndUpdate(
          id,
          {
            status: status,
            dispatchAt: new Date(),
          },
          { new: true }
        );
      } else if (status === "entregue") {
        // Lógica para quando a viagem foi entregue
        travel = await Travel.findByIdAndUpdate(
          id,
          {
            status: status,
            deliveryTime: new Date(),
          },
          { new: true }
        );
      } else {
        // Para outros status, apenas atualizar o status
        travel = await Travel.findByIdAndUpdate(
          id,
          {
            status: status,
          },
          { new: true }
        );
      }

      if (status === "entregue") {
        // Validações para evitar NaN
        if (!travel.dispatchAt) {
          console.error("Erro: dispatchAt não definido");
          throw new Error("Dados de tempo da viagem incompletos");
        }

        const dispatchAt = new Date(travel.dispatchAt);
        const deliveryTime = new Date();
        const timeDiff = Math.abs(deliveryTime - dispatchAt);
        const minutesDiff = timeDiff / (1000 * 60);

        // Validar se os valores são válidos
        const distance = parseFloat(travel.distance) || 0;
        const customerCount = parseInt(travel.customerCount) || 1;

        // Calcular velocidade
        const velocidade = (distance / minutesDiff) * customerCount;

        // Calcular atualização do score usando função modular
        const scoreCalculation = this.calculateScoreUpdate(
          velocidade,
          distance,
          minutesDiff,
          customerCount
        );

        // Atualizar score do motoboy usando função modular
        await this.updateMotoboyScore(
          travel.motoboyId,
          scoreCalculation,
          travel
        );

        await this.additionalBonusForLatePrepare(travel);
      }

      return travel;
    } catch (error) {
      return { message: error.message };
    }
  }

  async additionalBonusForLatePrepare(travel) {
    try {
      const timeDiff = Math.abs(travel.dispatchAt - travel.createdAt);
      if (timeDiff > 15 * 60 * 1000) {
        // se passou mais de 15 minutos
        const bonus = (Math.abs(timeDiff - 15 * 60 * 1000) / (60 * 1000)) * 0.3; // R$0,30 por minuto extra
        travel.price += bonus;
        travel.finance.value += bonus;
        travel.finance.bonus = bonus;
        await travel.save();
        console.warn(
          `Bônus de R$${bonus.toFixed(2)} adicionado para a viagem ${
            travel._id
          } por atraso na preparação.`
        );
      } else {
        console.warn(`Nenhum bônus aplicado para a viagem ${travel._id}.`);
      }

      return travel;
    } catch (error) {
      console.error(`Erro ao adicionar bônus: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new TravelService();
