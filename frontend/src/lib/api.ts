import axios from 'axios';
import { useAuthStore } from '@/store/auth';
import { toast } from 'sonner';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach token to every request
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Biến cờ và hàng đợi để xử lý concurrency refresh token
let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token as string);
    }
  });
  failedQueue = [];
};

// Handle 401 - intercept and refresh token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Handle 429 Too Many Requests
    if (error.response?.status === 429) {
      toast.error('Bạn thao tác quá nhanh. Vui lòng thử lại sau.');
      return Promise.reject(error);
    }

    const originalRequest = error.config;

    // Không can thiệp refresh token cho các route auth (login, register, refresh)
    const isAuthRoute =
      originalRequest?.url?.includes('/auth/login') ||
      originalRequest?.url?.includes('/auth/register') ||
      originalRequest?.url?.includes('/auth/refresh');

    if (isAuthRoute) {
      return Promise.reject(error);
    }

    // Nếu mã lỗi là 401 và chưa retry
    if (error.response?.status === 401 && !originalRequest?._retry) {
      // Nếu đang có 1 request khác đang gọi refresh token rồi
      if (isRefreshing) {
        // Tạm thời đưa request này vào hàng đợi
        return new Promise(function (resolve, reject) {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      // Nếu chưa có ai gọi refresh, request này sẽ đứng ra gọi
      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = useAuthStore.getState().refreshToken;
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        // Gọi API cấp lại access_token VÀ refresh_token mới
        const response = await axios.post(`${API_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        });

        const { access_token, refresh_token } = response.data;

        // Lưu vào Zustand cả 2 token
        useAuthStore.getState().setToken(access_token);
        if (refresh_token) {
          useAuthStore.getState().setRefreshToken(refresh_token);
        }

        // Chạy lại TOÀN BỘ các request đang bị kẹt trong hàng đợi (9 request còn lại)
        processQueue(null, access_token);

        // Chạy lại request đầu tiên
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return api(originalRequest);
      } catch (err) {
        // Nếu refresh thất bại, báo lỗi cho toàn bộ hàng đợi
        processQueue(err, null);
        useAuthStore.getState().logout();
        if (
          typeof window !== 'undefined' &&
          !window.location.pathname.startsWith('/login') &&
          !window.location.pathname.startsWith('/register')
        ) {
          window.location.href = '/login';
        }
        return Promise.reject(err);
      } finally {
        // Xong xuôi thì mở khoá
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
