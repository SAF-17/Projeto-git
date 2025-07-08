import React, { useState } from 'react';
import { adicionarPontoTuristico, cidadeExists, criarCidade, uploadImage } from '../firebase/firestore';
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
  // Remove setas dos inputs number
  WebkitAppearance: 'none',
  MozAppearance: 'textfield',
  appearance: 'textfield',
};

const AdicionarPonto = () => {
  const [distrito, setDistrito] = useState('');
  const [cidade, setCidade] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showCityForm, setShowCityForm] = useState(false);
  
  // Estados para o novo formulário de cidade
  const [centerLat, setCenterLat] = useState('');
  const [centerLng, setCenterLng] = useState('');
  const [imgLinkCidade, setImgLinkCidade] = useState('');

  const handleContinue = async (e) => {
    e.preventDefault();
    try {
      const existe = await cidadeExists(cidade);
      if (existe) {
        setShowForm(true);
      } else {
        setShowCityForm(true);
      }
    } catch (error) {
      toast.error("Erro ao verificar a cidade.");
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

    try {
      const novaCidade = {
        nome: cidade,
        coordenadas_centro: new GeoPoint(lat, lng),
        zoom: zoomLevel,
        img_link_cidade: imgLinkCidade,
      };
      
      await criarCidade(novaCidade, distrito);

      toast.success(`Cidade ${cidade} criada com sucesso!`);
      setShowCityForm(false);
      setShowForm(true);
    } catch (error) {
      console.error("Erro ao criar a cidade:", error);
      toast.error("Ocorreu um erro ao criar a cidade.");
    }
  };

  return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ maxWidth: 500, width: '100%', padding: 24, background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <h2 style={{ textAlign: 'center' }}>Adicionar Ponto Turístico</h2>
        
        {!showForm && !showCityForm && (
          <form onSubmit={handleContinue}>
            <div style={{ marginBottom: 16 }}>
              <label>Distrito:</label><br />
              <select value={distrito} onChange={e => { setDistrito(e.target.value); setCidade(''); setShowForm(false); }} required style={inputStyle}>
                <option value="">Selecione o distrito</option>
                {Object.keys(distritosCidades).map(dist => (
                  <option key={dist} value={dist}>{dist}</option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label>Cidade:</label><br />
              <select value={cidade} onChange={e => { setCidade(e.target.value); setShowForm(false); }} required disabled={!distrito} style={inputStyle}>
                <option value="">Selecione a cidade</option>
                {distrito && distritosCidades[distrito].map(cid => (
                  <option key={cid} value={cid}>{cid}</option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              style={distrito && cidade ? buttonStyle : buttonDisabledStyle}
              disabled={!(distrito && cidade)}
            >
              Continuar
            </button>
          </form>
        )}

        {showCityForm && (
          <div style={boxStyle}>
            <h3 style={{ textAlign: 'center', marginBottom: 24 }}>Nova cidade: <b>{cidade}</b></h3>
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
              <input type="text" value={imgLinkCidade} onChange={(e) => setImgLinkCidade(e.target.value)} placeholder="URL da Imagem da Cidade" required style={inputStyle} />
              <button type="submit" style={buttonStyle}>Guardar Cidade e Continuar</button>
            </form>
          </div>
        )}

        {showForm && (
          <AdicionarPontoForm distrito={distrito} cidade={cidade} onSuccess={() => setShowForm(false)} />
        )}
      </div>
    </div>
  );
};

// Novo componente reutilizável
export function AdicionarPontoForm({ distrito, cidade, onSuccess }) {
  const [nome, setNome] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [descricao, setDescricao] = useState('');
  const [imagem, setImagem] = useState('');
  const [imagemFicheiro, setImagemFicheiro] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleImagemChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setImagemFicheiro(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    if (isNaN(lat) || isNaN(lng)) {
      toast.error('Latitude e longitude devem ser números válidos.');
      return;
    }
    
    if (!imagem && !imagemFicheiro) {
      toast.warn("Por favor, adicione uma imagem (link ou ficheiro).");
      return;
    }

    setIsUploading(true);
    setLoading(true);

    try {
      let finalImageUrl = imagem;
      if (imagemFicheiro) {
        finalImageUrl = await uploadImage(imagemFicheiro, `pontos_turisticos/${cidade}`);
      }
      
      const ponto = {
        nome_ponto: nome,
        coordenadas_ponto: new GeoPoint(lat, lng),
        info_ponto: descricao,
        img_link_ponto: finalImageUrl,
      };
      await adicionarPontoTuristico(ponto, distrito, cidade);
      
      toast.success('Ponto turístico adicionado com sucesso!');
      setNome('');
      setLatitude('');
      setLongitude('');
      setDescricao('');
      setImagem('');
      setImagemFicheiro(null);
      if (onSuccess) onSuccess();

    } catch (error) {
      console.error('Erro ao adicionar ponto turístico: ', error);
      toast.error('Erro ao adicionar ponto turístico: ' + (error?.message || error));
    } finally {
      setIsUploading(false);
      setLoading(false);
    }
  };

  return (
    <div style={boxStyle}>
      <h3 style={{ textAlign: 'center', marginBottom: 24, fontSize: '2.6em', color: 'var(--primary)', fontWeight: 800, textShadow: '0 3px 12px rgba(0,0,0,0.18)' }}>Novo ponto em <b>{cidade}</b>, <b>{distrito}</b></h3>
      <form onSubmit={handleSubmit}>
        <label>Nome:</label>
        <input
          type="text"
          value={nome}
          onChange={e => setNome(e.target.value)}
          required
          style={inputStyle}
          placeholder="Nome do ponto turístico"
        />
        <div style={{ marginBottom: 8 }}><b>Coordenadas</b></div>
        <div style={rowStyle}>
          <div style={{ width: '50%' }}>
            <label style={{ fontSize: 13, marginBottom: 4, display: 'block' }}>Latitude</label>
            <input
              type="text"
              inputMode="decimal"
              pattern="^-?\d*(\.\d*)?$"
              value={latitude}
              onChange={e => setLatitude(e.target.value)}
              required
              style={inputNoSpinner}
              placeholder="Latitude"
            />
          </div>
          <div style={{ width: '50%' }}>
            <label style={{ fontSize: 13, marginBottom: 4, display: 'block' }}>Longitude</label>
            <input
              type="text"
              inputMode="decimal"
              pattern="^-?\d*(\.\d*)?$"
              value={longitude}
              onChange={e => setLongitude(e.target.value)}
              required
              style={inputNoSpinner}
              placeholder="Longitude"
            />
          </div>
        </div>
        <label>Descrição:</label>
        <textarea
          value={descricao}
          onChange={e => setDescricao(e.target.value)}
          required
          style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }}
          placeholder="Descrição do ponto turístico"
        />
        <label>URL da Imagem:</label>
        <input
          type="text"
          value={imagem}
          onChange={(e) => setImagem(e.target.value)}
          style={inputStyle}
          placeholder="URL da Imagem do Ponto Turístico"
          disabled={!!imagemFicheiro}
        />

        <div style={{ textAlign: 'center', margin: '8px 0', fontSize: 14, fontWeight: 500 }}>OU</div>
        
        <input
          type="file"
          accept="image/*"
          onChange={handleImagemChange}
          style={{ ...inputStyle, border: 'none', padding: 0 }}
          disabled={!!imagem}
        />
        
        <button
          type="submit"
          style={loading || isUploading ? buttonDisabledStyle : buttonStyle}
          disabled={loading || isUploading}
        >
          {loading || isUploading ? 'A Adicionar...' : 'Adicionar Ponto'}
        </button>
      </form>
    </div>
  );
}

export default AdicionarPonto; 