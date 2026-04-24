import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const TypographyContext = createContext();

const DEFAULT_FONTS = {
  heading: {
    family: 'system-ui, -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, \'Helvetica Neue\', Arial, \'Noto Sans\', sans-serif, \'Apple Color Emoji\', \'Segoe UI Emoji\', \'Segoe UI Symbol\', \'Noto Color Emoji\'',
    source: 'system',
    url: ''
  },
  body: {
    family: 'system-ui, -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, \'Helvetica Neue\', Arial, \'Noto Sans\', sans-serif, \'Apple Color Emoji\', \'Segoe UI Emoji\', \'Segoe UI Symbol\', \'Noto Color Emoji\'',
    source: 'system',
    url: ''
  }
};

export const GOOGLE_FONTS = [];

export const TypographyProvider = ({ children }) => {
  const [fonts, setFonts] = useState(() => {
    const stored = localStorage.getItem('typographyFonts');
    return stored ? JSON.parse(stored) : DEFAULT_FONTS;
  });

  const [loadedFonts, setLoadedFonts] = useState([]);

  const loadFont = useCallback((fontConfig) => {
    if (!fontConfig || !fontConfig.url) return;
    
    const fontName = fontConfig.family;
    if (loadedFonts.includes(fontName)) return;

    const existingLink = document.querySelector(`link[data-font="${fontName}"]`);
    if (existingLink) return;

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = fontConfig.url;
    link.setAttribute('data-font', fontName);
    document.head.appendChild(link);
    
    setLoadedFonts(prev => [...prev, fontName]);
  }, [loadedFonts]);

  const applyFonts = useCallback((fontConfig) => {
    const root = document.documentElement;
    root.style.setProperty('--font-heading', fontConfig.heading.family);
    root.style.setProperty('--font-body', fontConfig.body.family);
  }, []);

  useEffect(() => {
    loadFont(fonts.heading);
    loadFont(fonts.body);
    applyFonts(fonts);
  }, [fonts]);

  const updateFonts = useCallback((newFonts) => {
    const updated = { ...fonts, ...newFonts };
    setFonts(updated);
    localStorage.setItem('typographyFonts', JSON.stringify(updated));
    
    if (newFonts.heading) loadFont(newFonts.heading);
    if (newFonts.body) loadFont(newFonts.body);
    applyFonts(updated);
  }, [fonts, loadFont, applyFonts]);

  const addUploadedFont = useCallback((fontData) => {
    const fontName = fontData.name.replace(/\s+/g, '');
    
    const style = document.createElement('style');
    style.setAttribute('data-font-uploaded', fontName);
    style.textContent = `
      @font-face {
        font-family: '${fontName}';
        src: url('${fontData.url}') format('${fontData.format}');
        font-weight: normal;
        font-style: normal;
      }
    `;
    document.head.appendChild(style);
    
    const newFont = {
      family: fontName,
      source: 'uploaded',
      url: fontData.url
    };
    
    setLoadedFonts(prev => [...prev, fontName]);
    return newFont;
  }, []);

  const deleteUploadedFont = useCallback((fontName) => {
    const style = document.querySelector(`style[data-font-uploaded="${fontName}"]`);
    if (style) {
      style.remove();
    }
    
    const link = document.querySelector(`link[data-font="${fontName}"]`);
    if (link) {
      link.remove();
    }
    
    setLoadedFonts(prev => prev.filter(f => f !== fontName));
  }, []);

  const value = {
    fonts,
    updateFonts,
    addUploadedFont,
    deleteUploadedFont,
    GOOGLE_FONTS,
    loadedFonts
  };

  return (
    <TypographyContext.Provider value={value}>
      {children}
    </TypographyContext.Provider>
  );
};

export const useTypography = () => {
  const context = useContext(TypographyContext);
  if (!context) {
    throw new Error('useTypography must be used within TypographyProvider');
  }
  return context;
};

export default TypographyContext;