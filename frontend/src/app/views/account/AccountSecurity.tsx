import { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Key,
  Lock,
  Laptop,
  Trash2,
  ShieldAlert,
  CheckCircle2,
  Copy,
  RefreshCw,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslation } from 'react-i18next';
import apiClient from '../../../lib/api-client';
import { useAuth } from '../../../core/auth/AuthContext';

export default function AccountSecurity() {
  const [activeTab, setActiveTab] = useState<'password' | '2fa' | 'sessions'>('password');

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900 flex items-center gap-2">
          <ShieldCheck className="w-7 h-7 text-mehndi-600" />
          Account Security
        </h1>
        <p className="text-zinc-500 text-sm mt-1">
          Manage your password, two-factor authentication, and active sessions.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        <div className="w-full md:w-64 shrink-0">
          <nav className="flex flex-row md:flex-col gap-2 overflow-x-auto pb-2 md:pb-0">
            <button
              onClick={() => setActiveTab('password')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                activeTab === 'password'
                  ? 'bg-zinc-900 text-white shadow-md'
                  : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              <Key className="w-4 h-4" />
              Password
            </button>
            <button
              onClick={() => setActiveTab('2fa')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                activeTab === '2fa'
                  ? 'bg-zinc-900 text-white shadow-md'
                  : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              <Lock className="w-4 h-4" />
              Two-Factor Auth
            </button>
            <button
              onClick={() => setActiveTab('sessions')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                activeTab === 'sessions'
                  ? 'bg-zinc-900 text-white shadow-md'
                  : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              <Laptop className="w-4 h-4" />
              Active Sessions
            </button>
          </nav>
        </div>

        <div className="flex-1">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6 md:p-8 min-h-[400px]">
            {activeTab === 'password' && <ChangePasswordForm />}
            {activeTab === '2fa' && <TwoFactorSetup />}
            {activeTab === 'sessions' && <SessionList />}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Components ---

const passwordSchema = z
  .object({
    current_password: z.string().min(1, 'Current password is required'),
    new_password: z.string().min(8, 'Must be at least 8 characters'),
    confirm_password: z.string(),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "Passwords don't match",
    path: ['confirm_password'],
  });

function ChangePasswordForm() {
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm({
    resolver: zodResolver(passwordSchema),
  });

  const onSubmit = async (data: any) => {
    try {
      setStatus(null);
      await apiClient.patch('/security/password', data);
      setStatus({ type: 'success', message: 'Password updated successfully.' });
      reset();
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.response?.data?.detail;
      setStatus({
        type: 'error',
        message: msg || 'Failed to update password.',
      });
    }
  };

  return (
    <div className="max-w-md">
      <h2 className="text-lg font-bold text-zinc-900 mb-6">Change Password</h2>

      {status && (
        <div
          className={`mb-6 p-4 rounded-xl text-sm font-medium ${status.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}
        >
          {status.message}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label className="block text-xs font-bold text-zinc-700 mb-1.5">Current Password</label>
          <input
            {...register('current_password')}
            type="password"
            className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-mehndi-500/20 focus:border-mehndi-500"
          />
          {errors.current_password && (
            <p className="mt-1 text-xs text-red-600">{errors.current_password.message as string}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-bold text-zinc-700 mb-1.5">New Password</label>
          <input
            {...register('new_password')}
            type="password"
            className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-mehndi-500/20 focus:border-mehndi-500"
          />
          {errors.new_password && (
            <p className="mt-1 text-xs text-red-600">{errors.new_password.message as string}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-bold text-zinc-700 mb-1.5">
            Confirm New Password
          </label>
          <input
            {...register('confirm_password')}
            type="password"
            className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-mehndi-500/20 focus:border-mehndi-500"
          />
          {errors.confirm_password && (
            <p className="mt-1 text-xs text-red-600">{errors.confirm_password.message as string}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="px-5 py-2.5 bg-zinc-900 text-white rounded-lg text-sm font-bold hover:bg-zinc-800 disabled:opacity-50 transition-colors"
        >
          {isSubmitting ? 'Updating...' : 'Update Password'}
        </button>
      </form>
    </div>
  );
}

function TwoFactorSetup() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [step, setStep] = useState<number>(0);
  const [setupData, setSetupData] = useState<{
    secret: string;
    uri: string;
    recovery_codes: string[];
  } | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isEnabled, setIsEnabled] = useState(Boolean(user?.is_2fa_enabled));
  const [copied, setCopied] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regeneratedCodes, setRegeneratedCodes] = useState<string[] | null>(null);

  useEffect(() => {
    if (user?.is_2fa_enabled !== undefined) {
      setIsEnabled(Boolean(user.is_2fa_enabled));
    }
  }, [user?.is_2fa_enabled]);

  const beginSetup = async () => {
    try {
      setError('');
      const res = await apiClient.post('/security/2fa/setup');
      setSetupData(res.data);
      setStep(1);
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.response?.data?.detail;
      if (msg === '2FA is already enabled') {
        setIsEnabled(true);
      } else {
        setError(msg || 'Failed to initiate 2FA setup');
      }
    }
  };

  const verifySetup = async () => {
    try {
      setError('');
      await apiClient.post('/security/2fa/verify', { code });
      setIsEnabled(true);
      setStep(2); // Show newly generated recovery codes after verification
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.response?.data?.detail;
      setError(msg || 'Invalid code');
    }
  };

  const handleRegenerateCodes = async () => {
    try {
      setError('');
      setIsRegenerating(true);
      const res = await apiClient.post('/security/2fa/recovery-codes');
      setRegeneratedCodes(res.data.recovery_codes);
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.response?.data?.detail;
      setError(msg || 'Failed to regenerate recovery codes');
    } finally {
      setIsRegenerating(false);
    }
  };

  const disable2FA = async () => {
    try {
      setError('');
      await apiClient.delete('/security/2fa');
      setIsEnabled(false);
      setStep(0);
      setRegeneratedCodes(null);
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.response?.data?.detail;
      setError(msg || 'Failed to disable 2FA');
    }
  };

  // Step 2: Show recovery codes once after successful verification
  if (step === 2) {
    return (
      <div>
        <h2 className="text-lg font-bold text-zinc-900 mb-2">{t('auth.twoFactor.saveCodesTitle')}</h2>
        <div className="p-6 bg-amber-50 border border-amber-200 rounded-2xl mb-6">
          <h3 className="text-sm font-bold text-amber-900 mb-2 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-600" /> {t('auth.twoFactor.saveCodesTitle')}
          </h3>
          <p className="text-xs text-amber-800 mb-4 font-medium leading-relaxed">
            {t('auth.twoFactor.saveCodesWarning')}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 font-mono text-sm text-zinc-800 bg-white p-4 rounded-xl border border-amber-200 shadow-xs mb-4">
            {setupData?.recovery_codes?.map((rc, i) => (
              <div
                key={i}
                className="p-2.5 bg-zinc-50 rounded-lg text-center font-bold tracking-wider select-all border border-zinc-100"
              >
                {rc}
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                if (setupData?.recovery_codes) {
                  navigator.clipboard.writeText(setupData.recovery_codes.join('\n'));
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }
              }}
              className="px-4 py-2 bg-white text-zinc-700 border border-zinc-300 rounded-lg text-xs font-semibold hover:bg-zinc-50 flex items-center gap-1.5 transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              {copied ? t('auth.twoFactor.copied') : t('auth.twoFactor.copyAll')}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep(0);
                setSetupData(null);
              }}
              className="px-5 py-2 bg-zinc-900 text-white rounded-lg text-xs font-bold hover:bg-zinc-800 transition-colors"
            >
              {t('auth.twoFactor.codesSavedButton')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isEnabled) {
    return (
      <div>
        <h2 className="text-lg font-bold text-zinc-900 mb-6">{t('auth.twoFactor.title')}</h2>
        <div className="flex items-start gap-4 p-5 bg-emerald-50 border border-emerald-200 rounded-xl mb-6">
          <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-emerald-900">2FA is Enabled</h3>
            <p className="text-sm text-emerald-700 mt-1">
              Your account is protected by an additional layer of security.
            </p>
            <div className="flex flex-wrap gap-3 mt-4">
              <button
                onClick={handleRegenerateCodes}
                disabled={isRegenerating}
                className="px-4 py-2 bg-white text-zinc-700 border border-zinc-200 rounded-lg text-sm font-semibold hover:bg-zinc-50 transition-colors flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${isRegenerating ? 'animate-spin' : ''}`} />
                {isRegenerating ? t('auth.twoFactor.regenerating') : t('auth.twoFactor.regenerateCodes')}
              </button>
              <button
                onClick={disable2FA}
                className="px-4 py-2 bg-white text-red-600 border border-red-200 rounded-lg text-sm font-semibold hover:bg-red-50 transition-colors"
              >
                Disable 2FA
              </button>
            </div>
          </div>
        </div>

        {error && <div className="mb-4 text-sm text-red-600">{error}</div>}

        {regeneratedCodes && (
          <div className="p-6 bg-amber-50 border border-amber-200 rounded-2xl">
            <h3 className="text-sm font-bold text-amber-900 mb-2 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-600" /> {t('auth.twoFactor.saveCodesTitle')}
            </h3>
            <p className="text-xs text-amber-800 mb-4 font-medium leading-relaxed">
              {t('auth.twoFactor.saveCodesWarning')}
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 font-mono text-sm text-zinc-800 bg-white p-4 rounded-xl border border-amber-200 shadow-xs mb-4">
              {regeneratedCodes.map((rc, i) => (
                <div
                  key={i}
                  className="p-2.5 bg-zinc-50 rounded-lg text-center font-bold tracking-wider select-all border border-zinc-100"
                >
                  {rc}
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(regeneratedCodes.join('\n'));
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="px-4 py-2 bg-white text-zinc-700 border border-zinc-300 rounded-lg text-xs font-semibold hover:bg-zinc-50 flex items-center gap-1.5 transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                {copied ? t('auth.twoFactor.copied') : t('auth.twoFactor.copyAll')}
              </button>
              <button
                type="button"
                onClick={() => setRegeneratedCodes(null)}
                className="px-5 py-2 bg-zinc-900 text-white rounded-lg text-xs font-bold hover:bg-zinc-800 transition-colors"
              >
                {t('auth.twoFactor.codesSavedButton')}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (step === 0) {
    return (
      <div>
        <h2 className="text-lg font-bold text-zinc-900 mb-2">{t('auth.twoFactor.title')}</h2>
        <p className="text-zinc-500 text-sm mb-6 max-w-lg">
          Add an extra layer of security to your account. Once enabled, you'll be required to enter
          a code generated by your authenticator app (like Google Authenticator or Authy) when you
          sign in.
        </p>

        {error && <div className="mb-4 text-sm text-red-600">{error}</div>}

        <button
          onClick={beginSetup}
          className="px-5 py-2.5 bg-mehndi-600 text-white rounded-lg text-sm font-bold hover:bg-mehndi-700 transition-colors"
        >
          Set up 2FA
        </button>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-bold text-zinc-900 mb-6">Configure Authenticator App</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        <div className="p-6 bg-zinc-50 border border-zinc-200 rounded-2xl flex flex-col items-center text-center">
          <div className="p-4 bg-white border border-zinc-200 rounded-xl shadow-sm inline-block mb-4">
            {setupData && <QRCodeSVG value={setupData.uri} size={160} />}
          </div>
          <p className="text-xs text-zinc-500 mb-2">
            Scan this QR code with Google Authenticator or Authy
          </p>
          <div className="w-full flex items-center justify-between p-2.5 bg-white border border-zinc-200 rounded-lg font-mono text-xs text-zinc-800">
            <span className="tracking-widest select-all">{setupData?.secret}</span>
            <button
              type="button"
              onClick={() => {
                if (setupData?.secret) navigator.clipboard.writeText(setupData.secret);
              }}
              className="p-1 text-zinc-400 hover:text-zinc-700 rounded"
              title="Copy secret"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 mb-1">Verify Authenticator Code</h3>
            <p className="text-xs text-zinc-500 mb-3">
              Enter the 6-digit verification code shown in your authenticator app.
            </p>
            <input
              type="text"
              placeholder="000000"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full px-4 py-2.5 text-center tracking-[0.5em] font-mono text-lg border border-zinc-300 rounded-lg focus:outline-none focus:border-mehndi-500 focus:ring-1 focus:ring-mehndi-500"
            />
            {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
          </div>

          <div className="flex gap-3">
            <button
              onClick={verifySetup}
              disabled={code.length !== 6}
              className="flex-1 py-2.5 bg-zinc-900 text-white rounded-lg text-sm font-bold hover:bg-zinc-800 disabled:opacity-50 transition-colors"
            >
              Verify & Enable
            </button>
            <button
              onClick={() => setStep(0)}
              className="px-4 py-2.5 bg-white text-zinc-600 border border-zinc-200 rounded-lg text-sm font-semibold hover:bg-zinc-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SessionList() {
  const [sessions, setSessions] = useState<any[]>([]);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const res = await apiClient.get('/security/sessions');
      setSessions(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const revokeSession = async (id: string) => {
    try {
      await apiClient.delete(`/security/sessions/${id}`);
      loadSessions();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div>
      <h2 className="text-lg font-bold text-zinc-900 mb-2">Active Sessions</h2>
      <p className="text-zinc-500 text-sm mb-6">
        These devices are currently signed in to your account. Revoke any sessions that you don't
        recognize.
      </p>

      <div className="space-y-3">
        {sessions.map((s) => (
          <div
            key={s.id}
            className="flex items-center justify-between p-4 bg-zinc-50/50 border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-white border border-zinc-200 rounded-lg flex items-center justify-center text-zinc-400">
                <Laptop className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-zinc-900">
                    {s.ip_address || 'Unknown IP'}
                  </h3>
                  {/* We'd normally parse user_agent here, skipping for brevity */}
                </div>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Last active: {new Date(s.last_activity_at).toLocaleString()}
                </p>
                <p
                  className="text-[10px] text-zinc-400 mt-0.5 max-w-sm truncate"
                  title={s.user_agent}
                >
                  {s.user_agent}
                </p>
              </div>
            </div>

            <button
              onClick={() => revokeSession(s.id)}
              className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Revoke Session"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        {sessions.length === 0 && (
          <div className="p-8 text-center text-zinc-500 text-sm border border-dashed border-zinc-300 rounded-xl">
            No active sessions found.
          </div>
        )}
      </div>
    </div>
  );
}
