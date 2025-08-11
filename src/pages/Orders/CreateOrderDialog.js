import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  TextField,
  Grid,
  Card,
  CardContent,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  Tabs,
  Tab,
  Paper,
  Divider,
  Stack,
  InputAdornment,
  Alert,
  CircularProgress,
} from "@mui/material";
import {
  Close as CloseIcon,
  Store as StoreIcon,
  Person as PersonIcon,
  ShoppingCart as ProductIcon,
  Payment as PaymentIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  LocationOn as LocationIcon,
  Search as SearchIcon,
  MyLocation as MyLocationIcon,
} from "@mui/icons-material";
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";
import api from "../../services/api";
import "./CreateOrderDialog.css";

const CreateOrderDialog = ({ open, onClose, onOrderCreated, storeId }) => {
  // Hook para carregar a API do Google Maps
  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
  });

  // Estados principais
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [stores, setStores] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [loadingStores, setLoadingStores] = useState(false);
  const [loadingProdutos, setLoadingProdutos] = useState(false);
  const [produtosFetched, setProdutosFetched] = useState(false); // Controlar se já foram carregados

  // Estados do formulário
  const [selectedStore, setSelectedStore] = useState(null);
  const [customers, setCustomers] = useState([
    {
      name: "",
      phone: "",
      customerAddress: {
        cep: "",
        address: "",
        addressNumber: "",
        bairro: "",
        cidade: "",
        estado: "",
        coordinates: [],
      },
    },
  ]);
  const [items, setItems] = useState([
    {
      productId: "",
      productName: "Produto padrão",
      quantity: 1,
      price: 1,
    },
  ]);
  const [payment, setPayment] = useState({
    method: "dinheiro",
    change: 0,
  });
  const [notes, setNotes] = useState("");
  const [total, setTotal] = useState(0);

  // Estados para preview de custo
  const [previewCost, setPreviewCost] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [driveBack, setDriveBack] = useState(false);

  // Refs para os mapas (separados para evitar conflito)
  const mapRef = useRef(null);
  const storeMapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [storeMap, setStoreMap] = useState(null);

  // Estados para controle do mapa
  const [mapCenter, setMapCenter] = useState({
    lat: -22.39731,
    lng: -46.947326,
  });
  const [activeCustomerIndex, setActiveCustomerIndex] = useState(0);
  const [searchAddress, setSearchAddress] = useState("");

  // Estados específicos para o mapa da loja
  const [storeSearchAddress, setStoreSearchAddress] = useState("");
  const [isSelectingStoreLocation, setIsSelectingStoreLocation] =
    useState(false);

  // Carregar lojas quando o dialog abrir
  useEffect(() => {
    if (open) {
      fetchStores();
      // Carregar produtos do cache se existirem
      loadProductsFromCache();
    }
  }, [open]);

  // Configurar listener de clique no mapa do cliente (sempre ativo quando o mapa existe)
  useEffect(() => {
    if (map && isLoaded) {
      console.log("🎯 Configurando listener de clique no mapa do cliente");

      const clickListener = map.addListener("click", (event) => {
        console.log("🖱️ Clique detectado no mapa do cliente");
        handleCustomerMapClick(event);
      });

      return () => {
        if (clickListener) {
          console.log("🧹 Removendo listener de clique do mapa do cliente");
          clickListener.remove();
        }
      };
    }
  }, [map, isLoaded, activeCustomerIndex, customers]);

  // Configurar listener de clique no mapa da loja (sempre ativo quando o mapa existe)
  useEffect(() => {
    if (storeMap && isLoaded) {
      console.log("🎯 Configurando listener de clique no mapa da loja");

      const clickListener = storeMap.addListener("click", (event) => {
        console.log("🖱️ Clique detectado no mapa da loja");
        handleStoreMapClick(event);
      });

      return () => {
        if (clickListener) {
          console.log("🧹 Removendo listener de clique do mapa da loja");
          clickListener.remove();
        }
      };
    }
  }, [storeMap, isLoaded, selectedStore]);

  // Carregar produtos apenas uma vez quando uma loja for selecionada
  useEffect(() => {
    if (selectedStore && !produtosFetched && !loadingProdutos) {
      console.log("🛍️ Carregando produtos da API...");
      fetchProdutos();
    }
  }, [selectedStore, produtosFetched, loadingProdutos]);

  // Calcular total quando itens mudarem
  useEffect(() => {
    const newTotal = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    setTotal(newTotal);
  }, [items]);

  // Calcular preview automaticamente quando endereços mudarem
  useEffect(() => {
    const timer = setTimeout(() => {
      if (
        selectedStore &&
        customers.some((c) => c.customerAddress.coordinates.length === 2)
      ) {
        calculatePreviewCost();
      }
    }, 1000); // Debounce de 1 segundo

    return () => clearTimeout(timer);
  }, [selectedStore, customers, driveBack]);

  const fetchStores = async () => {
    try {
      setLoadingStores(true);
      const response = await api.get("/stores");
      setStores(response.data || []);
      if (storeId) {
        const store = response.data.find((s) => s._id === storeId);
        if (store) {
          setStores([store]);
        }
      }
    } catch (error) {
      console.error("Erro ao buscar lojas:", error);
    } finally {
      setLoadingStores(false);
    }
  };

  // Função para carregar produtos do cache
  const loadProductsFromCache = () => {
    try {
      const cachedProducts = localStorage.getItem("gringo-products-cache");
      const cacheTimestamp = localStorage.getItem(
        "gringo-products-cache-timestamp"
      );

      if (cachedProducts && cacheTimestamp) {
        const now = new Date().getTime();
        const cacheTime = parseInt(cacheTimestamp);
        const fiveMinutes = 5 * 60 * 1000; // 5 minutos em ms

        // Se o cache tem menos de 5 minutos, usar os dados em cache
        if (now - cacheTime < fiveMinutes) {
          const products = JSON.parse(cachedProducts);
          setProdutos(products);
          setProdutosFetched(true);
          console.log(`📦 ${products.length} produtos carregados do cache`);
          return;
        }
      }
    } catch (error) {
      console.warn("Erro ao carregar produtos do cache:", error);
    }
  };

  // Função para salvar produtos no cache
  const saveProductsToCache = (products) => {
    try {
      localStorage.setItem("gringo-products-cache", JSON.stringify(products));
      localStorage.setItem(
        "gringo-products-cache-timestamp",
        new Date().getTime().toString()
      );
      console.log("💾 Produtos salvos no cache");
    } catch (error) {
      console.warn("Erro ao salvar produtos no cache:", error);
    }
  };

  // Função para forçar recarregamento dos produtos
  const forceRefreshProducts = async () => {
    console.log("🔄 Forçando recarregamento dos produtos");
    setProdutosFetched(false);
    setProdutos([]);

    // Limpar cache
    try {
      localStorage.removeItem("gringo-products-cache");
      localStorage.removeItem("gringo-products-cache-timestamp");
    } catch (error) {
      console.warn("Erro ao limpar cache:", error);
    }

    // Aguardar um pouco antes de fazer nova requisição
    setTimeout(() => {
      fetchProdutos();
    }, 1000);
  };

  const fetchProdutos = async () => {
    // Evitar múltiplas chamadas
    if (loadingProdutos || produtosFetched) {
      console.log(
        "⚠️ Produtos já estão sendo carregados ou já foram carregados"
      );
      return;
    }

    try {
      setLoadingProdutos(true);
      console.log("📡 Fazendo requisição para /products");

      // Adicionar delay para evitar rate limiting
      await new Promise((resolve) => setTimeout(resolve, 500));

      const response = await api.get("/products");
      const products = response.data || [];

      setProdutos(products);
      setProdutosFetched(true);

      // Salvar no cache
      saveProductsToCache(products);

      console.log(`✅ ${products.length} produtos carregados da API`);
    } catch (error) {
      console.error("❌ Erro ao buscar produtos:", error);

      // Se for erro 429, mostrar mensagem específica
      if (error.response?.status === 429) {
        alert(
          "Limite de requisições excedido. Os produtos serão carregados do cache quando disponível."
        );

        // Tentar carregar do cache como fallback
        const cachedProducts = localStorage.getItem("gringo-products-cache");
        if (cachedProducts) {
          try {
            const products = JSON.parse(cachedProducts);
            setProdutos(products);
            setProdutosFetched(true);
            console.log("🔄 Produtos carregados do cache após erro 429");
          } catch (cacheError) {
            console.error("Erro ao carregar cache após 429:", cacheError);
          }
        }
      }
    } finally {
      setLoadingProdutos(false);
    }
  };

  const handleStoreSelect = (event, store) => {
    setSelectedStore(store);
    if (store && store.address?.coordinates) {
      setMapCenter({
        lat:
          store.address.coordinates[1] || store.geolocation.coordinates[1] || 0,
        lng:
          store.address.coordinates[0] || store.geolocation.coordinates[0] || 0,
      });
    }
  };

  const handleAddCustomer = () => {
    setCustomers([
      ...customers,
      {
        name: "",
        phone: "",
        customerAddress: {
          cep: "",
          address: "",
          addressNumber: "",
          bairro: "",
          cidade: "",
          estado: "",
          coordinates: [],
        },
      },
    ]);
  };

  const handleRemoveCustomer = (index) => {
    if (customers.length > 1) {
      const newCustomers = customers.filter((_, i) => i !== index);
      setCustomers(newCustomers);
      if (activeCustomerIndex >= newCustomers.length) {
        setActiveCustomerIndex(newCustomers.length - 1);
      }
    }
  };

  const handleCustomerChange = (field, value, index = activeCustomerIndex) => {
    const newCustomers = [...customers];
    if (field.includes(".")) {
      const [parent, child] = field.split(".");
      newCustomers[index][parent][child] = value;
    } else {
      newCustomers[index][field] = value;
    }
    setCustomers(newCustomers);
  };

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        productId: "",
        productName: "Produto padrão",
        quantity: 1,
        price: 1,
      },
    ]);
  };

  const handleRemoveItem = (index) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;

    // Se selecionou um produto, preencher o nome e preço
    if (field === "productId" && value) {
      const produto = produtos.find((p) => p._id === value);
      if (produto) {
        newItems[index].productName = produto.name;
        newItems[index].price = produto.price || 1;
      }
    }

    setItems(newItems);
  };

  // Função específica para cliques no mapa do cliente
  const handleCustomerMapClick = (event) => {
    if (!event || !event.latLng) {
      console.error("Evento de clique inválido no mapa do cliente:", event);
      return;
    }

    const lat = event.latLng.lat();
    const lng = event.latLng.lng();

    console.log("👤 Mapa do cliente clicado em:", {
      lat,
      lng,
      activeCustomerIndex,
    });

    // Atualizar coordenadas do cliente ativo
    const newCustomers = [...customers];
    newCustomers[activeCustomerIndex].customerAddress.coordinates = [lng, lat];
    setCustomers(newCustomers);

    // Geocodificação reversa para obter o endereço
    reverseGeocode(lat, lng);
  };

  // Função específica para cliques no mapa da loja
  const handleStoreMapClick = (event) => {
    if (!event || !event.latLng) {
      console.error("Evento de clique inválido no mapa da loja:", event);
      return;
    }

    const lat = event.latLng.lat();
    const lng = event.latLng.lng();

    console.log("🏪 Mapa da loja clicado em:", {
      lat,
      lng,
      selectedStore: selectedStore?.businessName || selectedStore?.name,
    });

    if (selectedStore) {
      // Atualizar coordenadas da loja selecionada
      const updatedStore = {
        ...selectedStore,
        address: {
          ...selectedStore.address,
          coordinates: [lng, lat],
        },
      };
      setSelectedStore(updatedStore);

      // Geocodificação reversa para obter o endereço da loja
      reverseGeocodeStore(lat, lng);
    }
  };

  const reverseGeocode = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${process.env.REACT_APP_GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();

      if (data.results && data.results.length > 0) {
        const address = data.results[0];
        const addressComponents = address.address_components;

        const newCustomers = [...customers];
        newCustomers[activeCustomerIndex].customerAddress.address =
          address.formatted_address;

        // Extrair componentes do endereço
        addressComponents.forEach((component) => {
          if (component.types.includes("postal_code")) {
            newCustomers[activeCustomerIndex].customerAddress.cep =
              component.long_name;
          }
          if (
            component.types.includes("sublocality") ||
            component.types.includes("neighborhood")
          ) {
            newCustomers[activeCustomerIndex].customerAddress.bairro =
              component.long_name;
          }
          if (component.types.includes("administrative_area_level_2")) {
            newCustomers[activeCustomerIndex].customerAddress.cidade =
              component.long_name;
          }
          if (component.types.includes("administrative_area_level_1")) {
            newCustomers[activeCustomerIndex].customerAddress.estado =
              component.short_name;
          }
        });

        setCustomers(newCustomers);
      }
    } catch (error) {
      console.error("Erro na geocodificação reversa:", error);
    }
  };

  // Nova função para geocodificação reversa da loja
  const reverseGeocodeStore = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${process.env.REACT_APP_GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();

      if (data.results && data.results.length > 0) {
        const address = data.results[0];

        const updatedStore = {
          ...selectedStore,
          address: {
            ...selectedStore.address,
            address: address.formatted_address,
            coordinates: [lng, lat],
          },
        };
        setSelectedStore(updatedStore);
      }
    } catch (error) {
      console.error("Erro na geocodificação reversa da loja:", error);
    }
  };

  const handleSearchAddress = async () => {
    if (!searchAddress.trim() || !isLoaded) return;

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
          searchAddress
        )}&key=${process.env.REACT_APP_GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();

      if (data.results && data.results.length > 0) {
        const location = data.results[0].geometry.location;
        setMapCenter({ lat: location.lat, lng: location.lng });
        handleCustomerMapClick({
          latLng: {
            lat: () => location.lat,
            lng: () => location.lng,
          },
        });
      }
    } catch (error) {
      console.error("Erro na busca de endereço:", error);
    }
  };

  // Nova função para busca de endereço da loja
  const handleStoreSearchAddress = async () => {
    if (!storeSearchAddress.trim() || !isLoaded) return;

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
          storeSearchAddress
        )}&key=${process.env.REACT_APP_GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();

      if (data.results && data.results.length > 0) {
        const location = data.results[0].geometry.location;
        setMapCenter({ lat: location.lat, lng: location.lng });

        // Simular clique no mapa para a loja
        if (selectedStore) {
          handleStoreMapClick({
            latLng: {
              lat: () => location.lat,
              lng: () => location.lng,
            },
          });
        }
      }
    } catch (error) {
      console.error("Erro na busca de endereço da loja:", error);
    }
  };

  // Função para calcular preview do custo
  const calculatePreviewCost = async () => {
    // Verificar se existe loja selecionada
    if (!selectedStore) {
      alert("Selecione uma loja primeiro");
      return;
    }

    // Verificar se a loja tem coordenadas válidas
    const storeCoords =
      selectedStore.address?.coordinates ||
      selectedStore.geolocation.coordinates;
    if (
      !storeCoords ||
      !Array.isArray(storeCoords) ||
      storeCoords.length !== 2
    ) {
      alert("A loja selecionada não possui coordenadas válidas");
      return;
    }

    // Verificar se todos os clientes têm coordenadas
    const customersWithCoords = customers.filter(
      (customer) =>
        customer.customerAddress.coordinates &&
        customer.customerAddress.coordinates.length === 2
    );

    if (customersWithCoords.length === 0) {
      alert("Adicione pelo menos um endereço de entrega no mapa");
      return;
    }

    try {
      setLoadingPreview(true);

      const previewData = {
        store: {
          coordinates: storeCoords,
        },
        customer: customersWithCoords,
        driveBack: driveBack,
      };

      console.log("Enviando dados para preview:", previewData);

      const response = await api.post("/orders/preview-cost", previewData);

      console.log("Resposta do preview:", response.data);

      if (response.data.success) {
        setPreviewCost(response.data.preview);
      } else {
        alert("Erro ao calcular custo: " + response.data.message);
      }
    } catch (error) {
      console.error("Erro ao calcular preview do custo:", error);
      alert("Erro ao calcular custo da viagem");
    } finally {
      setLoadingPreview(false);
    }
  };

  const validateCustomers = () => {
    const errors = [];

    customers.forEach((customer, index) => {
      const customerNumber = index + 1;

      // Validar campos obrigatórios do cliente
      if (!customer.name || customer.name.trim() === "") {
        errors.push(`Cliente ${customerNumber}: Nome é obrigatório`);
      }

      if (!customer.phone || customer.phone.trim() === "") {
        errors.push(`Cliente ${customerNumber}: Telefone é obrigatório`);
      }

      // Validar campos do endereço
      const address = customer.customerAddress;

      if (!address.cep || address.cep.trim() === "") {
        errors.push(`Cliente ${customerNumber}: CEP é obrigatório`);
      }

      if (!address.address || address.address.trim() === "") {
        errors.push(`Cliente ${customerNumber}: Endereço é obrigatório`);
      }

      if (!address.addressNumber || address.addressNumber.trim() === "") {
        errors.push(
          `Cliente ${customerNumber}: Número do endereço é obrigatório`
        );
      }

      if (!address.bairro || address.bairro.trim() === "") {
        errors.push(`Cliente ${customerNumber}: Bairro é obrigatório`);
      }

      if (!address.cidade || address.cidade.trim() === "") {
        errors.push(`Cliente ${customerNumber}: Cidade é obrigatória`);
      }

      if (!address.estado || address.estado.trim() === "") {
        errors.push(`Cliente ${customerNumber}: Estado é obrigatório`);
      }

      // Validar coordenadas
      if (!address.coordinates || address.coordinates.length !== 2) {
        errors.push(
          `Cliente ${customerNumber}: Localização no mapa é obrigatória`
        );
      }
    });

    return errors;
  };

  const handleSubmit = async () => {
    if (!selectedStore) {
      alert("Selecione uma loja");
      return;
    }

    // Validar todos os campos dos clientes
    const customerErrors = validateCustomers();
    if (customerErrors.length > 0) {
      const errorMessage =
        "Por favor, corrija os seguintes erros:\n\n" +
        customerErrors.join("\n");
      alert(errorMessage);
      return;
    }

    if (items.some((i) => !i.productName || i.quantity <= 0 || i.price <= 0)) {
      alert("Verifique os itens do pedido");
      return;
    }

    try {
      setLoading(true);

      // Processar items para remover productId vazio
      const processedItems = items.map((item) => {
        const processedItem = { ...item };
        // Se productId estiver vazio, removê-lo do objeto
        if (!processedItem.productId || processedItem.productId === "") {
          delete processedItem.productId;
        }
        return processedItem;
      });

      const orderData = {
        store: {
          name: selectedStore.businessName || selectedStore.name,
          cnpj: selectedStore.cnpj,
          coordinates:
            selectedStore.address?.coordinates ||
            selectedStore.coordinates ||
            selectedStore.geolocation.coordinates,
          address: selectedStore.address,
        },
        customer: customers,
        items: processedItems,
        payment: payment,
        notes: notes,
        total: total,
        driveBack: driveBack,
        findDriverAuto: true, // Usar o estado do checkbox
        preview: {
          cost: previewCost?.cost || 0,
          distance: previewCost?.distance || 0,
          priceList: previewCost || {},
        },
      };

      const response = await api.post("/orders", orderData);

      if (onOrderCreated) {
        onOrderCreated(response.data.order);
      }

      handleClose();
    } catch (error) {
      console.error("Erro ao criar pedido:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Erro desconhecido ao criar pedido";

      alert("Erro ao criar pedido: " + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    // Reset do formulário
    setActiveTab(0);
    setSelectedStore(null);
    setCustomers([
      {
        name: "",
        phone: "",
        customerAddress: {
          cep: "",
          address: "",
          addressNumber: "",
          bairro: "",
          cidade: "",
          estado: "",
          coordinates: [],
        },
      },
    ]);
    setItems([
      {
        productId: "",
        productName: "Produto padrão",
        quantity: 1,
        price: 1,
      },
    ]);
    setPayment({ method: "dinheiro", change: 0 });
    setNotes("");
    setTotal(0);
    setActiveCustomerIndex(0);
    setSearchAddress("");
    setMap(null); // Reset do mapa
    setStoreMap(null); // Reset do mapa da loja

    // Reset dos novos estados
    setPreviewCost(null);
    setLoadingPreview(false);
    setDriveBack(false);
    setStoreSearchAddress("");
    setIsSelectingStoreLocation(false);
    setProdutosFetched(false); // Reset do controle de produtos

    onClose();
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2, maxHeight: "90vh" },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          pb: 1,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <ProductIcon sx={{ mr: 1, color: "primary.main" }} />
          <Typography variant="h6" fontWeight="bold">
            Criar Nova Corrida
          </Typography>
        </Box>
        <IconButton onClick={handleClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ borderBottom: 1, borderColor: "divider", px: 3 }}>
          <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
            <Tab label="Loja" />
            <Tab label="Clientes" />
            <Tab label="Itens" />
            <Tab label="Pagamento" />
          </Tabs>
        </Box>

        <Box sx={{ p: 3 }}>
          {/* Aba Loja */}
          {activeTab === 0 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Selecione a Loja
              </Typography>

              {loadingStores ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <Autocomplete
                  options={stores}
                  getOptionLabel={(option) =>
                    option.businessName || option.name || ""
                  }
                  value={selectedStore}
                  onChange={handleStoreSelect}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Buscar loja"
                      variant="outlined"
                      fullWidth
                    />
                  )}
                  renderOption={(props, option) => (
                    <Box component="li" {...props}>
                      <StoreIcon sx={{ mr: 2 }} />
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {option.businessName || option.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {option.address?.address || "Endereço não informado"}
                        </Typography>
                      </Box>
                    </Box>
                  )}
                />
              )}

              {selectedStore && (
                <>
                  <Card sx={{ mt: 2 }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Loja Selecionada
                      </Typography>
                      <Typography variant="body2">
                        <strong>Nome:</strong>{" "}
                        {selectedStore.businessName || selectedStore.name}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Endereço:</strong>{" "}
                        {selectedStore.address?.address || "Não informado"}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Telefone:</strong>{" "}
                        {selectedStore.phoneNumber || "Não informado"}
                      </Typography>

                      <Box sx={{ mt: 2, display: "flex", gap: 1 }}>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<LocationIcon />}
                          onClick={() => {
                            setIsSelectingStoreLocation(true);
                            if (selectedStore.address?.coordinates) {
                              setMapCenter({
                                lat: selectedStore.address.coordinates[1],
                                lng: selectedStore.address.coordinates[0],
                              });
                            }
                          }}
                          disabled={!isLoaded || loadError}
                        >
                          {!isLoaded
                            ? "Carregando mapa..."
                            : "Selecionar Localização no Mapa"}
                        </Button>
                        {selectedStore.address?.coordinates?.length === 2 && (
                          <Typography
                            variant="caption"
                            color="success.main"
                            sx={{ alignSelf: "center" }}
                          >
                            ✓ Coordenadas definidas
                          </Typography>
                        )}
                      </Box>
                    </CardContent>
                  </Card>

                  {/* Mapa para seleção de localização da loja */}
                  {isSelectingStoreLocation && (
                    <Card sx={{ mt: 2 }}>
                      <CardContent>
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            mb: 2,
                          }}
                        >
                          <Typography variant="h6">
                            Selecionar Localização da Loja
                          </Typography>
                          <Button
                            variant="text"
                            size="small"
                            onClick={() => setIsSelectingStoreLocation(false)}
                          >
                            Fechar Mapa
                          </Button>
                        </Box>

                        <Box sx={{ mb: 2, display: "flex", gap: 1 }}>
                          <TextField
                            fullWidth
                            placeholder="Buscar endereço da loja..."
                            value={storeSearchAddress}
                            disabled={!isLoaded || loadError}
                            onChange={(e) =>
                              setStoreSearchAddress(e.target.value)
                            }
                            onKeyPress={(e) => {
                              if (e.key === "Enter" && isLoaded && !loadError) {
                                handleStoreSearchAddress();
                              }
                            }}
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  <SearchIcon />
                                </InputAdornment>
                              ),
                            }}
                          />
                          <Button
                            variant="contained"
                            onClick={handleStoreSearchAddress}
                            disabled={!isLoaded || loadError}
                            sx={{ minWidth: "auto", px: 2 }}
                          >
                            <SearchIcon />
                          </Button>
                        </Box>

                        {loadError && (
                          <Alert severity="error" sx={{ mb: 2 }}>
                            Erro ao carregar o Google Maps. Verifique sua
                            conexão com a internet.
                          </Alert>
                        )}

                        {!isLoaded ? (
                          <Box
                            sx={{
                              width: "100%",
                              height: "400px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              backgroundColor: "grey.100",
                              borderRadius: 1,
                            }}
                          >
                            <Box sx={{ textAlign: "center" }}>
                              <CircularProgress sx={{ mb: 2 }} />
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                Carregando mapa...
                              </Typography>
                            </Box>
                          </Box>
                        ) : (
                          <GoogleMap
                            ref={storeMapRef}
                            mapContainerStyle={{
                              width: "100%",
                              height: "400px",
                            }}
                            center={mapCenter}
                            zoom={15}
                            onLoad={(mapInstance) => {
                              storeMapRef.current = mapInstance;
                              setStoreMap(mapInstance);
                              console.log(
                                "✅ Mapa da loja carregado e pronto para cliques"
                              );
                            }}
                          >
                            {selectedStore?.address?.coordinates?.length ===
                              2 && (
                              <Marker
                                position={{
                                  lat: selectedStore.address.coordinates[1],
                                  lng: selectedStore.address.coordinates[0],
                                }}
                                icon={{
                                  url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 24 24' fill='%23FF5722'%3E%3Cpath d='M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z'/%3E%3C/svg%3E",
                                  scaledSize: new window.google.maps.Size(
                                    40,
                                    40
                                  ),
                                }}
                              />
                            )}
                          </GoogleMap>
                        )}

                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ mt: 1, display: "block" }}
                        >
                          Clique no mapa para selecionar a localização exata da
                          loja
                        </Typography>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </Box>
          )}

          {/* Aba Clientes */}
          {activeTab === 1 && (
            <Box>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 2,
                }}
              >
                <Tabs
                  value={activeCustomerIndex}
                  onChange={(e, newValue) => setActiveCustomerIndex(newValue)}
                >
                  {customers.map((_, index) => (
                    <Tab key={index} label={`Cliente ${index + 1}`} />
                  ))}
                </Tabs>
                <Button
                  startIcon={<AddIcon />}
                  onClick={handleAddCustomer}
                  variant="outlined"
                  size="small"
                >
                  Adicionar Cliente
                </Button>
              </Box>

              <Card sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="h6" fontWeight={"bold"} gutterBottom>
                    Selecionar Localização - Cliente {activeCustomerIndex + 1}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" mb={1}>
                    Clique no mapa para selecionar a localização do cliente ou
                    digite CEP ou endereço (ex: Av Brasil, Centro, Mogi Guaçu).
                  </Typography>

                  <Box sx={{ mb: 2, display: "flex", gap: 1 }}>
                    <TextField
                      fullWidth
                      placeholder="Buscar endereço..."
                      value={searchAddress}
                      disabled={!isLoaded || loadError}
                      onChange={(e) => setSearchAddress(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter" && isLoaded && !loadError) {
                          handleSearchAddress();
                        }
                      }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon />
                          </InputAdornment>
                        ),
                      }}
                    />
                    <Button
                      variant="contained"
                      onClick={handleSearchAddress}
                      disabled={!isLoaded || loadError}
                      sx={{ minWidth: "auto", px: 2 }}
                    >
                      <SearchIcon />
                    </Button>
                  </Box>

                  {loadError && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                      Erro ao carregar o Google Maps. Verifique sua conexão com
                      a internet.
                    </Alert>
                  )}

                  {!isLoaded ? (
                    <Box
                      sx={{
                        width: "100%",
                        height: "400px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: "grey.100",
                        borderRadius: 1,
                      }}
                    >
                      <Box sx={{ textAlign: "center" }}>
                        <CircularProgress sx={{ mb: 2 }} />
                        <Typography variant="body2" color="text.secondary">
                          Carregando mapa...
                        </Typography>
                      </Box>
                    </Box>
                  ) : (
                    <GoogleMap
                      ref={mapRef}
                      mapContainerStyle={{ width: "100%", height: "400px" }}
                      center={mapCenter}
                      zoom={15}
                      onLoad={(mapInstance) => {
                        mapRef.current = mapInstance;
                        setMap(mapInstance);
                        console.log("✅ Mapa carregado e pronto para cliques");
                      }}
                    >
                      {customers[activeCustomerIndex]?.customerAddress
                        ?.coordinates?.length === 2 && (
                        <Marker
                          position={{
                            lat: customers[activeCustomerIndex].customerAddress
                              .coordinates[1],
                            lng: customers[activeCustomerIndex].customerAddress
                              .coordinates[0],
                          }}
                        />
                      )}
                    </GoogleMap>
                  )}

                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ mt: 1, display: "block" }}
                  >
                    Clique no mapa para selecionar a localização do Cliente{" "}
                    {activeCustomerIndex + 1}
                  </Typography>
                </CardContent>
              </Card>

              {customers.map((customer, index) => (
                <Card key={index} sx={{ mt: 2 }}>
                  <CardContent>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        mb: 2,
                      }}
                    >
                      <Typography variant="subtitle1" fontWeight="bold">
                        Cliente {index + 1}
                      </Typography>
                      {customers.length > 1 && (
                        <IconButton
                          onClick={() => handleRemoveCustomer(index)}
                          size="small"
                          color="error"
                        >
                          <RemoveIcon />
                        </IconButton>
                      )}
                    </Box>

                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Nome *"
                          fullWidth
                          required
                          error={!customer.name || customer.name.trim() === ""}
                          helperText={
                            !customer.name || customer.name.trim() === ""
                              ? "Nome é obrigatório"
                              : ""
                          }
                          value={customer.name}
                          onChange={(e) =>
                            handleCustomerChange("name", e.target.value, index)
                          }
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Telefone *"
                          fullWidth
                          required
                          error={
                            !customer.phone || customer.phone.trim() === ""
                          }
                          helperText={
                            !customer.phone || customer.phone.trim() === ""
                              ? "Telefone é obrigatório"
                              : ""
                          }
                          value={customer.phone}
                          onChange={(e) =>
                            handleCustomerChange("phone", e.target.value, index)
                          }
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="subtitle2" gutterBottom>
                          Endereço
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="CEP *"
                          fullWidth
                          required
                          error={
                            !customer.customerAddress.cep ||
                            customer.customerAddress.cep.trim() === ""
                          }
                          helperText={
                            !customer.customerAddress.cep ||
                            customer.customerAddress.cep.trim() === ""
                              ? "CEP é obrigatório"
                              : ""
                          }
                          value={customer.customerAddress.cep}
                          onChange={(e) =>
                            handleCustomerChange(
                              "customerAddress.cep",
                              e.target.value,
                              index
                            )
                          }
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Endereço *"
                          fullWidth
                          required
                          error={
                            !customer.customerAddress.address ||
                            customer.customerAddress.address.trim() === ""
                          }
                          helperText={
                            !customer.customerAddress.address ||
                            customer.customerAddress.address.trim() === ""
                              ? "Endereço é obrigatório"
                              : ""
                          }
                          value={customer.customerAddress.address}
                          onChange={(e) =>
                            handleCustomerChange(
                              "customerAddress.address",
                              e.target.value,
                              index
                            )
                          }
                        />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <TextField
                          label="Número *"
                          fullWidth
                          required
                          error={
                            !customer.customerAddress.addressNumber ||
                            customer.customerAddress.addressNumber.trim() === ""
                          }
                          helperText={
                            !customer.customerAddress.addressNumber ||
                            customer.customerAddress.addressNumber.trim() === ""
                              ? "Número é obrigatório"
                              : ""
                          }
                          value={customer.customerAddress.addressNumber}
                          onChange={(e) =>
                            handleCustomerChange(
                              "customerAddress.addressNumber",
                              e.target.value,
                              index
                            )
                          }
                        />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <TextField
                          label="Bairro *"
                          fullWidth
                          required
                          error={
                            !customer.customerAddress.bairro ||
                            customer.customerAddress.bairro.trim() === ""
                          }
                          helperText={
                            !customer.customerAddress.bairro ||
                            customer.customerAddress.bairro.trim() === ""
                              ? "Bairro é obrigatório"
                              : ""
                          }
                          value={customer.customerAddress.bairro}
                          onChange={(e) =>
                            handleCustomerChange(
                              "customerAddress.bairro",
                              e.target.value,
                              index
                            )
                          }
                        />
                      </Grid>
                      <Grid item xs={12} sm={3}>
                        <TextField
                          label="Cidade *"
                          fullWidth
                          required
                          error={
                            !customer.customerAddress.cidade ||
                            customer.customerAddress.cidade.trim() === ""
                          }
                          helperText={
                            !customer.customerAddress.cidade ||
                            customer.customerAddress.cidade.trim() === ""
                              ? "Cidade é obrigatória"
                              : ""
                          }
                          value={customer.customerAddress.cidade}
                          onChange={(e) =>
                            handleCustomerChange(
                              "customerAddress.cidade",
                              e.target.value,
                              index
                            )
                          }
                        />
                      </Grid>
                      <Grid item xs={12} sm={1}>
                        <TextField
                          label="Estado *"
                          fullWidth
                          required
                          error={
                            !customer.customerAddress.estado ||
                            customer.customerAddress.estado.trim() === ""
                          }
                          helperText={
                            !customer.customerAddress.estado ||
                            customer.customerAddress.estado.trim() === ""
                              ? "Estado é obrigatório"
                              : ""
                          }
                          value={customer.customerAddress.estado}
                          placeholder="SP"
                          onChange={(e) =>
                            handleCustomerChange(
                              "customerAddress.estado",
                              e.target.value,
                              index
                            )
                          }
                        />
                      </Grid>
                    </Grid>

                    <Box sx={{ mt: 2 }}>
                      {(!customer.customerAddress.coordinates ||
                        customer.customerAddress.coordinates.length !== 2) && (
                        <Alert severity="warning" sx={{ mb: 2 }}>
                          ⚠️ É necessário selecionar a localização no mapa para
                          este cliente
                        </Alert>
                      )}

                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => setActiveCustomerIndex(index)}
                        disabled={!isLoaded || loadError}
                        startIcon={<LocationIcon />}
                      >
                        {!isLoaded
                          ? "Carregando mapa..."
                          : customer.customerAddress.coordinates?.length === 2
                          ? "Alterar Localização no Mapa"
                          : "Selecionar Localização no Mapa"}
                      </Button>

                      {customer.customerAddress.coordinates?.length === 2 && (
                        <Typography
                          variant="caption"
                          color="success.main"
                          sx={{ ml: 2 }}
                        >
                          ✓ Localização definida
                        </Typography>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              ))}

              {/* Mapa para seleção de endereço */}
            </Box>
          )}

          {/* Aba Itens */}
          {activeTab === 2 && (
            <Box>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 2,
                }}
              >
                <Typography variant="h6">
                  Itens do Pedido
                  {produtosFetched && produtos.length > 0 && (
                    <Typography
                      component="span"
                      variant="caption"
                      color="text.secondary"
                      sx={{ ml: 1 }}
                    >
                      ({produtos.length} produtos disponíveis)
                    </Typography>
                  )}
                </Typography>
                <Box sx={{ display: "flex", gap: 1 }}>
                  {!produtosFetched && (
                    <Button
                      size="small"
                      onClick={() => {
                        setProdutosFetched(false);
                        fetchProdutos();
                      }}
                      disabled={loadingProdutos}
                      color="secondary"
                    >
                      {loadingProdutos ? "Carregando..." : "Carregar Produtos"}
                    </Button>
                  )}
                  {produtosFetched && (
                    <Button
                      size="small"
                      onClick={forceRefreshProducts}
                      disabled={loadingProdutos}
                      color="info"
                      title="Recarregar produtos da API"
                    >
                      🔄 Atualizar
                    </Button>
                  )}
                  <Button
                    startIcon={<AddIcon />}
                    onClick={handleAddItem}
                    variant="outlined"
                    size="small"
                  >
                    Adicionar Item
                  </Button>
                </Box>
              </Box>

              {items.map((item, index) => (
                <Card key={index} sx={{ mb: 2 }}>
                  <CardContent>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        mb: 2,
                      }}
                    >
                      <Typography variant="subtitle1" fontWeight="bold">
                        Item {index + 1}
                      </Typography>
                      {items.length > 1 && (
                        <IconButton
                          onClick={() => handleRemoveItem(index)}
                          size="small"
                          color="error"
                        >
                          <RemoveIcon />
                        </IconButton>
                      )}
                    </Box>

                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <FormControl fullWidth>
                          <InputLabel>Produto</InputLabel>
                          <Select
                            value={item.productId}
                            onChange={(e) =>
                              handleItemChange(
                                index,
                                "productId",
                                e.target.value
                              )
                            }
                            label="Produto"
                          >
                            {produtos.map((produto) => (
                              <MenuItem key={produto._id} value={produto._id}>
                                {produto.name} -{" "}
                                {formatCurrency(produto.price || 1)}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Nome do Produto"
                          fullWidth
                          value={item.productName}
                          onChange={(e) =>
                            handleItemChange(
                              index,
                              "productName",
                              e.target.value
                            )
                          }
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Quantidade"
                          type="number"
                          fullWidth
                          value={item.quantity}
                          onChange={(e) =>
                            handleItemChange(
                              index,
                              "quantity",
                              parseInt(e.target.value) || 1
                            )
                          }
                          inputProps={{ min: 1 }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Preço Unitário"
                          type="number"
                          fullWidth
                          value={item.price}
                          onChange={(e) =>
                            handleItemChange(
                              index,
                              "price",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          inputProps={{ min: 0, step: 0.01 }}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                R$
                              </InputAdornment>
                            ),
                          }}
                        />
                      </Grid>
                    </Grid>

                    <Box sx={{ mt: 2, textAlign: "right" }}>
                      <Typography variant="body2" color="text.secondary">
                        Subtotal: {formatCurrency(item.price * item.quantity)}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              ))}

              <Paper sx={{ p: 2, backgroundColor: "grey.50" }}>
                <Typography variant="h6" textAlign="right">
                  Total: {formatCurrency(total)}
                </Typography>
              </Paper>
            </Box>
          )}

          {/* Aba Pagamento */}
          {activeTab === 3 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Informações de Pagamento
              </Typography>

              {/* Preview do Custo da Viagem */}
              <Card sx={{ mb: 3, backgroundColor: "background.paper" }}>
                <CardContent>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      mb: 2,
                    }}
                  >
                    <Typography variant="h6" color="primary">
                      Custo da Viagem
                      {loadingPreview && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ ml: 1 }}
                        >
                          (Calculando automaticamente...)
                        </Typography>
                      )}
                    </Typography>
                    <Button
                      variant="outlined"
                      onClick={calculatePreviewCost}
                      disabled={loadingPreview || !selectedStore}
                      size="small"
                    >
                      {loadingPreview ? (
                        <CircularProgress size={16} />
                      ) : (
                        "Recalcular"
                      )}
                    </Button>
                  </Box>

                  <FormControl component="fieldset" sx={{ mb: 2 }}>
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <input
                        type="checkbox"
                        id="driveBack"
                        checked={driveBack}
                        onChange={(e) => setDriveBack(e.target.checked)}
                        style={{ marginRight: 8 }}
                      />
                      <label htmlFor="driveBack">
                        <Typography variant="body2">
                          Motoboy deve retornar à loja (custo adicional)
                        </Typography>
                      </label>
                    </Box>
                  </FormControl>

                  {previewCost ? (
                    <Box>
                      <Divider sx={{ my: 2 }} />
                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="text.secondary">
                            Custo Total:
                          </Typography>
                          <Typography
                            variant="h6"
                            color="primary"
                            fontWeight="bold"
                          >
                            {formatCurrency(previewCost.totalCost)}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="text.secondary">
                            Distância Total:
                          </Typography>
                          <Typography variant="body1">
                            {previewCost.totalDistance.toFixed(2)} km
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="text.secondary">
                            Número de Clientes:
                          </Typography>
                          <Typography variant="body1">
                            {previewCost.numberOfCustomers}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="text.secondary">
                            Condições:
                          </Typography>
                          <Typography variant="body1">
                            {previewCost.priceList.isRain
                              ? "🌧️ Chuva"
                              : previewCost.priceList.isHighDemand
                              ? "🔥 Alta Demanda"
                              : "☀️ Normal"}
                          </Typography>
                        </Grid>
                      </Grid>

                      {/* Breakdown detalhado */}
                      <Box
                        sx={{
                          mt: 2,
                          p: 2,
                          backgroundColor: "grey.50",
                          borderRadius: 1,
                        }}
                      >
                        <Typography variant="subtitle2" gutterBottom>
                          Detalhamento do Custo:
                        </Typography>
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            py: 0.5,
                          }}
                        >
                          <Typography variant="body2">Valor Base:</Typography>
                          <Typography variant="body2">
                            {formatCurrency(previewCost.breakdown.baseCost)}
                          </Typography>
                        </Box>
                        {previewCost.breakdown.extraDistanceCost > 0 && (
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                              py: 0.5,
                            }}
                          >
                            <Typography variant="body2">
                              Distância Extra:
                            </Typography>
                            <Typography variant="body2">
                              {formatCurrency(
                                previewCost.breakdown.extraDistanceCost
                              )}
                            </Typography>
                          </Box>
                        )}
                        {previewCost.breakdown.multipleCustomersCost > 0 && (
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                              py: 0.5,
                            }}
                          >
                            <Typography variant="body2">
                              Múltiplos Clientes:
                            </Typography>
                            <Typography variant="body2">
                              {formatCurrency(
                                previewCost.breakdown.multipleCustomersCost
                              )}
                            </Typography>
                          </Box>
                        )}
                        {previewCost.breakdown.driveBackCost > 0 && (
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                              py: 0.5,
                            }}
                          >
                            <Typography variant="body2">
                              Retorno à Loja:
                            </Typography>
                            <Typography variant="body2">
                              {formatCurrency(
                                previewCost.breakdown.driveBackCost
                              )}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    </Box>
                  ) : (
                    !loadingPreview && (
                      <Box
                        sx={{
                          mt: 2,
                          p: 2,
                          backgroundColor: "grey.50",
                          borderRadius: 1,
                          textAlign: "center",
                        }}
                      >
                        <Typography variant="body2" color="text.secondary">
                          📍 Selecione uma loja e adicione endereços de entrega
                          para calcular o custo
                        </Typography>
                      </Box>
                    )
                  )}
                </CardContent>
              </Card>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Forma de Pagamento</InputLabel>
                    <Select
                      value={payment.method}
                      onChange={(e) =>
                        setPayment({ ...payment, method: e.target.value })
                      }
                      label="Forma de Pagamento"
                    >
                      <MenuItem value="dinheiro">Dinheiro</MenuItem>
                      <MenuItem value="cartao_credito">
                        Cartão de Crédito
                      </MenuItem>
                      <MenuItem value="cartao_debito">
                        Cartão de Débito
                      </MenuItem>
                      <MenuItem value="pix">PIX</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                {payment.method === "dinheiro" && (
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Troco para"
                      type="number"
                      fullWidth
                      value={payment.change}
                      onChange={(e) =>
                        setPayment({
                          ...payment,
                          change: parseFloat(e.target.value) || 0,
                        })
                      }
                      inputProps={{ min: 0, step: 0.01 }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">R$</InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                )}
                <Grid item xs={12}>
                  <TextField
                    label="Observações"
                    fullWidth
                    multiline
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Observações adicionais sobre o pedido..."
                  />
                </Grid>
              </Grid>

              <Paper
                sx={{
                  p: 2,
                  mt: 2,
                  backgroundColor: "primary.light",
                  color: "primary.contrastText",
                }}
              >
                <Typography variant="h5" textAlign="center" fontWeight="bold">
                  Total do Pedido: {formatCurrency(total)}
                </Typography>
              </Paper>
            </Box>
          )}
        </Box>

        {!customers.length && (
          <Typography variant="body2" color="text.secondary">
            Nenhum cliente adicionado.
          </Typography>
        )}

        {customers.length > 0 &&
          (!customers[activeCustomerIndex].customerAddress.addressNumber ||
            !customers[activeCustomerIndex].name ||
            !customers[activeCustomerIndex].phone) && (
            <Typography
              variant="body2"
              color="text.secondary"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              Cliente incompleto: verifique nome, telefone e numero do endereço.
            </Typography>
          )}

        {customers.length > 0 &&
          customers[activeCustomerIndex]?.customerAddress?.addressNumber && (
            <Typography>
              {customers[activeCustomerIndex].customerAddress.addressNumber}
            </Typography>
          )}
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 1 }}>
        <Button onClick={handleClose} color="inherit">
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color="primary"
          disabled={
            loading ||
            !selectedStore ||
            customers.some((c) => !c.name || !c.phone)
          }
        >
          {loading ? <CircularProgress size={20} /> : "Criar Corrida"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateOrderDialog;
