import { MessageCircle } from 'lucide-react';

export default function ChatPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 text-center px-4">
      <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
        <MessageCircle className="w-10 h-10 text-indigo-600" />
      </div>
      <h2 className="text-xl font-semibold text-gray-800 mb-2">Chào mừng đến ChatApp</h2>
      <p className="text-gray-500 text-sm max-w-xs">
        Chọn một cuộc trò chuyện từ danh sách bên trái hoặc bắt đầu cuộc trò chuyện mới.
      </p>
    </div>
  );
}
