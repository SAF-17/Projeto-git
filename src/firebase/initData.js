import { db } from './config';
import { doc, setDoc } from 'firebase/firestore';
import { adicionarPontoTuristico } from './firestore';
import { pontosTuristicos } from './pontosTuristicos';

// Adiciona o documento da cidade
const criarDocumentoCidade = async (cidadeId, dadosCidade) => {
  try {
    await setDoc(doc(db, 'Cidades', cidadeId), dadosCidade);
  } catch (error) {
    throw error;
  }
};

export const inicializarDados = async () => {
  try {
    // 1. Criar o documento da cidade
    await criarDocumentoCidade('Covilhã', {
      nome: 'Covilhã',
      coordenadas_centro: [40.280556, -7.504343],
      zoom: 16
    });

    // 2. Adicionar os pontos turísticos a essa cidade
    for (const ponto of pontosTuristicos) {
      await adicionarPontoTuristico(ponto, 'DistritoExemplo', 'Covilhã');
    }
  } catch (error) {
    throw error;
  }
}; 