import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyDocuments, uploadDocument, getDocumentCategories, getAllowedFileTypes, deleteDocument } from '../../../services/documentService';

const DocumentManagement = () => {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [fileTypes, setFileTypes] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit, setLimit] = useState(20);
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [file, setFile] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load categories
      const categoriesResponse = await getDocumentCategories();
      if (categoriesResponse.success) {
        setCategories(categoriesResponse.data.categories);
      }
      
      // Load file types
      const fileTypesResponse = await getAllowedFileTypes();
      if (fileTypesResponse.success) {
        setFileTypes(fileTypesResponse.data.fileTypes);
      }
      
      // Load documents
      await loadDocuments();
    } catch (error) {
      console.error('Error loading document data:', error);
    }
  };

  const loadDocuments = async () => {
    try {
      const params = {
        category: selectedCategory || undefined,
        search: searchTerm || undefined,
        page,
        limit
      };
      
      const response = await getMyDocuments(params);
      if (response.success) {
        setDocuments(response.data.documents);
        setTotalPages(response.data.pagination.pages);
      }
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    
    if (!title || !category || !file) {
      alert('العنوان والفئة والملف مطلوبة');
      return;
    }
    
    setUploading(true);
    try {
      const metadata = {
        title,
        description,
        category,
        tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        isPublic
      };
      
      const response = await uploadDocument(file, metadata);
      
      if (response.success) {
        alert('تم رفع الوثيقة بنجاح');
        setTitle('');
        setDescription('');
        setCategory('');
        setTags('');
        setIsPublic(false);
        setFile(null);
        await loadDocuments();
        
        // Close modal if exists
        document.getElementById('uploadModal')?.classList.add('hidden');
      } else {
        alert(response.message || 'حدث خطأ في رفع الوثيقة');
      }
    } catch (error) {
      console.error('Error uploading document:', error);
      alert('حدث خطأ في رفع الوثيقة');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    
    setDeleting(true);
    try {
      const response = await deleteDocument(deleteId);
      
      if (response.success) {
        alert('تم حذف الوثيقة بنجاح');
        setDeleteId(null);
        await loadDocuments();
      } else {
        alert(response.message || 'حدث خطأ في حذف الوثيقة');
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('حدث خطأ في حذف الوثيقة');
    } finally {
      setDeleting(false);
      document.getElementById('deleteModal')?.classList.add('hidden');
    }
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
    loadDocuments();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-dark">إدارة الوثائق</h1>
          <p className="text-gray-600 mt-1">رفع وإدارة الوثائق الشخصية والمهنية</p>
        </div>
        
        {/* Upload Button */}
        <div className="mb-6">
          <button
            onClick={() => document.getElementById('uploadModal')?.classList.remove('hidden')}
            className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary-dark transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            رفع وثيقة جديدة
          </button>
        </div>
        
        {/* Filters */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-dark mb-2">الفئة</label>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setPage(1);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="">كل الفئات</option>
              {categories.map(cat => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-dark mb-2">بحث</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              placeholder="ابحث في العنوان والوصف..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-dark mb-2">العناصر لكل صفحة</label>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(parseInt(e.target.value));
                setPage(1);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>
        </div>
        
        {/* Documents Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold text-dark">الوثائق</h2>
          </div>
          
          {documents.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              <p>لا توجد وثائق مطابقة للمعايير المحددة</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">العنوان</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">الفئة</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">الحجم</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">التاريخ</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">الإصدار</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {documents.map(doc => (
                    <tr key={doc._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-dark">{doc.title}</div>
                        {doc.description && (
                          <p className="text-sm text-gray-500 mt-1">{doc.description}</p>
                        )}
                        {doc.tags.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {doc.tags.map(tag => (
                              <span key={tag} className="px-2 py-0.5 text-xs bg-primary/10 text-primary rounded">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs bg-secondary/20 text-secondary-dark rounded-full">
                          {doc.category
                            .split('_')
                            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                            .join(' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {(doc.fileSize / 1024 / 1024).toFixed(2)} ميجابايت
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(doc.createdAt).toLocaleDateString('ar-SA')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {doc.version}
                        {doc.isLatestVersion && (
                          <span className="ml-2 px-1.5 py-0.5 text-xs bg-success/20 text-success rounded">
                            أحدث
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm flex gap-2">
                        <button
                          onClick={() => {
                            // Preview/download logic would go here
                            const downloadLink = document.createElement('a');
                            downloadLink.href = doc.fileUrl;
                            downloadLink.download = doc.fileName;
                            document.body.appendChild(downloadLink);
                            downloadLink.click();
                            document.body.removeChild(downloadLink);
                          }}
                          className="px-3 py-1.5 bg-primary/10 text-primary rounded hover:bg-primary/20"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M5 12h14M5 8h14" />
                          </svg>
                          تحميل
                        </button>
                        
                        {!doc.isLatestVersion && (
                          <button
                            onClick={() => {
                              // Navigate to version history
                            }}
                            className="px-3 py-1.5 bg-info/10 text-info rounded hover:bg-info/20"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                            الإصدارات
                          </button>
                        )}
                        
                        <button
                          onClick={() => {
                            setDeleteId(doc._id);
                            document.getElementById('deleteModal')?.classList.remove('hidden');
                          }}
                          className="px-3 py-1.5 bg-error/10 text-error rounded hover:bg-error/20"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          حذف
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {/* Pagination */}
          {documents.length > 0 && (
            <div className="px-6 py-4 border-t flex justify-between items-center">
              <span className="text-sm text-gray-500">
                عرض {(page - 1) * limit + 1}-{Math.min(page * limit, documents.length)} من {documents.length} وثيقة
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 1}
                  className="px-3 py-1.5 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50"
                >
                  السابق
                </button>
                <span className="px-3 py-1.5 text-sm">{page} / {totalPages}</span>
                <button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50"
                >
                  التالي
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Upload Modal */}
      <div
        id="uploadModal"
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 hidden"
      >
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
          <div className="px-6 py-4 border-b">
            <h2 className="text-xl font-semibold text-dark">رفع وثيقة جديدة</h2>
            <button
              onClick={() => document.getElementById('uploadModal')?.classList.add('hidden')}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <form onSubmit={handleUpload} className="px-6 py-4">
            <div className="mb-4">
              <label className="block text-sm font-medium text-dark mb-2">العنوان *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="أدخل عنوان الوثيقة"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-dark mb-2">الوصف</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="أدخل وصفًا للوثيقة (اختياري)"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-dark mb-2">الفئة *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              >
                <option value="">اختر الفئة</option>
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-dark mb-2">العلامات</label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="علامات مفصولة بفاصلة (مثال: مهم, سرية, نهائي)"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            
            <div className="mb-4">
              <label className="flex items-center gap-2 text-sm font-medium text-dark mb-2">
                 <input
                   type="checkbox"
                   checked={isPublic}
                   onChange={(e) => setIsPublic(e.target.checked)}
                   className="h-4 w-4 text-primary rounded border-gray-300"
                 />
                جعل الوثيقة عامة
              </label>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-dark mb-2">الملف *</label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400">
                 <input
                   type="file"
                   accept={fileTypes.map(ft => `.${ft.extension}`).join(',')}
                   onChange={handleFileChange}
                   className="hidden"
                 />
                <div className="space-y-3">
                  <svg className="mx-auto h-10 w-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16v4a2 2 0 002 2h8a2 2 0 002-2v-4M11 8h2m-1-4h2m5 4V7a2 2 0 00-2-2h-2a2 2 0 00-2 2v2m-1-4h2m-5 4H8a2 2 0 01-2-2v-2a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-sm text-gray-600">
                    انقر لرفع الملف أو اسحبها هنا
                  </p>
                  <p className="text-xs text-gray-500">
                    الأنواع المسموحة: {fileTypes.map(ft => ft.extension.toUpperCase()).join(', ')}
                    <br />
                    الحد الأقصى للحجم: {(MAX_FILE_SIZE / (1024 * 1024)).toFixed(0)} ميجابايت
                  </p>
                </div>
              </div>
              
              {file && (
                <div className="mt-3">
                  <p className="text-sm font-medium text-dark">الملف المحدد:</p>
                  <p className="text-sm text-gray-500 truncate">
                    {file.name} ({ (file.size / 1024 / 1024).toFixed(2) } ميجابايت)
                  </p>
                </div>
              )}
            </div>
            
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => document.getElementById('uploadModal')?.classList.add('hidden')}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={uploading}
                className={`px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors ${
                  uploading ? 'opacity-70' : ''
                }`}
              >
                {uploading ? 'جاري الرفع...' : 'رفع الوثيقة'}
              </button>
            </div>
          </form>
        </div>
      </div>
      
      {/* Delete Confirmation Modal */}
      <div
        id="deleteModal"
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 hidden"
      >
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
          <div className="px-6 py-4 border-b">
            <h2 className="text-xl font-semibold text-dark">تأكيد الحذف</h2>
            <button
              onClick={() => document.getElementById('deleteModal')?.classList.add('hidden')}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="px-6 py-6">
            <p className="text-gray-700 mb-4">
              هل أنت متأكد من أنك تريد حذف هذه الوثيقة نهائيًا؟ لا يمكن التراجع عن هذا الإجراء.
            </p>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => document.getElementById('deleteModal')?.classList.add('hidden')}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
              >
                إلغاء
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className={`px-6 py-3 bg-error text-white rounded-lg hover:bg-error-dark transition-colors ${
                  deleting ? 'opacity-70' : ''
                }`}
              >
                {deleting ? 'جاري الحذف...' : 'حذف الوثيقة'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentManagement;