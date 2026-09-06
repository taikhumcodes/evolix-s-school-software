import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Users,
  Building,
  MapPin,
  Search,
  Check,
  AlertCircle,
} from 'lucide-react';
import { StudentsNav } from './StudentsNav';
import { useCreateStudent, useGuardiansSearch, useNextRollNumber } from '../../../lib/api/students';
import { useClasses, useReligions, useCategories, useCastes } from '../../../lib/api/master-data';
import { useAcademicYears } from '../../../lib/api/academic-years';
import { useTenant } from '../../../core/tenancy/TenantContext';

export default function StudentForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { currentTenant } = useTenant();
  const schoolId = currentTenant?.schoolId || localStorage.getItem('selected_school_id') || undefined;

  // Form State
  const [formData, setFormData] = useState({
    academicYearId: '',
    classId: '',
    sectionId: '',
    rollNumber: '',
    admissionDate: new Date().toISOString().split('T')[0],

    firstName: '',
    middleName: '',
    lastName: '',
    gender: 'MALE' as 'MALE' | 'FEMALE' | 'OTHER',
    dateOfBirth: '',
    bloodGroup: '',
    placeOfBirth: '',
    nationality: 'IN',
    religionId: '',
    categoryId: '',
    casteId: '',
    primaryLanguage: 'English',

    previousSchool: '',
    previousClass: '',

    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'IN',

    guardianId: '',
    guardianName: '',
    guardianRelationship: 'FATHER',
    guardianPhone: '',
    guardianAltPhone: '',
    guardianEmail: '',
    guardianOccupation: '',
  });

  // Master Data
  const { data: classes } = useClasses(schoolId);
  const { data: academicYears } = useAcademicYears(schoolId || '');
  const { data: religions } = useReligions();
  const { data: categories } = useCategories();
  const { data: castes } = useCastes(undefined, formData.categoryId || undefined);

  const [formError, setFormError] = useState('');

  // Default current academic year
  useEffect(() => {
    if (academicYears && !formData.academicYearId) {
      const current = academicYears.find((ay) => ay.is_current) || academicYears[0];
      if (current) {
        setFormData((prev) => ({ ...prev, academicYearId: current.id }));
      }
    }
  }, [academicYears, formData.academicYearId]);

  // Selected Class details
  const selectedClass = classes?.find((c) => c.id === formData.classId);

  // Auto-suggest next roll number
  const { data: suggestedRoll } = useNextRollNumber({
    academicYearId: formData.academicYearId,
    classId: formData.classId,
    sectionId: formData.sectionId || undefined,
  });

  useEffect(() => {
    if (suggestedRoll?.rollNumber && !formData.rollNumber) {
      setFormData((prev) => ({ ...prev, rollNumber: suggestedRoll.rollNumber }));
    }
  }, [suggestedRoll, formData.rollNumber]);

  // Typeahead Guardian Lookup
  const [guardianSearchQuery, setGuardianSearchQuery] = useState('');
  const { data: guardianSearchResults } = useGuardiansSearch(guardianSearchQuery);

  const handleSelectExistingGuardian = (guardian: any) => {
    setFormData((prev) => ({
      ...prev,
      guardianId: guardian.id,
      guardianName: `${guardian.firstName} ${guardian.lastName}`.trim(),
      guardianRelationship: guardian.relationship || 'GUARDIAN',
      guardianPhone: guardian.phone || '',
      guardianAltPhone: guardian.altPhone || '',
      guardianEmail: guardian.email || '',
      guardianOccupation: guardian.occupation || '',
      addressLine1: guardian.address || prev.addressLine1,
      city: guardian.city || prev.city,
      state: guardian.state || prev.state,
      postalCode: guardian.postalCode || prev.postalCode,
      country: guardian.country || prev.country,
    }));
    setGuardianSearchQuery('');
  };

  const createStudentMutation = useCreateStudent();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.academicYearId || !formData.classId) {
      setFormError('Academic Year and Class are required.');
      return;
    }

    if (!formData.guardianName.trim() || !formData.guardianPhone.trim()) {
      setFormError('Primary guardian name and phone number are required.');
      return;
    }

    try {
      const res = await createStudentMutation.mutateAsync({
        academicYearId: formData.academicYearId,
        classId: formData.classId,
        sectionId: formData.sectionId || undefined,
        rollNumber: formData.rollNumber.trim() || undefined,
        admissionDate: formData.admissionDate,

        firstName: formData.firstName.trim(),
        middleName: formData.middleName.trim() || undefined,
        lastName: formData.lastName.trim(),
        gender: formData.gender,
        dateOfBirth: formData.dateOfBirth,
        bloodGroup: formData.bloodGroup.trim() || undefined,
        placeOfBirth: formData.placeOfBirth.trim() || undefined,
        nationality: formData.nationality.trim() || 'IN',
        religionId: formData.religionId || undefined,
        categoryId: formData.categoryId || undefined,
        casteId: formData.casteId || undefined,
        primaryLanguage: formData.primaryLanguage.trim() || undefined,

        previousSchool: formData.previousSchool.trim() || undefined,
        previousClass: formData.previousClass.trim() || undefined,

        addressLine1: formData.addressLine1.trim() || undefined,
        addressLine2: formData.addressLine2.trim() || undefined,
        city: formData.city.trim() || undefined,
        state: formData.state.trim() || undefined,
        postalCode: formData.postalCode.trim() || undefined,
        country: formData.country.trim() || 'IN',

        guardianId: formData.guardianId || undefined,
        guardianName: formData.guardianName.trim(),
        guardianRelationship: formData.guardianRelationship,
        guardianPhone: formData.guardianPhone.trim(),
        guardianAltPhone: formData.guardianAltPhone.trim() || undefined,
        guardianEmail: formData.guardianEmail.trim() || undefined,
        guardianOccupation: formData.guardianOccupation.trim() || undefined,
      });

      if (res.id) {
        navigate(`/students/${res.id}`);
      } else {
        navigate('/students/list');
      }
    } catch (err: any) {
      setFormError(err?.response?.data?.message || err.message || 'Failed to create student');
    }
  };

  return (
    <div className="space-y-6 pb-20 max-w-4xl mx-auto">
      <StudentsNav />

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          to="/students/list"
          className="p-2 rounded-xl border border-zinc-200 hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-black text-zinc-900 tracking-tight">
            {t('studentsModule.actions.addStudent', 'Add Student Directly')}
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Immediate student creation bypassing the admissions workflow
          </p>
        </div>
      </div>

      {formError && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold">Creation Error</div>
            <div>{formError}</div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Academic & Class Assignment */}
        <div className="bg-white rounded-2xl border border-zinc-200/80 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-zinc-100 pb-3">
            <Building className="w-4 h-4 text-mehndi-600" />
            <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-wide">
              1. Enrollment & Academic Class
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">
                {t('studentsModule.student.academicYear', 'Academic Year')} *
              </label>
              <select
                required
                value={formData.academicYearId}
                onChange={(e) => setFormData({ ...formData, academicYearId: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs bg-white text-zinc-800 focus:ring-2 focus:ring-mehndi-500/20 focus:border-mehndi-500"
              >
                <option value="">Select Academic Year</option>
                {academicYears?.map((ay) => (
                  <option key={ay.id} value={ay.id}>
                    {ay.name} {ay.is_current ? '(Current)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">
                {t('studentsModule.student.class', 'Class')} *
              </label>
              <select
                required
                value={formData.classId}
                onChange={(e) =>
                  setFormData({ ...formData, classId: e.target.value, sectionId: '', rollNumber: '' })
                }
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs bg-white text-zinc-800 focus:ring-2 focus:ring-mehndi-500/20 focus:border-mehndi-500"
              >
                <option value="">Select Class</option>
                {classes?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">
                {t('studentsModule.student.section', 'Section')}
              </label>
              <select
                value={formData.sectionId}
                onChange={(e) =>
                  setFormData({ ...formData, sectionId: e.target.value, rollNumber: '' })
                }
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs bg-white text-zinc-800 focus:ring-2 focus:ring-mehndi-500/20 focus:border-mehndi-500"
              >
                <option value="">No Section</option>
                {selectedClass?.sections?.map((sec) => (
                  <option key={sec.sectionId} value={sec.sectionId}>
                    {sec.section?.name || 'Section'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">
                {t('studentsModule.student.rollNumber', 'Roll Number')}
              </label>
              <input
                type="text"
                value={formData.rollNumber}
                onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })}
                placeholder="Auto-suggested"
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs font-mono font-bold focus:ring-2 focus:ring-mehndi-500/20 focus:border-mehndi-500"
              />
            </div>
          </div>
        </div>

        {/* Student Personal Information */}
        <div className="bg-white rounded-2xl border border-zinc-200/80 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-zinc-100 pb-3">
            <Users className="w-4 h-4 text-mehndi-600" />
            <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-wide">
              2. Student Personal Information
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">First Name *</label>
              <input
                type="text"
                required
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs focus:ring-2 focus:ring-mehndi-500/20 focus:border-mehndi-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">Middle Name</label>
              <input
                type="text"
                value={formData.middleName}
                onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs focus:ring-2 focus:ring-mehndi-500/20 focus:border-mehndi-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">Last Name *</label>
              <input
                type="text"
                required
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs focus:ring-2 focus:ring-mehndi-500/20 focus:border-mehndi-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">
                {t('studentsModule.student.dob', 'Date of Birth')} *
              </label>
              <input
                type="date"
                required
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs focus:ring-2 focus:ring-mehndi-500/20 focus:border-mehndi-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">
                {t('studentsModule.student.gender', 'Gender')} *
              </label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs bg-white text-zinc-800 focus:ring-2 focus:ring-mehndi-500/20 focus:border-mehndi-500"
              >
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">
                {t('studentsModule.student.bloodGroup', 'Blood Group')}
              </label>
              <select
                value={formData.bloodGroup}
                onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs bg-white text-zinc-800 focus:ring-2 focus:ring-mehndi-500/20 focus:border-mehndi-500"
              >
                <option value="">Select Blood Group</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">
                {t('studentsModule.student.religion', 'Religion')}
              </label>
              <select
                value={formData.religionId}
                onChange={(e) => setFormData({ ...formData, religionId: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs bg-white text-zinc-800 focus:ring-2 focus:ring-mehndi-500/20 focus:border-mehndi-500"
              >
                <option value="">Select Religion</option>
                {religions?.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">
                {t('studentsModule.student.category', 'Category')}
              </label>
              <select
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs bg-white text-zinc-800 focus:ring-2 focus:ring-mehndi-500/20 focus:border-mehndi-500"
              >
                <option value="">Select Category</option>
                {categories?.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">
                {t('studentsModule.student.caste', 'Caste')}
              </label>
              <select
                value={formData.casteId}
                onChange={(e) => setFormData({ ...formData, casteId: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs bg-white text-zinc-800 focus:ring-2 focus:ring-mehndi-500/20 focus:border-mehndi-500"
              >
                <option value="">Select Caste</option>
                {castes?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Guardian Information */}
        <div className="bg-white rounded-2xl border border-zinc-200/80 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-mehndi-600" />
              <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-wide">
                3. Primary Guardian Information
              </h2>
            </div>
            {formData.guardianId && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <Check className="w-3 h-3" /> Linked to Existing Guardian
              </span>
            )}
          </div>

          {/* Typeahead Guardian Lookup */}
          <div className="relative">
            <label className="block text-xs font-bold text-zinc-700 mb-1">
              Search Existing Guardian (Sibling Lookup)
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={guardianSearchQuery}
                onChange={(e) => setGuardianSearchQuery(e.target.value)}
                placeholder={t(
                  'studentsModule.guardian.searchPlaceholder',
                  'Type phone or email to search existing guardians...'
                )}
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-zinc-200 text-xs focus:ring-2 focus:ring-mehndi-500/20 focus:border-mehndi-500"
              />
            </div>

            {guardianSearchResults && guardianSearchResults.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-zinc-200 rounded-xl shadow-lg divide-y divide-zinc-100 overflow-hidden max-h-48 overflow-y-auto">
                {guardianSearchResults.map((g) => (
                  <div
                    key={g.id}
                    onClick={() => handleSelectExistingGuardian(g)}
                    className="p-3 hover:bg-mehndi-50/50 cursor-pointer transition-colors flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-zinc-900">
                        {g.firstName} {g.lastName} ({g.relationship})
                      </div>
                      <div className="text-[11px] text-zinc-500 mt-0.5">
                        Phone: {g.phone} {g.email ? `• ${g.email}` : ''}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="px-2.5 py-1 rounded-lg bg-mehndi-600 text-white font-semibold text-[11px]"
                    >
                      {t('studentsModule.guardian.linkExisting', 'Link')}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">
                Guardian Name *
              </label>
              <input
                type="text"
                required
                value={formData.guardianName}
                onChange={(e) => setFormData({ ...formData, guardianName: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs focus:ring-2 focus:ring-mehndi-500/20 focus:border-mehndi-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">
                {t('studentsModule.guardian.relationship', 'Relationship')} *
              </label>
              <select
                value={formData.guardianRelationship}
                onChange={(e) => setFormData({ ...formData, guardianRelationship: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs bg-white text-zinc-800 focus:ring-2 focus:ring-mehndi-500/20 focus:border-mehndi-500"
              >
                <option value="FATHER">Father</option>
                <option value="MOTHER">Mother</option>
                <option value="GUARDIAN">Guardian</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">
                Guardian Phone *
              </label>
              <input
                type="tel"
                required
                value={formData.guardianPhone}
                onChange={(e) => setFormData({ ...formData, guardianPhone: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs focus:ring-2 focus:ring-mehndi-500/20 focus:border-mehndi-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">
                Alternate Phone
              </label>
              <input
                type="tel"
                value={formData.guardianAltPhone}
                onChange={(e) => setFormData({ ...formData, guardianAltPhone: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs focus:ring-2 focus:ring-mehndi-500/20 focus:border-mehndi-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">
                Guardian Email
              </label>
              <input
                type="email"
                value={formData.guardianEmail}
                onChange={(e) => setFormData({ ...formData, guardianEmail: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs focus:ring-2 focus:ring-mehndi-500/20 focus:border-mehndi-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">Occupation</label>
              <input
                type="text"
                value={formData.guardianOccupation}
                onChange={(e) => setFormData({ ...formData, guardianOccupation: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs focus:ring-2 focus:ring-mehndi-500/20 focus:border-mehndi-500"
              />
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="bg-white rounded-2xl border border-zinc-200/80 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-zinc-100 pb-3">
            <MapPin className="w-4 h-4 text-mehndi-600" />
            <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-wide">
              4. {t('studentsModule.student.address', 'Residential Address')}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">Address Line 1</label>
              <input
                type="text"
                value={formData.addressLine1}
                onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs focus:ring-2 focus:ring-mehndi-500/20 focus:border-mehndi-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">Address Line 2</label>
              <input
                type="text"
                value={formData.addressLine2}
                onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs focus:ring-2 focus:ring-mehndi-500/20 focus:border-mehndi-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">
                {t('studentsModule.student.city', 'City')}
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs focus:ring-2 focus:ring-mehndi-500/20 focus:border-mehndi-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">
                {t('studentsModule.student.state', 'State')}
              </label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs focus:ring-2 focus:ring-mehndi-500/20 focus:border-mehndi-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">
                {t('studentsModule.student.postalCode', 'Postal Code')}
              </label>
              <input
                type="text"
                value={formData.postalCode}
                onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs focus:ring-2 focus:ring-mehndi-500/20 focus:border-mehndi-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <Link
            to="/students/list"
            className="px-5 py-2.5 rounded-xl border border-zinc-200 hover:bg-zinc-50 text-xs font-semibold text-zinc-700"
          >
            {t('studentsModule.actions.cancel', 'Cancel')}
          </Link>
          <button
            type="submit"
            disabled={createStudentMutation.isPending}
            className="px-6 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50"
          >
            {createStudentMutation.isPending ? 'Creating Student...' : t('studentsModule.actions.save', 'Create Student')}
          </button>
        </div>
      </form>
    </div>
  );
}
