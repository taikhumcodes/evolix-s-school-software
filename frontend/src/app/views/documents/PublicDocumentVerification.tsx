import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Building2,
  Calendar,
  FileText,
  Hash,
  ArrowLeft,
} from 'lucide-react';
import { verifyDocumentPublic, PublicVerificationResult } from '../../../lib/api/documents';

export const PublicDocumentVerification: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState<boolean>(true);
  const [result, setResult] = useState<PublicVerificationResult | null>(null);

  useEffect(() => {
    if (token) {
      setLoading(true);
      verifyDocumentPublic(token)
        .then((res) => {
          setResult(res);
          setLoading(false);
        })
        .catch(() => {
          setResult({ isValid: false, reason: 'VERIFICATION_ERROR' });
          setLoading(false);
        });
    }
  }, [token]);

  const displayDate = result?.issueDate || '';

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-4 sm:p-6">
      {/* Container */}
      <div className="max-w-lg w-full bg-white rounded-3xl border border-zinc-200 shadow-xl overflow-hidden">
        {/* Brand Banner */}
        <div className="bg-gradient-to-r from-zinc-900 to-zinc-800 p-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-mehndi-500 flex items-center justify-center text-zinc-900 font-black text-sm">
              E
            </div>
            <div>
              <div className="font-extrabold text-sm tracking-tight">EVOLIX Verification Portal</div>
              <div className="text-[10px] text-zinc-400">Authentic Document Certification</div>
            </div>
          </div>

          <ShieldCheck className="w-6 h-6 text-mehndi-400" />
        </div>

        {/* Verification Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {loading ? (
            <div className="py-12 text-center text-zinc-400 space-y-2">
              <div className="w-8 h-8 border-2 border-mehndi-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-semibold text-zinc-600">Verifying cryptographic signature...</p>
            </div>
          ) : result?.status === 'CANCELLED' ? (
            // Cancelled / Revoked Document
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
                  <XCircle className="w-8 h-8" />
                </div>
                <h1 className="text-lg font-bold text-zinc-900">Certificate Revoked / Cancelled</h1>
                <p className="text-xs text-rose-700 font-semibold bg-rose-50 border border-rose-200 rounded-full px-3 py-1 inline-block">
                  Officially Cancelled & Void
                </p>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto pt-1">
                  This document was officially cancelled by the institution and is no longer valid for official purposes.
                </p>
              </div>

              {/* Metadata Card */}
              <div className="bg-zinc-50 rounded-2xl border border-zinc-200 p-5 space-y-3.5 text-xs">
                {result.documentNumber && (
                  <div className="flex items-center justify-between border-b border-zinc-200/60 pb-2.5">
                    <span className="text-zinc-500 flex items-center gap-1.5 font-medium">
                      <Hash className="w-4 h-4 text-zinc-400" />
                      Document Number
                    </span>
                    <span className="font-mono font-bold text-zinc-900 text-sm">
                      {result.documentNumber}
                    </span>
                  </div>
                )}

                {result.documentType && (
                  <div className="flex items-center justify-between border-b border-zinc-200/60 pb-2.5">
                    <span className="text-zinc-500 flex items-center gap-1.5 font-medium">
                      <FileText className="w-4 h-4 text-zinc-400" />
                      Document Type
                    </span>
                    <span className="font-bold text-zinc-800">{result.documentType}</span>
                  </div>
                )}

                {result.schoolName && (
                  <div className="flex items-center justify-between border-b border-zinc-200/60 pb-2.5">
                    <span className="text-zinc-500 flex items-center gap-1.5 font-medium">
                      <Building2 className="w-4 h-4 text-zinc-400" />
                      Issuing School
                    </span>
                    <span className="font-semibold text-zinc-800">{result.schoolName}</span>
                  </div>
                )}

                {displayDate && (
                  <div className="flex items-center justify-between border-b border-zinc-200/60 pb-2.5">
                    <span className="text-zinc-500 flex items-center gap-1.5 font-medium">
                      <Calendar className="w-4 h-4 text-zinc-400" />
                      Date of Issue
                    </span>
                    <span className="font-semibold text-zinc-800">{displayDate}</span>
                  </div>
                )}

                {result.cancelledAt && (
                  <div className="flex items-center justify-between border-b border-zinc-200/60 pb-2.5">
                    <span className="text-zinc-500 flex items-center gap-1.5 font-medium">
                      <Calendar className="w-4 h-4 text-rose-500" />
                      Cancellation Date
                    </span>
                    <span className="font-semibold text-rose-700">
                      {new Date(result.cancelledAt).toLocaleDateString()}
                    </span>
                  </div>
                )}

                {result.checksumSha256 && (
                  <div className="pt-1">
                    <span className="text-[10px] text-zinc-400 block mb-0.5">
                      SHA-256 Byte Fingerprint:
                    </span>
                    <span className="font-mono text-[10px] text-zinc-600 break-all">
                      {result.checksumSha256}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ) : result?.status === 'SUPERSEDED' ? (
            // Superseded Document
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto">
                  <AlertTriangle className="w-8 h-8" />
                </div>
                <h1 className="text-lg font-bold text-zinc-900">Document Superseded</h1>
                <p className="text-xs text-amber-700 font-semibold bg-amber-50 border border-amber-200 rounded-full px-3 py-1 inline-block">
                  Superseded by Newer Issuance
                </p>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto pt-1">
                  A newer document has been issued.
                </p>
              </div>

              {/* Metadata Card */}
              <div className="bg-zinc-50 rounded-2xl border border-zinc-200 p-5 space-y-3.5 text-xs">
                {result.documentNumber && (
                  <div className="flex items-center justify-between border-b border-zinc-200/60 pb-2.5">
                    <span className="text-zinc-500 flex items-center gap-1.5 font-medium">
                      <Hash className="w-4 h-4 text-zinc-400" />
                      Document Number
                    </span>
                    <span className="font-mono font-bold text-zinc-900 text-sm">
                      {result.documentNumber}
                    </span>
                  </div>
                )}

                {result.schoolName && (
                  <div className="flex items-center justify-between border-b border-zinc-200/60 pb-2.5">
                    <span className="text-zinc-500 flex items-center gap-1.5 font-medium">
                      <Building2 className="w-4 h-4 text-zinc-400" />
                      Issuing School
                    </span>
                    <span className="font-semibold text-zinc-800">{result.schoolName}</span>
                  </div>
                )}

                {displayDate && (
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500 flex items-center gap-1.5 font-medium">
                      <Calendar className="w-4 h-4 text-zinc-400" />
                      Original Issue Date
                    </span>
                    <span className="font-semibold text-zinc-800">{displayDate}</span>
                  </div>
                )}
              </div>
            </div>
          ) : !result?.isValid ? (
            // Invalid / Tampered / Non-Existent Result
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
                <XCircle className="w-10 h-10" />
              </div>

              <div>
                <h1 className="text-lg font-bold text-zinc-900">Invalid Document</h1>
                <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                  The verification token was not found or has been altered. This document cannot be authenticated.
                </p>
              </div>
            </div>
          ) : (
            // Valid Official Document (FINALIZED)
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h1 className="text-lg font-black text-zinc-900">Official Verified Document</h1>
                <p className="text-xs text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1 inline-block">
                  Cryptographically Authentic & Active
                </p>
              </div>

              {/* Certificate Metadata Card */}
              <div className="bg-zinc-50 rounded-2xl border border-zinc-200 p-5 space-y-3.5 text-xs">
                <div className="flex items-center justify-between border-b border-zinc-200/60 pb-2.5">
                  <span className="text-zinc-500 flex items-center gap-1.5 font-medium">
                    <Hash className="w-4 h-4 text-zinc-400" />
                    Document Number
                  </span>
                  <span className="font-mono font-bold text-zinc-900 text-sm">
                    {result.documentNumber}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-zinc-200/60 pb-2.5">
                  <span className="text-zinc-500 flex items-center gap-1.5 font-medium">
                    <FileText className="w-4 h-4 text-zinc-400" />
                    Document Type
                  </span>
                  <span className="font-bold text-zinc-800">{result.documentType}</span>
                </div>

                <div className="flex items-center justify-between border-b border-zinc-200/60 pb-2.5">
                  <span className="text-zinc-500 flex items-center gap-1.5 font-medium">
                    <Building2 className="w-4 h-4 text-zinc-400" />
                    Issuing School
                  </span>
                  <span className="font-semibold text-zinc-800">{result.schoolName}</span>
                </div>

                <div className="flex items-center justify-between border-b border-zinc-200/60 pb-2.5">
                  <span className="text-zinc-500 flex items-center gap-1.5 font-medium">
                    <Calendar className="w-4 h-4 text-zinc-400" />
                    Date of Issue
                  </span>
                  <span className="font-semibold text-zinc-800">
                    {displayDate || '-'}
                  </span>
                </div>

                {result.checksumSha256 && (
                  <div className="pt-1">
                    <span className="text-[10px] text-zinc-400 block mb-0.5">
                      SHA-256 Byte Fingerprint:
                    </span>
                    <span className="font-mono text-[10px] text-zinc-600 break-all">
                      {result.checksumSha256}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-zinc-100 flex items-center justify-between text-xs">
            <Link
              to="/login"
              className="text-zinc-500 hover:text-zinc-800 flex items-center gap-1 font-semibold"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to EVOLIX Login</span>
            </Link>

            <span className="text-[11px] text-zinc-400">EVOLIX v4.0 Official Verifier</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicDocumentVerification;
