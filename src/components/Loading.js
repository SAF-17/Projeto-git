import React from 'react';
import './Loading.css';

const Loading = ({ message = 'A carregar...' }) => {
    return (
        <div className="loading-overlay">
            <div className="loading-spinner"></div>
            <p className="loading-text">{message}</p>
        </div>
    );
};

export default Loading; 