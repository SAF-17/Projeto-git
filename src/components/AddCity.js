import React, { useState, useEffect } from 'react';
import { cidadeExists, criarCidade, obterCidades, uploadImage } from '../firebase/firestore';
import { GeoPoint } from 'firebase/firestore';
import { toast } from 'react-toastify';
import { distritosCidades } from '../firebase/dadosGeograficos';

const buttonStyle = {
  background: '#4CAF50',
  color: 'white',
  border: 'none',
  borderRadius: 4,
  padding: '10px 20px',
  fontSize: 16,
  cursor: 'pointer',
  marginTop: 16,
  marginBottom: 16,
  transition: 'background 0.2s',
  width: '100%',
  display: 'block',
};

const buttonDisabledStyle = {
  ...buttonStyle,
  background: '#cccccc',
  cursor: 'not-allowed',
};

const inputStyle = {
  width: '100%',
  padding: 8,
  borderRadius: 4,
  border: '1px solid #ccc',
  marginBottom: 16,
  fontSize: 15,
};

const boxStyle = {
  background: '#f8f8f8',
  borderRadius: 8,
  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  padding: 24,
  marginTop: 24,
};

const rowStyle = {
  display: 'flex',
  gap: 12,
  marginBottom: 16,
};

const inputHalfStyle = {
  ...inputStyle,
  width: '100%',
  marginBottom: 0,
  MozAppearance: 'textfield',
};

const inputNoSpinner = {
  ...inputHalfStyle,
  WebkitAppearance: 'none',
  MozAppearance: 'textfield',
  appearance: 'textfield',
};

const AddCity = ({ onCancel }) => {
  const [distrito, setDistrito] = useState('');
  const [cidade, setCidade] = useState('');
  const [showCityForm, setShowCityForm] = useState(false);
  const [centerLat, setCenterLat] = useState('');
  const [centerLng, setCenterLng] = useState('');
  const [imgLinkCidade, setImgLinkCidade] = useState('');
  const [cidadesExistentes, setCidadesExistentes] = useState([]);
  const [cidadesDisponiveis, setCidadesDisponiveis] = useState([]);
  const [imagemFicheiro, setImagemFicheiro] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // Buscar cidades já criadas na base de dados
  useEffect(() => {
    const fetchCidades = async () => {
      try {
        const cidadesDB = await obterCidades();
        setCidadesExistentes(cidadesDB.map(c => c.id));
      } catch (e) {
        toast.error('Erro ao carregar cidades existentes');
      }
    };
    fetchCidades();
  }, []);

  // Atualizar cidades disponíveis quando muda o distrito ou cidades existentes
  useEffect(() => {
    if (!distrito) {
      setCidadesDisponiveis([]);
      setCidade('');
      return;
    }
    const todasCidades = distritosCidades[distrito] || [];
    const disponiveis = todasCidades.filter(cid => !cidadesExistentes.includes(cid));
    setCidadesDisponiveis(disponiveis);
    setCidade('');
  }, [distrito, cidadesExistentes]);

  const handleContinue = async (e) => {
    e.preventDefault();
    if (!distrito || !cidade) return;
    try {
      const existe = await cidadeExists(cidade);
      if (existe) {
        toast.warn(`A cidade "${cidade}" já existe na base de dados.`);
      } else {
        setShowCityForm(true);
      }
    } catch (error) {
      toast.error("Erro ao verificar a cidade.");
    }
  };

  const handleImagemChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const ficheiro = e.target.files[0];
      setImagemFicheiro(ficheiro);
    }
  };

  const handleCitySubmit = async (e) => {
    e.preventDefault();
    const lat = parseFloat(centerLat);
    const lng = parseFloat(centerLng);
    const zoomLevel = 16;

    if (isNaN(lat) || isNaN(lng)) {
      toast.error("Por favor, insira valores numéricos válidos para as coordenadas.");
      return;
    }
    
    if (!imgLinkCidade && !imagemFicheiro) {
      toast.warn("Por favor, adicione uma imagem (link ou ficheiro).");
      return;
    }

    setIsUploading(true);

    try {
      let finalImageUrl = imgLinkCidade;
      if (imagemFicheiro) {
        finalImageUrl = await uploadImage(imagemFicheiro, 'cidades');
      }

      const novaCidade = {
        nome: cidade,
        coordenadas_centro: new GeoPoint(lat, lng),
        zoom: zoomLevel,
        imageUrl: finalImageUrl,
        distrito: distrito
      };
      
      await criarCidade(novaCidade);
      
      toast.success(`Cidade ${cidade} criada com sucesso!`);
      setShowCityForm(false);
      setDistrito('');
      setCidade('');
      setCenterLat('');
      setCenterLng('');
      setImgLinkCidade('');
      setImagemFicheiro(null);
      setCidadesExistentes(prev => [...prev, cidade]);
    } catch (error) {
      console.error("Erro ao criar a cidade:", error);
      toast.error("Ocorreu um erro ao criar a cidade.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div style={{ maxWidth: 500, width: '100%', margin: '0 auto' }}>
      {!showCityForm ? (
        <form onSubmit={handleContinue}>
          <h2 style={{ textAlign: 'center', marginBottom: 24, color: 'var(--primary)' }}>Adicionar Cidade</h2>
          <div style={{ marginBottom: 16 }}>
            <label>Distrito:</label><br />
            <select value={distrito} onChange={e => setDistrito(e.target.value)} required style={inputStyle}>
              <option value="">Selecione o distrito</option>
              {Object.keys(distritosCidades).sort().map(dist => (
                <option key={dist} value={dist}>{dist}</option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label>Cidade:</label><br />
            <select
              value={cidade}
              onChange={e => setCidade(e.target.value)}
              required
              disabled={!distrito || cidadesDisponiveis.length === 0}
              style={inputStyle}
            >
              <option value="">Selecione a cidade</option>
              {cidadesDisponiveis.map(cid => (
                <option key={cid} value={cid}>{cid}</option>
              ))}
            </select>
            {distrito && cidadesDisponiveis.length === 0 && (
              <div style={{ color: '#e11d48', fontSize: 14, marginTop: 6 }}>Todas as cidades deste distrito já existem na base de dados.</div>
            )}
          </div>
          <button
            type="submit"
            style={distrito && cidade ? buttonStyle : buttonDisabledStyle}
            disabled={!(distrito && cidade)}
          >
            Verificar e Continuar
          </button>
          {onCancel && (
            <button type="button" onClick={onCancel} style={{...buttonStyle, background: '#f44336', marginTop: 8}}>Cancelar</button>
          )}
        </form>
      ) : (
        <div style={boxStyle}>
          <h3 style={{ textAlign: 'center', marginBottom: 24, color: '#2563eb' }}>Nova cidade: <b>{cidade}</b></h3>
          <p style={{textAlign: 'center', marginTop: -15, marginBottom: 20, fontSize: 15}}>Esta cidade ainda não existe na base de dados. Adicione as suas coordenadas centrais.</p>
          <form onSubmit={handleCitySubmit}>
            <div style={{ marginBottom: 8 }}><b>Coordenadas do Centro da Cidade</b></div>
            <div style={rowStyle}>
              <div style={{ width: '50%' }}>
                <label style={{ fontSize: 13, marginBottom: 4, display: 'block' }}>Latitude</label>
                <input type="text" value={centerLat} onChange={e => setCenterLat(e.target.value)} required style={inputNoSpinner} placeholder="Ex: 40.280556" />
              </div>
              <div style={{ width: '50%' }}>
                <label style={{ fontSize: 13, marginBottom: 4, display: 'block' }}>Longitude</label>
                <input type="text" value={centerLng} onChange={e => setCenterLng(e.target.value)} required style={inputNoSpinner} placeholder="Ex: -7.504343" />
              </div>
            </div>
            <input 
              type="text" 
              value={imgLinkCidade} 
              onChange={(e) => setImgLinkCidade(e.target.value)} 
              placeholder="URL da Imagem da Cidade" 
              style={inputStyle}
              disabled={!!imagemFicheiro}
            />
            
            <div style={{ textAlign: 'center', margin: '12px 0', fontSize: 15, fontWeight: 500 }}>OU</div>

            <input 
              type="file" 
              accept="image/*" 
              onChange={handleImagemChange} 
              style={{ ...inputStyle, border: 'none', padding: 0 }}
              disabled={!!imgLinkCidade}
            />

            <button 
              type="submit" 
              style={isUploading ? buttonDisabledStyle : buttonStyle}
              disabled={isUploading}
            >
              {isUploading ? 'A Guardar...' : 'Guardar Cidade'}
            </button>
            <button type="button" onClick={onCancel || (() => setShowCityForm(false))} style={{...buttonStyle, background: '#f44336', marginTop: 8}}>Cancelar</button>
          </form>
        </div>
      )}
    </div>
  );
};

export default AddCity; 