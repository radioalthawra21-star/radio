import { useContext } from 'react';
import { FontContext } from '../context/FontContext';

export const useFonts = () => {
  const context = useContext(FontContext);
  if (!context) {
    throw new Error('useFonts must be used within FontProvider');
  }
  return context;
};