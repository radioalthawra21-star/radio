import React from 'react';
import { useTypography } from '../../context/TypographyContext';
import Card from '../../components/common/Card';

const TypographySettings = () => {
  const { fonts, loadedFonts } = useTypography();

  const previewText = {
    heading: 'لوحة التحكم',
    body: 'هذا نص عربي لاختبار الخط المستخدم في النصوص',
  };

const isHeadingMontserrat = fonts.heading.family.includes('Montserrat Arabic');
const isBodyMontserrat = fonts.body.family.includes('Montserrat Arabic Light');

...

<p className="text-xl font-bold text-primary mb-2">
  Montserrat Arabic (الاعتيادي، وزن 400)
</p>
...
<p className="text-xl font-bold text-secondary mb-2">
  Montserrat Arabic Light (خفيف، وزن 300)
</p>
...
<li><strong>العناوين:</strong> Montserrat Arabic (وزن 400)</li>
<li><strong>النصوص:</strong> Montserrat Arabic Light (وزن 300)</li>
        </ul>
        <p className="text-sm text-gray-500 mt-3">
          هذه الخطوط مثبتة من المجلد <code className="bg-gray-100 px-2 py-1 rounded">public/fonts/</code>
          ولا يمكن تغييرها من هذه الصفحة.
        </p>
      </Card>

      <Card>
        <h3 className="text-lg font-bold text-dark mb-4">👁️ معاينة مباشرة</h3>
        
        <div className="mb-4 p-4 bg-white rounded-lg border">
          <p className="text-sm text-gray-500 mb-2">عنوان (H1)</p>
          <h1 
            className="text-3xl font-bold"
            style={{ fontFamily: fonts.heading.family }}
          >
            {previewText.heading}
          </h1>
        </div>
        
        <div className="mb-4 p-4 bg-white rounded-lg border">
          <p className="text-sm text-gray-500 mb-2">نص عادي</p>
          <p 
            className="text-base leading-relaxed"
            style={{ fontFamily: fonts.body.family }}
          >
            {previewText.body}. هذا مثال على النصوص التي ستظهر في جميع أنحاء الموقع.
          </p>
        </div>

        <div className="p-4 bg-white rounded-lg border">
          <p className="text-sm text-gray-500 mb-2">جدول</p>
          <table className="w-full text-right" style={{ fontFamily: fonts.body.family }}>
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="p-2">الاسم</th>
                <th className="p-2">القسم</th>
                <th className="p-2">الحالة</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="p-2">أحمد محمد</td>
                <td className="p-2">الإنتاج</td>
                <td className="p-2"><span className="badge bg-secondary">نشط</span></td>
              </tr>
              <tr>
                <td className="p-2">سارة علي</td>
                <td className="p-2">الأخبار</td>
                <td className="p-2"><span className="badge bg-secondary">نشط</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default TypographySettings;
