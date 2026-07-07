import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuthStore } from '../store/auth.store';
import { api, setAccessToken, ApiClientError } from '../lib/api-client';
import type { User, LoginInput, RegisterInput } from '@rootlink/shared';

export function useAuth() {
  const router  = useRouter();
  const store   = useAuthStore();

  const loginMutation = useMutation({
    mutationFn: (data: LoginInput) =>
      api.post<{ accessToken: string; expiresIn: string }>(
        '/v1/auth/login', data, { skipAuth: true },
      ),
    onSuccess: async (tokens) => {
      setAccessToken(tokens.accessToken);
      const user = await api.get<User>('/v1/users/me');
      store.setAuth(user, tokens.accessToken);
      router.replace('/dashboard');
    },
  });

  const registerMutation = useMutation({
    mutationFn: (data: RegisterInput) =>
      api.post('/v1/auth/register', data, { skipAuth: true }),
    onSuccess: () => {
      toast.success('Account created. Please verify your email.');
      router.push('/login');
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => api.post('/v1/auth/logout', {}),
    onSettled: () => {
      store.clearAuth();
      router.replace('/login');
    },
  });

  return {
    user:            store.user,
    isAuthenticated: store.isAuthenticated,
    isLoading:       store.isLoading,
    login:           loginMutation.mutate,
    register:        registerMutation.mutate,
    logout:          () => logoutMutation.mutate(),
    loginPending:    loginMutation.isPending,
    registerPending: registerMutation.isPending,
    loginError:      loginMutation.error instanceof ApiClientError ? loginMutation.error : null,
  };
}
