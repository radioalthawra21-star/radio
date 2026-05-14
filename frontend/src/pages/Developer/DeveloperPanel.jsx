import { useState, useEffect } from 'react';
import Card from '../../components/common/Card';
import TypographySettings from './TypographySettings';
import BrandingTab from './BrandingTab';
import DesignTab from './DesignTab';
import {
  STORAGE_KEY, CUSTOM_FONTS_KEY, ACTIVE_FONT_KEY,
  DEV_PASSWORD_KEY, APP_LOGO_KEY, APP_NAME_KEY,
  DEFAULT_SETTINGS, getFontSizeValue, getShadowValue,
  getButtonRadius, applyBranding
} from './DeveloperConfig';

const DeveloperPanel = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);
  const [customFonts, setCustomFonts] = useState([]);
  const [activeFont, setActiveFont] = useState(null);
  const [fontName, setFontName] = useState('');
  const [fontType, setFontType] = useState('main');
  const [activeTab, setActiveTab] = useState('design');
  const [appLogo, setAppLogo] = useState('');
  const [appName, setAppName] = useState('');

  const storedDevPassword = localStorage.getItem(DEV_PASSWORD_KEY);

  useEffect(() => {
    const storedLogo = localStorage.getItem(APP_LOGO_KEY);
    const storedName = localStorage.getItem(APP_NAME_KEY);
    if (storedLogo) setAppLogo(storedLogo);
    if (storedName) setAppName(storedName);
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    const savedPassword = storedDevPassword || 'dev123';
    if (password === savedPassword) {
      setIsAuthenticated(true);
      setError('');
      loadSettings();
    } else {
      setError('كلمة المرور غير صحيحة');
    }
  };

  const loadSettings = () => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) { try { setSettings(JSON.parse(stored)); } catch (e) {} }

    const storedFonts = localStorage.getItem(CUSTOM_FONTS_KEY);
    if (storedFonts) { try { setCustomFonts(JSON.parse(storedFonts)); } catch (e) {} }

    const storedActiveFont = localStorage.getItem(ACTIVE_FONT_KEY);
    if (storedActiveFont) { try { setActiveFont(JSON.parse(storedActiveFont)); } catch (e) {} }

    const storedLogo = localStorage.getItem(APP_LOGO_KEY);
    if (storedLogo) setAppLogo(storedLogo);

    const storedName = localStorage.getItem(APP_NAME_KEY);
    if (storedName) setAppName(storedName);
  };

  const handleColorChange = (key, value) => {
    setSettings(prev => ({ ...prev, colors: { ...prev.colors, [key]: value } }));
    setSaved(false);
  };

  const handleFontChange = (key, value) => {
    setSettings(prev => ({ ...prev, fonts: { ...prev.fonts, [key]: value } }));
    setSaved(false);
  };

  const handleStylingChange = (key, value) => {
    setSettings(prev => ({ ...prev, styling: { ...prev.styling, [key]: value } }));
    setSaved(false);
  };

  const handleFontUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const extension = file.name.split('.').pop().toLowerCase();
    if (!['ttf', 'otf', 'woff'].includes(extension)) {
      alert('يرجى اختيار ملف خط صالح (TTF, OTF, WOFF)');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const fontData = {
        id: Date.now(), name: fontName || file.name.replace(/\.[^/.]+$/, ''),
        data: event.target.result, type: fontType, extension
      };
      const updatedFonts = [...customFonts, fontData];
      setCustomFonts(updatedFonts);
      localStorage.setItem(CUSTOM_FONTS_KEY, JSON.stringify(updatedFonts));
      if (!activeFont) {
        setActiveFont(fontData);
        localStorage.setItem(ACTIVE_FONT_KEY, JSON.stringify(fontData));
      }
      setFontName('');
    };
    reader.readAsDataURL(file);
  };

  const handleSetActiveFont = (font) => {
    setActiveFont(font);
    localStorage.setItem(ACTIVE_FONT_KEY, JSON.stringify(font));
  };

  const handleDeleteFont = (fontId) => {
    const updatedFonts = customFonts.filter(f => f.id !== fontId);
    setCustomFonts(updatedFonts);
    localStorage.setItem(CUSTOM_FONTS_KEY, JSON.stringify(updatedFonts));
    if (activeFont && activeFont.id === fontId) {
      const newActive = updatedFonts.length > 0 ? updatedFonts[0] : null;
      setActiveFont(newActive);
      localStorage.setItem(ACTIVE_FONT_KEY, JSON.stringify(newActive));
    }
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const logoData = event.target.result;
      setAppLogo(logoData);
      applyBranding(logoData, appName);
    };
    reader.readAsDataURL(file);
  };

  const handleNameChange = (name) => {
    setAppName(name);
    applyBranding(appLogo, name);
  };

  const handleRemoveLogo = () => {
    setAppLogo('');
    localStorage.removeItem(APP_LOGO_KEY);
    document.documentElement.style.removeProperty('--app-logo');
  };

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleReset = () => {
    if (window.confirm('هل أنت متأكد من إعادة تعيين الإعدادات الافتراضية؟')) {
      setSettings(DEFAULT_SETTINGS);
      localStorage.removeItem(STORAGE_KEY);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  };

  const { colors, fonts, styling } = settings;
  const fontSize = getFontSizeValue(fonts.scale);
  const shadow = getShadowValue(styling.cardShadow);
  const buttonRadius = getButtonRadius(styling.buttonStyle, styling.borderRadius);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <h1 className="text-2xl font-bold text-dark mb-6 text-center">لوحة المطور</h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="label">كلمة المرور</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                className="input" placeholder="أدخل كلمة المرور..." />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button type="submit" className="btn btn-primary w-full">تسجيل الدخول</button>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-dark">لوحة المطور</h1>
        <button onClick={() => setIsAuthenticated(false)} className="btn btn-outline">خروج</button>
      </div>

      {saved && (
        <div className="bg-success/10 border border-success text-success p-3 rounded-lg mb-4">
          تم حفظ الإعدادات بنجاح
        </div>
      )}

      <div className="flex gap-2 mb-6 border-b">
        <button onClick={() => setActiveTab('branding')}
          className={`px-4 py-2 font-semibold transition-colors ${activeTab === 'branding' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-dark'}`}>
          الهوية
        </button>
        <button onClick={() => setActiveTab('design')}
          className={`px-4 py-2 font-semibold transition-colors ${activeTab === 'design' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-dark'}`}>
          إعدادات التصميم
        </button>
        <button onClick={() => setActiveTab('typography')}
          className={`px-4 py-2 font-semibold transition-colors ${activeTab === 'typography' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-dark'}`}>
          إعدادات الخطوط
        </button>
      </div>

      {activeTab === 'branding' && (
        <BrandingTab
          appLogo={appLogo} appName={appName}
          handleLogoUpload={handleLogoUpload} handleRemoveLogo={handleRemoveLogo}
          handleNameChange={handleNameChange}
        />
      )}

      {activeTab === 'design' && (
        <DesignTab
          colors={colors} fonts={fonts} styling={styling}
          fontSize={fontSize} shadow={shadow} buttonRadius={buttonRadius}
          handleColorChange={handleColorChange} handleFontChange={handleFontChange}
          handleStylingChange={handleStylingChange}
          fontName={fontName} setFontName={setFontName}
          fontType={fontType} setFontType={setFontType}
          handleFontUpload={handleFontUpload}
          customFonts={customFonts} activeFont={activeFont}
          handleSetActiveFont={handleSetActiveFont} handleDeleteFont={handleDeleteFont}
          handleSave={handleSave} handleReset={handleReset}
        />
      )}

      {activeTab === 'typography' && <TypographySettings />}
    </div>
  );
};

export default DeveloperPanel;
