'use client';

import { useState, useRef } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import { useAuthStore } from '@/store/auth';
import api from '@/lib/api';
import { Camera, Save } from 'lucide-react';
import { User } from '@/types';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const { user, updateUser, logout } = useAuthStore();
  const [name, setName] = useState(user?.name || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSaveName = async () => {
    if (!name.trim()) return;
    setIsSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await api.put<{ data: User }>('/users/me', { name: name.trim() });
      updateUser(res.data.data);
      setSuccess('Cập nhật tên thành công!');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Cập nhật thất bại');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('avatar', file);

    setIsUploading(true);
    setError('');
    try {
      const res = await api.put<{ data: User }>('/users/me/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      updateUser(res.data.data);
      setSuccess('Cập nhật ảnh đại diện thành công!');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Upload thất bại');
    } finally {
      setIsUploading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {}
    logout();
    window.location.href = '/login';
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Hồ sơ cá nhân" size="sm">
      <div className="flex flex-col items-center">
        {/* Avatar section */}
        <div className="relative mb-4">
          <Avatar name={user?.name || ''} avatarUrl={user?.avatar_url} size="xl" />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="absolute bottom-0 right-0 p-1.5 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-colors shadow-md"
          >
            {isUploading ? (
              <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            ) : (
              <Camera className="w-3.5 h-3.5" />
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            className="hidden"
          />
        </div>

        <p className="text-sm text-gray-400 mb-6">{user?.email}</p>

        {/* Name input */}
        <div className="w-full space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tên hiển thị</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {success && <p className="text-green-600 text-sm">{success}</p>}
          {error && <p className="text-red-500 text-sm">{error}</p>}

          <Button
            onClick={handleSaveName}
            isLoading={isSaving}
            className="w-full justify-center"
          >
            <Save className="w-4 h-4" />
            Lưu thay đổi
          </Button>

          <Button
            variant="danger"
            onClick={handleLogout}
            className="w-full justify-center"
          >
            Đăng xuất
          </Button>
        </div>
      </div>
    </Modal>
  );
}
