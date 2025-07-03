import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// ATENÇÃO: A linha abaixo é para popular a base de dados pela primeira vez.
// Execute a aplicação UMA VEZ com esta linha, e depois COMENTE-A ou REMOVA-A.


// ATENÇÃO: A linha abaixo serve para corrigir os distritos das cidades existentes.
// Descomente, execute a aplicação UMA VEZ, e depois COMENTE-A novamente.
// atualizarDistritosDasCidades();



// ATENÇÃO: Execute UMA VEZ e depois remova/comente!
//atribuirRoleAdminPorUid('YaKba05GI7gznVRXCXD7WlcJlw53', 'simaofraga10@gmail.com'
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
