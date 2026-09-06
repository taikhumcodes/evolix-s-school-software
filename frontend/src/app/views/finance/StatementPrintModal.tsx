import React from 'react';
import { useTranslation } from 'react-i18next';
import { Printer, X } from 'lucide-react';
import { StudentLedgerResponse } from '../../../lib/api/finance';

interface StatementPrintModalProps {
  student: any | null;
  ledger: StudentLedgerResponse | null;
  isOpen: boolean;
  onClose: () => void;
}

export const StatementPrintModal: React.FC<StatementPrintModalProps> = ({
  student,
  ledger,
  isOpen,
  onClose,
}) => {
  const { t } = useTranslation();

  if (!isOpen || !student || !ledger) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden border border-zinc-200 print:shadow-none print:border-none print:m-0 print:max-w-none">
        {/* Modal Actions (Hidden in Print) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 bg-zinc-50 print:hidden">
          <span className="text-sm font-bold text-zinc-900">
            {t('finance.statement.title', 'Student Financial Account Statement')}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-mehndi-600 hover:bg-mehndi-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{t('finance.common.print', 'Print')}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-lg hover:bg-zinc-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Paper */}
        <div className="p-8 print:p-6 space-y-6 text-zinc-900 font-sans">
          {/* Header */}
          <div className="text-center border-b-2 border-zinc-900 pb-4">
            <h1 className="text-2xl font-black uppercase tracking-wider text-zinc-900">
              GREENWOOD HIGH SCHOOL
            </h1>
            <p className="text-xs font-medium text-zinc-600 uppercase tracking-widest mt-0.5">
              Affiliated with CBSE Board &bull; School Code: 20481
            </p>
            <div className="mt-3 inline-block px-4 py-1 rounded bg-zinc-100 border border-zinc-300">
              <span className="text-xs font-black uppercase tracking-widest">
                {t('finance.statement.officialStatement', 'STUDENT FINANCIAL ACCOUNT STATEMENT')}
              </span>
            </div>
          </div>

          {/* Student Info & Summary */}
          <div className="grid grid-cols-2 gap-4 text-xs border border-zinc-200 rounded-xl p-4 bg-zinc-50/50">
            <div className="space-y-1">
              <p>
                <strong className="text-zinc-600">Student Name:</strong> {student.firstName} {student.lastName}
              </p>
              <p>
                <strong className="text-zinc-600">Admission No:</strong> {student.admissionNumber}
              </p>
              <p>
                <strong className="text-zinc-600">Student ID:</strong> {student.studentId}
              </p>
            </div>
            <div className="space-y-1 text-right">
              <p>
                <strong className="text-zinc-600">Total Invoiced:</strong> ₹{ledger.summary.totalCharges}
              </p>
              <p>
                <strong className="text-zinc-600">Total Paid:</strong> ₹{ledger.summary.totalPaid}
              </p>
              <p className="text-sm font-black text-rose-700">
                <strong className="text-zinc-700">Outstanding Balance:</strong> ₹
                {ledger.summary.outstandingBalance}
              </p>
            </div>
          </div>

          {/* Chronological Ledger Table */}
          <div className="border border-zinc-200 rounded-xl overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-zinc-100 border-b border-zinc-200 font-bold text-zinc-700 uppercase tracking-wider">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Reference #</th>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3 text-right">Debit (₹)</th>
                  <th className="py-2.5 px-3 text-right">Credit (₹)</th>
                  <th className="py-2.5 px-3 text-right">Balance (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {ledger.entries && ledger.entries.length > 0 ? (
                  ledger.entries.map((e, idx) => (
                    <tr key={idx} className="hover:bg-zinc-50">
                      <td className="py-2.5 px-3">{new Date(e.date).toLocaleDateString()}</td>
                      <td className="py-2.5 px-3 font-semibold text-[10px]">{e.type}</td>
                      <td className="py-2.5 px-3 font-mono font-bold">{e.reference}</td>
                      <td className="py-2.5 px-3 text-zinc-600">{e.description}</td>
                      <td className="py-2.5 px-3 text-right font-mono">
                        {Number(e.debit) > 0 ? `₹${e.debit}` : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-700">
                        {Number(e.credit) > 0 ? `₹${e.credit}` : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold">
                        ₹{e.runningBalance}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-zinc-400">
                      No financial transactions posted yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="pt-6 text-center text-[10px] text-zinc-400">
            * Generated on {new Date().toLocaleString()} &bull; Authoritative Evolix School ERP Financial Ledger
          </div>
        </div>
      </div>
    </div>
  );
};
