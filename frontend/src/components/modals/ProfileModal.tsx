'use client';

import { useState, useRef } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import PasswordInput from '@/components/ui/PasswordInput';
import { useAuthStore } from '@/store/auth';
import api from '@/lib/api';
import { Camera, Save } from 'lucide-react';
import { User } from '@/types';
import { toast } from 'sonner';

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

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

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

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      toast.error('Vui lòng nhập đầy đủ thông tin');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Mật khẩu xác nhận không khớp');
      return;
    }
    if (newPassword === oldPassword) {
      toast.error('Mật khẩu mới không được giống mật khẩu cũ');
      return;
    }

    setIsChangingPassword(true);
    try {
      await api.post('/auth/change-password', {
        old_password: oldPassword,
        new_password: newPassword,
      });
      toast.success('Đổi mật khẩu thành công!');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordForm(false);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Đổi mật khẩu thất bại');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleLogout = async () => {
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
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
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

          {!showPasswordForm ? (
            <>
              <Button
                onClick={handleSaveName}
                isLoading={isSaving}
                className="w-full justify-center"
              >
                <Save className="w-4 h-4" />
                Lưu thay đổi
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setShowPasswordForm(true);
                  setOldPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                  setSuccess('');
                }}
                className="w-full justify-center bg-gray-100 hover:bg-gray-200 text-gray-700"
              >
                Đổi mật khẩu
              </Button>
            </>
          ) : (
            <div className="space-y-3 pt-2 border-t border-gray-200 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu cũ</label>
                <PasswordInput
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu mới</label>
                <PasswordInput
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Xác nhận mật khẩu mới</label>
                <PasswordInput
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowPasswordForm(false);
                    setOldPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                    setError('');
                    setSuccess('');
                  }}
                  className="flex-1 justify-center bg-gray-100 hover:bg-gray-200 text-gray-700"
                >
                  Huỷ
                </Button>
                <Button
                  onClick={handleChangePassword}
                  isLoading={isChangingPassword}
                  className="flex-1 justify-center"
                >
                  Xác nhận
                </Button>
              </div>
            </div>
          )}

          <Button
            variant="danger"
            onClick={handleLogout}
            className="w-full justify-center mt-2"
          >
            Đăng xuất
          </Button>
        </div>
      </div>
    </Modal>
  );
}
