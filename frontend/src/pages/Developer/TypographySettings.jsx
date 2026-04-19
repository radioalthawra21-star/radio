import { useState, useRef } from 'react';
import { useTypography, GOOGLE_FONTS } from '../../context/TypographyContext';
import Card from '../../components/common/Card';

const TypographySettings = () => {
  const { fonts, updateFonts, addUploadedFont, deleteUploadedFont, loadedFonts } = useTypography();
  const [previewText] = useState({
    heading: 'لوحة التحكم',
    body: 'هذا نص عربي لاختبار الخط المستخدم في النصوص',
  });
  const fileInputRef = useRef(null);

  const handleFontChange = (type, font) => {
    updateFonts({ [type]: font });
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const format = file.name.endsWith('.woff2') ? 'woff2' : 
                     file.name.endsWith('.woff') ? 'woff' : 'truetype';
      
      const fontData = {
        name: file.name.replace(/\.[^/.]+$/, ''),
        url: event.target.result,
        format
      };
      
      const newFont = addUploadedFont(fontData);
      updateFonts({ body: newFont });
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteFont = (font) => {
    if (font.source === 'uploaded') {
      deleteUploadedFont(font.family);
      if (fonts.heading.family === font.family) {
        updateFonts({ heading: GOOGLE_FONTS[0] });
      }
      if (fonts.body.family === font.family) {
        updateFonts({ body: GOOGLE_FONTS[0] });
      }
    }
  };

  const uploadedFonts = loadedFonts.filter(fontName => {
    const isGoogle = GOOGLE_FONTS.some(gf => gf.family === fontName);
    return !isGoogle;
  });

  return (
    <div className="space-y-6">
      <Card>
        <h3 className="text-lg font-bold text-dark mb-4">خط العناوين</h3>
        <select
          value={fonts.heading.family}
          onChange={(e) => {
            const font = GOOGLE_FONTS.find(f => f.family === e.target.value);
            if (font) updateFonts({ heading: font });
          }}
          className="input"
          style={{ fontFamily: fonts.heading.family }}
        >
          {GOOGLE_FONTS.map(font => (
            <option key={font.family} value={font.family} style={{ fontFamily: font.family }}>
              {font.name}
            </option>
          ))}
        </select>
        <p className="text-sm text-gray-500 mt-2">العناوين: {fonts.heading.family}</p>
      </Card>

      <Card>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-dark">خط النصوص</h3>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn btn-outline text-sm"
          >
            رفع خط خاص
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".woff2,.woff,.ttf"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
        <select
          value={fonts.body.family}
          onChange={(e) => {
            const font = GOOGLE_FONTS.find(f => f.family === e.target.value);
            if (font) updateFonts({ body: font });
          }}
          className="input"
          style={{ fontFamily: fonts.body.family }}
        >
          {GOOGLE_FONTS.map(font => (
            <option key={font.family} value={font.family} style={{ fontFamily: font.family }}>
              {font.name}
            </option>
          ))}
        </select>
        <p className="text-sm text-gray-500 mt-2">النصوص: {fonts.body.family}</p>
      </Card>

      {uploadedFonts.length > 0 && (
        <Card>
          <h3 className="text-lg font-bold text-dark mb-4">الخطوط المرفوعة</h3>
          <div className="space-y-2">
            {uploadedFonts.map(fontName => (
              <div key={fontName} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span style={{ fontFamily: fontName }}>{fontName}</span>
                <div className="flex gap-2">
                  {fonts.heading.family === fontName && (
                    <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded">عنوان</span>
                  )}
                  {fonts.body.family === fontName && (
                    <span className="text-xs bg-secondary/20 text-secondary px-2 py-1 rounded">نص</span>
                  )}
                  <button
                    onClick={() => handleDeleteFont({ family: fontName, source: 'uploaded' })}
                    className="text-sm text-red-500 hover:underline"
                  >
                    حذف
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <h3 className="text-lg font-bold text-dark mb-4">جميع الخطوط المحملة</h3>
        <div className="flex flex-wrap gap-2">
          {loadedFonts.map(fontName => {
            const isHeading = fonts.heading.family === fontName;
            const isBody = fonts.body.family === fontName;
            const isGoogle = GOOGLE_FONTS.some(gf => gf.family === fontName);
            return (
              <div
                key={fontName}
                className={`px-3 py-2 rounded-lg border ${
                  isHeading || isBody ? 'border-primary bg-primary/10' : 'border-gray-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span style={{ fontFamily: fontName }}>{fontName}</span>
                  {isHeading && <span className="text-xs text-primary">ع</span>}
                  {isBody && <span className="text-xs text-secondary">ن</span>}
                  {!isGoogle && (
                    <button
                      onClick={() => handleDeleteFont({ family: fontName, source: 'uploaded' })}
                      className="text-xs text-red-500 hover:underline"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card>
        <h3 className="text-lg font-bold text-dark mb-4">معاينة مباشرة</h3>
        
        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-500 mb-2">عنوان</p>
          <h2 
            className="text-2xl font-bold"
            style={{ fontFamily: fonts.heading.family }}
          >
            {previewText.heading}
          </h2>
        </div>

        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-500 mb-2">نص</p>
          <p 
            className="text-base"
            style={{ fontFamily: fonts.body.family }}
          >
            {previewText.body}
          </p>
        </div>

        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-500 mb-2">جدول</p>
          <table className="w-full text-right" style={{ fontFamily: fonts.body.family }}>
            <thead>
              <tr className="border-b">
                <th className="p-2">الاسم</th>
                <th className="p-2">القسم</th>
                <th className="p-2">الحالة</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="p-2">أحمد محمد</td>
                <td className="p-2">الإنتاج</td>
                <td className="p-2">نشط</td>
              </tr>
              <tr>
                <td className="p-2">سارة علي</td>
                <td className="p-2">الأخبار</td>
                <td className="p-2">نشط</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default TypographySettings;