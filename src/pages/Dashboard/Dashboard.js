import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getUserProfile } from '../../services/api';
import './Dashboard.css';

const Dashboard = () => {
  const { currentUser, logout } = useAuth();
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const response = await getUserProfile();
        setUserProfile(response.data);
      } catch (error) {
        console.error('Erro ao buscar perfil:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="dashboard-spinner"></div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-sidebar">
        <div className="dashboard-menu">
          <Link to="/dashboard" className="dashboard-menu-item active">
            Dashboard
          </Link>
          <Link to="/produtos" className="dashboard-menu-item">
            Produtos
          </Link>
          {/* Adicionar mais links de navegação conforme necessário */}
        </div>
      </div>
      
      <div className="dashboard-content">
        <h1 className="dashboard-title">Dashboard</h1>
        
        <div className="dashboard-profile-card">
          <h2 className="dashboard-welcome">
            Bem-vindo, {userProfile?.displayName || currentUser?.email}!
          </h2>
          
          <div className="dashboard-info-container">
            <span className="dashboard-info-label">Email:</span>
            <span className="dashboard-info-value">{currentUser?.email}</span>
          </div>
          
          {userProfile && userProfile.cnpj && (
            <div className="dashboard-info-container">
              <span className="dashboard-info-label">CNPJ:</span>
              <span className="dashboard-info-value">{userProfile.cnpj}</span>
            </div>
          )}
          
          {userProfile && userProfile.photoURL && (
            <img 
              src={userProfile.photoURL} 
              alt="Foto de perfil" 
              className="dashboard-profile-image" 
            />
          )}
        </div>
        
        <button 
          className="dashboard-logout-button"
          onClick={handleLogout}
        >
          Sair
        </button>
      </div>
    </div>
  );
};

export default Dashboard;