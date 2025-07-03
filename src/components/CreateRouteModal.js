import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { obterPontosTuristicos } from '../firebase/firestore';
import L from 'leaflet';
import pinIconUrl from '../img/pin.png';
import { toast } from 'react-toastify';

const pinIcon = new L.Icon({
  iconUrl: pinIconUrl,
  iconSize: [20, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -35],
  className: '',
});

const CreateRouteModal = ({ cidade, onClose, onSave, utilizador }) => {
  const [pontos, setPontos] = useState([]);
  const [selecionados, setSelecionados] = useState([]);
  const [trajetoNome, setTrajetoNome] = useState('');
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!cidade) return;
    setIsLoading(true);
    obterPontosTuristicos(cidade.id)
      .then(pontosDB => {
        setPontos(pontosDB);
        setIsLoading(false);
      })
      .catch(() => {
        setPontos([]);
        setIsLoading(false);
        toast.error('Erro ao carregar pontos turísticos.');
      });
  }, [cidade]);

  const handleSelect = (nome) => {
    setSelecionados(prev =>
      prev.includes(nome) ? prev.filter(n => n !== nome) : [...prev, nome]
    );
  };

  useEffect(() => {
    if (selecionados.length > 0) {
      setInicio(selecionados[0]);
      setFim(selecionados[selecionados.length - 1]);
    } else {
      setInicio('');
      setFim('');
    }
  }, [selecionados]);

  const handleSave = () => {
    if (!trajetoNome.trim()) {
      toast.warn('Por favor, insira um nome para o trajeto.');
      return;
    }
    if (selecionados.length < 2) {
      toast.warn('Selecione pelo menos 2 pontos.');
      return;
    }
    if (!inicio || !fim) {
      toast.warn('Selecione início e fim.');
      return;
    }
    // Permitir trajetos circulares (inicio === fim)
    const pontosSelecionados = selecionados.map(nome => pontos.find(p => p.nome === nome)).filter(Boolean);
    onSave({
      nome: trajetoNome.trim(),
      pontos: pontosSelecionados,
      utilizador,
      cidade,
      inicio,
      fim,
    });
  };

  // Centro do mapa
  let center = [40.28, -7.50];
  if (cidade && cidade.coordenadas_centro && Array.isArray(cidade.coordenadas_centro)) {
    center = cidade.coordenadas_centro;
  } else if (pontos.length > 0) {
    center = pontos[0].coordenadas;
  }

  return (
    <div className="trajeto-modal-bg">
      <div className="trajeto-modal" style={{ maxWidth: 700, width: '100%' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#888' }}>&times;</button>
        <h2 style={{ color: '#2563eb', marginBottom: 18 }}>Criar Novo Trajeto</h2>
        <input
          type="text"
          placeholder="Nome do trajeto"
          value={trajetoNome}
          onChange={e => setTrajetoNome(e.target.value)}
          className="trajeto-modal-input"
          autoFocus
          style={{ width: '100%', marginBottom: 18, padding: 10, borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 16 }}
        />
        <div style={{ width: '100%', height: 320, marginBottom: 18 }}>
          <MapContainer center={center} zoom={14} style={{ width: '100%', height: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {pontos.map((p, idx) => (
              <Marker key={idx} position={p.coordenadas} icon={pinIcon}>
                <Popup>
                  <div style={{ minWidth: 120 }}>
                    <b>{p.nome}</b>
                    <br />
                    <button
                      className="popup-select-btn"
                      style={{ marginTop: 8, background: selecionados.includes(p.nome) ? '#22c55e' : undefined }}
                      onClick={() => handleSelect(p.nome)}
                    >
                      {selecionados.includes(p.nome) ? 'Remover' : 'Selecionar'}
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}
            {selecionados.length > 1 && (
              <Polyline positions={selecionados.map(nome => pontos.find(p => p.nome === nome)?.coordenadas).filter(Boolean)} color="#2563eb" weight={4} />
            )}
          </MapContainer>
        </div>
        {selecionados.length > 1 && (
          <div style={{ width: '100%', marginBottom: 18 }}>
            <label style={{ fontWeight: 600, marginRight: 12 }}>
              Início:
              <select value={inicio} onChange={e => setInicio(e.target.value)} style={{ marginLeft: 8, padding: 6, borderRadius: 8, border: '1.5px solid #e0e7ff' }}>
                {selecionados.map(nome => (
                  <option key={nome} value={nome}>{nome}</option>
                ))}
              </select>
            </label>
            <label style={{ fontWeight: 600, marginLeft: 24 }}>
              Fim:
              <select value={fim} onChange={e => setFim(e.target.value)} style={{ marginLeft: 8, padding: 6, borderRadius: 8, border: '1.5px solid #e0e7ff' }}>
                {selecionados.map(nome => (
                  <option key={nome} value={nome}>{nome}</option>
                ))}
              </select>
            </label>
          </div>
        )}
        <div className="trajeto-modal-actions" style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
          <button
            onClick={handleSave}
            className="trajeto-modal-btn"
            style={{ background: '#22c55e', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 28px', fontWeight: 700, fontSize: 17, cursor: !trajetoNome || selecionados.length < 2 ? 'not-allowed' : 'pointer' }}
            disabled={!trajetoNome || selecionados.length < 2}
          >
            Guardar
          </button>
          <button onClick={onClose} className="trajeto-modal-btn cancel" style={{ background: '#e11d48', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 28px', fontWeight: 700, fontSize: 17, cursor: 'pointer' }}>Cancelar</button>
        </div>
      </div>
    </div>
  );
};

export default CreateRouteModal; 