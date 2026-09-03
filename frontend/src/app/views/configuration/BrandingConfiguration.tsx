import { ChangeEvent, useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ImagePlus,
  Loader2,
  RefreshCw,
  Save,
  Trash2,
  Upload,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTenant } from '../../../core/tenancy/TenantContext';
import {
  getBrandingAssetUrl,
  useBranding,
  useDeleteBrandingAsset,
  useUpdateConfiguration,
  useUploadBranding,
} from '../../../lib/api/configuration';

const MAX_SIZE = 5 * 1024 * 1024;
const acceptedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/x-icon'];

export default function BrandingConfiguration() {
  const { t } = useTranslation();
  const { currentTenant } = useTenant();
  const schoolId = currentTenant?.schoolId;
  const branding = useBranding(schoolId);
  const upload = useUploadBranding(schoolId);
  const deleteAsset = useDeleteBrandingAsset(schoolId);
  const update = useUpdateConfiguration('branding', schoolId);
  const [values, setValues] = useState<Record<string, string | number | boolean | null>>({});
  const [preview, setPreview] = useState<string>();
  const [fileError, setFileError] = useState('');
  const [assetType, setAssetType] = useState<'logo' | 'compact_logo' | 'favicon'>('logo');

  useEffect(() => {
    if (branding.data) setValues(branding.data.values);
  }, [branding.data]);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const hasAsset =
    assetType === 'logo'
      ? Boolean(values.logo_file_id || values.logo_storage_key)
      : assetType === 'compact_logo'
        ? Boolean(values.compact_logo_file_id)
        : Boolean(values.favicon_file_id);

  const chooseFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileError('');
    if (file.size > MAX_SIZE) {
      setFileError(t('admin.configuration.branding.tooLarge'));
      event.target.value = '';
      return;
    }
    if (!acceptedTypes.includes(file.type)) {
      setFileError(t('admin.configuration.branding.invalidFile'));
      event.target.value = '';
      return;
    }
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);
    try {
      const data = await upload.mutateAsync({ file, assetType });
      setValues(data.values);
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.response?.data?.detail;
      setFileError(msg || t('admin.configuration.branding.uploadError'));
      setPreview(undefined);
    } finally {
      event.target.value = '';
    }
  };

  const removeCurrentAsset = async () => {
    try {
      setFileError('');
      const data = await deleteAsset.mutateAsync(assetType);
      setValues(data.values);
      setPreview(undefined);
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.response?.data?.detail;
      setFileError(msg || t('admin.configuration.branding.uploadError'));
    }
  };

  const save = async () => {
    if (!branding.data) return;
    const currentVersion = Number(values.version || branding.data.version);
    await update.mutateAsync({ version: currentVersion, values });
  };

  const imageSource =
    preview ||
    (hasAsset && schoolId
      ? getBrandingAssetUrl(assetType, schoolId, Number(values.version || branding.data?.version || 1))
      : undefined);

  if (!schoolId || branding.isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="flex items-center gap-3 text-zinc-500 text-sm">
          <Loader2 className="w-5 h-5 animate-spin text-mehndi-600" />
          <span>{t('admin.configuration.loading')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">
          {t('admin.configuration.sections.branding')}
        </h1>
        <p className="text-sm text-zinc-500 mt-1">{t('admin.configuration.branding.subtitle')}</p>
      </div>
      <div className="glass-panel p-5 md:p-7 bg-white/70 border border-zinc-200 space-y-6">
        <div className="flex flex-col sm:flex-row gap-5 items-start">
          <div className="w-32 h-32 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 flex items-center justify-center overflow-hidden shrink-0">
            {imageSource ? (
              <img
                src={imageSource}
                alt={t('admin.configuration.branding.logoPreview')}
                className="max-w-full max-h-full object-contain p-1"
                onError={() => {
                  // Fallback if asset file cannot be loaded
                  if (!preview) setPreview(undefined);
                }}
              />
            ) : (
              <ImagePlus className="w-8 h-8 text-zinc-400" />
            )}
          </div>
          <div className="space-y-3 flex-1 min-w-0">
            <div>
              <label className="block text-sm font-medium text-zinc-700">
                {t('admin.configuration.branding.assetType')}
                <select
                  value={assetType}
                  onChange={(event) => {
                    setAssetType(event.target.value as typeof assetType);
                    setPreview(undefined);
                    setFileError('');
                  }}
                  className="input-field mt-1 max-w-xs"
                >
                  <option value="logo">{t('admin.configuration.branding.logo')}</option>
                  <option value="compact_logo">
                    {t('admin.configuration.branding.compactLogo')}
                  </option>
                  <option value="favicon">{t('admin.configuration.branding.favicon')}</option>
                </select>
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label className="btn-secondary cursor-pointer">
                {upload.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                {upload.isPending
                  ? t('admin.configuration.branding.uploading')
                  : hasAsset
                    ? t('admin.configuration.branding.replace')
                    : t('admin.configuration.branding.chooseFile')}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/x-icon"
                  onChange={chooseFile}
                  className="sr-only"
                  disabled={upload.isPending || deleteAsset.isPending}
                />
              </label>

              {hasAsset && (
                <button
                  type="button"
                  onClick={removeCurrentAsset}
                  disabled={deleteAsset.isPending || upload.isPending}
                  className="btn-secondary text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                >
                  {deleteAsset.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  {t('admin.configuration.branding.remove')}
                </button>
              )}
            </div>

            <p className="text-xs text-zinc-500">{t('admin.configuration.branding.fileHelp')}</p>

            {hasAsset && (
              <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-md w-fit">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {t('admin.configuration.branding.uploaded')}
                  {values.logo_size ? ` (${Math.round(Number(values.logo_size) / 1024)} KB)` : ''}
                </span>
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="text-xs text-zinc-500 mb-3 bg-zinc-50 border border-zinc-200 p-3 rounded-lg">
            {t('admin.configuration.branding.themeNotice')}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {(
              [
                'primary_print_color',
                'accent_print_color',
                'letterhead_text',
                'footer_text',
              ] as const
            ).map((field) => {
              const fallbacks: Record<string, string> = {
                primary_print_color: 'Primary Print Color',
                accent_print_color: 'Accent Print Color',
                letterhead_text: 'Letterhead Text',
                footer_text: 'Footer Text',
              };
              return (
                <label key={field} className="block text-sm font-medium text-zinc-700">
                  {t(`admin.configuration.fields.${field}`, fallbacks[field])}
                  <input
                    type={field.includes('color') ? 'color' : 'text'}
                    value={String(values[field] || '')}
                    onChange={(event) => setValues({ ...values, [field]: event.target.value })}
                    className="input-field mt-2 h-10"
                  />
                </label>
              );
            })}
          </div>
        </div>

        {fileError && (
          <div
            role="alert"
            className="flex gap-2 items-start text-sm text-red-700 bg-red-50 border border-red-200 p-3 rounded-lg"
          >
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{fileError}</span>
          </div>
        )}

        {update.isError && (
          <div
            role="alert"
            className="flex gap-2 items-start text-sm text-red-700 bg-red-50 border border-red-200 p-3 rounded-lg"
          >
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <div className="flex-1">
              {(update.error as { response?: { status?: number } })?.response?.status === 409 ? (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <span>{t('admin.configuration.conflict')}</span>
                  <button
                    type="button"
                    onClick={() => branding.refetch()}
                    className="btn-secondary text-xs"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    {t('admin.configuration.reload')}
                  </button>
                </div>
              ) : (
                <span>
                  {(update.error as any)?.response?.data?.error?.message ||
                    (update.error as any)?.response?.data?.detail ||
                    t('admin.configuration.saveError')}
                </span>
              )}
            </div>
          </div>
        )}

        {update.isSuccess && (
          <div
            role="status"
            className="flex gap-2 items-center text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 p-3 rounded-lg"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{t('admin.configuration.saved')}</span>
          </div>
        )}

        <div className="flex justify-end">
          <button
            onClick={save}
            disabled={update.isPending || branding.isLoading || upload.isPending}
            className="btn-primary"
          >
            <Save className="w-4 h-4" />
            {update.isPending ? t('admin.configuration.saving') : t('common.actions.save')}
          </button>
        </div>
      </div>
    </div>
  );
}
