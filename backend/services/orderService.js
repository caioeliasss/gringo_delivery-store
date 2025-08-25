const Order = require("../models/Order");
const mongoose = require("mongoose");
const motoboyServices = require("./motoboyServices");
const axios = require("axios");
const geolib = require("geolib");
const DeliveryPrice = require("../models/DeliveryPrice");

class OrderService {
  // Funções auxiliares para busca de dados externos
  async buscarCnpj(cnpj) {
    const API_URL = "https://brasilapi.com.br/api/cnpj/v1";

    const api = axios.create({
      baseURL: API_URL,
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer 123",
      },
    });

    return api.get(`/${cnpj}`);
  }

  async buscarCep(cep) {
    const API_URL = `https://viacep.com.br/ws/${cep}/json/`;

    const api = axios.create({
      baseURL: API_URL,
    });

    return api.get(`/`);
  }

  async buscarCoord(logradoro, cidade, estado) {
    const API_URL = "https://nominatim.openstreetmap.org/search?format=json&q=";

    const api = axios.create({ baseURL: API_URL });

    const formatar = (str) => {
      if (!str || typeof str !== "string") {
        return "";
      }
      return str.replace(/ /g, "+");
    };

    // Verificar se os parâmetros existem antes de usar
    const logradoroFormatado = formatar(logradoro || "");
    const cidadeFormatada = formatar(cidade || "");
    const estadoFormatado = formatar(estado || "");

    if (!logradoroFormatado && !cidadeFormatada) {
      throw new Error("Endereço insuficiente para buscar coordenadas");
    }

    const query = `${logradoroFormatado},+${cidadeFormatada},+${estadoFormatado}`;

    return api.get(query);
  }

  async getCep(cnpj) {
    const response = await this.buscarCnpj(cnpj);
    const cep = response.data.cep;

    let storeName = response.data.nome_fantasia;
    if (!storeName) {
      storeName = response.data.razao_social;
    }

    return { cep, storeName };
  }

  async calculatePrice(coordFrom, cep) {
    const response = await this.buscarCep(cep);
    const addressCustomer = response.data;

    const responseCoord = await this.buscarCoord(
      addressCustomer.logradouro,
      addressCustomer.localidade,
      addressCustomer.uf
    );

    const { lat, lon } = responseCoord.data[0]; // pega o primeiro resultado válido
    const coordTo = { latitude: parseFloat(lat), longitude: parseFloat(lon) };

    let distance = geolib.getDistance(
      { latitude: coordFrom[1], longitude: coordFrom[0] }, // coordFrom no formato [lng, lat]
      coordTo
    );
    distance = distance / 1000;

    const priceList = await DeliveryPrice.findOne();

    if (!priceList) {
      console.log("Price List não encontrado");
      throw new Error("Lista de preços de entrega não encontrada");
    }

    let cost;
    let valorFixo;

    if (priceList.isRain) {
      valorFixo = priceList.priceRain;
    } else if (priceList.isHighDemand) {
      valorFixo = priceList.fixedPriceHigh;
    } else {
      valorFixo = priceList.fixedPrice;
    }

    if (distance > priceList.fixedKm) {
      let bonusDistance = distance - priceList.fixedKm; // Corrigido: era valorFixo - distance
      cost = bonusDistance * priceList.bonusKm;
      cost = cost + valorFixo;
    } else {
      cost = valorFixo;
    }
    return { cost, distance, coordTo };
  }

  // Adicionar método getMerchantDetails
  async getMerchantDetails(merchantId) {
    const IfoodService = require("./ifoodService");
    const ifoodService = new IfoodService();

    try {
      const merchantDetails = await ifoodService.getMerchantDetails(merchantId);
      return merchantDetails;
    } catch (error) {
      console.error("Erro ao buscar detalhes do merchant:", error);
      throw error;
    }
  }

  // Criar um novo pedido
  async create(orderData) {
    try {
      // Se orderData já vem completo (do iFood), apenas salvar
      if (orderData.ifoodId || orderData.orderNumber) {
        // Para pedidos do iFood, buscar coordenadas do merchant se necessário
        if (
          orderData.store?.ifoodId &&
          (!orderData.store.coordinates || orderData.store.coordinates[0] === 0)
        ) {
          try {
            const merchantDetails = await this.getMerchantDetails(
              orderData.store.ifoodId
            );

            if (
              merchantDetails?.address?.longitude &&
              merchantDetails?.address?.latitude
            ) {
              orderData.store.coordinates = [
                parseFloat(merchantDetails.address.longitude),
                parseFloat(merchantDetails.address.latitude),
              ];
              console.log(
                "Coordenadas do merchant atualizadas:",
                orderData.store.coordinates
              );
            }
          } catch (error) {
            console.error("Erro ao buscar detalhes do merchant:", error);
            // Manter coordenadas padrão se houver erro
          }
        }
      }

      // Processar como pedido do app (lógica original)
      const { store, customer, items, total, payment, notes } = orderData;

      // Validações para pedidos do app
      if (!store?.cnpj) {
        throw new Error("CNPJ da loja é obrigatório para pedidos do app");
      }
      if (!customer?.phone) {
        throw new Error("Telefone do cliente é obrigatório");
      }
      if (!customer?.customerAddress?.cep) {
        throw new Error("CEP do cliente é obrigatório");
      }
      if (!total) {
        throw new Error("Total do pedido é obrigatório");
      }
      if (!payment) {
        throw new Error("Método de pagamento é obrigatório");
      }

      const cnpj = store.cnpj;

      // Gerar número do pedido (formato: PD + timestamp)
      const orderNumber = "PD" + Date.now().toString().substr(-6);

      // Calcular preço e distância da entrega
      const { cost, distance, coordTo } = await this.calculatePrice(
        store.coordinates,
        customer.customerAddress.cep
      );

      // Buscar dados da loja pelo CNPJ
      const { cep, storeName } = await this.getCep(cnpj);

      // Criar novo pedido com todos os dados processados
      const newOrderData = {
        store: {
          name: storeName,
          cnpj: cnpj,
          coordinates: store.coordinates,
          address: store.address,
          cep: cep,
        },
        orderNumber,
        customer: {
          ...customer,
          customerAddress: {
            ...customer.customerAddress,
            coordinates: [coordTo.longitude, coordTo.latitude],
          },
        },
        items,
        total,
        payment,
        notes: notes || "",
        status: "pendente",
        cliente_cod: customer.phone.replace(/\D/g, "").slice(-4),
        delivery: {
          distance: distance,
        },
        motoboy: {
          price: cost,
          motoboyId: null,
          name: "",
          phone: null,
          location: {
            distance: 0,
            estimatedTime: 0,
          },
        },
      };

      const order = new Order(newOrderData);
      const savedOrder = await order.save();

      // Buscar motoboys próximos e processar fila
      if (orderData.orderType === "DELIVERY") {
        try {
          const motoboys = await motoboyServices.findBestMotoboys(
            order.store.coordinates
          );

          const motoboyRequest = await motoboyServices.processMotoboyQueue(
            motoboys,
            order
          );
        } catch (motoboyError) {
          console.error("Erro ao processar motoboys:", motoboyError);
          // Não interromper o processo se houver erro com motoboys
        }
      }

      return savedOrder;
    } catch (error) {
      console.error("Erro ao criar pedido:", error);
      throw new Error(`Erro ao criar pedido: ${error.message}`);
    }
  }

  // Buscar pedido por ID
  async findById(id) {
    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error("ID inválido");
      }

      const order = await Order.findById(id)
        .populate("motoboy.motoboyId")
        .populate("items.productId");

      return order;
    } catch (error) {
      console.error("Erro ao buscar pedido por ID:", error);
      throw new Error(`Erro ao buscar pedido: ${error.message}`);
    }
  }

  // Buscar pedido por número do pedido
  async findByOrderNumber(orderNumber) {
    try {
      const order = await Order.findOne({ orderNumber })
        .populate("motoboy.motoboyId")
        .populate("items.productId");

      return order;
    } catch (error) {
      console.error("Erro ao buscar pedido por número:", error);
      throw new Error(`Erro ao buscar pedido: ${error.message}`);
    }
  }

  // Buscar pedido por ID do iFood (para integração)
  async findByIfoodId(ifoodId) {
    try {
      const order = await Order.findOne({ ifoodId: ifoodId });
      return order;
    } catch (error) {
      console.error("Erro ao buscar pedido do iFood:", error);
      throw new Error(`Erro ao buscar pedido do iFood: ${error.message}`);
    }
  }

  // Listar todos os pedidos com filtros
  async findAll(filters = {}, options = {}) {
    try {
      const {
        status,
        customerName,
        phone,
        startDate,
        endDate,
        cnpj,
        motoboyId,
      } = filters;

      const { page = 1, limit = 10, sort = { createdAt: -1 } } = options;

      // Construir query
      const query = {};

      if (status) {
        query.status = status;
      }

      if (customerName) {
        query["customer.name"] = { $regex: customerName, $options: "i" };
      }

      if (phone) {
        query["customer.phone"] = phone;
      }

      if (cnpj) {
        query["store.cnpj"] = cnpj;
      }

      if (motoboyId) {
        query["motoboy.motoboyId"] = motoboyId;
      }

      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) {
          query.createdAt.$gte = new Date(startDate);
        }
        if (endDate) {
          query.createdAt.$lte = new Date(endDate);
        }
      }

      // Executar query com paginação
      const orders = await Order.find(query)
        .populate("motoboy.motoboyId")
        .populate("items.productId")
        .sort(sort)
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await Order.countDocuments(query);

      return {
        orders,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        total,
      };
    } catch (error) {
      console.error("Erro ao listar pedidos:", error);
      throw new Error(`Erro ao listar pedidos: ${error.message}`);
    }
  }

  // Atualizar pedido
  async update(id, updateData) {
    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error("ID inválido");
      }

      const updatedOrder = await Order.findByIdAndUpdate(
        id,
        { ...updateData, updatedAt: new Date() },
        { new: true, runValidators: true }
      )
        .populate("motoboy.motoboyId")
        .populate("items.productId");

      if (!updatedOrder) {
        throw new Error("Pedido não encontrado");
      }

      return updatedOrder;
    } catch (error) {
      console.error("Erro ao atualizar pedido:", error);
      throw new Error(`Erro ao atualizar pedido: ${error.message}`);
    }
  }

  // Atualizar status do pedido
  async updateStatus(id, status) {
    try {
      const validStatuses = [
        "pendente",
        "em_preparo",
        "em_entrega",
        "entregue",
        "cancelado",
      ];

      if (!validStatuses.includes(status)) {
        throw new Error("Status inválido");
      }

      const updateData = { status };

      // Adicionar timestamps específicos baseado no status
      if (status === "em_entrega") {
        updateData["delivery.startTime"] = new Date();
      } else if (status === "entregue") {
        updateData["delivery.endTime"] = new Date();
      }

      return await this.update(id, updateData);
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      throw new Error(`Erro ao atualizar status: ${error.message}`);
    }
  }

  // Atribuir motoboy ao pedido
  async assignMotoboy(orderId, motoboyData) {
    try {
      const updateData = {
        "motoboy.motoboyId": motoboyData.motoboyId,
        "motoboy.name": motoboyData.name,
        "motoboy.phone": motoboyData.phone,
        "motoboy.price": motoboyData.price,
      };

      return await this.update(orderId, updateData);
    } catch (error) {
      console.error("Erro ao atribuir motoboy:", error);
      throw new Error(`Erro ao atribuir motoboy: ${error.message}`);
    }
  }

  // Calcular estatísticas
  async getStatistics(filters = {}) {
    try {
      const { startDate, endDate, cnpj } = filters;

      const matchStage = {};

      if (cnpj) {
        matchStage["store.cnpj"] = cnpj;
      }

      if (startDate || endDate) {
        matchStage.createdAt = {};
        if (startDate) {
          matchStage.createdAt.$gte = new Date(startDate);
        }
        if (endDate) {
          matchStage.createdAt.$lte = new Date(endDate);
        }
      }

      const stats = await Order.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalRevenue: { $sum: "$total" },
            averageOrderValue: { $avg: "$total" },
            ordersByStatus: {
              $push: "$status",
            },
          },
        },
        {
          $project: {
            _id: 0,
            totalOrders: 1,
            totalRevenue: 1,
            averageOrderValue: { $round: ["$averageOrderValue", 2] },
            statusCount: {
              $arrayToObject: {
                $map: {
                  input: [
                    "pendente",
                    "em_preparo",
                    "em_entrega",
                    "entregue",
                    "cancelado",
                  ],
                  as: "status",
                  in: {
                    k: "$$status",
                    v: {
                      $size: {
                        $filter: {
                          input: "$ordersByStatus",
                          cond: { $eq: ["$$this", "$$status"] },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      ]);

      return (
        stats[0] || {
          totalOrders: 0,
          totalRevenue: 0,
          averageOrderValue: 0,
          statusCount: {
            pendente: 0,
            em_preparo: 0,
            em_entrega: 0,
            entregue: 0,
            cancelado: 0,
          },
        }
      );
    } catch (error) {
      console.error("Erro ao calcular estatísticas:", error);
      throw new Error(`Erro ao calcular estatísticas: ${error.message}`);
    }
  }

  // Buscar pedidos por localização (próximos)
  async findNearby(coordinates, maxDistance = 5000) {
    try {
      const orders = await Order.find({
        "customer.geolocation": {
          $near: {
            $geometry: {
              type: "Point",
              coordinates: coordinates, // [longitude, latitude]
            },
            $maxDistance: maxDistance, // em metros
          },
        },
        status: { $in: ["pendente", "em_preparo"] },
      }).populate("motoboy.motoboyId");

      return orders;
    } catch (error) {
      console.error("Erro ao buscar pedidos próximos:", error);
      throw new Error(`Erro ao buscar pedidos próximos: ${error.message}`);
    }
  }

  // Deletar pedido
  async delete(id) {
    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error("ID inválido");
      }

      const deletedOrder = await Order.findByIdAndDelete(id);

      if (!deletedOrder) {
        throw new Error("Pedido não encontrado");
      }

      return deletedOrder;
    } catch (error) {
      console.error("Erro ao deletar pedido:", error);
      throw new Error(`Erro ao deletar pedido: ${error.message}`);
    }
  }

  // Gerar número do pedido automaticamente
  generateOrderNumber() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `PED${timestamp}${random}`;
  }
}

module.exports = OrderService;
