import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Stamp,
  Trash2,
  AlertCircle,
  Shield,
  User,
  Plus,
} from 'lucide-react';
import {
  useSignatureAssets,
  useUploadSignatureAsset,
  useDeleteSignatureAsset,
} from '../../../lib/api/documents';

export const SignaturesBrandingView: React.FC = () => {
  const { t } = useTranslation();
  const { data: assets, isLoading, refetch } = useSignatureAssets();
  const uploadMutation = useUploadSignatureAsset();
  const deleteMutation = useDeleteSignatureAsset();

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [assetName, setAssetName] = useState('');
  const [assetType, setAssetType] = useState<'SIGNATURE' | 'STAMP' | 'SEAL'>('SIGNATURE');
  const [signatoryName, setSignatoryName] = useState('');
  const [designation, setDesignation] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMsg('Please select an image file (PNG or JPEG).');
      return;
    }
    setErrorMsg(null);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('name', assetName.trim() || selectedFile.name);
    formData.append('assetType', assetType);
    if (signatoryName.trim()) formData.append('signatoryName', signatoryName.trim());
    if (designation.trim()) formData.append('designation', designation.trim());

    try {
      await uploadMutation.mutateAsync(formData);
      setShowUploadModal(false);
      setSelectedFile(null);
      setAssetName('');
      setSignatoryName('');
      setDesignation('');
      refetch();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Upload failed');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this signature/seal asset?')) return;
    try {
      await deleteMutation.mutateAsync(id);
      refetch();
    } catch (err) {
      console.error('Failed to delete asset', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-3xl border border-zinc-200/80 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">
            {t('documents.signatures.title', 'Signatures & School Seals')}
          </h1>
          <p className="text-xs text-zinc-500 mt-1 max-w-xl">
            {t(
              'documents.signatures.subtitle',
              'Manage authorized signature images, principal stamps, and institutional seals for automated document branding.'
            )}
          </p>
        </div>

        <button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-mehndi-600 hover:bg-mehndi-700 text-white font-semibold text-xs transition-all shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>{t('documents.signatures.uploadBtn', 'Upload Signature / Stamp')}</span>
        </button>
      </div>

      {/* Assets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {isLoading ? (
          <div className="col-span-full py-12 text-center text-zinc-400">
            Loading signature assets...
          </div>
        ) : !assets || assets.length === 0 ? (
          <div className="col-span-full py-12 text-center bg-white rounded-3xl border border-zinc-200">
            <Stamp className="w-10 h-10 mx-auto text-zinc-300 mb-3" />
            <h3 className="text-sm font-bold text-zinc-800">No Signature Assets Configured</h3>
            <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
              Upload authorized signatures or school stamps to embed them automatically in official certificates and report cards.
            </p>
            <button
              onClick={() => setShowUploadModal(true)}
              className="mt-4 px-4 py-2 rounded-xl bg-mehndi-600 text-white font-semibold text-xs"
            >
              Upload First Asset
            </button>
          </div>
        ) : (
          assets.map((asset) => (
            <div
              key={asset.id}
              className="bg-white p-5 rounded-2xl border border-zinc-200/90 shadow-2xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700 uppercase">
                      {asset.assetType}
                    </span>
                    <h3 className="text-sm font-bold text-zinc-900 mt-2">{asset.name}</h3>
                  </div>
                  <button
                    onClick={() => handleDelete(asset.id)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    title="Delete Asset"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="mt-3 text-xs text-zinc-500 space-y-1">
                  {asset.signatoryName && (
                    <div className="flex items-center gap-1.5 font-medium text-zinc-700">
                      <User className="w-3.5 h-3.5 text-zinc-400" />
                      <span>{asset.signatoryName}</span>
                    </div>
                  )}
                  {asset.designation && <div>Role: {asset.designation}</div>}
                  <div>File: {asset.mimeType} • {(asset.fileSizeBytes / 1024).toFixed(1)} KB</div>
                </div>
              </div>

              {/* Visual preview placeholder */}
              <div className="mt-4 p-3 bg-zinc-50 rounded-xl border border-dashed border-zinc-200 flex items-center justify-center min-h-[90px]">
                <div className="text-center text-zinc-400 text-[11px] flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-emerald-600" />
                  <span>Secure Asset Stored on Disk</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-zinc-200">
            <h2 className="text-base font-bold text-zinc-900">Upload Authorized Asset</h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Upload a transparent PNG signature or stamp image.
            </p>

            <form onSubmit={handleUploadSubmit} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Asset Display Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Principal Official Signature"
                  value={assetName}
                  onChange={(e) => setAssetName(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-mehndi-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Asset Type</label>
                <select
                  value={assetType}
                  onChange={(e) => setAssetType(e.target.value as any)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs focus:bg-white"
                >
                  <option value="SIGNATURE">Authorized Signature Image</option>
                  <option value="STAMP">Official Stamp</option>
                  <option value="SEAL">School Embossed Seal</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Signatory Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Dr. Rajesh Sharma"
                  value={signatoryName}
                  onChange={(e) => setSignatoryName(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Signatory Designation</label>
                <input
                  type="text"
                  placeholder="e.g. Principal / Headmaster"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Image File (PNG or JPG)</label>
                <input
                  type="file"
                  accept="image/png,image/jpeg"
                  required
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-zinc-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-mehndi-50 file:text-mehndi-700 hover:file:bg-mehndi-100 cursor-pointer"
                />
              </div>

              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 hover:bg-zinc-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadMutation.isPending || !selectedFile}
                  className="px-4 py-2 rounded-xl bg-mehndi-600 hover:bg-mehndi-700 text-white text-xs font-bold transition-all disabled:opacity-50"
                >
                  {uploadMutation.isPending ? 'Uploading...' : 'Upload Asset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SignaturesBrandingView;
