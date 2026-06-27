import { useState } from 'react';
import { formatDateArabic } from '../../utils/dateUtils';

const CommentSection = ({ comments = [], onAddComment, loading }) => {
  const [newComment, setNewComment] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    onAddComment(newComment.trim());
    setNewComment('');
  };

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
        <input
          type="text"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="أكتب تعليقاً..."
          className="input flex-1"
        />
        <button type="submit" disabled={loading || !newComment.trim()} className="btn btn-primary shrink-0">
          {loading ? '...' : 'إرسال'}
        </button>
      </form>
      <div className="space-y-3 max-h-60 overflow-y-auto">
        {comments.map((comment) => (
          <div key={comment._id} className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-semibold text-dark">{comment.user?.name}</span>
              <span className="text-xs text-gray-400 en-num">
                {comment.createdAt ? formatDateArabic(comment.createdAt) : ''}
              </span>
            </div>
            <p className="text-sm text-gray-600">{comment.content}</p>
          </div>
        ))}
        {comments.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-4">لا توجد تعليقات</p>
        )}
      </div>
    </div>
  );
};

export default CommentSection;
