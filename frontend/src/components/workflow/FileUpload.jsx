import { useState, useRef } from 'react';

const FileUpload = ({ onUpload, loading, accept = '.pdf,.doc,.docx,.xls,.xlsx,.jpg,.png,.txt,.zip' }) => {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const handleFile = (file) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert('حجم الملف يتجاوز 10 ميغابايت');
      return;
    }
    onUpload(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  };

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
        dragOver ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-gray-400'
      }`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => handleFile(e.target.files[0])}
      />
      <span className="text-3xl block mb-2">📤</span>
      <p className="text-sm text-gray-600">اسحب الملف هنا أو انقر للاختيار</p>
      <p className="text-xs text-gray-400 mt-1">الحد الأقصى: 10 ميغابايت</p>
    </div>
  );
};

export default FileUpload;
