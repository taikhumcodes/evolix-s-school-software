import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { KeyRound, ShieldAlert, LogOut, ArrowRight, Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../lib/api-client';
import { useAuth } from '../../../core/auth/AuthContext';
import { useToast } from '../../../components/ui/Toast';

const forceChangeSchema = z
  .object({
    current_password: z.string().min(1, 'Current password is required'),
    new_password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Must contain at least one lowercase letter')
      .regex(/\d/, 'Must contain at least one number'),
    confirm_password: z.string().min(1, 'Confirm your new password'),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: 'New passwords do not match',
    path: ['confirm_password'],
  });

type ForceChangeFormValues = z.infer<typeof forceChangeSchema>;

export default function ForcePasswordChange() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForceChangeFormValues>({
    resolver: zodResolver(forceChangeSchema),
  });

  const onSubmit = async (values: ForceChangeFormValues) => {
    setServerError(null);
    try {
      await apiClient.patch('/security/password', {
        current_password: values.current_password,
        new_password: values.new_password,
      });

      toast.success('Your new password has been set successfully. Welcome!');
      // Invalidate auth query to update must_change_password to false
      await queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    } catch (err: any) {
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        err.response?.data?.detail ||
        'Failed to update password. Please ensure current temporary password is correct.';
      setServerError(msg);
      toast.error(msg);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 border border-zinc-100 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-6">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
            <KeyRound className="w-6 h-6" />
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
            <ShieldAlert className="w-3.5 h-3.5" />
            First Login Security
          </span>
        </div>

        <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">
          Create Your New Password
        </h1>
        <p className="text-zinc-500 text-sm mt-2 leading-relaxed">
          Hello <span className="font-semibold text-zinc-800">{user?.name || user?.email}</span>.
          You signed in using a temporary password. You must set your own private password before
          accessing the school software.
        </p>

        {serverError && (
          <div className="mt-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium leading-relaxed">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 mb-1.5">
              Current Temporary Password
            </label>
            <input
              type="password"
              {...register('current_password')}
              placeholder="Paste temporary password here"
              className="w-full px-4 py-3 rounded-xl border border-zinc-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 transition-all"
            />
            {errors.current_password && (
              <p className="mt-1.5 text-xs text-rose-600 font-medium">
                {errors.current_password.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 mb-1.5">
              New Password
            </label>
            <input
              type="password"
              {...register('new_password')}
              placeholder="At least 8 chars, uppercase, lowercase, number"
              className="w-full px-4 py-3 rounded-xl border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 transition-all"
            />
            {errors.new_password && (
              <p className="mt-1.5 text-xs text-rose-600 font-medium">
                {errors.new_password.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 mb-1.5">
              Confirm New Password
            </label>
            <input
              type="password"
              {...register('confirm_password')}
              placeholder="Re-enter new password"
              className="w-full px-4 py-3 rounded-xl border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 transition-all"
            />
            {errors.confirm_password && (
              <p className="mt-1.5 text-xs text-rose-600 font-medium">
                {errors.confirm_password.message}
              </p>
            )}
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-zinc-900 text-white font-semibold text-sm hover:bg-zinc-800 active:scale-[0.99] transition-all disabled:opacity-60 disabled:pointer-events-none shadow-lg shadow-zinc-900/10"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Updating Password...
                </>
              ) : (
                <>
                  Save New Password & Continue
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

        <div className="mt-6 pt-6 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-400">
          <span>Need help? Contact school admin</span>
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-1.5 text-zinc-600 hover:text-zinc-900 font-medium transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
