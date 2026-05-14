import Card from '../../components/common/Card';
import {
  FONT_FAMILIES, FONT_SCALES, BUTTON_STYLES, SHADOWS
} from './DeveloperConfig';

export default function DesignTab({
  colors, fonts, styling, fontSize, shadow, buttonRadius,
  handleColorChange, handleFontChange, handleStylingChange,
  fontName, setFontName, fontType, setFontType,
  handleFontUpload, customFonts, activeFont,
  handleSetActiveFont, handleDeleteFont,
  handleSave, handleReset
}) {
  return (
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
                  <input type="color" value={colors[key]}
                    onChange={(e) => handleColorChange(key, e.target.value)}
                    className="w-10 h-10 rounded cursor-pointer border-2 border-gray-200" />
                  <input type="text" value={colors[key]}
                    onChange={(e) => handleColorChange(key, e.target.value)}
                    className="input w-28 text-sm text-left" dir="ltr" />
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
              <select value={fonts.family} onChange={(e) => handleFontChange('family', e.target.value)} className="input">
                {FONT_FAMILIES.map(font => (<option key={font} value={font}>{font}</option>))}
              </select>
            </div>
            <div>
              <label className="label">مقياس الخط</label>
              <select value={fonts.scale} onChange={(e) => handleFontChange('scale', e.target.value)} className="input">
                {FONT_SCALES.map(scale => (<option key={scale} value={scale}>{scale}</option>))}
              </select>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-bold text-dark mb-6">رفع خط مخصص</h2>
          <div className="space-y-4">
            <div>
              <label className="label">اسم الخط</label>
              <input type="text" value={fontName} onChange={(e) => setFontName(e.target.value)}
                placeholder="أدخل اسم الخط..." className="input" />
            </div>
            <div>
              <label className="label">نوع الخط</label>
              <select value={fontType} onChange={(e) => setFontType(e.target.value)} className="input">
                <option value="main">خط رئيسي</option>
                <option value="sub">خط فرعي</option>
              </select>
            </div>
            <div>
              <label className="label">ملف الخط (TTF, OTF, WOFF)</label>
              <input type="file" accept=".ttf,.otf,.woff" onChange={handleFontUpload} className="input" />
            </div>

            {customFonts.length > 0 && (
              <div className="mt-4">
                <h3 className="font-semibold mb-3">الخطوط المرفوعة</h3>
                <div className="space-y-2">
                  {customFonts.map(font => (
                    <div key={font.id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${activeFont?.id === font.id ? 'border-primary bg-primary/10' : 'border-gray-200'}`}>
                      <div>
                        <p className="font-medium">{font.name}</p>
                        <p className="text-sm text-gray-500">{font.type === 'main' ? 'خط رئيسي' : 'خط فرعي'} • .{font.extension}</p>
                      </div>
                      <div className="flex gap-2">
                        {activeFont?.id === font.id ? (
                          <span className="text-sm text-primary font-medium">نشط</span>
                        ) : (
                          <button onClick={() => handleSetActiveFont(font)} className="text-sm text-secondary hover:underline">تفعيل</button>
                        )}
                        <button onClick={() => handleDeleteFont(font.id)} className="text-sm text-red-500 hover:underline">حذف</button>
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
              <input type="range" min="0" max="30" value={styling.borderRadius}
                onChange={(e) => handleStylingChange('borderRadius', parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
            </div>
            <div>
              <label className="label">نمط الأزرار</label>
              <select value={styling.buttonStyle} onChange={(e) => handleStylingChange('buttonStyle', e.target.value)} className="input">
                {BUTTON_STYLES.map(style => (<option key={style} value={style}>{style}</option>))}
              </select>
            </div>
            <div>
              <label className="label">ظلال البطاقات</label>
              <select value={styling.cardShadow} onChange={(e) => handleStylingChange('cardShadow', e.target.value)} className="input">
                {SHADOWS.map(s => (<option key={s} value={s}>{s}</option>))}
              </select>
            </div>
          </div>
        </Card>

        <Card style={{ background: colors.background }}>
          <h2 className="text-xl font-bold mb-6" style={{ color: colors.dark }}>معاينة</h2>
          <div className="space-y-6">
            <div className="p-4" style={{
              background: '#ffffff', borderRadius: styling.borderRadius,
              boxShadow: shadow, color: colors.dark, fontSize: fontSize
            }}>
              <p className="font-bold mb-2">بطاقة عينة</p>
              <p style={{ color: colors.secondary }}>هذا نص تجريبي لاختبار الإعدادات</p>
            </div>

            <div className="flex gap-3 flex-wrap">
              {['primary', 'secondary', 'interactive'].map(key => (
                <button key={key} style={{
                  background: colors[key], color: '#ffffff',
                  borderRadius: buttonRadius, padding: '8px 16px',
                  border: 'none', fontSize: fontSize
                }}>
                  زر {key === 'primary' ? 'أساسي' : key === 'secondary' ? 'Secondary' : 'تفاعلي'}
                </button>
              ))}
            </div>

            <div>
              <label style={{ color: colors.dark, fontSize: fontSize - 2 }} className="block mb-1">حقل إدخال</label>
              <input type="text" placeholder="أدخل النص هنا..." style={{
                border: `1px solid ${colors.primary}`, borderRadius: styling.borderRadius / 2,
                padding: '8px 12px', fontSize: fontSize, color: colors.dark, outline: 'none'
              }} />
            </div>
          </div>
        </Card>
      </div>

      <div className="flex gap-4 mt-8">
        <button onClick={handleSave} className="btn btn-primary">حفظ الإعدادات</button>
        <button onClick={handleReset} className="btn btn-outline">إعادة تعيين</button>
      </div>
    </>
  );
}
