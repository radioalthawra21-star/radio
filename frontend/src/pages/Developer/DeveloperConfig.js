export const STORAGE_KEY = 'designSettings';
export const CUSTOM_FONTS_KEY = 'customFonts';
export const ACTIVE_FONT_KEY = 'activeFont';
export const DEV_PASSWORD_KEY = 'devPassword';
export const APP_LOGO_KEY = 'appLogo';
export const APP_NAME_KEY = 'appName';

export const DEFAULT_SETTINGS = {
  colors: {
    background: '#E3D4BE',
    primary: '#CD6F13',
    secondary: '#1C95A4',
    interactive: '#1C95A4',
    dark: '#182E4E'
  },
  fonts: {
    family: 'system-ui, -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, \'Helvetica Neue\', Arial, \'Noto Sans\', sans-serif, \'Apple Color Emoji\', \'Segoe UI Emoji\', \'Segoe UI Symbol\', \'Noto Color Emoji\'',
    scale: 'متوسط'
  },
  styling: {
    borderRadius: 8,
    buttonStyle: 'دائري',
    cardShadow: 'متوسط'
  }
};

export const FONT_FAMILIES = ['MONTSERRAT-ARABIC', 'Tajawal', 'El Messiri', 'Noto Sans Arabic'];
export const FONT_SCALES = ['صغير', 'متوسط', 'كبير', 'كبير جداً'];
export const BUTTON_STYLES = ['دائري', 'مربع', 'حبة'];
export const SHADOWS = ['None', 'خفيف', 'متوسط', 'قوي'];

export const getFontSizeValue = (scale) => {
  const sizes = { 'صغير': 12, 'متوسط': 14, 'كبير': 16, 'كبير جداً': 18 };
  return sizes[scale] || 14;
};

export const getShadowValue = (shadow) => {
  const shadows = {
    'None': 'none', 'خفيف': '0 1px 3px rgba(0,0,0,0.1)',
    'متوسط': '0 4px 6px rgba(0,0,0,0.1)', 'قوي': '0 10px 25px rgba(0,0,0,0.15)'
  };
  return shadows[shadow] || shadows['متوسط'];
};

export const getButtonRadius = (style, baseRadius) => {
  if (style === 'مربع') return 4;
  if (style === 'حبة') return baseRadius * 2;
  return baseRadius;
};

export const applyBranding = (logo, name) => {
  const root = document.documentElement;
  if (logo) {
    root.style.setProperty('--app-logo', logo);
    localStorage.setItem(APP_LOGO_KEY, logo);
    window.dispatchEvent(new CustomEvent('appLogoUpdate'));
  }
  if (name) {
    root.style.setProperty('--app-name', name);
    localStorage.setItem(APP_NAME_KEY, name);
    document.title = name;
    window.dispatchEvent(new CustomEvent('appBrandingUpdate'));
  }
};
