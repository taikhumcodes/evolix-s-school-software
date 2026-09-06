import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Printer, ArrowLeft } from 'lucide-react';
import { useStudents } from '../../../lib/api/students';
import { useClasses } from '../../../lib/api/master-data';
import { useAcademicYears } from '../../../lib/api/academic-years';
import { useTenant } from '../../../core/tenancy/TenantContext';

export default function StudentPrintList() {
  const { currentTenant } = useTenant();
  const schoolId = currentTenant?.schoolId || localStorage.getItem('selected_school_id') || undefined;

  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ACTIVE');

  const { data: classes } = useClasses(schoolId);
  const { data: academicYears } = useAcademicYears(schoolId || '');
  const currentAcademicYear = academicYears?.find((ay) => ay.is_current);

  const selectedClass = useMemo(() => {
    return classes?.find((c) => c.id === selectedClassId);
  }, [classes, selectedClassId]);

  const { data, isLoading } = useStudents({
    classId: selectedClassId || undefined,
    sectionId: selectedSectionId || undefined,
    status: selectedStatus === 'ALL' ? undefined : selectedStatus,
    limit: 200,
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Non-printed Controls Bar */}
      <div className="print:hidden flex items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm">
        <Link
          to="/students/list"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 hover:bg-zinc-50 text-xs font-semibold text-zinc-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Directory</span>
        </Link>

        {/* Filter selectors for print list */}
        <div className="flex items-center gap-2">
          <select
            value={selectedClassId}
            onChange={(e) => {
              setSelectedClassId(e.target.value);
              setSelectedSectionId('');
            }}
            className="px-3 py-1.5 rounded-xl border border-zinc-200 text-xs bg-white text-zinc-800"
          >
            <option value="">All Classes</option>
            {classes?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {selectedClass && selectedClass.sections && selectedClass.sections.length > 0 && (
            <select
              value={selectedSectionId}
              onChange={(e) => setSelectedSectionId(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-zinc-200 text-xs bg-white text-zinc-800"
            >
              <option value="">All Sections</option>
              {selectedClass.sections.map((s) => (
                <option key={s.sectionId} value={s.sectionId}>
                  {s.section?.name || 'Section'}
                </option>
              ))}
            </select>
          )}

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-zinc-200 text-xs bg-white text-zinc-800"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active Only</option>
            <option value="WITHDRAWN">Withdrawn</option>
            <option value="TRANSFERRED">Transferred</option>
          </select>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold shadow-sm transition-all"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Printable Sheet */}
      <div className="bg-white p-8 rounded-2xl border border-zinc-200 print:border-none print:p-0 print:shadow-none shadow-sm space-y-6">
        {/* School Header */}
        <div className="border-b-2 border-zinc-900 pb-4 text-center space-y-1">
          <h1 className="text-xl font-black uppercase tracking-wider text-zinc-900">
            {currentTenant?.schoolName || 'EVOLIX ACADEMY'}
          </h1>
          <p className="text-xs font-semibold uppercase text-zinc-600 tracking-wide">
            Student Enrollment Directory & Class Roll
          </p>
          <div className="text-[11px] text-zinc-500 pt-1 flex items-center justify-center gap-4">
            <span>Academic Cycle: <strong>{currentAcademicYear?.name || 'Current'}</strong></span>
            <span>•</span>
            <span>Printed On: <strong>{new Date().toLocaleDateString()}</strong></span>
            <span>•</span>
            <span>Total Enrolled: <strong>{data?.pagination?.total ?? 0} Students</strong></span>
          </div>
        </div>

        {/* Printable Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-zinc-300 font-bold text-zinc-800 uppercase text-[11px]">
                <th className="py-2 px-3 w-10">#</th>
                <th className="py-2 px-3">Roll No</th>
                <th className="py-2 px-3">Student Name</th>
                <th className="py-2 px-3">Student ID</th>
                <th className="py-2 px-3">Admission No</th>
                <th className="py-2 px-3">Class & Section</th>
                <th className="py-2 px-3">Gender</th>
                <th className="py-2 px-3">Guardian Name & Phone</th>
                <th className="py-2 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-zinc-400">
                    Loading student records...
                  </td>
                </tr>
              ) : data?.items && data.items.length > 0 ? (
                data.items.map((stu, index) => (
                  <tr key={stu.id} className="text-[11px]">
                    <td className="py-2 px-3 text-zinc-400">{index + 1}</td>
                    <td className="py-2 px-3 font-mono font-bold text-zinc-900">
                      {stu.currentRollNumber || '—'}
                    </td>
                    <td className="py-2 px-3 font-bold text-zinc-900">
                      {stu.firstName} {stu.lastName}
                    </td>
                    <td className="py-2 px-3 font-mono text-zinc-600">{stu.studentId}</td>
                    <td className="py-2 px-3 font-mono text-zinc-600">{stu.admissionNumber}</td>
                    <td className="py-2 px-3 font-medium">
                      {stu.currentClass?.name || '—'}
                      {stu.currentSection?.name ? ` - ${stu.currentSection.name}` : ''}
                    </td>
                    <td className="py-2 px-3 text-zinc-600">{stu.gender}</td>
                    <td className="py-2 px-3">
                      {stu.primaryGuardian ? (
                        <span>
                          {stu.primaryGuardian.name} ({stu.primaryGuardian.phone})
                        </span>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>
                    <td className="py-2 px-3 font-semibold uppercase text-[10px] text-zinc-700">
                      {stu.status}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-zinc-400">
                    No student records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Signature line for print */}
        <div className="hidden print:flex items-center justify-between pt-16 text-xs text-zinc-600 border-t border-zinc-200">
          <div>Prepared By: ___________________</div>
          <div>Verified By: ___________________</div>
          <div>Principal / Authority: ___________________</div>
        </div>
      </div>
    </div>
  );
}
