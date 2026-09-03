import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import apiClient from '../../lib/api-client';
import { ShieldAlert } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const totpSchema = z.object({
  totp_code: z.string().min(6).max(16),
});

type LoginForm = z.infer<typeof loginSchema>;
type TotpForm = z.infer<typeof totpSchema>;

export default function Login() {
  const { t, i18n } = useTranslation();
  const [error, setError] = useState('');
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);

  const {
    register: registerLogin,
    handleSubmit: handleLoginSubmit,
    formState: { isSubmitting: isLoginSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const {
    register: registerTotp,
    handleSubmit: handleTotpSubmit,
    formState: { isSubmitting: isTotpSubmitting },
    reset: resetTotp,
  } = useForm<TotpForm>({
    resolver: zodResolver(totpSchema),
  });

  const onLoginSubmit = async (data: LoginForm) => {
    try {
      setError('');
      const response = await apiClient.post('/auth/login', data);

      if (response.data.token_type === '2fa_challenge') {
        setChallengeToken(response.data.challenge_token);
        setUseRecoveryCode(false);
        return;
      }

      localStorage.setItem('access_token', response.data.access_token);
      localStorage.setItem('refresh_token', response.data.refresh_token);
      window.location.href = '/dashboard';
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.response?.data?.detail;
      setError(msg || t('auth.login.error'));
    }
  };

  const onTotpSubmit = async (data: TotpForm) => {
    try {
      setError('');

      let response;
      if (useRecoveryCode) {
        response = await apiClient.post('/auth/recovery-login', {
          challenge_token: challengeToken,
          recovery_code: data.totp_code.trim(),
        });
      } else {
        response = await apiClient.post('/auth/verify-2fa', {
          challenge_token: challengeToken,
          totp_code: data.totp_code.trim(),
        });
      }

      localStorage.setItem('access_token', response.data.access_token);
      localStorage.setItem('refresh_token', response.data.refresh_token);
      window.location.href = '/dashboard';
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.response?.data?.detail;
      setError(
        msg ||
          (useRecoveryCode
            ? t('auth.twoFactor.invalidRecoveryCode')
            : t('auth.twoFactor.invalidCode'))
      );
    }
  };

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'en' ? 'hi' : 'en');
  };

  return (
    <div className="flex h-screen items-center justify-center bg-zinc-50 relative p-4">
      <button
        onClick={toggleLanguage}
        className="absolute top-4 right-4 text-xs font-semibold px-3 py-1 bg-white border border-zinc-200 rounded-md hover:bg-zinc-100"
      >
        {i18n.language === 'en' ? 'हिंदी' : 'English'}
      </button>

      <div className="w-full max-w-[400px] mx-auto p-6 sm:p-8 bg-white/80 glass-panel border border-zinc-200 rounded-2xl shadow-sm">
        <h1 className="text-xl font-bold text-center mb-6 text-zinc-900">
          {t('auth.login.title')}
        </h1>

        {error && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-100">
            {error}
          </div>
        )}

        {!challengeToken ? (
          <form onSubmit={handleLoginSubmit(onLoginSubmit)} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-zinc-600 mb-1">
                {t('auth.login.email')}
              </label>
              <input
                {...registerLogin('email')}
                type="email"
                className="w-full px-3 py-2 border border-zinc-300 rounded-md text-sm focus:outline-none focus:border-zinc-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-600 mb-1">
                {t('auth.login.password')}
              </label>
              <input
                {...registerLogin('password')}
                type="password"
                className="w-full px-3 py-2 border border-zinc-300 rounded-md text-sm focus:outline-none focus:border-zinc-500"
              />
            </div>
            <button
              type="submit"
              disabled={isLoginSubmitting}
              className="w-full py-2 bg-zinc-900 text-white rounded-md text-sm font-bold hover:bg-zinc-800 disabled:opacity-50"
            >
              {isLoginSubmitting ? '...' : t('auth.login.submit')}
            </button>
          </form>
        ) : (
          <form onSubmit={handleTotpSubmit(onTotpSubmit)} className="space-y-4">
            <div className="flex flex-col items-center justify-center mb-4 text-center">
              <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-3">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-zinc-900">{t('auth.twoFactor.title')}</h2>
              <p className="text-xs text-zinc-500 mt-1">
                {useRecoveryCode
                  ? t('auth.twoFactor.recoverySubtitle')
                  : t('auth.twoFactor.totpSubtitle')}
              </p>
            </div>

            <div>
              <input
                {...registerTotp('totp_code')}
                type="text"
                maxLength={useRecoveryCode ? 19 : 6}
                placeholder={useRecoveryCode ? 'ABCD-EFGH' : '000000'}
                className={`w-full px-4 py-3 text-center tracking-[0.5em] font-mono text-xl border border-zinc-300 rounded-lg focus:outline-none focus:border-mehndi-500 focus:ring-1 focus:ring-mehndi-500 ${useRecoveryCode ? 'tracking-[0.2em]' : ''}`}
                autoComplete="one-time-code"
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={isTotpSubmitting}
              className="w-full py-2 bg-mehndi-600 text-white rounded-lg text-sm font-bold hover:bg-mehndi-700 disabled:opacity-50 transition-colors"
            >
              {isTotpSubmitting ? t('auth.twoFactor.verifying') : t('auth.twoFactor.verifyCode')}
            </button>
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={() => {
                  setUseRecoveryCode(!useRecoveryCode);
                  setError('');
                  resetTotp();
                }}
                className="flex-1 py-2 bg-white text-zinc-600 border border-zinc-200 rounded-lg text-xs font-semibold hover:bg-zinc-50 transition-colors"
              >
                {useRecoveryCode
                  ? t('auth.twoFactor.useAuthenticator')
                  : t('auth.twoFactor.useRecoveryCode')}
              </button>
              <button
                type="button"
                onClick={() => setChallengeToken(null)}
                className="flex-1 py-2 bg-white text-zinc-600 border border-zinc-200 rounded-lg text-xs font-semibold hover:bg-zinc-50 transition-colors"
              >
                {t('common.actions.cancel')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
