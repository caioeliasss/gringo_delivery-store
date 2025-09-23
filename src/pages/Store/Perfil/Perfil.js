import React, { useState, useEffect } from "react";
import { auth } from "../../../firebase";
import "./Perfil.css";
import { Link, useNavigate } from "react-router-dom";
import api, { getStore } from "../../../services/api";
import SideDrawer from "../../../components/SideDrawer/SideDrawer";
import { IconButton } from "@mui/material";
import { Menu as MenuIcon } from "@mui/icons-material";
import {
  STORE_MENU_ITEMS,
  createSupportFooterItems,
} from "../../../config/menuConfig";
import { useAuth } from "../../../contexts/AuthContext";
import {
  uploadStoreProfileImage,
  deleteStoreProfileImage,
} from "../../../services/storageService";

const Perfil = () => {
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [user, setUser] = useState(null);
  const [sideDrawerOpen, setSideDrawerOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState({
    displayName: "",
    businessName: "",
    cnpj: "",
    phone: "",
    email: "",
    perfil_url: "",
    address: {
      address: "",
      bairro: "",
      cidade: "",
      cep: "",
    },
    geolocation: {
      coordinates: [0, 0],
    },
    isAvailable: false,
    cnpj_approved: false,
    freeToNavigate: false,
    termsAccepted: false,
  });
  const [locationData, setLocationData] = useState({
    longitude: "",
    latitude: "",
  });
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setUser(user);
        fetchProfileData(user);
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile) {
        setSideDrawerOpen(false); // Fecha o drawer móvel quando volta para desktop
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const fetchProfileData = async (currentUser) => {
    try {
      const response = await api.get("/stores/me");

      console.log("Resposta da API:", response.data);

      // Para axios, verificamos response.status ao invés de response.ok
      if (response.status === 200 && response.data) {
        const data = response.data;
        console.log("Dados recebidos:", data);
        setProfileData(data);
        if (data.geolocation && data.geolocation.coordinates) {
          setLocationData({
            longitude: data.geolocation.coordinates[0],
            latitude: data.geolocation.coordinates[1],
          });
        }
      } else {
        console.error("Resposta da API sem dados válidos:", response);
      }
    } catch (error) {
      console.error("Erro ao buscar perfil:", error);
      console.error("Detalhes do erro:", error.response?.data || error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name.includes(".")) {
      const [parent, child] = name.split(".");
      setProfileData((prev) => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value,
        },
      }));
    } else {
      setProfileData((prev) => ({
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      }));
    }
  };

  const handleLocationChange = (e) => {
    const { name, value } = e.target;
    setLocationData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const updateProfile = async (e) => {
    e.preventDefault();
    setUpdating(true);

    try {
      const profileDataToUpdate = {
        ...profileData,
        geolocation: {
          coordinates: [
            parseFloat(locationData.longitude) || 0,
            parseFloat(locationData.latitude) || 0,
          ],
        },
      };

      console.log("Dados para atualização:", profileDataToUpdate);

      // Usar a API service ao invés de fetch direto
      const response = await api.post("/stores/profile", profileDataToUpdate);

      if (response.status === 200) {
        const updatedData = response.data;
        console.log("Perfil atualizado:", updatedData);
        setProfileData(updatedData);
        alert("Perfil atualizado com sucesso!");
      } else {
        console.error("Erro na resposta:", response);
        alert("Erro ao atualizar perfil");
      }
    } catch (error) {
      console.error("Erro ao atualizar perfil:", error);
      console.error("Detalhes do erro:", error.response?.data || error.message);
      alert("Erro ao atualizar perfil");
    } finally {
      setUpdating(false);
    }
  };

  const updateCnpj = async () => {
    if (!profileData.cnpj) {
      alert("Por favor, insira um CNPJ");
      return;
    }

    try {
      const response = await api.put("/stores/cnpj", {
        cnpj: profileData.cnpj,
        storeId: profileData._id,
      });

      if (response.status === 200) {
        alert("CNPJ atualizado com sucesso!");
        fetchProfileData(user);
      } else {
        alert("Erro ao atualizar CNPJ");
      }
    } catch (error) {
      console.error("Erro ao atualizar CNPJ:", error);
      console.error("Detalhes do erro:", error.response?.data || error.message);
      alert("Erro ao atualizar CNPJ");
    }
  };

  const updatePhone = async () => {
    if (!profileData.phone) {
      alert("Por favor, insira um telefone");
      return;
    }

    try {
      const response = await api.put("/stores/phone", {
        phone: profileData.phone,
        storeId: profileData._id,
      });

      if (response.status === 200) {
        alert("Telefone atualizado com sucesso!");
        fetchProfileData(user);
      } else {
        alert("Erro ao atualizar telefone");
      }
    } catch (error) {
      console.error("Erro ao atualizar telefone:", error);
      console.error("Detalhes do erro:", error.response?.data || error.message);
      alert("Erro ao atualizar telefone");
    }
  };

  const updateLocation = async () => {
    if (!locationData.longitude || !locationData.latitude) {
      alert("Por favor, insira longitude e latitude");
      return;
    }

    try {
      const response = await api.put("/stores/location", {
        longitude: parseFloat(locationData.longitude),
        latitude: parseFloat(locationData.latitude),
      });

      if (response.status === 200) {
        alert("Localização atualizada com sucesso!");
        fetchProfileData(user);
      } else {
        alert("Erro ao atualizar localização");
      }
    } catch (error) {
      console.error("Erro ao atualizar localização:", error);
      console.error("Detalhes do erro:", error.response?.data || error.message);
      alert("Erro ao atualizar localização");
    }
  };

  const toggleAvailability = async () => {
    try {
      const response = await api.put("/stores/availability", {
        isAvailable: !profileData.isAvailable,
      });

      if (response.status === 200) {
        setProfileData((prev) => ({
          ...prev,
          isAvailable: !prev.isAvailable,
        }));
        alert(
          `Loja agora está ${!profileData.isAvailable ? "aberta" : "fechada"}`
        );
      } else {
        alert("Erro ao alterar disponibilidade");
      }
    } catch (error) {
      console.error("Erro ao alterar disponibilidade:", error);
      console.error("Detalhes do erro:", error.response?.data || error.message);
      alert("Erro ao alterar disponibilidade");
    }
  };

  const acceptTerms = async () => {
    try {
      const response = await api.post("/stores/accept-terms");

      if (response.status === 200) {
        setProfileData((prev) => ({
          ...prev,
          termsAccepted: true,
          termsAcceptedAt: new Date(),
        }));
        alert("Termos aceitos com sucesso!");
      } else {
        alert("Erro ao aceitar termos");
      }
    } catch (error) {
      console.error("Erro ao aceitar termos:", error);
      console.error("Detalhes do erro:", error.response?.data || error.message);
      alert("Erro ao aceitar termos");
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocationData({
            longitude: position.coords.longitude.toString(),
            latitude: position.coords.latitude.toString(),
          });
        },
        (error) => {
          console.error("Erro ao obter localização:", error);
          alert("Erro ao obter localização atual");
        }
      );
    } else {
      alert("Geolocalização não é suportada neste navegador");
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
  };

  const handleProfileImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploadingImage(true);

    try {
      // Fazer upload da nova imagem
      const imageUrl = await uploadStoreProfileImage(
        file,
        profileData.firebaseUid
      );

      // Excluir imagem anterior se existir
      if (profileData.perfil_url) {
        await deleteStoreProfileImage(profileData.perfil_url);
      }

      // Atualizar perfil no backend
      const response = await api.put("/stores/profile-image", {
        perfil_url: imageUrl,
      });

      if (response.status === 200) {
        setProfileData((prev) => ({
          ...prev,
          perfil_url: imageUrl,
        }));
        alert("Imagem de perfil atualizada com sucesso!");
      } else {
        alert("Erro ao salvar URL da imagem no perfil");
      }
    } catch (error) {
      console.error("Erro ao fazer upload da imagem:", error);
      alert(error.message || "Erro ao fazer upload da imagem");
    } finally {
      setUploadingImage(false);
    }
  };

  const removeProfileImage = async () => {
    if (!profileData.perfil_url) return;

    setUploadingImage(true);

    try {
      // Excluir imagem do storage
      await deleteStoreProfileImage(profileData.perfil_url);

      // Atualizar perfil no backend
      const response = await api.put("/stores/profile-image", {
        perfil_url: "",
      });

      if (response.status === 200) {
        setProfileData((prev) => ({
          ...prev,
          perfil_url: "",
        }));
        alert("Imagem de perfil removida com sucesso!");
      } else {
        alert("Erro ao remover imagem do perfil");
      }
    } catch (error) {
      console.error("Erro ao remover imagem:", error);
      alert("Erro ao remover imagem de perfil");
    } finally {
      setUploadingImage(false);
    }
  };

  if (loading) {
    return (
      <div className="perfil-container">
        <div className="loading">Carregando...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="perfil-container">
        <div className="error">
          Você precisa estar logado para acessar esta página
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex" }}>
      <SideDrawer
        open={sideDrawerOpen}
        onClose={() => setSideDrawerOpen(false)}
        variant={isMobile ? "temporary" : "permanent"}
        menuItems={STORE_MENU_ITEMS}
        footerItems={createSupportFooterItems(handleLogout)}
      />
      <div
        className="perfil-container"
        style={{
          marginLeft: isMobile ? "0" : "250px",
          flex: 1,
        }}
      >
        <div className="perfil-header">
          {isMobile && (
            <IconButton
              onClick={() => setSideDrawerOpen(true)}
              sx={{ marginBottom: 2 }}
            >
              <MenuIcon />
            </IconButton>
          )}
          <h1>Perfil da Loja</h1>
          <div className="status-indicators">
            <span
              className={`status-badge ${
                profileData.cnpj_approved ? "approved" : "pending"
              }`}
            >
              CNPJ: {profileData.cnpj_approved ? "Aprovado" : "Pendente"}
            </span>
            <span
              className={`status-badge ${
                profileData.freeToNavigate ? "approved" : "pending"
              }`}
            >
              Acesso: {profileData.freeToNavigate ? "Liberado" : "Restrito"}
            </span>
            <span
              className={`status-badge ${
                profileData.isAvailable ? "available" : "unavailable"
              }`}
            >
              Status: {profileData.isAvailable ? "Aberta" : "Fechada"}
            </span>
          </div>
        </div>

        <form onSubmit={updateProfile} className="perfil-form">
          <div className="form-section">
            <h2>Imagem de Perfil</h2>

            <div className="profile-image-section">
              {profileData.perfil_url ? (
                <div className="current-image">
                  <img
                    src={profileData.perfil_url}
                    alt="Perfil do estabelecimento"
                    style={{
                      width: "150px",
                      height: "150px",
                      objectFit: "cover",
                      borderRadius: "8px",
                      border: "2px solid #ddd",
                    }}
                  />
                  <div className="image-actions">
                    <button
                      type="button"
                      onClick={removeProfileImage}
                      disabled={uploadingImage}
                      className="btn-remove"
                      style={{
                        backgroundColor: "#dc3545",
                        color: "white",
                        border: "none",
                        padding: "8px 16px",
                        borderRadius: "4px",
                        cursor: "pointer",
                        marginTop: "10px",
                      }}
                    >
                      {uploadingImage ? "Removendo..." : "Remover Imagem"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="no-image">
                  <div
                    style={{
                      width: "150px",
                      height: "150px",
                      backgroundColor: "#f8f9fa",
                      border: "2px dashed #ddd",
                      borderRadius: "8px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#6c757d",
                    }}
                  >
                    Sem imagem
                  </div>
                </div>
              )}

              <div className="upload-section">
                <input
                  type="file"
                  id="profile-image"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleProfileImageUpload}
                  disabled={uploadingImage}
                  style={{ display: "none" }}
                />
                <label
                  htmlFor="profile-image"
                  className="btn-upload"
                  style={{
                    backgroundColor: "#007bff",
                    color: "white",
                    border: "none",
                    padding: "10px 20px",
                    borderRadius: "4px",
                    cursor: uploadingImage ? "not-allowed" : "pointer",
                    display: "inline-block",
                    marginTop: "10px",
                    opacity: uploadingImage ? 0.6 : 1,
                  }}
                >
                  {uploadingImage
                    ? "Enviando..."
                    : profileData.perfil_url
                    ? "Alterar Imagem"
                    : "Adicionar Imagem"}
                </label>
                <p
                  style={{
                    fontSize: "12px",
                    color: "#6c757d",
                    marginTop: "5px",
                  }}
                >
                  Formatos aceitos: JPG, PNG, WebP (máx. 5MB)
                </p>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h2>Informações Básicas</h2>

            <div className="form-group">
              <label>Nome de Exibição:</label>
              <input
                type="text"
                name="displayName"
                value={profileData.displayName}
                onChange={handleInputChange}
                placeholder="Nome que aparece para os clientes"
              />
            </div>

            <div className="form-group">
              <label>Nome do Negócio:</label>
              <input
                type="text"
                name="businessName"
                value={profileData.businessName}
                onChange={handleInputChange}
                placeholder="Razão social ou nome fantasia"
              />
            </div>

            <div className="form-group">
              <label>Email:</label>
              <input
                type="email"
                name="email"
                value={profileData.email}
                onChange={handleInputChange}
                placeholder="email@exemplo.com"
              />
            </div>
          </div>

          <div className="form-section">
            <h2>CNPJ</h2>
            <div className="form-group-inline">
              <input
                type="text"
                name="cnpj"
                value={profileData.cnpj}
                onChange={handleInputChange}
                placeholder="00.000.000/0000-00"
              />
            </div>
          </div>

          <div className="form-section">
            <h2>Telefone</h2>
            <div className="form-group-inline">
              <input
                type="text"
                name="phone"
                value={profileData.phone}
                onChange={handleInputChange}
                placeholder="(11) 99999-9999"
              />
            </div>
          </div>

          <div className="form-section">
            <h2>Endereço</h2>

            <div className="form-group">
              <label>Endereço:</label>
              <input
                type="text"
                name="address.address"
                value={profileData.address?.address || ""}
                onChange={handleInputChange}
                placeholder="Rua, número"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Bairro:</label>
                <input
                  type="text"
                  name="address.bairro"
                  value={profileData.address?.bairro || ""}
                  onChange={handleInputChange}
                  placeholder="Bairro"
                />
              </div>

              <div className="form-group">
                <label>Cidade:</label>
                <input
                  type="text"
                  name="address.cidade"
                  value={profileData.address?.cidade || ""}
                  onChange={handleInputChange}
                  placeholder="Cidade"
                />
              </div>

              <div className="form-group">
                <label>CEP:</label>
                <input
                  type="text"
                  name="address.cep"
                  value={profileData.address?.cep || ""}
                  onChange={handleInputChange}
                  placeholder="00000-000"
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h2>Localização (GPS)</h2>
            <div className="location-controls">
              <div className="form-row">
                <div className="form-group">
                  <label>Longitude:</label>
                  <input
                    type="number"
                    step="any"
                    name="longitude"
                    value={locationData.longitude}
                    onChange={handleLocationChange}
                    placeholder="-46.633308"
                  />
                </div>

                <div className="form-group">
                  <label>Latitude:</label>
                  <input
                    type="number"
                    step="any"
                    name="latitude"
                    value={locationData.latitude}
                    onChange={handleLocationChange}
                    placeholder="-23.550520"
                  />
                </div>
              </div>

              <div className="location-buttons">
                <button
                  type="button"
                  onClick={getCurrentLocation}
                  className="btn-location"
                >
                  Usar Localização Atual
                </button>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h2>Controles da Loja</h2>

            <div className="toggle-controls">
              {/* <button
              type="button"
              onClick={toggleAvailability}
              className={`btn-toggle ${
                profileData.isAvailable ? "active" : ""
              }`}
            >
              {profileData.isAvailable ? "Fechar Loja" : "Abrir Loja"}
            </button> */}

              <Link to="/termos/store" className="btn-terms">
                Ver Termos de Serviço
              </Link>
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" disabled={updating} className="btn-primary">
              {updating ? "Atualizando..." : "Salvar Perfil Completo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Perfil;
