import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { buscarTodosTrajetos } from '../firebase/firestore';
import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const EditSingleRoute = () => {
  const { id } = useParams();
  const [trajeto, setTrajeto] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Buscar todos os trajetos e filtrar pelo id
    buscarTodosTrajetos().then(trajetos => {
      const t = trajetos.find(tr => tr.id === id);
      setTrajeto(t);
      setLoading(false);
    });
  }, [id]);

  if (loading) return <div style={{ padding: 32 }}>Carregando...</div>;
  if (!trajeto) return <div style={{ padding: 32 }}>Trajeto não encontrado.</div>;

  const pontos = trajeto.pontos || [];
  const center = pontos.length > 0 ? pontos[0].coordenadas : [40.28, -7.50];
  const polyline = pontos.map(p => p.coordenadas);

  return (
    <div style={{ display: 'flex', gap: 32, padding: 32, justifyContent: 'center' }}>
      <div style={{ background: '#f4f7fa', borderRadius: 16, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
        <h2 style={{ color: '#2563eb', marginBottom: 18 }}>{trajeto.nome}</h2>
        <div style={{ width: 600, height: 400, borderRadius: 16, overflow: 'hidden', marginBottom: 24 }}>
          <MapContainer center={center} zoom={15} style={{ width: '100%', height: '100%' }} scrollWheelZoom={false}>
            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
            />
            {polyline.length > 1 && <Polyline positions={polyline} color='#2563eb' weight={4} />}
            {pontos.map((p, idx) => (
              <Marker key={idx} position={p.coordenadas} />
            ))}
          </MapContainer>
        </div>
      </div>
      <div style={{ minWidth: 320, background: '#fff', borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', padding: 24, height: 'fit-content' }}>
        <h3 style={{ color: '#2563eb', marginBottom: 18 }}>Pontos do Trajeto</h3>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {pontos.map((p, idx) => (
            <li key={idx} style={{ background: '#f4f7fa', borderRadius: 8, padding: 12, marginBottom: 12, fontWeight: 500 }}>
              {p.nome}
              <div style={{ fontSize: 13, color: '#666' }}>({p.coordenadas[0]}, {p.coordenadas[1]})</div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default EditSingleRoute; 