import Card from '../../components/common/Card';

export default function BrandingTab({ appLogo, appName, handleLogoUpload, handleRemoveLogo, handleNameChange }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <h2 className="text-xl font-bold text-dark mb-6">الشعار</h2>
        <div className="space-y-4">
          <div>
            <label className="label">رفع شعار جديد</label>
            <input type="file" accept="image/*" onChange={handleLogoUpload} className="input" />
          </div>
          {appLogo && (
            <div className="mt-4">
              <p className="text-sm text-gray-500 mb-2">الشعار الحالي:</p>
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <img src={appLogo} alt="Logo" className="h-16 w-auto" />
                <button onClick={handleRemoveLogo} className="text-sm text-red-500 hover:underline">إزالة</button>
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
            <input type="text" value={appName} onChange={(e) => handleNameChange(e.target.value)}
              placeholder="أدخل اسم المنصة..." className="input" />
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
            <h3 className="text-2xl font-bold text-dark">{appName || 'اسم المنصة'}</h3>
          </div>
          <p className="text-gray-500">هذا كيف ستظهر الهوية في الصفحة الرئيسية</p>
        </div>
      </Card>
    </div>
  );
}
