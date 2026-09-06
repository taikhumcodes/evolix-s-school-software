import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  Users,
  Search,
  Plus,
  CreditCard,
  Eye,
  X,
  AlertCircle,
} from 'lucide-react';
import { HrNav } from './HrNav';
import { useOptionalTenant } from '../../../core/tenancy/TenantContext';
import {
  useEmployees,
  useDepartments,
  useDesignations,
  useCreateEmployee,
} from '../../../lib/api/hr';

export const EmployeesDirectory: React.FC = () => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState('MALE');
  const [contactNumber, setContactNumber] = useState('');
  const [employmentType, setEmploymentType] = useState('FULL_TIME');
  const [joiningDate, setJoiningDate] = useState(new Date().toISOString().slice(0, 10));
  const [departmentId, setDepartmentId] = useState('');
  const [designationId, setDesignationId] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [formError, setFormError] = useState('');

  const tenantCtx = useOptionalTenant();
  const activeSchoolId = tenantCtx?.currentTenant?.schoolId || (typeof window !== 'undefined' ? localStorage.getItem('selected_school_id') : undefined) || undefined;

  const { data: deptList } = useDepartments(activeSchoolId);
  const { data: desigList } = useDesignations(activeSchoolId);
  const { data: empData, isLoading } = useEmployees({
    search: searchTerm || undefined,
    departmentId: selectedDept || undefined,
    employmentStatus: selectedStatus || undefined,
  });

  const createEmployeeMutation = useCreateEmployee();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!firstName || !joiningDate) {
      setFormError('First name and joining date are required.');
      return;
    }

    try {
      await createEmployeeMutation.mutateAsync({
        firstName,
        lastName: lastName || undefined,
        gender,
        contactNumber: contactNumber || undefined,
        employmentType,
        joiningDate,
        departmentId: departmentId || undefined,
        designationId: designationId || undefined,
        bankAccount: accountNumber
          ? {
              bankName: bankName || 'Default Bank',
              accountNumber,
              ifscCode: ifscCode || 'SBIN0000000',
              accountType: 'SAVINGS',
              isPrimary: true,
            }
          : undefined,
      });

      setIsModalOpen(false);
      // Reset form
      setFirstName('');
      setLastName('');
      setContactNumber('');
      setAccountNumber('');
      setBankName('');
      setIfscCode('');
    } catch (err: any) {
      setFormError(err.response?.data?.message || err.message || 'Failed to create employee');
    }
  };

  const employees = empData?.data || [];

  return (
    <div className="space-y-6">
      <HrNav />

      <div className="px-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-zinc-900 tracking-tight">
              {t('hr.directory.title', 'Staff Directory')}
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              {t('hr.directory.subtitle', 'Canonical human capital records, masked bank accounts, and employment lifecycle status.')}
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-mehndi-600 hover:bg-mehndi-700 text-white text-sm font-semibold rounded-xl shadow-sm shadow-mehndi-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t('hr.directory.addStaff', 'Add Employee')}</span>
          </button>
        </div>

        {/* Filters bar */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={t('hr.directory.searchPlaceholder', 'Search by name, employee code, or phone...')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-zinc-50/70 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-mehndi-500/20 focus:border-mehndi-500 transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="px-3 py-2 bg-zinc-50/70 border border-zinc-200 rounded-xl text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-mehndi-500/20"
            >
              <option value="">{t('hr.filters.allDepartments', 'All Departments')}</option>
              {deptList?.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 bg-zinc-50/70 border border-zinc-200 rounded-xl text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-mehndi-500/20"
            >
              <option value="">{t('hr.filters.allStatuses', 'All Statuses')}</option>
              <option value="ACTIVE">Active</option>
              <option value="PROBATION">Probation</option>
              <option value="NOTICE_PERIOD">Notice Period</option>
              <option value="RESIGNED">Resigned</option>
              <option value="TERMINATED">Terminated</option>
            </select>
          </div>
        </div>

        {/* Directory Table */}
        <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <div className="w-8 h-8 border-4 border-mehndi-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : employees.length === 0 ? (
            <div className="py-12 text-center text-zinc-400 text-sm">
              <Users className="w-10 h-10 mx-auto mb-3 text-zinc-300 stroke-1" />
              {t('hr.directory.noEmployees', 'No employee records found matching current criteria.')}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50/50 text-zinc-500 text-xs font-semibold uppercase">
                    <th className="px-6 py-3.5">{t('hr.table.employee', 'Employee')}</th>
                    <th className="px-6 py-3.5">{t('hr.table.code', 'Employee Code')}</th>
                    <th className="px-6 py-3.5">{t('hr.table.department', 'Department & Role')}</th>
                    <th className="px-6 py-3.5">{t('hr.table.bank', 'Disbursement Bank')}</th>
                    <th className="px-6 py-3.5">{t('hr.table.status', 'Status')}</th>
                    <th className="px-6 py-3.5 text-right">{t('common.actions', 'Actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {employees.map((emp) => {
                    const primaryBank = emp.bankAccounts?.find((b) => b.isPrimary) || emp.bankAccounts?.[0];
                    return (
                      <tr key={emp.id} className="hover:bg-zinc-50/80 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-zinc-900">{emp.displayName}</div>
                          <div className="text-xs text-zinc-500">{emp.contactNumber || 'No phone registered'}</div>
                        </td>
                        <td className="px-6 py-4 font-mono text-xs font-semibold text-zinc-700">
                          {emp.employeeNumber}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-zinc-900 font-medium">
                            {emp.designation?.name || 'Unassigned Role'}
                          </div>
                          <div className="text-xs text-zinc-500">
                            {emp.department?.name || 'No Department'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {primaryBank ? (
                            <div className="flex items-center gap-2">
                              <CreditCard className="w-4 h-4 text-zinc-400 shrink-0" />
                              <div>
                                <div className="text-xs font-mono font-bold text-zinc-800">
                                  {primaryBank.maskedAccountNumber}
                                </div>
                                <div className="text-[11px] text-zinc-500">{primaryBank.bankName}</div>
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-zinc-400 italic">No bank attached</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              emp.employmentStatus === 'ACTIVE'
                                ? 'bg-emerald-100 text-emerald-800'
                                : emp.employmentStatus === 'PROBATION'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-zinc-100 text-zinc-700'
                            }`}
                          >
                            {emp.employmentStatus}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link
                            to={`/hr/employees/${emp.id}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-semibold rounded-lg transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>{t('common.view', 'View Profile')}</span>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add Employee Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-zinc-200 max-h-[90vh] overflow-y-auto space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h2 className="text-lg font-bold text-zinc-900">
                {t('hr.modal.addStaffTitle', 'Register New Employee')}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl flex items-center gap-2 text-xs font-medium">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    {t('hr.form.firstName', 'First Name *')}
                  </label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-mehndi-500/20 focus:border-mehndi-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    {t('hr.form.lastName', 'Last Name')}
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-mehndi-500/20 focus:border-mehndi-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    {t('hr.form.gender', 'Gender')}
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-mehndi-500/20"
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    {t('hr.form.phone', 'Contact Number')}
                  </label>
                  <input
                    type="text"
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-mehndi-500/20 focus:border-mehndi-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    {t('hr.form.department', 'Department')}
                  </label>
                  <select
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-mehndi-500/20"
                  >
                    <option value="">Select Department</option>
                    {deptList?.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    {t('hr.form.designation', 'Designation')}
                  </label>
                  <select
                    value={designationId}
                    onChange={(e) => setDesignationId(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-mehndi-500/20"
                  >
                    <option value="">Select Designation</option>
                    {desigList?.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    {t('hr.form.employmentType', 'Employment Type')}
                  </label>
                  <select
                    value={employmentType}
                    onChange={(e) => setEmploymentType(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-mehndi-500/20"
                  >
                    <option value="FULL_TIME">Full Time</option>
                    <option value="PART_TIME">Part Time</option>
                    <option value="CONTRACT">Contract</option>
                    <option value="PROBATION">Probation</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    {t('hr.form.joiningDate', 'Joining Date *')}
                  </label>
                  <input
                    type="date"
                    required
                    value={joiningDate}
                    onChange={(e) => setJoiningDate(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-mehndi-500/20"
                  />
                </div>
              </div>

              {/* Bank Account Section */}
              <div className="pt-3 border-t border-zinc-100">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">
                  {t('hr.form.bankDetails', 'Primary Bank Account (Encrypted at Rest)')}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-600 mb-1">
                      {t('hr.form.bankName', 'Bank Name')}
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. State Bank of India"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      autoComplete="off"
                      className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-600 mb-1">
                      {t('hr.form.accountNumber', 'Account Number')}
                    </label>
                    <input
                      type="password"
                      placeholder="Will be masked on read"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      autoComplete="new-password"
                      className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-600 mb-1">
                      {t('hr.form.ifscCode', 'IFSC Code')}
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. SBIN0001234"
                      value={ifscCode}
                      onChange={(e) => setIfscCode(e.target.value)}
                      className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-zinc-200 text-zinc-700 text-sm font-semibold rounded-xl hover:bg-zinc-50 cursor-pointer"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={createEmployeeMutation.isPending}
                  className="px-5 py-2 bg-mehndi-600 hover:bg-mehndi-700 text-white text-sm font-bold rounded-xl shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {createEmployeeMutation.isPending ? 'Saving...' : t('common.save', 'Save Employee')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
