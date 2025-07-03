import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './MapPage_estilos.css';
import L from 'leaflet';
import { obterPontosTuristicos, guardarTrajeto, deletarTrajeto } from '../firebase/firestore';
import pinIconUrl from '../img/pin.png';
import { toast } from 'react-toastify';
import { useCity } from '../context/CityContext';

const pinIcon = new L.Icon({
  iconUrl: pinIconUrl,
  iconSize: [20, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -35],
  className: '',
});

const EditRouteMap = ({ onPointsSelected, onBack, trajetoParaExibir }) => {
  const { selectedCity } = useCity();
  const [pontosSelecionados, setPontosSelecionados] = useState([]);
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');
  const [todosPontos, setTodosPontos] = useState([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [novoNome, setNovoNome] = useState(trajetoParaExibir?.nome || '');
  const [novoInicio, setNovoInicio] = useState(inicio);
  const [novoFim, setNovoFim] = useState(fim);

  useEffect(() => {
    if (!selectedCity || !trajetoParaExibir) return;
    const fetchPontos = async () => {
      try {
        // Buscar todos os pontos turísticos da cidade
        const pontos = await obterPontosTuristicos(selectedCity.id);
        setTodosPontos(pontos);
        // Preencher pontos selecionados e início/fim com base no trajeto
        const nomesSelecionados = trajetoParaExibir.pontos.map(p => p.nome);
        setPontosSelecionados(nomesSelecionados);
        setInicio(trajetoParaExibir.pontos[0]?.nome || '');
        setFim(trajetoParaExibir.pontos[trajetoParaExibir.pontos.length - 1]?.nome || '');
      } catch (error) {
        toast.error('Erro ao carregar pontos turísticos.');
      }
    };
    fetchPontos();
  }, [selectedCity, trajetoParaExibir]);

  const handleCheckboxChange = (nome) => {
    setPontosSelecionados(prev =>
      prev.includes(nome) ? prev.filter(n => n !== nome) : [...prev, nome]
    );
  };

  const handleSave = () => {
    setNovoNome(trajetoParaExibir?.nome || '');
    setNovoInicio(inicio);
    setNovoFim(fim);
    setShowSaveModal(true);
  };

  const handleConfirmSave = async () => {
    setShowSaveModal(false);
    try {
      // Construir o array de pontos na ordem correta (início, meio, fim)
      const pontosOrdenados = [...pontosSelecionados];
      // Garante que início e fim estão na ordem correta
      if (novoInicio && pontosOrdenados.includes(novoInicio)) {
        pontosOrdenados.splice(pontosOrdenados.indexOf(novoInicio), 1);
        pontosOrdenados.unshift(novoInicio);
      }
      if (novoFim && pontosOrdenados.includes(novoFim)) {
        pontosOrdenados.splice(pontosOrdenados.indexOf(novoFim), 1);
        pontosOrdenados.push(novoFim);
      }
      // Buscar os objetos completos dos pontos selecionados
      const pontosParaGuardar = pontosOrdenados.map(nome => {
        const ponto = todosPontos.find(p => p.nome === nome);
        return ponto ? {
          nome: ponto.nome,
          coordenadas: ponto.coordenadas,
          descricao: ponto.descricao || '',
          imagem: ponto.imagem || ''
        } : { nome };
      });
      // Se o nome mudou, deletar o trajeto antigo antes de salvar o novo
      if (novoNome !== trajetoParaExibir.nome) {
        await deletarTrajeto(trajetoParaExibir.nome);
      }
      await guardarTrajeto({
        nome: novoNome,
        pontos: pontosParaGuardar,
        cidade: selectedCity?.id || selectedCity?.nome || '',
        utilizador: trajetoParaExibir?.utilizador || 'admin'
      });
      toast.success('Trajeto atualizado com sucesso!');
      if (onBack) onBack();
    } catch (e) {
      toast.error('Erro ao guardar alterações do trajeto.');
    }
  };

  // Aceitar coordenadas de selectedCity.coordenadas ou selectedCity.coordenadas_centro
  const coords = selectedCity?.coordenadas || selectedCity?.coordenadas_centro;
  const hasCoords = coords && Array.isArray(coords) && coords.length === 2 && typeof coords[0] === 'number' && typeof coords[1] === 'number';

  // Mostrar loading enquanto todosPontos está a carregar
  const isLoadingPontos = !todosPontos || (Array.isArray(todosPontos) && todosPontos.length === 0);

  // Filtrar pontos válidos para o mapa
  const pontosValidos = todosPontos.filter(
    p => pontosSelecionados.includes(p.nome) &&
      Array.isArray(p.coordenadas) &&
      p.coordenadas.length === 2 &&
      !isNaN(p.coordenadas[0]) &&
      !isNaN(p.coordenadas[1])
  );

  if (!trajetoParaExibir) return null;

  return (
    <div className="mappage-container edit-route-map" style={{
      background: 'linear-gradient(135deg, #e0e7ff 0%, #f8fafc 100%)',
      borderRadius: 28,
      padding: '18px 0 32px 0',
      boxShadow: '0 8px 40px 0 rgba(37,99,235,0.10)',
      marginTop: 0,
      maxWidth: 1300,
      minHeight: 420,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-start',
      margin: '0 auto'
    }}>
      <div style={{width: '100%', maxWidth: 1100, display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 0, alignItems: 'center', padding: 0, marginTop: 0}}>
        <div style={{ width: '100%', textAlign: 'center', marginBottom: 0 }}>
          <h2 style={{ color: '#2563eb', fontWeight: 800, fontSize: '1.5em', margin: 0, marginBottom: 2 }}>Mapa de {selectedCity.nome}</h2>
          <h3 style={{ color: '#2563eb', fontWeight: 700, fontSize: '1.18em', margin: 0, marginBottom: 8 }}>{trajetoParaExibir.nome}</h3>
        </div>
        <button
          onClick={onBack}
          style={{
            padding: '7px 18px',
            borderRadius: 12,
            border: 'none',
            background: 'linear-gradient(90deg, #2563eb 0%, #e11d48 100%)',
            color: '#fff',
            fontWeight: 700,
            fontSize: '1em',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(37,99,235,0.10)',
            width: 'auto',
            minWidth: 0,
            maxWidth: 'none',
            alignSelf: 'flex-start',
            whiteSpace: 'nowrap',
            marginBottom: 18
          }}
        >
          ← Voltar
        </button>
        <div style={{display: 'flex', gap: 36, flexWrap: 'wrap', justifyContent: 'center', alignItems: 'flex-start', width: '100%', marginTop: 0, paddingTop: 0}}>
          <div className="map-section" style={{minWidth: 340, maxWidth: 540, width: 420, flex: 3, height: 480, display: 'flex', flexDirection: 'column', borderRadius: 28, overflow: 'hidden', boxShadow: '0 8px 40px 0 rgba(37,99,235,0.10)', background: '#fff', padding: 0}}>
            <div className="map-header" style={{height: 56}}></div>
            <div className="map-container" style={{height: '100%', flex: 1, padding: 0, margin: 0}}>
              {hasCoords ? (
                <MapContainer
                  key={JSON.stringify(pontosValidos.map(p => p.nome + '-' + p.coordenadas.join(',')))}
                  center={coords}
                  zoom={16}
                  style={{ height: '100%', width: '100%', border: 'none', borderRadius: 0, overflow: 'hidden', background: 'none', margin: 0, padding: 0 }}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  />
                  {pontosValidos.map((ponto) => (
                    <Marker
                      key={ponto.nome}
                      position={ponto.coordenadas}
                      icon={pinIcon}
                    >
                      <Popup>
                        <div className="popup-content">
                          <h3>{ponto.nome}
                            {ponto.nome === inicio && ' 🏁'}
                            {ponto.nome === fim && ' 🎯'}
                          </h3>
                          {ponto.imagem && (
                            <img
                              src={ponto.imagem}
                              alt={ponto.nome}
                              className="popup-image"
                            />
                          )}
                          <p className="popup-info">{ponto.descricao}</p>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              ) : (
                <div style={{height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e11d48', fontWeight: 700}}>
                  Não há coordenadas válidas para esta cidade.
                </div>
              )}
            </div>
          </div>
          <div className="list-section" style={{minWidth: 270, maxWidth: 370, background: '#fff', borderRadius: 28, boxShadow: '0 8px 40px 0 rgba(37,99,235,0.13)', border: '1.5px solid #e0e7ff', height: 480, display: 'flex', flexDirection: 'column', padding: 0}}>
            <div style={{flex: 1, display: 'flex', flexDirection: 'column', height: '100%', padding: '24px 18px 18px 18px', minHeight: 0, fontSize: '0.97em', lineHeight: 1.25}}>
              <h2 style={{color: '#2563eb', fontWeight: 800, fontSize: '1em', textAlign: 'center', borderBottom: '2px solid #e11d48', paddingBottom: 10, marginBottom: 14, letterSpacing: 0.01}}>Editar Pontos do Trajeto</h2>
              {isLoadingPontos ? (
                <div style={{color: '#64748b', fontWeight: 500, textAlign: 'center', marginTop: 24}}>
                  A carregar pontos turísticos...
                </div>
              ) : todosPontos.length === 0 ? (
                <div style={{color: '#e11d48', fontWeight: 700, textAlign: 'center', marginTop: 24}}>
                  Não há pontos turísticos para esta cidade.
                </div>
              ) : (
                <ul className="pontos-list" style={{flex: 1, minHeight: 0, maxHeight: 'none', overflowY: 'auto', marginBottom: 18}}>
                  {todosPontos.map((ponto) => (
                    <li key={ponto.nome} className="ponto-item">
                      <label>
                        <input
                          type="checkbox"
                          checked={pontosSelecionados.includes(ponto.nome)}
                          onChange={() => handleCheckboxChange(ponto.nome)}
                        />
                        {ponto.nome}
                        {ponto.nome === inicio && ' 🏁'}
                        {ponto.nome === fim && ' 🎯'}
                      </label>
                    </li>
                  ))}
                </ul>
              )}
              <div style={{marginTop: 'auto'}}>
                <button
                  className="generate-route-btn"
                  onClick={handleSave}
                  style={{width: '100%', padding: '12px 0', borderRadius: 16, fontWeight: 700, fontSize: '1.08em', background: 'linear-gradient(90deg, #2563eb 0%, #e11d48 100%)'}}
                >
                  Guardar Alterações
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      {showSaveModal && (
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
            padding: 32,
            minWidth: 320,
            maxWidth: '90vw',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            position: 'relative',
            alignItems: 'stretch'
          }}>
            <h3 style={{margin: 0, marginBottom: 12, fontSize: '1.15em', color: 'var(--primary)', fontWeight: 700}}>Guardar informações do trajeto</h3>
            <label style={{fontWeight: 600, marginBottom: 4}}>Nome do trajeto:
              <input type="text" value={novoNome} onChange={e => setNovoNome(e.target.value)} style={{width: '100%', padding: 8, borderRadius: 8, border: '1.5px solid #e0e7ff', marginTop: 4}} />
            </label>
            <label style={{fontWeight: 600, marginBottom: 4}}>Início:
              <select value={novoInicio} onChange={e => setNovoInicio(e.target.value)} style={{width: '100%', padding: 8, borderRadius: 8, border: '1.5px solid #e0e7ff', marginTop: 4}}>
                {pontosSelecionados.map(nome => (
                  <option key={nome} value={nome}>{nome}</option>
                ))}
              </select>
            </label>
            <label style={{fontWeight: 600, marginBottom: 4}}>Fim:
              <select value={novoFim} onChange={e => setNovoFim(e.target.value)} style={{width: '100%', padding: 8, borderRadius: 8, border: '1.5px solid #e0e7ff', marginTop: 4}}>
                {pontosSelecionados.map(nome => (
                  <option key={nome} value={nome}>{nome}</option>
                ))}
              </select>
            </label>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 32, marginTop: 18 }}>
              <div style={{ background: '#d1fae5', borderRadius: 18, padding: '14px 0', boxShadow: '0 2px 8px rgba(37,99,235,0.07)', display: 'flex', justifyContent: 'center', width: '50%' }}>
                <button onClick={handleConfirmSave} style={{ background: 'transparent', color: '#2563eb', border: 'none', borderRadius: 999, padding: '10px 32px', fontWeight: 700, fontSize: '1em', cursor: 'pointer', boxShadow: 'none', transition: 'background 0.18s, color 0.18s', width: '100%' }}>Guardar</button>
              </div>
              <div style={{ background: '#fee2e2', borderRadius: 18, padding: '14px 0', boxShadow: '0 2px 8px rgba(225,29,72,0.07)', display: 'flex', justifyContent: 'center', width: '50%' }}>
                <button onClick={() => setShowSaveModal(false)} style={{ background: 'transparent', color: '#e11d48', border: 'none', borderRadius: 999, padding: '10px 32px', fontWeight: 700, fontSize: '1em', cursor: 'pointer', boxShadow: 'none', transition: 'background 0.18s, color 0.18s', width: '100%' }}>Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditRouteMap; 