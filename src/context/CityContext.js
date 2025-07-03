import React, { createContext, useState, useContext } from 'react';

const CityContext = createContext();

export const useCity = () => useContext(CityContext);

export const CityProvider = ({ children }) => {
  const [selectedCity, setSelectedCity] = useState(null);

  const value = {
    selectedCity,
    setSelectedCity,
  };

  return <CityContext.Provider value={value}>{children}</CityContext.Provider>;
}; 