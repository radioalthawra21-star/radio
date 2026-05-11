import { createContext, useState, useEffect, useCallback } from 'react';

export const FontContext = createContext();

const DEFAULT_HEADING = {
  family: 'Montserrat Arabic',
  url: '/fonts/MONTSERRAT-ARABIC-REGULAR.TTF',
};
const DEFAULT_BODY = {
  family: 'Montserrat Arabic Light',
  url: '/fonts/MONTSERRAT-ARABIC-LIGHT.TTF',
};

export const FontProvider = ({ children }) => {
  const [headingFont, setHeadingFont] = useState(DEFAULT_HEADING);
  const [bodyFont, setBodyFont] = useState(DEFAULT_BODY);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('fontSettings');
      if (stored) {
        const parsed = JSON.parse(stored);
        setHeadingFont(parsed.headingFont ?? DEFAULT_HEADING);
        setBodyFont(parsed.bodyFont ?? DEFAULT_BODY);
      }
    } catch (e) {
      console.error('Failed to load font settings from localStorage', e);
    }
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(
        'fontSettings',
        JSON.stringify({ headingFont, bodyFont })
      );
    } catch (e) {
      console.error('Failed to save font settings to localStorage', e);
    }
  }, [headingFont, bodyFont]);

  // Convert file to Data URL
  const fileToDataUrl = useCallback((file) => {
    return new Promise((resolve, reject) => {
      if (!file) {
        reject(new Error('No file provided'));
        return;
      }

      const validExtensions = ['.ttf', '.otf', '.woff', '.woff2'];
      const fileName = file.name.toLowerCase();
      
      const isValidExtension = validExtensions.some(ext => fileName.endsWith(ext));

      if (!isValidExtension) {
        reject(new Error('الملف غير صالح. يرجى رفع ملف خط (TTF، OTF)'));
        return;
      }

      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('فشل قراءة الملف'));
      reader.readAsDataURL(file);
    });
  }, []);

  const updateFont = useCallback(async (type, file) => {
    try {
      const url = await fileToDataUrl(file);
      if (type === 'heading') {
        setHeadingFont({ family: file.name.replace(/\.[^/.]+$/, ''), url });
      } else if (type === 'body') {
        setBodyFont({ family: file.name.replace(/\.[^/.]+$/, ''), url });
      }
    } catch (err) {
      console.error('Error processing font file', err);
    }
  }, [fileToDataUrl]);

  const resetFont = useCallback((type) => {
    if (type === 'heading') setHeadingFont(DEFAULT_HEADING);
    else if (type === 'body') setBodyFont(DEFAULT_BODY);
  }, []);

  const value = {
    headingFont,
    bodyFont,
    updateFont,
    resetFont,
  };

  return <FontContext.Provider value={value}>{children}</FontContext.Provider>;
};

export default FontProvider;
