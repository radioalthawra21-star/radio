import { useState, useEffect } from 'react';
import Card from '../../components/common/Card';
import TypographySettings from './TypographySettings';

const STORAGE_KEY = 'designSettings';
const CUSTOM_FONTS_KEY = 'customFonts';
const ACTIVE_FONT_KEY = 'activeFont';
const DEV_PASSWORD_KEY = 'devPassword';
const APP_LOGO_KEY = 'appLogo';
const APP_NAME_KEY = 'appName';

const DEFAULT_SETTINGS = {
  colors: {
    background: '#E3D4BE',
    primary: '#CD6F13',
    secondary: '#1C95A4',
    interactive: '#1C95A4',
    dark: '#182E4E'
  },
  fonts: {
    family: 'CAIRO',
    scale: 'متوسط'
  },
  styling: {
    borderRadius: 8,
    buttonStyle: 'دائري',
    cardShadow: 'متوسط'
  }
};

const FONT_FAMILIES = ['CAIRO', 'MONTSERRAT-ARABIC', 'Tajawal', 'El Messiri', 'Noto Sans Arabic'];
const FONT_SCALES = ['صغير', 'متوسط', 'كبير', 'كبير جداً'];
const BUTTON_STYLES = ['دائري', 'مربع', 'حبة'];
const SHADOWS = ['None', 'خفيف', 'متوسط', 'قوي'];

const getFontSizeValue = (scale) => {
  const sizes = { 'صغير': 12, 'متوسط': 14, 'كبير': 16, 'كبير جداً': 18 };
  return sizes[scale] || 14;
};

const getShadowValue = (shadow) => {
  const shadows = { 'None': 'none', 'خفيف': '0 1px 3px rgba(0,0,0,0.1)', 'متوسط': '0 4px 6px rgba(0,0,0,0.1)', 'قوي': '0 10px 25px rgba(0,0,0,0.15)' };
  return shadows[shadow] || shadows['متوسط'];
};

const getButtonRadius = (style, baseRadius) => {
  if (style === 'مربع') return 4;
  if (style === 'حبة') return baseRadius * 2;
  return baseRadius;
};

const applyBranding = (logo, name) => {
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
    if (stored) {
      try {
        setSettings(JSON.parse(stored));
      } catch (e) {
        console.error('Error loading settings:', e);
      }
    }

    const storedFonts = localStorage.getItem(CUSTOM_FONTS_KEY);
    if (storedFonts) {
      try {
        setCustomFonts(JSON.parse(storedFonts));
      } catch (e) {
        console.error('Error loading fonts:', e);
      }
    }

    const storedActiveFont = localStorage.getItem(ACTIVE_FONT_KEY);
    if (storedActiveFont) {
      try {
        setActiveFont(JSON.parse(storedActiveFont));
      } catch (e) {
        console.error('Error loading active font:', e);
      }
    }

    const storedLogo = localStorage.getItem(APP_LOGO_KEY);
    if (storedLogo) setAppLogo(storedLogo);
    
    const storedName = localStorage.getItem(APP_NAME_KEY);
    if (storedName) setAppName(storedName);
  };

  const handleColorChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      colors: { ...prev.colors, [key]: value }
    }));
    setSaved(false);
  };

  const handleFontChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      fonts: { ...prev.fonts, [key]: value }
    }));
    setSaved(false);
  };

  const handleStylingChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      styling: { ...prev.styling, [key]: value }
    }));
    setSaved(false);
  };

  const handleFontUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const extension = file.name.split('.').pop().toLowerCase();
    const validExtensions = ['ttf', 'otf', 'woff'];

    if (!validExtensions.includes(extension)) {
      alert('يرجى اختيار ملف خط صالح (TTF, OTF, WOFF)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const fontData = {
        id: Date.now(),
        name: fontName || file.name.replace(/\.[^/.]+$/, ''),
        data: event.target.result,
        type: fontType,
        extension: extension
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
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder="أدخل كلمة المرور..."
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button type="submit" className="btn btn-primary w-full">
              تسجيل الدخول
            </button>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ fontFamily: fonts.family }}>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-dark">لوحة المطور</h1>
        <button onClick={() => setIsAuthenticated(false)} className="btn btn-outline">
          خروج
        </button>
      </div>

      {saved && (
        <div className="bg-success/10 border border-success text-success p-3 rounded-lg mb-4">
          تم حفظ الإعدادات بنجاح
        </div>
      )}

      <div className="flex gap-2 mb-6 border-b">
        <button
          onClick={() => setActiveTab('branding')}
          className={`px-4 py-2 font-semibold transition-colors ${
            activeTab === 'branding' 
              ? 'text-primary border-b-2 border-primary' 
              : 'text-gray-500 hover:text-dark'
          }`}
        >
          الهوية
        </button>
        <button
          onClick={() => setActiveTab('design')}
          className={`px-4 py-2 font-semibold transition-colors ${
            activeTab === 'design' 
              ? 'text-primary border-b-2 border-primary' 
              : 'text-gray-500 hover:text-dark'
          }`}
        >
          إعدادات التصميم
        </button>
        <button
          onClick={() => setActiveTab('typography')}
          className={`px-4 py-2 font-semibold transition-colors ${
            activeTab === 'typography' 
              ? 'text-primary border-b-2 border-primary' 
              : 'text-gray-500 hover:text-dark'
          }`}
        >
          إعدادات الخطوط
        </button>
      </div>

      {activeTab === 'branding' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <h2 className="text-xl font-bold text-dark mb-6">الشعار</h2>
            <div className="space-y-4">
              <div>
                <label className="label">رفع شعار جديد</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="input"
                />
              </div>
              
              {appLogo && (
                <div className="mt-4">
                  <p className="text-sm text-gray-500 mb-2">الشعار الحالي:</p>
                  <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                    <img src={appLogo} alt="Logo" className="h-16 w-auto" />
                    <button
                      onClick={handleRemoveLogo}
                      className="text-sm text-red-500 hover:underline"
                    >
                      إزالة
                    </button>
                  </div>
                </div>
              )}
            </div>
          </Card>

          <Card>
            <h2 className="text-xl font-bold text-dark mb-6">اسم المنصة</h2>
            <div className="space-y-4">
              <div>
                <label className="label">اسم المنصة</label>
                <input
                  type="text"
                  value={appName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="أدخل اسم المنصة..."
                  className="input"
                />
              </div>
              
              {appName && (
                <div className="mt-4">
                  <p className="text-sm text-gray-500 mb-2">معاينة:</p>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-2xl font-bold text-dark">{appName}</p>
                  </div>
                </div>
              )}
            </div>
          </Card>

          <Card className="lg:col-span-2">
            <h2 className="text-xl font-bold text-dark mb-6">معاينة الهوية</h2>
            <div className="p-6 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-4 mb-4">
                {appLogo ? (
                  <img src={appLogo} alt="Logo" className="h-12" />
                ) : (
                  <div className="h-12 w-12 bg-primary/20 rounded-lg flex items-center justify-center">
                    <span className="text-primary text-xl">📷</span>
                  </div>
                )}
                <h3 className="text-2xl font-bold text-dark">
                  {appName || 'اسم المنصة'}
                </h3>
              </div>
              <p className="text-gray-500">هذا كيف ستظهر الهوية في الصفحة الرئيسية</p>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'design' && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h2 className="text-xl font-bold text-dark mb-6">الألوان</h2>
          <div className="space-y-4">
            {[
              { key: 'background', label: 'لون الخلفية' },
              { key: 'primary', label: 'اللون الأساسي' },
              { key: 'secondary', label: 'اللون Secondary' },
              { key: 'interactive', label: 'اللون التفاعلي' },
              { key: 'dark', label: 'لون النص' }
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between">
                <label className="text-gray-700 font-medium">{label}</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={colors[key]}
                    onChange={(e) => handleColorChange(key, e.target.value)}
                    className="w-10 h-10 rounded cursor-pointer border-2 border-gray-200"
                  />
                  <input
                    type="text"
                    value={colors[key]}
                    onChange={(e) => handleColorChange(key, e.target.value)}
                    className="input w-28 text-sm text-left"
                    dir="ltr"
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-bold text-dark mb-6">الخطوط</h2>
          <div className="space-y-6">
            <div>
              <label className="label">عائلة الخط</label>
              <select
                value={fonts.family}
                onChange={(e) => handleFontChange('family', e.target.value)}
                className="input"
              >
                {FONT_FAMILIES.map(font => (
                  <option key={font} value={font}>{font}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">مقياس الخط</label>
              <select
                value={fonts.scale}
                onChange={(e) => handleFontChange('scale', e.target.value)}
                className="input"
              >
                {FONT_SCALES.map(scale => (
                  <option key={scale} value={scale}>{scale}</option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-bold text-dark mb-6">رفع خط مخصص</h2>
          <div className="space-y-4">
            <div>
              <label className="label">اسم الخط</label>
              <input
                type="text"
                value={fontName}
                onChange={(e) => setFontName(e.target.value)}
                placeholder="أدخل اسم الخط..."
                className="input"
              />
            </div>
            <div>
              <label className="label">نوع الخط</label>
              <select
                value={fontType}
                onChange={(e) => setFontType(e.target.value)}
                className="input"
              >
                <option value="main">خط رئيسي</option>
                <option value="sub">خط فرعي</option>
              </select>
            </div>
            <div>
              <label className="label">ملف الخط (TTF, OTF, WOFF)</label>
              <input
                type="file"
                accept=".ttf,.otf,.woff"
                onChange={handleFontUpload}
                className="input"
              />
            </div>

            {customFonts.length > 0 && (
              <div className="mt-4">
                <h3 className="font-semibold mb-3">الخطوط المرفوعة</h3>
                <div className="space-y-2">
                  {customFonts.map(font => (
                    <div
                      key={font.id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        activeFont?.id === font.id ? 'border-primary bg-primary/10' : 'border-gray-200'
                      }`}
                    >
                      <div>
                        <p className="font-medium">{font.name}</p>
                        <p className="text-sm text-gray-500">
                          {font.type === 'main' ? 'خط رئيسي' : 'خط فرعي'} • .{font.extension}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {activeFont?.id === font.id ? (
                          <span className="text-sm text-primary font-medium">نشط</span>
                        ) : (
                          <button
                            onClick={() => handleSetActiveFont(font)}
                            className="text-sm text-secondary hover:underline"
                          >
                            تفعيل
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteFont(font.id)}
                          className="text-sm text-red-500 hover:underline"
                        >
                          حذف
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-bold text-dark mb-6">التنسيق</h2>
          <div className="space-y-6">
            <div>
              <label className="label">استدارة الحدود: {styling.borderRadius}px</label>
              <input
                type="range"
                min="0"
                max="30"
                value={styling.borderRadius}
                onChange={(e) => handleStylingChange('borderRadius', parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            <div>
              <label className="label">نمط الأزرار</label>
              <select
                value={styling.buttonStyle}
                onChange={(e) => handleStylingChange('buttonStyle', e.target.value)}
                className="input"
              >
                {BUTTON_STYLES.map(style => (
                  <option key={style} value={style}>{style}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">ظلال البطاقات</label>
              <select
                value={styling.cardShadow}
                onChange={(e) => handleStylingChange('cardShadow', e.target.value)}
                className="input"
              >
                {SHADOWS.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        <Card style={{ background: colors.background }}>
          <h2 className="text-xl font-bold mb-6" style={{ color: colors.dark }}>معاينة</h2>
          <div className="space-y-6">
            <div
              className="p-4"
              style={{
                background: '#ffffff',
                borderRadius: styling.borderRadius,
                boxShadow: shadow,
                color: colors.dark,
                fontSize: fontSize
              }}
            >
              <p className="font-bold mb-2">بطاقة عينة</p>
              <p style={{ color: colors.secondary }}>هذا نص تجريبي لاختبار الإعدادات</p>
            </div>

            <div className="flex gap-3 flex-wrap">
              <button
                style={{
                  background: colors.primary,
                  color: '#ffffff',
                  borderRadius: buttonRadius,
                  padding: '8px 16px',
                  border: 'none',
                  fontSize: fontSize
                }}
              >
                زر أساسي
              </button>
              <button
                style={{
                  background: colors.secondary,
                  color: '#ffffff',
                  borderRadius: buttonRadius,
                  padding: '8px 16px',
                  border: 'none',
                  fontSize: fontSize
                }}
              >
                زر Secondary
              </button>
              <button
                style={{
                  background: colors.interactive,
                  color: '#ffffff',
                  borderRadius: buttonRadius,
                  padding: '8px 16px',
                  border: 'none',
                  fontSize: fontSize
                }}
              >
                زر تفاعلي
              </button>
            </div>

            <div>
              <label style={{ color: colors.dark, fontSize: fontSize - 2 }} className="block mb-1">حقل إدخال</label>
              <input
                type="text"
                placeholder="أدخل النص هنا..."
                style={{
                  border: `1px solid ${colors.primary}`,
                  borderRadius: styling.borderRadius / 2,
                  padding: '8px 12px',
                  fontSize: fontSize,
                  color: colors.dark,
                  outline: 'none'
                }}
              />
            </div>
          </div>
        </Card>
      </div>

      <div className="flex gap-4 mt-8">
        <button onClick={handleSave} className="btn btn-primary">
          حفظ الإعدادات
        </button>
        <button onClick={handleReset} className="btn btn-outline">
          إعادة تعيين
        </button>
      </div>
      </>
      )}

      {activeTab === 'typography' && (
        <TypographySettings />
      )}
    </div>
  );
};

export default DeveloperPanel;