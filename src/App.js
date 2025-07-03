import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation, useNavigate } from "react-router-dom";
import "./modern.css";
import MapPage from "./components/MapPage";
import AdicionarPonto from "./components/AdicionarPonto";
import Login from "./components/Login";
import Trajetos from "./components/Trajetos";
import { auth } from "./firebase/config";
import { useAuthState } from "react-firebase-hooks/auth";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { CityProvider, useCity } from './context/CityContext';
import { obterCidades, obterTextoSobre, buscarTodosTrajetos, buscarTrajetosPorCidade } from './firebase/firestore';
import AdminRoute from './components/AdminRoute';
import AdminPage from './components/AdminPage';
import Loading from './components/Loading';
import { distritosCidades } from './firebase/dadosGeograficos';
import EditSingleRoute from './components/EditSingleRoute';
import EditRouteMap from './components/EditRouteMap';

const Menu = React.lazy(() => import('./components/Menu'));

const Explorar = () => {
  const [cidades, setCidades] = useState([]);
  const [distritoSelecionado, setDistritoSelecionado] = useState('');
  const [loading, setLoading] = useState(true);
  const { setSelectedCity } = useCity();
  const navigate = useNavigate();
  const [trajetosSugeridos, setTrajetosSugeridos] = useState([]);
  const [loadingTrajetos, setLoadingTrajetos] = useState(false);
  const [cidadeSelecionada, setCidadeSelecionada] = useState(null);

  useEffect(() => {
    const carregarCidades = async () => {
      setLoading(true);
      try {
        const cidadesArray = await obterCidades();
        setCidades(cidadesArray);
      } catch (error) {
        toast.error('Não foi possível carregar a lista de cidades.');
      } finally {
        setLoading(false);
      }
    };
    carregarCidades();
  }, []);

  useEffect(() => {
    if (distritoSelecionado && cidadeSelecionada) {
      setLoadingTrajetos(true);
      buscarTrajetosPorCidade(cidadeSelecionada.id).then(trajetos => {
        setTrajetosSugeridos(trajetos.slice(0, 6));
        setLoadingTrajetos(false);
      }).catch(() => {
        setTrajetosSugeridos([]);
        setLoadingTrajetos(false);
      });
    }
  }, [distritoSelecionado, cidadeSelecionada]);

  useEffect(() => {
    if (!distritoSelecionado) {
      setLoadingTrajetos(true);
      buscarTodosTrajetos().then(trajetos => {
        // Ordenar por classificação média (averageRating) decrescente
        const ordenados = [...trajetos].sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0));
        setTrajetosSugeridos(ordenados.slice(0, 6));
        setLoadingTrajetos(false);
      }).catch(() => {
        setTrajetosSugeridos([]);
        setLoadingTrajetos(false);
      });
    }
  }, [distritoSelecionado]);

  const handleSelectCity = (cidade) => {
    setSelectedCity(cidade);
    setCidadeSelecionada(cidade);
    navigate('/mapa');
  };

  const handleSelectTrajeto = (trajeto) => {
    // Se o trajeto tem uma cidade associada, usar essa cidade
    if (trajeto.cidade) {
      const cidadeDoTrajeto = cidades.find(c => c.id === trajeto.cidade);
      if (cidadeDoTrajeto) {
        setSelectedCity(cidadeDoTrajeto);
      }
    } else if (cidadeSelecionada) {
      // Se não tem cidade no trajeto, usar a cidade atualmente selecionada
      setSelectedCity(cidadeSelecionada);
    }
    
    // Navegar para o mapa com o trajeto
    navigate('/mapa', { state: { trajetoParaExibir: trajeto } });
  };
  
  const cidadesFiltradas = distritoSelecionado
    ? cidades.filter(c => c.distrito && c.distrito.trim().toLowerCase() === distritoSelecionado.trim().toLowerCase())
    : [];

  return (
    <div className="container city-selector">
      <h1 style={{ fontSize: '2.8em', color: 'var(--primary)', fontWeight: 900, textShadow: '0 3px 12px rgba(0,0,0,0.18)' }}>Escolha um Distrito para Explorar</h1>
      <p>Selecione um distrito para ver as cidades com pontos turísticos disponíveis.</p>
      
      <select 
        onChange={(e) => setDistritoSelecionado(e.target.value)} 
        value={distritoSelecionado}
        className="glowing-border"
        style={{marginBottom: '2rem', width: '300px', padding: '10px'}}
      >
        <option value="">Selecione um distrito</option>
        {Object.keys(distritosCidades).sort().map(distrito => (
          <option key={distrito} value={distrito}>{distrito}</option>
        ))}
      </select>

      {/* Box de trajetos sugeridos */}
      {!distritoSelecionado && !loading && (
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ marginTop: '2rem' }}>Trajetos Sugeridos</h2>
          {loadingTrajetos ? (
            <Loading message="A carregar trajetos sugeridos..." />
          ) : (
            <div className="city-list" style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {trajetosSugeridos.length === 0 && <p>Não há trajetos sugeridos disponíveis.</p>}
              {trajetosSugeridos.map(trajeto => (
                <div key={trajeto.id} className="city-card glowing-border" onClick={() => handleSelectTrajeto(trajeto)}>
                  {trajeto.pontos && trajeto.pontos[0] && trajeto.pontos[0].imagem && (
                    <img src={trajeto.pontos[0].imagem} alt={`Imagem do trajeto ${trajeto.nome}`} />
                  )}
                  <div className="city-name">{trajeto.nome}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {loading && <Loading message="A carregar cidades..." />}

      {!loading && distritoSelecionado && cidadesFiltradas.length === 0 && (
        <div style={{ marginTop: '2rem' }}>
          <p>Ainda não temos cidades para o distrito de {distritoSelecionado}.</p>
        </div>
      )}

      {!loading && cidadesFiltradas.length > 0 && (
        <>
          <h2 style={{ marginTop: '2rem' }}>Cidades em {distritoSelecionado}</h2>
          <div className="city-list">
            {cidadesFiltradas.map(cidade => (
              <div key={cidade.id} className="city-card glowing-border" onClick={() => handleSelectCity(cidade)}>
                {cidade.imageUrl && <img src={cidade.imageUrl} alt={`Imagem de ${cidade.id}`} />}
                <div className="city-name">{cidade.id}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {distritoSelecionado && cidadeSelecionada && !loading && (
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ marginTop: '2rem' }}>Trajetos Sugeridos para {cidadeSelecionada.id}</h2>
          {loadingTrajetos ? (
            <Loading message="A carregar trajetos sugeridos..." />
          ) : (
            <div className="city-list" style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {trajetosSugeridos.length === 0 && <p>Não há trajetos sugeridos disponíveis para esta cidade.</p>}
              {trajetosSugeridos.map(trajeto => (
                <div key={trajeto.id} className="city-card glowing-border" onClick={() => handleSelectTrajeto(trajeto)}>
                  {trajeto.pontos && trajeto.pontos[0] && trajeto.pontos[0].imagem && (
                    <img src={trajeto.pontos[0].imagem} alt={`Imagem do trajeto ${trajeto.nome}`} />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const Sobre = () => {
  const [texto, setTexto] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSobre = async () => {
      setLoading(true);
      try {
        const textoSobre = await obterTextoSobre();
        setTexto(textoSobre);
      } catch (e) {
        setTexto('Erro ao carregar o texto do sobre.');
      } finally {
        setLoading(false);
      }
    };
    fetchSobre();
  }, []);

  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <h1 style={{ fontSize: '3.2em', fontWeight: 900, textAlign: 'center', marginBottom: 32, color: 'var(--primary)', textShadow: '0 3px 12px rgba(0,0,0,0.18)' }}>Sobre</h1>
      <div style={{
        background: 'rgba(255,255,255,0.93)',
        borderRadius: 18,
        padding: 36,
        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.04)',
        maxWidth: 700,
        width: '100%',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}>
        {loading ? (
          <p style={{ fontSize: '1.35em', color: '#111', textAlign: 'center', margin: 0 }}>A carregar...</p>
        ) : (
          <p style={{ fontSize: '1.35em', color: '#111', textAlign: 'center', margin: 0, whiteSpace: 'pre-line' }}>{texto || 'Nenhuma informação disponível.'}</p>
        )}
      </div>
    </div>
  );
};

const PrivateRoute = ({ children }) => {
  const [user, loading] = useAuthState(auth);
  const location = useLocation();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<Explorar />} />
    <Route path="/trajetos" element={<PrivateRoute><Trajetos /></PrivateRoute>} />
    <Route path="/adicionar-ponto" element={<PrivateRoute><AdicionarPonto /></PrivateRoute>} />
    <Route path="/sobre" element={<Sobre />} />
    <Route path="/mapa" element={<MapPage />} />
    <Route path="/login" element={<Login />} />
    <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
    <Route path="/editar-trajeto/:id" element={<EditSingleRoute />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

const App = () => {
  const [user, loading] = useAuthState(auth);
  const [trajetoParaEditar, setTrajetoParaEditar] = useState(null);
  if (loading) return <Loading />;
  return (
    <CityProvider>
      <Router>
        <React.Suspense fallback={<Loading message="A carregar menu..." />}><Menu /></React.Suspense>
        <AppRoutes />
        {trajetoParaEditar && (
          <EditRouteMap
            onPointsSelected={() => {}}
            onBack={() => setTrajetoParaEditar(null)}
            trajetoParaExibir={trajetoParaEditar}
          />
        )}
        <ToastContainer
          className="custom-toast-container"
          toastClassName="custom-toast"
          bodyClassName="custom-toast-body"
          progressClassName="custom-toast-progress"
          position="top-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
        />
      </Router>
    </CityProvider>
  );
};

export default App;