import { Link } from 'react-router-dom';
import { getStoredUser } from '../../services/authService';

const NewsDashboard = () => {
  const user = getStoredUser();

  const sections = [
    {
      title: 'نوافذ التحرير',
      icon: '📝',
      items: [
        { path: '/news/editorial-pipeline', label: 'تحرير النصوص', desc: 'المسار التحريري القياسي - 6 مراحل', icon: '📝' },
        { path: '/news/couplet-pipeline', label: 'تحرير الفيديو جراف', desc: 'تنسيق النصوص - 4 كلمات في ثنائيات', icon: '🔤' },
      ]
    },
    {
      title: 'تعديل البرومتات',
      icon: '⚙️',
      items: [
        { path: '/news/prompts', label: 'تحرير برومت النصوص', desc: 'برومتات المسار التحريري القياسي', icon: '⚙️' },
        { path: '/news/couplet-prompts', label: 'تحرير برومت الفيديو جراف', desc: 'برومتات تحرير الفيديو جراف', icon: '🔧' },
      ]
    }
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto" dir="rtl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">قسم الأخبار</h1>
        <p className="text-gray-500">
          مرحباً {user?.name} - قسم الأخبار والمحتوى
        </p>
      </div>

      <div className="space-y-8">
        {sections.map((section, i) => (
          <div key={i}>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">{section.icon}</span>
              <h2 className="text-lg font-bold text-gray-800">{section.title}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {section.items.map((tool, j) => (
                <Link
                  key={j}
                  to={tool.path}
                  className="block p-5 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-primary/30 transition-all duration-200 group"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-3xl">{tool.icon}</div>
                    <div>
                      <h3 className="font-semibold text-gray-900 group-hover:text-primary transition-colors">
                        {tool.label}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">{tool.desc}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NewsDashboard;
