import React, { useState, useEffect } from 'react';
import { distritosCidades } from '../firebase/dadosGeograficos';
import { buscarTrajetosPorCidade, obterCidades, guardarTrajeto, deletarTrajeto } from '../firebase/firestore';
import EditRouteMap from './EditRouteMap';
import { useCity } from '../context/CityContext';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebase/config';
import { toast } from 'react-toastify';
import { MapContainer, TileLayer, Polyline, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import pinIconUrl from '../img/pin.png';
import CreateRouteModal from './CreateRouteModal';
import { useNavigate } from 'react-router-dom';

const pinIcon = new L.Icon({
  iconUrl: pinIconUrl,
  iconSize: [18, 28],
  iconAnchor: [9, 28],
  popupAnchor: [0, -28],
  className: '',
});

function MiniRouteMap({ pontos }) {
  if (!Array.isArray(pontos) || pontos.length === 0) return null;
  const coords = pontos.map(p => p.coordenadas);
  // Centro do mapa: centroide dos pontos
  const lat = coords.reduce((sum, c) => sum + c[0], 0) / coords.length;
  const lng = coords.reduce((sum, c) => sum + c[1], 0) / coords.length;
  return (
    <MapContainer
      center={[lat, lng]}
      zoom={14}
      style={{ width: '100%', height: 200, pointerEvents: 'none', borderRadius: 0, zIndex: 1 }}
      dragging={false}
      doubleClickZoom={false}
      scrollWheelZoom={false}
      zoomControl={false}
      attributionControl={false}
      keyboard={false}
      boxZoom={false}
      touchZoom={false}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Polyline positions={coords} color="#2563eb" weight={4} />
      {coords.map((c, i) => (
        <Marker key={i} position={c} icon={pinIcon} />
      ))}
    </MapContainer>
  );
}

const EditRoute = () => {
  const [distritoSelecionado, setDistritoSelecionado] = useState('');
  const [cidadeSelecionada, setCidadeSelecionada] = useState('');
  const [trajetos, setTrajetos] = useState([]);
  const [cidades, setCidades] = useState([]);
  const [showMap, setShowMap] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [trajetoNome, setTrajetoNome] = useState('');
  const [selectedPoints, setSelectedPoints] = useState(null);
  const { setSelectedCity } = useCity();
  const [user] = useAuthState(auth);
  const [trajetoParaEditar, setTrajetoParaEditar] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [trajetoParaApagar, setTrajetoParaApagar] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    obterCidades()
      .then(cidadesDB => setCidades(cidadesDB))
      .catch(error => {
        console.error('Erro ao buscar cidades:', error);
        setCidades([]);
      });
  }, []);

  const cidadesDoDistrito = distritoSelecionado
    ? cidades.filter(cidade =>
        cidade.distrito &&
        cidade.distrito.trim().toLowerCase() === distritoSelecionado.trim().toLowerCase()
      )
    : [];

  useEffect(() => {
    if (cidadeSelecionada) {
      buscarTrajetosPorCidade(cidadeSelecionada)
        .then(trajetos => setTrajetos(trajetos))
        .catch(() => setTrajetos([]));
    } else {
      setTrajetos([]);
    }
  }, [cidadeSelecionada]);

  const handleDistritoChange = (e) => {
    setDistritoSelecionado(e.target.value);
    setCidadeSelecionada('');
    setTrajetos([]);
    setShowMap(false);
  };

  const handleCidadeChange = (e) => {
    const cidadeId = e.target.value;
    setCidadeSelecionada(cidadeId);
    if (cidadeId) {
      const cidade = cidades.find(c => c.id === cidadeId);
      if (cidade) {
        setSelectedCity(cidade);
      }
    } else {
      setSelectedCity(null);
    }
    setShowMap(false);
  };

  const handleEditar = (trajetoId) => {
    const trajeto = trajetos.find(t => t.id === trajetoId);
    setTrajetoParaEditar(trajeto);
  };

  const handleApagar = (trajetoId) => {
    const trajeto = trajetos.find(t => t.id === trajetoId);
    setTrajetoParaApagar(trajeto);
    setShowDeleteModal(true);
  };

  const confirmarApagar = async () => {
    if (!trajetoParaApagar) return;
    try {
      await deletarTrajeto(trajetoParaApagar.id);
      toast.success('Trajeto apagado com sucesso!');
      setShowDeleteModal(false);
      setTrajetoParaApagar(null);
      // Atualiza a lista de trajetos
      if (cidadeSelecionada) {
        const novosTrajetos = await buscarTrajetosPorCidade(cidadeSelecionada);
        setTrajetos(novosTrajetos);
      }
    } catch (error) {
      toast.error('Erro ao apagar trajeto: ' + (error.message || error));
      setShowDeleteModal(false);
      setTrajetoParaApagar(null);
    }
  };

  const cancelarApagar = () => {
    setShowDeleteModal(false);
    setTrajetoParaApagar(null);
  };

  const handlePointsSelected = (points) => {
    setSelectedPoints(points);
    setShowModal(true);
    setTrajetoNome('');
  };

  const handleSaveTrajeto = async () => {
    if (!trajetoNome.trim()) {
      toast.warn('Por favor, insira um nome para o trajeto.');
      return;
    }
    if (!selectedPoints || selectedPoints.length < 2) {
      toast.warn('Selecione pelo menos 2 pontos para criar um trajeto.');
      return;
    }
    if (!cidadeSelecionada) {
      toast.warn('Selecione uma cidade antes de criar o trajeto.');
      return;
    }
    if (user && user.email) {
      try {
        // Buscar o objeto cidade completo para guardar id e nome
        const cidadeObj = cidades.find(c => c.id === cidadeSelecionada);
        await guardarTrajeto({
          nome: trajetoNome.trim(),
          pontos: selectedPoints.map(p => ({ nome: p.nome, coordenadas: p.coordenadas })),
          utilizador: user.email,
          cidade: cidadeObj ? { id: cidadeObj.id, nome: cidadeObj.nome, distrito: cidadeObj.distrito } : cidadeSelecionada,
        });
        toast.success('Trajeto guardado com sucesso!');
        setShowModal(false);
        setSelectedPoints(null);
        setTrajetoNome('');
        // Atualiza a lista de trajetos
        buscarTrajetosPorCidade(cidadeSelecionada)
          .then(trajetos => setTrajetos(trajetos));
      } catch (error) {
        toast.error('Erro ao guardar trajeto: ' + (error.message || error));
      }
    } else {
      toast.error('Trajeto não foi guardado (utilizador não autenticado).');
    }
  };

  // Função para redirecionar para criação de trajeto com Covilhã predefinida
  const handleCriarNovoTrajeto = () => {
    // Procurar a cidade selecionada no dropdown
    const cidade = cidades.find(c => c.id === cidadeSelecionada);
    if (cidade) {
      setSelectedCity(cidade);
      navigate('/mapa');
    } else {
      toast.error('Selecione uma cidade válida antes de criar o trajeto.');
    }
  };

  // Função para navegar diretamente para o trajeto ao clicar na box
  const handleAbrirTrajeto = async (trajeto) => {
    if (!trajeto.cidade || !trajeto.pontos || trajeto.pontos.length === 0) {
      toast.warn('Este trajeto não tem informação suficiente para ser mostrado no mapa.');
      return;
    }
    try {
      const cidadesDB = await obterCidades();
      let cidadeObj = cidadesDB.find(c => c.id === trajeto.cidade || c.nome === trajeto.cidade || c.id === trajeto.cidade.id);
      if (!cidadeObj) {
        cidadeObj = cidadesDB.find(c => c.nome === trajeto.cidade.nome);
      }
      if (!cidadeObj) {
        toast.error('Não foi possível encontrar os dados completos da cidade para este trajeto.');
        return;
      }
      setSelectedCity(cidadeObj);
      navigate('/mapa', { state: { trajetoParaExibir: trajeto } });
      toast.info(`A carregar o trajeto "${trajeto.nome}" no mapa...`);
    } catch (e) {
      toast.error('Erro ao buscar dados da cidade.');
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <h2 style={{ marginBottom: 32, color: 'var(--primary)', fontSize: '1.8em' }}>Gerir Trajetos</h2>
        {trajetoParaEditar ? (
          <EditRouteMap
            onPointsSelected={() => {}}
            onBack={async () => {
              setTrajetoParaEditar(null);
              if (cidadeSelecionada) {
                const novosTrajetos = await buscarTrajetosPorCidade(cidadeSelecionada);
                setTrajetos(novosTrajetos);
              }
            }}
            trajetoParaExibir={trajetoParaEditar}
          />
        ) : (
          <>
            <div style={{ display: 'flex', gap: 32, marginBottom: 32, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                  Selecionar Distrito:
                  <select 
                    value={distritoSelecionado} 
                    onChange={handleDistritoChange}
                    style={{
                      marginLeft: 12,
                      padding: '8px 16px',
                      borderRadius: 12,
                      border: '1.5px solid var(--primary-light)',
                      fontSize: '1em',
                      minWidth: 180
                    }}
                  >
                    <option value="">-- Escolha um distrito --</option>
                    {Object.keys(distritosCidades).sort().map(distrito => (
                      <option key={distrito} value={distrito}>{distrito}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                  Selecionar Cidade:
                  <select 
                    value={cidadeSelecionada} 
                    onChange={handleCidadeChange}
                    style={{
                      marginLeft: 12,
                      padding: '8px 16px',
                      borderRadius: 12,
                      border: '1.5px solid var(--primary-light)',
                      fontSize: '1em',
                      minWidth: 180
                    }}
                    disabled={!distritoSelecionado || cidadesDoDistrito.length === 0}
                  >
                    <option value="">-- Escolha uma cidade --</option>
                    {cidadesDoDistrito.map(cidade => (
                      <option key={cidade.id} value={cidade.id}>{cidade.nome}</option>
                    ))}
                  </select>
                </label>
                {!distritoSelecionado && (
                  <div style={{ color: '#888', fontSize: 13, marginTop: 2, marginLeft: 0 }}>Escolha primeiro um distrito</div>
                )}
                {distritoSelecionado && cidadesDoDistrito.length === 0 && (
                  <div style={{ color: '#e11d48', fontSize: 13, marginTop: 2, marginLeft: 0 }}>Nenhuma cidade encontrada no distrito {distritoSelecionado}.</div>
                )}
              </div>
            </div>

            {cidadeSelecionada && !showMap && (
              <div style={{ marginBottom: 32 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, gap: 24 }}>
                  <h3 style={{ margin: 0, color: 'var(--primary)', fontWeight: 800, fontSize: '1.25em' }}>Trajetos em {cidadesDoDistrito.find(c => c.id === cidadeSelecionada)?.nome}:</h3>
                  <div style={{ background: '#d1fae5', borderRadius: 18, padding: '14px 0', boxShadow: '0 2px 8px rgba(37,99,235,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 220, alignSelf: 'flex-end', marginLeft: 'auto', marginRight: 0, height: 48 }}>
                    <button
                      onClick={handleCriarNovoTrajeto}
                      style={{
                        width: '100%',
                        height: '100%',
                        background: 'transparent',
                        border: 'none',
                        color: '#2563eb',
                        fontSize: '1em',
                        fontWeight: 700,
                        cursor: 'pointer',
                        borderRadius: 999,
                        transition: 'background 0.18s, color 0.18s',
                        textDecoration: 'none',
                        outline: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: 'none',
                        padding: 0
                      }}
                      onMouseOver={e => {
                        e.currentTarget.parentNode.style.background = '#2563eb';
                        e.currentTarget.style.color = '#fff';
                      }}
                      onMouseOut={e => {
                        e.currentTarget.parentNode.style.background = '#d1fae5';
                        e.currentTarget.style.color = '#2563eb';
                      }}
                    >
                      Criar Novo Trajeto
                    </button>
                  </div>
                </div>

                {trajetos.length === 0 ? (
                  <div style={{ color: '#666', fontSize: 14, marginTop: 8 }}>
                    Nenhum trajeto encontrado para esta cidade.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
                    {trajetos.map(trajeto => (
                      <div key={trajeto.id}
                        style={{
                          background: '#f4f7fa',
                          borderRadius: 16,
                          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                          padding: 0,
                          width: 260,
                          height: 260,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          position: 'relative',
                          overflow: 'hidden',
                          cursor: 'pointer',
                          transition: 'box-shadow 0.2s',
                        }}
                        onClick={() => handleAbrirTrajeto(trajeto)}
                        onMouseOver={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(37,99,235,0.13)'}
                        onMouseOut={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'}
                      >
                        {/* Mini-mapa do trajeto */}
                        <div style={{ width: '100%', height: 150, background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                          <MiniRouteMap pontos={trajeto.pontos} />
                        </div>
                        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: '12px 8px 12px 8px', flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: 17, textAlign: 'center', margin: '18px 0 6px 0' }}>{trajeto.nome}</div>
                          <div style={{ display: 'flex', gap: 16, width: '100%', justifyContent: 'center', marginTop: 2 }}>
                            <button onClick={e => { e.stopPropagation(); handleEditar(trajeto.id); }}
                              style={{
                                fontSize: 22,
                                padding: 0,
                                border: 'none',
                                background: 'none',
                                color: 'inherit',
                                cursor: 'pointer',
                                boxShadow: 'none',
                                borderRadius: 999
                              }}
                              aria-label="Editar trajeto"
                            >✏️</button>
                            <button onClick={e => { e.stopPropagation(); handleApagar(trajeto.id); }}
                              style={{
                                fontSize: 22,
                                padding: 0,
                                border: 'none',
                                background: 'none',
                                color: 'inherit',
                                cursor: 'pointer',
                                boxShadow: 'none',
                                borderRadius: 999
                              }}
                              aria-label="Apagar trajeto"
                            >🗑️</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {cidadeSelecionada && showMap && (
              <div>
                <EditRouteMap onPointsSelected={handlePointsSelected} onBack={() => setShowMap(false)} />
              </div>
            )}

            {/* Modal para nome do trajeto */}
            {showModal && (
              <div className="trajeto-modal-bg">
                <div className="trajeto-modal">
                  <h3>Nome do Trajeto</h3>
                  <input
                    type="text"
                    value={trajetoNome}
                    onChange={(e) => setTrajetoNome(e.target.value)}
                    placeholder="Digite o nome do trajeto"
                    className="trajeto-modal-input"
                  />
                  <div className="trajeto-modal-actions">
                    <button
                      className="trajeto-modal-btn"
                      onClick={handleSaveTrajeto}
                    >
                      Guardar Trajeto
                    </button>
                    <button
                      className="trajeto-modal-btn cancel"
                      onClick={() => setShowModal(false)}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Modal de confirmação de exclusão */}
            {showDeleteModal && (
              <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                background: 'rgba(0,0,0,0.18)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 2000
              }}>
                <div style={{
                  background: '#fff',
                  borderRadius: 18,
                  boxShadow: '0 4px 24px rgba(0,0,0,0.13)',
                  padding: 36,
                  minWidth: 320,
                  maxWidth: '90vw',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 18,
                  position: 'relative',
                  alignItems: 'center'
                }}>
                  <h3 style={{margin: 0, marginBottom: 8, fontSize: '1.18em', color: '#e11d48', fontWeight: 800}}>Apagar trajeto?</h3>
                  <div style={{fontSize: 16, color: '#222', marginBottom: 8, textAlign: 'center'}}>
                    Tem a certeza que deseja apagar o trajeto <b>"{trajetoParaApagar?.nome}"</b>?<br/>Esta ação não pode ser desfeita.
                  </div>
                  <div style={{display: 'flex', gap: 16, marginTop: 8, width: '100%', justifyContent: 'center'}}>
                    <button onClick={confirmarApagar} style={{flex: 1, background: '#e11d48', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 0', fontWeight: 700, fontSize: '1em', cursor: 'pointer'}}>Apagar</button>
                    <button onClick={cancelarApagar} style={{flex: 1, background: '#e0e7ff', color: '#2563eb', border: 'none', borderRadius: 10, padding: '12px 0', fontWeight: 700, fontSize: '1em', cursor: 'pointer'}}>Cancelar</button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default EditRoute; 