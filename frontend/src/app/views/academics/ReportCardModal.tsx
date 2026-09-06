import React from 'react';
import { Printer, X } from 'lucide-react';
import { useStudentReportCard } from '../../../lib/api/academics';

interface ReportCardModalProps {
  examId: string;
  studentId: string;
  onClose: () => void;
}

export const ReportCardModal: React.FC<ReportCardModalProps> = ({
  examId,
  studentId,
  onClose,
}) => {
  const { data: reportCard, isLoading } = useStudentReportCard({ examId, studentId });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden my-8 print:m-0 print:border-none print:shadow-none print:w-full print:max-w-none">
        {/* Modal Action Bar (Hidden on print) */}
        <div className="flex items-center justify-between px-6 py-3 bg-zinc-900 text-white print:hidden">
          <span className="text-xs font-bold tracking-wide uppercase">
            Official Student Progress Report Card
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Report Card</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-white rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Report Card Content */}
        <div className="p-8 sm:p-12 text-zinc-900 print:p-6 print:m-0" id="report-card-printable">
          {isLoading ? (
            <div className="py-20 text-center text-zinc-400 font-semibold">
              Loading report card...
            </div>
          ) : !reportCard ? (
            <div className="py-20 text-center text-zinc-400 font-semibold">
              Report card data unavailable.
            </div>
          ) : (
            <div className="space-y-6">
              {/* 1. School Letterhead & Branding Header */}
              <div className="text-center border-b-2 border-zinc-900 pb-6">
                <div className="flex items-center justify-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-xl bg-emerald-700 text-white font-black text-2xl flex items-center justify-center shadow-md">
                    E
                  </div>
                  <div className="text-left">
                    <h1 className="text-2xl font-black text-zinc-950 uppercase tracking-tight">
                      {reportCard.school.name}
                    </h1>
                    {reportCard.school.address && (
                      <p className="text-xs text-zinc-600 font-medium">
                        {reportCard.school.address}
                      </p>
                    )}
                  </div>
                </div>

                <div className="text-[11px] text-zinc-500 font-medium flex items-center justify-center gap-4">
                  {reportCard.school.email && <span>Email: {reportCard.school.email}</span>}
                  {reportCard.school.contactNumber && <span>Phone: {reportCard.school.contactNumber}</span>}
                  {reportCard.school.code && <span>Affiliation / Code: {reportCard.school.code}</span>}
                </div>

                <div className="mt-4 inline-block bg-zinc-100 text-zinc-900 px-6 py-1 rounded-full text-xs font-black uppercase tracking-wider border border-zinc-300">
                  {reportCard.academic.examName} — Progress Report
                </div>
              </div>

              {/* 2. Student & Academic Information Grid */}
              <div className="grid grid-cols-2 gap-4 text-xs bg-zinc-50/80 p-4 rounded-xl border border-zinc-200">
                <div className="space-y-1.5">
                  <div>
                    <span className="text-zinc-500 font-semibold">Student Name: </span>
                    <span className="font-bold text-zinc-950 text-sm">{reportCard.student.name}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 font-semibold">Admission No: </span>
                    <span className="font-mono font-bold text-zinc-900">{reportCard.student.admissionNumber}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 font-semibold">Roll Number: </span>
                    <span className="font-mono font-bold text-zinc-900">{reportCard.student.rollNumber || '—'}</span>
                  </div>
                  {reportCard.student.fatherName && (
                    <div>
                      <span className="text-zinc-500 font-semibold">Father's Name: </span>
                      <span className="font-semibold text-zinc-800">{reportCard.student.fatherName}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5 text-right sm:text-left">
                  <div>
                    <span className="text-zinc-500 font-semibold">Academic Session: </span>
                    <span className="font-bold text-zinc-900">{reportCard.academic.academicYear}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 font-semibold">Class & Section: </span>
                    <span className="font-bold text-zinc-900">
                      {reportCard.academic.className} {reportCard.academic.sectionName ? `(${reportCard.academic.sectionName})` : ''}
                    </span>
                  </div>
                  {reportCard.academic.term && (
                    <div>
                      <span className="text-zinc-500 font-semibold">Term: </span>
                      <span className="font-semibold text-zinc-800">{reportCard.academic.term}</span>
                    </div>
                  )}
                  {reportCard.student.gender && (
                    <div>
                      <span className="text-zinc-500 font-semibold">Gender: </span>
                      <span className="font-semibold text-zinc-800">{reportCard.student.gender}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 3. Subject-wise Marks Table */}
              <div className="border border-zinc-200 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-zinc-100 text-zinc-700 font-black uppercase text-[10px] tracking-wider border-b border-zinc-200">
                      <th className="py-2.5 px-3">Subject</th>
                      <th className="py-2.5 px-3 text-center">Max Marks</th>
                      <th className="py-2.5 px-3 text-center">Pass Marks</th>
                      <th className="py-2.5 px-3 text-center">Theory</th>
                      <th className="py-2.5 px-3 text-center">Practical</th>
                      <th className="py-2.5 px-3 text-center">Grace</th>
                      <th className="py-2.5 px-3 text-center font-black">Total Marks</th>
                      <th className="py-2.5 px-3 text-center">Grade</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200">
                    {reportCard.marks.map((m, idx) => (
                      <tr key={idx} className="hover:bg-zinc-50">
                        <td className="py-2.5 px-3 font-bold text-zinc-900">
                          {m.subjectName} <span className="text-zinc-400 font-mono text-[10px]">({m.subjectCode})</span>
                        </td>
                        <td className="py-2.5 px-3 text-center font-medium text-zinc-600">{m.maxMarks}</td>
                        <td className="py-2.5 px-3 text-center font-medium text-zinc-600">{m.passMarks}</td>
                        <td className="py-2.5 px-3 text-center font-medium text-zinc-700">{m.rawTheory ?? '—'}</td>
                        <td className="py-2.5 px-3 text-center font-medium text-zinc-700">{m.rawPractical ?? '—'}</td>
                        <td className="py-2.5 px-3 text-center font-medium text-zinc-500">{m.graceMarks ? `+${m.graceMarks}` : '0'}</td>
                        <td className="py-2.5 px-3 text-center font-black text-zinc-950 text-sm">
                          {m.finalMarks !== null ? m.finalMarks : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-zinc-800">
                          {m.grade || '—'}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {m.status === 'ABSENT' ? (
                            <span className="text-[10px] font-bold uppercase text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded">Absent</span>
                          ) : m.status === 'EXEMPT' ? (
                            <span className="text-[10px] font-bold uppercase text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">Exempt</span>
                          ) : m.isPassed ? (
                            <span className="text-[10px] font-bold uppercase text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">Pass</span>
                          ) : (
                            <span className="text-[10px] font-bold uppercase text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded">Fail</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 4. Overall Performance & Attendance Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Result Summary Box */}
                <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200 space-y-2 text-xs">
                  <h4 className="font-bold text-zinc-900 uppercase tracking-wide text-[11px]">
                    Examination Summary
                  </h4>
                  <div className="flex justify-between py-1 border-b border-zinc-200">
                    <span className="text-zinc-500">Total Maximum Marks:</span>
                    <span className="font-bold text-zinc-900">{reportCard.summary.totalMaxMarks}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-zinc-200">
                    <span className="text-zinc-500">Total Marks Obtained:</span>
                    <span className="font-bold text-zinc-900 text-sm">{reportCard.summary.totalMarksObtained}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-zinc-200">
                    <span className="text-zinc-500">Overall Percentage:</span>
                    <span className="font-black text-emerald-700 text-base">{reportCard.summary.overallPercentage}%</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-zinc-200">
                    <span className="text-zinc-500">Final Grade:</span>
                    <span className="font-black text-zinc-900">{reportCard.summary.overallGrade || '—'}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-zinc-500">Overall Result:</span>
                    <span className={`font-black uppercase ${reportCard.summary.isPassed ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {reportCard.summary.statusText}
                    </span>
                  </div>
                </div>

                {/* Module 05 Attendance Integration Box */}
                <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200 space-y-2 text-xs">
                  <h4 className="font-bold text-zinc-900 uppercase tracking-wide text-[11px]">
                    Attendance Record (Official)
                  </h4>
                  <div className="flex justify-between py-1 border-b border-zinc-200">
                    <span className="text-zinc-500">Total School Working Days:</span>
                    <span className="font-bold text-zinc-900">{reportCard.attendanceSummary.totalWorkingDays}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-zinc-200">
                    <span className="text-zinc-500">Days Present:</span>
                    <span className="font-bold text-zinc-900">{reportCard.attendanceSummary.presentDays}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-zinc-200">
                    <span className="text-zinc-500">Days Absent:</span>
                    <span className="font-bold text-rose-700">{reportCard.attendanceSummary.absentDays}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-zinc-500">Attendance Percentage:</span>
                    <span className="font-black text-zinc-900 text-sm">
                      {reportCard.attendanceSummary.attendancePercentage}%
                    </span>
                  </div>
                  <div className="text-[10px] text-zinc-400 italic pt-2">
                    * Calculated strictly adhering to working calendar, holidays, and enrollment window.
                  </div>
                </div>
              </div>

              {/* 5. Official Signatures Block */}
              <div className="grid grid-cols-3 gap-8 pt-12 text-center text-xs text-zinc-700 border-t border-zinc-300">
                <div>
                  <div className="h-10 border-b border-zinc-400 mb-2"></div>
                  <div className="font-bold">Class Teacher Signature</div>
                </div>
                <div>
                  <div className="h-10 border-b border-zinc-400 mb-2"></div>
                  <div className="font-bold">Parent / Guardian Signature</div>
                </div>
                <div>
                  <div className="h-10 border-b border-zinc-400 mb-2"></div>
                  <div className="font-bold">Principal / Examination Head</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportCardModal;
