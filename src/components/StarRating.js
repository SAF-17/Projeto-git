import React from 'react';

const StarRating = ({ rating }) => {
  if (typeof rating !== 'number' || rating <= 0) {
    return <span style={{ color: '#9ca3af', fontSize: '0.9em' }}>N/A</span>;
  }
  
  const totalStars = 5;
  const fullStars = Math.floor(rating);
  const halfStar = rating % 1 !== 0;
  const emptyStars = totalStars - fullStars - (halfStar ? 1 : 0);

  const stars = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {[...Array(fullStars)].map((_, i) => <span key={`full-${i}`} style={{ color: '#fbbf24' }}>★</span>)}
      {halfStar && <span style={{ color: '#fbbf24' }}>☆</span>}
      {[...Array(emptyStars)].map((_, i) => <span key={`empty-${i}`} style={{ color: '#e5e7eb' }}>☆</span>)}
      <span style={{ marginLeft: 6, fontSize: '0.9em', fontWeight: 600 }}>({rating.toFixed(1)})</span>
    </div>
  );

  // Se a classificação for 0 ou indefinida, mostra as estrelas vazias.
  if (!rating || rating === 0) {
    return <>{stars}</>;
  }

  return <>{stars}</>;
};

export default StarRating; 