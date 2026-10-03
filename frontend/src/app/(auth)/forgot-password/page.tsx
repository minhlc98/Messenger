'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import PasswordInput from '@/components/ui/PasswordInput';
import api from '@/lib/api';
import { toast } from 'sonner';

const emailSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
});

const resetPasswordSchema = z
  .object({
    code: z.string().length(6, 'Mã xác thực phải gồm 6 chữ số'),
    newPassword: z.string().min(6, 'Mật khẩu ít nhất 6 ký tự'),
    confirmPassword: z.string().min(6, 'Xác nhận mật khẩu ít nhất 6 ký tự'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Xác nhận mật khẩu không khớp',
    path: ['confirmPassword'],
  });

type EmailForm = z.infer<typeof emailSchema>;
type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);

  const {
    register: registerEmail,
    handleSubmit: handleEmailSubmit,
    formState: { errors: emailErrors, isSubmitting: isEmailSubmitting },
  } = useForm<EmailForm>({ resolver: zodResolver(emailSchema) });

  const {
    register: registerReset,
    handleSubmit: handleResetSubmit,
    formState: { errors: resetErrors, isSubmitting: isResetSubmitting },
  } = useForm<ResetPasswordForm>({ resolver: zodResolver(resetPasswordSchema) });

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const onEmailSubmit = async (data: EmailForm) => {
    try {
      setError('');
      await api.post('/auth/forgot-password', data);
      setEmail(data.email);
      setStep(2);
      setCountdown(300); // 5 phút
      toast.success('Mã xác thực đã được gửi đến email của bạn');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Có lỗi xảy ra');
    }
  };

  const onResend = async () => {
    if (countdown > 0) return;
    try {
      setError('');
      await api.post('/auth/forgot-password', { email });
      setCountdown(300);
      toast.success('Đã gửi lại mã xác thực');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Gửi lại mã thất bại');
    }
  };

  const onResetSubmit = async (data: ResetPasswordForm) => {
    try {
      setError('');
      await api.post('/auth/reset-password', {
        email: email,
        code: data.code,
        new_password: data.newPassword,
      });
      toast.success('Đổi mật khẩu thành công!');
      router.push('/login');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Đổi mật khẩu thất bại');
    }
  };

  return (
    <>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        {step === 1 ? 'Quên mật khẩu' : 'Đổi mật khẩu mới'}
      </h2>
      <p className="text-sm text-gray-600 mb-6">
        {step === 1
          ? 'Nhập email đã đăng ký của bạn để nhận mã xác thực đổi mật khẩu.'
          : `Mã xác thực 6 số đã được gửi tới email ${email}.`}
      </p>

      {step === 1 ? (
        <form onSubmit={handleEmailSubmit(onEmailSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              {...registerEmail('email')}
              type="email"
              placeholder="you@example.com"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
            />
            {emailErrors.email && (
              <p className="text-red-500 text-xs mt-1">{emailErrors.email.message}</p>
            )}
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isEmailSubmitting}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium py-2.5 px-4 rounded-lg transition-colors"
          >
            {isEmailSubmitting ? 'Đang gửi...' : 'Nhận mã xác thực'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleResetSubmit(onResetSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mã xác thực (OTP)</label>
            <input
              {...registerReset('code')}
              type="text"
              maxLength={6}
              placeholder="123456"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm tracking-widest text-center text-lg font-bold"
            />
            {resetErrors.code && (
              <p className="text-red-500 text-xs mt-1 text-center">{resetErrors.code.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu mới</label>
            <PasswordInput
              {...registerReset('newPassword')}
              placeholder="••••••••"
            />
            {resetErrors.newPassword && (
              <p className="text-red-500 text-xs mt-1">{resetErrors.newPassword.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Xác nhận mật khẩu mới</label>
            <PasswordInput
              {...registerReset('confirmPassword')}
              placeholder="••••••••"
            />
            {resetErrors.confirmPassword && (
              <p className="text-red-500 text-xs mt-1">{resetErrors.confirmPassword.message}</p>
            )}
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isResetSubmitting}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium py-2.5 px-4 rounded-lg transition-colors"
          >
            {isResetSubmitting ? 'Đang cập nhật...' : 'Đổi mật khẩu'}
          </button>
          
          <div className="mt-4 text-center text-sm">
            <button
              onClick={onResend}
              disabled={countdown > 0}
              type="button"
              className={`font-medium transition-colors ${countdown > 0 ? 'text-gray-400 cursor-not-allowed' : 'text-indigo-600 hover:text-indigo-700'}`}
            >
              {countdown > 0 ? `Gửi lại mã sau ${countdown}s` : 'Gửi lại mã xác thực'}
            </button>
          </div>
        </form>
      )}

      <div className="mt-6 text-center">
        <Link
          href="/login"
          className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
        >
          Quay lại đăng nhập
        </Link>
      </div>
    </>
  );
}
