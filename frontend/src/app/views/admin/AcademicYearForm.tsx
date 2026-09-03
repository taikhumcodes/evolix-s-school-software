import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  useAcademicYears,
  useCreateAcademicYear,
  useUpdateAcademicYear,
} from '../../../lib/api/academic-years';
import { useTenant } from '../../../core/tenancy/TenantContext';
import { useAuth } from '../../../core/auth/AuthContext';

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().min(1, 'End date is required'),
  is_current: z.boolean().default(false),
  is_closed: z.boolean().default(false),
});

type FormValues = z.infer<typeof formSchema>;

export default function AcademicYearForm() {
  const { t } = useTranslation('common');
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = !!id;

  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const currentSchoolId = currentTenant?.schoolId || user?.school_id || '';

  const { data: years } = useAcademicYears(currentSchoolId);
  const createYear = useCreateAcademicYear();
  const updateYear = useUpdateAcademicYear();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      name: '',
      start_date: '',
      end_date: '',
      is_current: false,
      is_closed: false,
    },
  });

  useEffect(() => {
    if (isEditing && years) {
      const year = years.find((y) => y.id === id);
      if (year) {
        reset({
          name: year.name,
          start_date: year.start_date,
          end_date: year.end_date,
          is_current: year.is_current,
          is_closed: year.is_closed,
        });
      }
    }
  }, [isEditing, years, id, reset]);

  const onSubmit = async (data: FormValues) => {
    try {
      if (isEditing) {
        await updateYear.mutateAsync({ id, data });
      } else {
        await createYear.mutateAsync({ ...data, school_id: currentSchoolId });
      }
      navigate('/admin/academic-years');
    } catch (error) {
      console.error('Failed to save academic year', error);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">
        {isEditing ? 'Edit Academic Year' : t('admin.academicYears.new')}
      </h1>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-lg shadow p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('admin.academicYears.name')}
          </label>
          <input
            {...register('name')}
            placeholder="e.g. 2026-2027"
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('admin.academicYears.startDate')}
            </label>
            <input
              type="date"
              {...register('start_date')}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.start_date && (
              <p className="text-red-500 text-sm mt-1">{errors.start_date.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('admin.academicYears.endDate')}
            </label>
            <input
              type="date"
              {...register('end_date')}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.end_date && (
              <p className="text-red-500 text-sm mt-1">{errors.end_date.message}</p>
            )}
          </div>
        </div>

        <div className="flex space-x-6">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              {...register('is_current')}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">
              {t('admin.academicYears.isCurrent')}
            </span>
          </label>

          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              {...register('is_closed')}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">Closed</span>
          </label>
        </div>

        <div className="flex justify-end space-x-4 pt-4 border-t">
          <button
            type="button"
            onClick={() => navigate('/admin/academic-years')}
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
