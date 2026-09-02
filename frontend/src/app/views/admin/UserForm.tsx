import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateUser, useUpdateUser, useUser } from '../../../lib/api/users';
import { useRoles } from '../../../lib/api/roles';

const userSchema = z.object({
  email: z.string().email(),
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().optional(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .optional()
    .or(z.literal('')),
  is_active: z.boolean().default(true),
  role_ids: z.array(z.string()).default([]),
});

type UserFormValues = z.infer<typeof userSchema>;

export default function UserForm() {
  const { t } = useTranslation('common');
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = !!id;

  const { data: user, isLoading: isLoadingUser } = useUser(id || '');
  const { data: roles } = useRoles();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UserFormValues>({
    resolver: zodResolver(userSchema) as any,
    defaultValues: {
      email: '',
      first_name: '',
      last_name: '',
      password: '',
      is_active: true,
      role_ids: [],
    },
  });

  useEffect(() => {
    if (isEditing && user) {
      reset({
        email: user.email,
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        is_active: user.is_active,
        role_ids: user.roles?.map((r) => r.id) || [],
        password: '', // Don't populate password
      });
    }
  }, [isEditing, user, reset]);

  const onSubmit = async (data: UserFormValues) => {
    try {
      if (isEditing) {
        // If password is empty string, remove it so we don't update it
        const updateData = { ...data };
        if (!updateData.password) {
          delete updateData.password;
        }
        await updateUser.mutateAsync({ id, data: updateData });
      } else {
        await createUser.mutateAsync(data);
      }
      navigate('/admin/users');
    } catch (error) {
      console.error('Failed to save user', error);
      // Could add toast notification here
    }
  };

  if (isEditing && isLoadingUser) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">{isEditing ? 'Edit User' : t('admin.users.new')}</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-lg shadow p-6 space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('admin.users.firstName')}
            </label>
            <input
              {...register('first_name')}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.first_name && (
              <p className="text-red-500 text-sm mt-1">{errors.first_name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('admin.users.lastName')}
            </label>
            <input
              {...register('last_name')}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('admin.users.email')}
          </label>
          <input
            type="email"
            {...register('email')}
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Password {isEditing && '(Leave blank to keep unchanged)'}
          </label>
          <input
            type="password"
            {...register('password')}
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.password && (
            <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Roles</label>
          <div className="space-y-2">
            {roles?.map((role) => (
              <label key={role.id} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  value={role.id}
                  {...register('role_ids')}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span>{role.name}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="is_active"
            {...register('is_active')}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
            {t('admin.users.active')}
          </label>
        </div>

        <div className="flex justify-end space-x-4 pt-4 border-t">
          <button
            type="button"
            onClick={() => navigate('/admin/users')}
            className="px-4 py-2 text-gray-700 hover:text-gray-900"
          >
            {t('common.actions.cancel')}
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {t('common.actions.save')}
          </button>
        </div>
      </form>
    </div>
  );
}
