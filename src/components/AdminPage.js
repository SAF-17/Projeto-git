import React, { useState } from 'react';
import './AdminPage.css'; 
import EditCity from './EditCity';
import EditPoint from './EditPoint';
import EditRoute from './EditRoute';
import EditData from './EditData';
import ApprovePoints from './ApprovePoints';
import AdminUsers from './AdminUsers';

// Estes serão os componentes para cada funcionalidade
const AddPoint = () => <div>Formulário para Adicionar Ponto Turístico</div>;

// Componentes para cada ação

const AdminPage = () => {
  const [activeTab, setActiveTab] = useState('approvePoints');

  const renderContent = () => {
    if (activeTab === 'approvePoints') return <ApprovePoints />;
    switch (activeTab) {
      case 'editData':
        return <EditData />;
      case 'editCity':
        return <EditCity />;
      case 'editPoint':
        return <EditPoint />;
      case 'editRoute':
        return <EditRoute />;
      case 'adminUsers':
        return <AdminUsers />;
      default:
        return <EditCity />;
    }
  };

  return (
    <div className="admin-container">
      <aside className="admin-sidebar">
        <h2>Painel de Administrador</h2>
        <nav>
          <button
            className={activeTab === 'approvePoints' ? 'active' : ''}
            onClick={() => setActiveTab('approvePoints')}
          >
            Aprovar Pontos Turísticos
          </button>
          <button
            className={activeTab === 'editData' ? 'active' : ''}
            onClick={() => setActiveTab('editData')}
          >
            Editar Dados
          </button>
          <button
            className={activeTab === 'editCity' ? 'active' : ''}
            onClick={() => setActiveTab('editCity')}
          >
            Editar Cidade
          </button>
          <button
            className={activeTab === 'editPoint' ? 'active' : ''}
            onClick={() => setActiveTab('editPoint')}
          >
            Editar Ponto Turístico
          </button>
          <button
            className={activeTab === 'editRoute' ? 'active' : ''}
            onClick={() => setActiveTab('editRoute')}
          >
            Editar Trajeto
          </button>
          <button
            className={activeTab === 'adminUsers' ? 'active' : ''}
            onClick={() => setActiveTab('adminUsers')}
          >
            Gerir Utilizadores
          </button>
          {/* Futuras ações:
          <button>Adicionar Cidade</button>
          <button>Adicionar Ponto Turístico</button>
          <button>Adicionar Trajeto</button>
          <button>Remover Cidade/Ponto/Trajeto</button>
          <button>Exportar Dados</button>
          <button>Importar Dados</button>
          <button>Gerir Utilizadores</button>
          */}
        </nav>
      </aside>
      <main className="admin-content">
        {renderContent()}
      </main>
    </div>
  );
};

export default AdminPage; 