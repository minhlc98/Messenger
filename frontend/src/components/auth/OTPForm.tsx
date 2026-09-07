'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import api from '@/lib/api';
import { AuthResponse } from '@/types';
import { toast } from 'sonner';

interface OTPFormProps {
  email: string;
  onBack?: () => void;
}

export default function OTPForm({ email, onBack }: OTPFormProps) {
  const [otp, setOtp] = useState<string[]>(Array(6).fill(''));
  const [activeOTPIndex, setActiveOTPIndex] = useState<number>(0);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(120);

  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { setAuth } = useAuthStore();

  useEffect(() => {
    inputRef.current?.focus();
  }, [activeOTPIndex]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleOnChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const { value } = e.target;
    const newOTP = [...otp];
    // only allow 1 char and numeric
    if (!value || /^[0-9]$/.test(value)) {
      newOTP[index] = value.substring(value.length - 1);
      setOtp(newOTP);

      if (value && index < 5) {
        setActiveOTPIndex(index + 1);
      }
    }
  };

  const handleOnKeyDown = (e: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const newOTP = [...otp];
      if (otp[index]) {
        newOTP[index] = '';
        setOtp(newOTP);
      } else if (index > 0) {
        newOTP[index - 1] = '';
        setOtp(newOTP);
        setActiveOTPIndex(index - 1);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      setActiveOTPIndex(index - 1);
    } else if (e.key === 'ArrowRight' && index < 5) {
      setActiveOTPIndex(index + 1);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').slice(0, 6).split('');
    if (pasteData.every(char => /^[0-9]$/.test(char))) {
      const newOTP = [...otp];
      pasteData.forEach((char, index) => {
        newOTP[index] = char;
      });
      setOtp(newOTP);
      setActiveOTPIndex(Math.min(pasteData.length, 5));
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length < 6) {
      setError('Vui lòng nhập đủ 6 số');
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      const res = await api.post<AuthResponse>('/auth/verify-otp', {
        email,
        code,
      });

      if (res.data.user && res.data.access_token && res.data.refresh_token) {
        setAuth(res.data.user, res.data.access_token, res.data.refresh_token);
        toast.success('Xác thực thành công!');
        router.push('/chat');
      } else {
        setError('Lỗi máy chủ: Thiếu token');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Xác thực thất bại');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    try {
      setIsLoading(true);
      setError('');
      await api.post('/auth/resend-registration-otp', { email });
      setCountdown(120);
      setOtp(Array(6).fill(''));
      setActiveOTPIndex(0);
      toast.success('Đã gửi lại mã xác thực');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Gửi lại mã thất bại');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      {onBack && (
        <button
          onClick={onBack}
          type="button"
          className="text-sm text-indigo-600 hover:text-indigo-700 mb-6 flex items-center gap-1 font-medium transition-colors"
        >
          &larr; Quay lại
        </button>
      )}

      <h2 className="text-2xl font-bold text-gray-900 mb-2">Xác thực Email</h2>
      <p className="text-sm text-gray-600 mb-6">
        Chúng tôi đã gửi mã xác thực 6 số đến email <span className="font-semibold text-gray-900">{email}</span>. Mã sẽ hết hạn sau 2 phút.
      </p>

      <form onSubmit={onSubmit} className="space-y-6">
        <div className="flex justify-between gap-2">
          {otp.map((_, index) => (
            <input
              key={index}
              ref={index === activeOTPIndex ? inputRef : null}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              className="w-12 h-14 border border-gray-300 rounded-lg text-center text-xl font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              value={otp[index]}
              onChange={(e) => handleOnChange(e, index)}
              onKeyDown={(e) => handleOnKeyDown(e, index)}
              onPaste={handlePaste}
              onClick={() => setActiveOTPIndex(index)}
              disabled={isLoading}
            />
          ))}
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || otp.join('').length < 6}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium py-2.5 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          {isLoading ? 'Đang xác thực...' : 'Xác nhận'}
        </button>
      </form>

      <div className="mt-6 text-center text-sm">
        <span className="text-gray-600">Chưa nhận được mã? </span>
        <button
          onClick={handleResend}
          disabled={countdown > 0 || isLoading}
          type="button"
          className={`font-medium transition-colors ${countdown > 0 ? 'text-gray-400 cursor-not-allowed' : 'text-indigo-600 hover:text-indigo-700'}`}
        >
          {countdown > 0 ? `Gửi lại sau ${countdown}s` : 'Gửi lại mã'}
        </button>
      </div>
    </div>
  );
}
