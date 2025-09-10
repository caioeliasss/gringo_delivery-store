const Order = require("../models/Order");
const mongoose = require("mongoose");
const motoboyServices = require("./motoboyServices");
const axios = require("axios");
const geolib = require("geolib");
const DeliveryPrice = require("../models/DeliveryPrice");
const Store = require("../models/Store");
const Motoboy = require("../models/Motoboy");
const Travel = require("../models/Travel");
const NotificationService = require("./notificationService");
const IfoodService = require("./ifoodService");

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

  async buscarCoord(logradouro, cidade, estado) {
    try {
      // Obter a API key do Google Maps das variáveis de ambiente
      const API_KEY = process.env.GOOGLE_MAPS_API_KEY;

      if (!API_KEY) {
        console.warn(
          "API Key do Google Maps não configurada, usando geocodificação fallback"
        );
        return await this.geocodeAddressFallback(logradouro, cidade, estado);
      }

      // Formatar o endereço completo
      const address = encodeURIComponent(
        `${logradouro}, ${cidade}, ${estado}, Brasil`
      );

      // Fazer requisição para a API do Google Maps
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${address}&key=${API_KEY}`
      );

      // Verificar se a resposta foi bem-sucedida
      if (response.data.status === "OK" && response.data.results.length > 0) {
        const location = response.data.results[0].geometry.location;

        return {
          data: [
            {
              lat: location.lat.toString(),
              lon: location.lng.toString(),
            },
          ],
        };
      } else {
        console.warn(
          `Google Maps API retornou status: ${response.data.status}`
        );
        return await this.geocodeAddressFallback(logradouro, cidade, estado);
      }
    } catch (error) {
      console.error(
        "Erro ao buscar coordenadas com Google Maps:",
        error.message
      );
      return await this.geocodeAddressFallback(logradouro, cidade, estado);
    }
  }

  // Função de fallback para quando a API do Google Maps falhar
  async geocodeAddressFallback(logradouro, cidade, estado) {
    console.log("Usando geocodificação de fallback para", cidade);

    // Mapa de coordenadas aproximadas das principais cidades brasileiras
    const cidadesCoords = {
      "São Paulo": { lat: -23.5505, lon: -46.6333 },
      "Rio de Janeiro": { lat: -22.9068, lon: -43.1729 },
      "Belo Horizonte": { lat: -19.9167, lon: -43.9345 },
      Brasília: { lat: -15.7801, lon: -47.9292 },
      Salvador: { lat: -12.9714, lon: -38.5014 },
      Fortaleza: { lat: -3.7172, lon: -38.5433 },
      Recife: { lat: -8.0476, lon: -34.877 },
      "Porto Alegre": { lat: -30.0346, lon: -51.2177 },
      Manaus: { lat: -3.119, lon: -60.0217 },
      Curitiba: { lat: -25.4296, lon: -49.2719 },
    };

    // Verifica se a cidade existe no mapa, senão usa São Paulo como fallback
    const baseCoords = cidadesCoords[cidade] || cidadesCoords["São Paulo"];

    // Adiciona uma pequena variação para endereços diferentes
    const lat = baseCoords.lat + (Math.random() - 0.5) * 0.01;
    const lon = baseCoords.lon + (Math.random() - 0.5) * 0.01;

    return {
      data: [
        {
          lat: lat.toString(),
          lon: lon.toString(),
        },
      ],
    };
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
  async getMerchantDetails(merchantId, storeFirebaseUid = null) {
    const IfoodService = require("./ifoodService");
    const ifoodService = storeFirebaseUid
      ? await IfoodService.createForStore(storeFirebaseUid)
      : new IfoodService();

    try {
      const merchantDetails = await ifoodService.getMerchantDetails(
        merchantId,
        storeFirebaseUid
      );
      return merchantDetails;
    } catch (error) {
      console.error("Erro ao buscar detalhes do merchant:", error);
      throw error;
    }
  }

  // Criar um novo pedido (versão melhorada)
  async createOrder(orderData) {
    try {
      const {
        store,
        customer,
        items,
        total,
        payment,
        notes,
        driveBack,
        findDriverAuto,
        preview,
        ifoodId,
      } = orderData;

      // Validações básicas
      if (!store.cnpj || !customer || !items || !total || !payment) {
        throw new Error("Dados obrigatórios não fornecidos");
      }

      // Verificar se o CNPJ está aprovado
      const cnpj_approved = await Store.findOne({
        cnpj: store.cnpj,
      });
      if (cnpj_approved && !cnpj_approved.cnpj_approved) {
        throw new Error("CNPJ não aprovado");
      }

      const cnpj = store.cnpj;

      // Gerar número do pedido (formato: PD + timestamp)
      const orderNumber = "PD" + Date.now().toString().substr(-6);

      // Validar coordenadas da loja
      if (!store.coordinates) {
        throw new Error("Coordenadas da loja são obrigatórias");
      }

      // Validar coordenadas dos clientes
      customer.forEach((customerItem, index) => {
        if (!customerItem.customerAddress?.coordinates) {
          throw new Error(
            `Coordenadas do cliente ${index + 1} são obrigatórias`
          );
        }
      });

      // Usar dados do preview se fornecidos
      let cost, distance, priceList;
      if (preview?.priceList) {
        cost = preview.priceList.totalCost;
        distance = preview.priceList.totalDistance;
        priceList = preview.priceList;
      } else {
        // Calcular preço se preview não foi fornecido
        const result = await this.calculatePreviewCost(
          store,
          customer,
          driveBack
        );
        cost = result.preview.totalCost;
        distance = result.preview.totalDistance;
        priceList = result.preview.priceList;
      }

      // Criar novo pedido
      const newOrder = new Order({
        store: {
          cnpj: cnpj,
          name: store.name || store.businessName || "Estabelecimento",
          coordinates: store.coordinates,
          address: store.address,
        },
        orderNumber,
        customer: customer,
        items,
        ifoodId,
        total,
        payment,
        notes: notes || "",
        status: "pendente",
        cliente_cod: 1234,
        delivery: {
          distance: distance,
          priceList: priceList || {},
          driveBack: driveBack,
        },
        motoboy: {
          price: cost,
          motoboyId: null,
          name: "",
          phone: null,
          blacklist: [],
          rated: false,
          queue: {
            motoboys: [],
            motoboy_status: [],
            status: "pendente",
          },
          location: {
            distance: 0,
            estimatedTime: 0,
          },
        },
      });

      const savedOrder = await newOrder.save();

      // Iniciar busca por motoboys se solicitado
      if (findDriverAuto) {
        console.log(
          `🔍 [OrderService] Iniciando busca automática por motoboys para pedido ${savedOrder._id}`
        );

        setImmediate(async () => {
          try {
            const motoboys = await motoboyServices.findBestMotoboys(
              savedOrder.store.coordinates
            );

            if (motoboys && motoboys.length > 0) {
              console.log(
                `📋 Encontrados ${motoboys.length} motoboys disponíveis`
              );
              await motoboyServices.processMotoboyQueue(motoboys, savedOrder);
            } else {
              console.log("⚠️ Nenhum motoboy disponível encontrado");
            }
          } catch (error) {
            console.error("❌ Erro na busca assíncrona por motoboys:", error);
          }
        });
      } else {
        console.log(
          "ℹ️ [OrderService] Busca automática por motoboys desabilitada"
        );
      }

      if (global.sendSocketNotification) {
        global.sendSocketNotification(
          cnpj_approved.firebaseUid,
          "newOrder",
          savedOrder
        );
      }

      return {
        message: "Pedido criado com sucesso",
        order: savedOrder,
      };
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

  // Atualizar status do pedido (versão melhorada)
  async updateOrderStatus(id, status, firebaseUid = null) {
    try {
      if (!status || !id) {
        throw new Error("Status e ID são obrigatórios");
      }

      // Validar se o status é válido
      const validStatus = [
        "pendente",
        "em_preparo",
        "em_entrega",
        "pronto",
        "ready_takeout",
        "entregue",
        "codigo_pronto",
        "cancelado",
      ];
      if (!validStatus.includes(status)) {
        throw new Error("Status inválido");
      }

      let order = await Order.findOne({ ifoodId: id }); //FIXME
      if (!order) {
        order = await Order.findById(id);
      }
      if (!order) {
        throw new Error("Pedido não encontrado");
      }

      // Se firebaseUid for fornecido, verificar se o usuário tem permissão

      const user = await Store.findOne({ cnpj: order.store.cnpj });
      if (!user) {
        throw new Error("Usuário não encontrado");
      }

      // Se o pedido já estiver entregue ou cancelado, não permitir alteração
      if (order.status === "entregue" || order.status === "cancelado") {
        return {
          error:
            "Pedido já entregue ou cancelado, não é possível alterar o status",
        };
      }

      // Guardar status anterior para comparação
      const previousStatus = order.status;

      if (status === "cancelado") {
        // Salvar ID do motoboy antes de limpar
        const currentMotoboyId = order.motoboy?.motoboyId;

        // Adicionar motoboy atual à blacklist se existir
        if (currentMotoboyId) {
          try {
            motoboyServices.removeMotoboyFromOrder(order._id, currentMotoboyId);
          } catch (error) {
            console.error("Erro ao remover motoboy do pedido:", error);
          }
        }
      }

      // Atualizar status
      order.status = status;
      await order.save();

      console.log(
        `Pedido ${order._id} atualizado: ${previousStatus} -> ${status}`
      );

      // Notificar motoboy sobre mudança de status (se houver motoboy atribuído)
      if (previousStatus !== status && order.motoboy?.motoboyId) {
        // try {
        //   await NotificationService.createGenericNotification({
        //     orderId: order._id,
        //     newStatus: status,
        //     previousStatus: previousStatus,
        //     motoboyId: order.motoboy.motoboyId,
        //     storeName: order.store.name,
        //   });
        // } catch (notifyError) {
        //   console.error("Erro ao notificar motoboy:", notifyError);
        // }
      }

      if (order.ifoodId) {
        const IfoodService = require("./ifoodService");
        const ifoodService = firebaseUid
          ? await IfoodService.createForStore(firebaseUid)
          : new IfoodService();

        if (previousStatus === "pendente" && status === "em_preparo") {
          try {
            await ifoodService.confirmOrder(order.ifoodId, firebaseUid);
          } catch (ifoodError) {
            console.error(
              "Erro ao atualizar status no iFood (confirmOrder):",
              ifoodError
            );
          }
        }
        if (previousStatus === "pronto" && status === "em_entrega") {
          try {
            await ifoodService.dispatchOrder(order.ifoodId, firebaseUid);
          } catch (ifoodError) {
            console.error(
              "Erro ao atualizar status no iFood (dispatchOrder):",
              ifoodError
            );
          }
        }

        if (status === "ready_takeout") {
          try {
            await ifoodService.readyToPickup(order.ifoodId, firebaseUid);
          } catch (ifoodError) {
            console.error(
              "Erro ao atualizar status no iFood (dispatchOrder):",
              ifoodError
            );
          }
        }
      }

      if (global.sendSocketNotification) {
        global.sendSocketNotification(user.firebaseUid, "orderUpdate", {
          orderId: order._id,
          status: status,
          data: { status, orderId: order._id },
        });
      }

      return {
        message: "Status do pedido atualizado com sucesso",
        order,
        previousStatus,
        newStatus: status,
      };
    } catch (error) {
      console.error("Erro ao atualizar status do pedido:", error);
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

  // Listar todos os pedidos (para admin)
  async getAllOrders() {
    try {
      const orders = await Order.find({}).sort({
        orderDate: -1,
      });
      return orders;
    } catch (error) {
      console.error("Erro ao listar todos os pedidos:", error);
      throw new Error(`Erro ao listar pedidos: ${error.message}`);
    }
  }

  // Listar pedidos por Firebase UID do usuário
  async getOrdersByFirebaseUid(firebaseUid) {
    try {
      const user = await Store.findOne({ firebaseUid: firebaseUid });
      if (!user) {
        throw new Error("Usuário não encontrado");
      }

      // Verificar se o usuário tem um CNPJ aprovado
      if (!user.cnpj || !user.cnpj_approved) {
        throw new Error("CNPJ não aprovado ou não fornecido");
      }

      const orders = await Order.find({ "store.cnpj": user.cnpj }).sort({
        orderDate: -1,
      });
      return orders;
    } catch (error) {
      console.error("Erro ao listar pedidos por Firebase UID:", error);
      throw new Error(`Erro ao listar pedidos: ${error.message}`);
    }
  }

  // Listar pedidos por Store ID
  async getOrdersByStoreId(storeId) {
    try {
      const user = await Store.findById(storeId);
      if (!user) {
        throw new Error("Usuário não encontrado");
      }

      // Verificar se o usuário tem um CNPJ aprovado
      if (!user.cnpj || !user.cnpj_approved) {
        throw new Error("CNPJ não aprovado ou não fornecido");
      }

      const orders = await Order.find({ "store.cnpj": user.cnpj }).sort({
        orderDate: -1,
      });
      return orders;
    } catch (error) {
      console.error("Erro ao listar pedidos por Store ID:", error);
    }
  }

  // Calcular preview do custo antes de criar o pedido
  async calculatePreviewCost(store, customer, driveBack = false) {
    try {
      // Validar dados obrigatórios
      if (!store || !customer) {
        throw new Error("Dados da loja e cliente são obrigatórios");
      }

      // Validar coordenadas da loja
      if (
        !store.coordinates ||
        !Array.isArray(store.coordinates) ||
        store.coordinates.length !== 2
      ) {
        throw new Error("Coordenadas da loja são obrigatórias");
      }

      // Validar se customer é array
      if (!Array.isArray(customer)) {
        throw new Error("Customer deve ser um array");
      }

      // Validar coordenadas dos clientes
      for (let i = 0; i < customer.length; i++) {
        const customerItem = customer[i];
        if (
          !customerItem.customerAddress ||
          !customerItem.customerAddress.coordinates
        ) {
          throw new Error(`Coordenadas do cliente ${i + 1} são obrigatórias`);
        }
      }

      // Função para calcular distância e custo do ponto de origem para o primeiro cliente
      const calculateOriginToFirstCustomer = async (
        coordFrom,
        coordTo,
        driveBack
      ) => {
        let distance = geolib.getDistance(
          { latitude: coordFrom[1], longitude: coordFrom[0] },
          { latitude: coordTo[1], longitude: coordTo[0] }
        );
        distance = distance / 1000;

        const priceList = await DeliveryPrice.findOne();

        if (!priceList) {
          throw new Error("Lista de preços de entrega não encontrada");
        }

        let cost;
        let valorFixo;

        // Verificar clima (chuva)
        try {
          // Implementar verificação de clima aqui se necessário
        } catch (error) {
          console.warn("Erro ao verificar clima:", error.message);
        }

        // Determinar valor fixo baseado nas condições
        if (priceList.isRain) {
          valorFixo = priceList.priceRain;
        } else if (priceList.isHighDemand) {
          valorFixo = priceList.fixedPriceHigh;
        } else {
          valorFixo = priceList.fixedPrice;
        }

        // Calcular custo baseado na distância
        if (distance > priceList.fixedKm) {
          cost = valorFixo + (distance - priceList.fixedKm) * priceList.bonusKm;
        } else {
          cost = valorFixo;
        }

        // Adicionar custo de volta se solicitado
        if (driveBack) {
          cost += distance * priceList.driveBack;
        }

        let distanceOrigin = distance;

        return { cost, distance, distanceOrigin, priceList };
      };

      // Função para calcular distância entre clientes
      const calculateCustomerToCustomer = async (customers) => {
        let totalDistance = 0;

        for (let i = 0; i < customers.length - 1; i++) {
          const coordFrom = customers[i].customerAddress.coordinates;
          const coordTo = customers[i + 1].customerAddress.coordinates;

          let distance = geolib.getDistance(
            { latitude: coordFrom[1], longitude: coordFrom[0] },
            { latitude: coordTo[1], longitude: coordTo[0] }
          );
          totalDistance += distance;
        }

        totalDistance = totalDistance / 1000;

        const priceList = await DeliveryPrice.findOne();

        if (!priceList) {
          throw new Error("Lista de preços de entrega não encontrada");
        }

        let cost;
        if (totalDistance > priceList.fixedKm) {
          cost =
            priceList.fixedPrice +
            (totalDistance - priceList.fixedKm) * priceList.bonusKm;
        } else {
          cost = priceList.fixedPrice;
        }

        let distanceCustomers = totalDistance;
        return { cost, distance: totalDistance, priceList, distanceCustomers };
      };

      // Função principal para calcular o preço total
      const calculateTotalPrice = async (coordFrom, customers, driveBack) => {
        if (!coordFrom || !customers || customers.length === 0) {
          throw new Error("Coordenadas e clientes são obrigatórios");
        }

        // Calcular distância e custo do ponto de origem para o primeiro cliente
        const firstCustomer = customers[0].customerAddress.coordinates;

        const originResult = await calculateOriginToFirstCustomer(
          coordFrom,
          firstCustomer,
          driveBack
        );

        let totalCost = originResult.cost;
        let totalDistance = originResult.distance;
        let distanceOrigin = originResult.distanceOrigin;
        let distanceCustomers = 0;

        // Se há múltiplos clientes, calcular distância entre eles
        if (customers.length > 1) {
          const customerResult = await calculateCustomerToCustomer(customers);
          totalCost += customerResult.cost;
          totalDistance += customerResult.distance;
          distanceCustomers = customerResult.distanceCustomers;
        }

        return {
          cost: totalCost,
          totalDistance,
          distanceOrigin,
          distanceCustomers,
          priceList: originResult.priceList,
        };
      };

      // Executar cálculo
      const result = await calculateTotalPrice(
        store.coordinates,
        customer,
        driveBack
      );

      // Resposta com detalhes do cálculo
      return {
        success: true,
        preview: {
          totalCost: parseFloat(result.cost.toFixed(2)),
          totalDistance: parseFloat(result.totalDistance.toFixed(2)),
          distanceOrigin: parseFloat(result.distanceOrigin.toFixed(2)),
          distanceCustomers: parseFloat(result.distanceCustomers.toFixed(2)),
          driveBack: driveBack,
          numberOfCustomers: customer.length,
          priceList: result.priceList,
          weather: {
            isRaining: result.priceList.isRain,
            condition: result.weatherCondition || "Não verificado",
            provider: result.weatherProvider || "N/A",
          },
          breakdown: {
            baseCost: result.priceList.isRain
              ? result.priceList.priceRain
              : result.priceList.isHighDemand
              ? result.priceList.fixedPriceHigh
              : result.priceList.fixedPrice,
            extraDistanceCost:
              result.totalDistance > result.priceList.fixedKm
                ? (result.totalDistance - result.priceList.fixedKm) *
                  result.priceList.bonusKm
                : 0,
            driveBackCost: driveBack
              ? result.totalDistance * result.priceList.driveBack
              : 0,
            multipleCustomersCost:
              customer.length > 1
                ? (result.priceList.isRain
                    ? result.priceList.priceRain
                    : result.priceList.isHighDemand
                    ? result.priceList.fixedPriceHigh
                    : result.priceList.fixedPrice) *
                  (customer.length - 1)
                : 0,
          },
        },
      };
    } catch (error) {
      console.error("Erro ao calcular preview do custo:", error);
      throw new Error(`Erro ao calcular preview: ${error.message}`);
    }
  }

  // Buscar motoboys próximos para atribuir a um pedido
  async getNearbyMotoboys(orderId, firebaseUid, maxDistance = 5000) {
    try {
      const user = await Store.findOne({ firebaseUid: firebaseUid });
      if (!user) {
        throw new Error("Usuário não encontrado");
      }

      const order = await Order.findOne({
        _id: orderId,
        "store.cnpj": user.cnpj,
      });
      if (!order) {
        throw new Error("Pedido não encontrado");
      }

      if (!order.customer.geolocation) {
        throw new Error("Geolocalização do cliente não encontrada");
      }

      // Buscar motoboys disponíveis próximos ao endereço de entrega
      const { coordinates } = order.customer.geolocation;

      const nearbyMotoboys = await Motoboy.find({
        isAvailable: true,
        register_approved: true,
        geolocation: {
          $near: {
            $geometry: {
              type: "Point",
              coordinates: coordinates,
            },
            $maxDistance: parseInt(maxDistance),
          },
        },
      }).select("name phone geolocation score profileImage");

      return nearbyMotoboys;
    } catch (error) {
      console.error("Erro ao buscar motoboys próximos:", error);
      throw new Error(`Erro ao buscar motoboys próximos: ${error.message}`);
    }
  }

  // Atribuir motoboy a um pedido
  async assignMotoboyToOrder(orderId, motoboyId, firebaseUid) {
    try {
      const order = await Order.findOne({
        _id: orderId,
      });
      if (!order) {
        throw new Error("Pedido não encontrado");
      }

      if (!motoboyId) {
        throw new Error("ID do motoboy é obrigatório");
      }

      const motoboy = await Motoboy.findById(motoboyId);
      if (!motoboy) {
        throw new Error("Motoboy não encontrado");
      }

      order.motoboy.queue.status = "confirmado";
      // Motoboy accepted, assign to order
      order.motoboy = {
        ...order.motoboy,
        motoboyId: motoboy._id,
        name: motoboy.name,
        phone: motoboy.phoneNumber,
        phoneNumber: motoboy.phoneNumber,
        timer: Date.now(),
        location: {
          estimatedTime: motoboy.estimatedTimeMinutes,
          distance: motoboy.distance,
          startTime: new Date(),
        },
      };

      // Atualizar status do pedido para "em entrega"
      if (order.status === "em_preparo") {
        order.status = "em_entrega";
      }

      // Calcular estimativa de entrega
      if (order.customer.geolocation && motoboy.geolocation) {
        const distance = geolib.getDistance(
          {
            latitude: motoboy.geolocation.coordinates[1],
            longitude: motoboy.geolocation.coordinates[0],
          },
          {
            latitude: order.customer.geolocation.coordinates[1],
            longitude: order.customer.geolocation.coordinates[0],
          }
        );

        order.delivery.estimatedTime = Math.round((distance / 1000) * 3); // 3 min por km
      }

      if (order.ifoodId) {
        const driver = {
          name: motoboy.name,
          phone: motoboy.phoneNumber,
          vehicleType: "MOTORCYCLE",
        };
        const ifoodService = new IfoodService();
        try {
          await ifoodService.assignMotoboy(order.ifoodId, driver);
        } catch (error) {
          console.error("Erro ao atribuir motoboy no iFood:", error);
        }
      }

      await order.save();

      return {
        message: "Motoboy atribuído ao pedido com sucesso",
        order,
      };
    } catch (error) {
      console.error("Erro ao atribuir motoboy ao pedido:", error);
      throw new Error(`Erro ao atribuir motoboy: ${error.message}`);
    }
  }

  async arrivedDestination(orderId) {
    try {
      const order = await Order.findById(orderId);
      if (!order) {
        throw new Error("Pedido não encontrado");
      }

      order.arrivedDestination = true;
      await order.save();

      if (order.ifoodId) {
        try {
          const ifoodService = new IfoodService();
          await ifoodService.arrivedAtDestination(order.ifoodId);
        } catch (error) {
          console.error(
            "Erro ao arrivedAtDestination status do pedido no iFood:",
            error.message
          );
        }
      }

      return {
        message: "Pedido marcado como entregue com sucesso",
        order,
      };
    } catch (error) {
      console.error("Erro ao marcar pedido como entregue:", error);
      throw new Error(`Erro ao marcar pedido como entregue: ${error.message}`);
    }
  }

  // Aceitar pedido (usado pelo motoboy)
  async acceptOrder(orderId, motoboyId) {
    try {
      if (!motoboyId) {
        throw new Error("ID do motoboy é obrigatório");
      }

      const order = await Order.findById(orderId);
      if (!order) {
        throw new Error("Pedido não encontrado");
      }

      const motoboy = await Motoboy.findById(motoboyId);
      if (!motoboy) {
        throw new Error("Motoboy não encontrado");
      }

      // Verificar se o pedido já foi aceito por outro motoboy
      if (order.motoboy.motoboyId) {
        throw new Error("Pedido já foi aceito por outro motoboy");
      }

      // Atribuir motoboy ao pedido
      order.motoboy = {
        ...order.motoboy,
        motoboyId: motoboy._id,
        name: motoboy.name,
        phone: motoboy.phone,
        profileImage: motoboy.profileImage,
      };

      // Atualizar status do pedido para "em_preparo"
      order.status = "em_preparo";

      await order.save();

      // Atualizar disponibilidade do motoboy
      motoboy.isAvailable = false;
      await motoboy.save();

      return {
        message: "Motoboy atribuído ao pedido com sucesso",
        order,
      };
    } catch (error) {
      console.error("Erro ao atribuir motoboy ao pedido:", error);
      throw new Error(`Erro ao aceitar pedido: ${error.message}`);
    }
  }

  // Iniciar busca por motoboy
  async findDriverForOrder(orderId) {
    try {
      const order = await Order.findById(orderId);
      if (!order) {
        throw new Error("Pedido não encontrado");
      }

      // Verificar se o pedido já tem motoboy atribuído
      if (order.motoboy?.motoboyId) {
        throw new Error("Pedido já tem motoboy atribuído");
      }

      // Verificar se o pedido está em status válido para buscar motoboy
      if (!["pendente", "em_preparo"].includes(order.status)) {
        throw new Error("Status do pedido não permite busca por motoboy");
      }

      // Iniciar busca por motoboys de forma assíncrona
      setImmediate(async () => {
        try {
          const motoboys = await motoboyServices.findBestMotoboys(
            order.store.coordinates
          );

          if (motoboys && motoboys.length > 0) {
            console.log(
              `📋 Encontrados ${motoboys.length} motoboys disponíveis`
            );
            await motoboyServices.processMotoboyQueue(motoboys, order);
          } else {
            console.log("⚠️ Nenhum motoboy disponível encontrado");
          }
        } catch (error) {
          console.error("❌ Erro na busca assíncrona por motoboys:", error);
        }
      });

      return {
        message: "Busca por motoboy iniciada em segundo plano",
        orderId: orderId,
        orderNumber: order.orderNumber,
      };
    } catch (error) {
      console.error("Erro ao iniciar busca por motoboy:", error);
      throw new Error(`Erro ao iniciar busca: ${error.message}`);
    }
  }

  // Marcar pedido como avaliado
  async markOrderAsRated(orderId, firebaseUid) {
    try {
      const order = await Order.findById(orderId);
      if (!order) {
        throw new Error("Pedido não encontrado");
      }

      // Atualiza apenas o campo rated dentro de motoboy, mantendo os outros dados
      order.motoboy = {
        ...order.motoboy,
        rated: true,
      };

      await order.save();

      return { message: "Avaliação enviada com sucesso" };
    } catch (error) {
      console.error("Erro ao enviar avaliação:", error);
      throw new Error(`Erro ao enviar avaliação: ${error.message}`);
    }
  }

  // Obter estatísticas resumidas
  async getOrdersSummaryStats(firebaseUid) {
    try {
      const user = await Store.findOne({ firebaseUid: firebaseUid });
      if (!user) {
        throw new Error("Usuário não encontrado");
      }

      // Obter data de hoje
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Obter data de 30 dias atrás
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Total de pedidos
      const totalOrders = await Order.countDocuments({
        "store.cnpj": user.cnpj,
      });

      // Pedidos hoje
      const todayOrders = await Order.countDocuments({
        "store.cnpj": user.cnpj,
        orderDate: { $gte: today },
      });

      // Pedidos nos últimos 30 dias
      const last30DaysOrders = await Order.countDocuments({
        "store.cnpj": user.cnpj,
        orderDate: { $gte: thirtyDaysAgo },
      });

      // Pedidos por status
      const ordersByStatus = await Order.aggregate([
        { $match: { "store.cnpj": user.cnpj } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]);

      // Formatar resultado dos pedidos por status
      const statusCount = {
        pendente: 0,
        em_preparo: 0,
        em_entrega: 0,
        entregue: 0,
        cancelado: 0,
      };

      ordersByStatus.forEach((item) => {
        if (statusCount.hasOwnProperty(item._id)) {
          statusCount[item._id] = item.count;
        }
      });

      // Receita total (apenas pedidos entregues)
      const totalRevenue = await Order.aggregate([
        {
          $match: {
            "store.cnpj": user.cnpj,
            status: "entregue",
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$total" },
          },
        },
      ]);

      // Receita nos últimos 30 dias
      const last30DaysRevenue = await Order.aggregate([
        {
          $match: {
            "store.cnpj": user.cnpj,
            status: "entregue",
            orderDate: { $gte: thirtyDaysAgo },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$total" },
          },
        },
      ]);

      // Estatísticas de entrega (distância média, tempo médio)
      const deliveryStats = await Order.aggregate([
        {
          $match: {
            "store.cnpj": user.cnpj,
            status: "entregue",
            "delivery.distance": { $exists: true },
            "delivery.estimatedTime": { $exists: true },
          },
        },
        {
          $group: {
            _id: null,
            avgDistance: { $avg: "$delivery.distance" },
            avgTime: { $avg: "$delivery.estimatedTime" },
            totalDeliveries: { $sum: 1 },
          },
        },
      ]);

      return {
        totalOrders,
        todayOrders,
        last30DaysOrders,
        statusCount,
        totalRevenue: totalRevenue.length > 0 ? totalRevenue[0].total : 0,
        last30DaysRevenue:
          last30DaysRevenue.length > 0 ? last30DaysRevenue[0].total : 0,
        deliveryStats:
          deliveryStats.length > 0
            ? {
                avgDistance: Math.round(deliveryStats[0].avgDistance),
                avgTime: Math.round(deliveryStats[0].avgTime),
                totalDeliveries: deliveryStats[0].totalDeliveries,
              }
            : null,
      };
    } catch (error) {
      console.error("Erro ao obter estatísticas:", error);
      throw new Error(`Erro ao obter estatísticas: ${error.message}`);
    }
  }

  // Função para geocodificar endereço
  async geocodeAddress(address) {
    try {
      // Simular uma resposta de geocodificação
      return {
        type: "Point",
        coordinates: [
          -46.6333 + (Math.random() - 0.5) * 0.1,
          -23.5505 + (Math.random() - 0.5) * 0.1,
        ],
      };

      // Em um ambiente real, você usaria algo como:
      /*
      const googleMapsApiKey = process.env.GOOGLE_EXPO_PUBLIC_MAPS_API_KEY;
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${googleMapsApiKey}`
      );
      
      if (response.data.status === 'OK' && response.data.results.length > 0) {
        const location = response.data.results[0].geometry.location;
        return {
          type: 'Point',
          coordinates: [location.lng, location.lat]
        };
      }
      
      throw new Error('Não foi possível geocodificar o endereço');
      */
    } catch (error) {
      console.error("Erro ao geocodificar endereço:", error);
      throw error;
    }
  }

  // Função para obter geolocalização do cliente
  async customerGeolocation(address) {
    const url = `https://www.cepaberto.com/api/v3/cep?cep=${address}`;
    const headers = {
      headers: {
        Authorization: "Token token=4a63e414a4b85704bbe354a6ccda8aad",
      },
    };

    try {
      const response = await fetch(url, headers);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Erro ao obter geolocalização:", error);
      throw error;
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
