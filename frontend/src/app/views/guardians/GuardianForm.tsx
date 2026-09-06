import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Save,
  ArrowLeft,
  AlertTriangle,
  ExternalLink,
  Users,
} from 'lucide-react';
import { ParentsNav } from './ParentsNav';
import {
  useGuardian,
  useCreateGuardian,
  useUpdateGuardian,
  useCheckDuplicateGuardians,
} from '../../../lib/api/guardians';
import { useStudents } from '../../../lib/api/students';

export default function GuardianForm() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { data: existingGuardian, isLoading: isExistingLoading } = useGuardian(id);
  const createMutation = useCreateGuardian();
  const updateMutation = useUpdateGuardian(id || '');
  const checkDuplicateMutation = useCheckDuplicateGuardians();

  // Form states
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [relationship, setRelationship] = useState('FATHER');
  const [phone, setPhone] = useState('');
  const [altPhone, setAltPhone] = useState('');
  const [email, setEmail] = useState('');
  const [occupation, setOccupation] = useState('');
  const [employer, setEmployer] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('IN');
  const [preferredLanguage, setPreferredLanguage] = useState<'en' | 'hi' | 'hinglish'>('en');
  const [emailNotification, setEmailNotification] = useState(true);
  const [smsNotification, setSmsNotification] = useState(true);
  const [whatsappNotification, setWhatsappNotification] = useState(false);

  // Initial student link (for create mode)
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [isPrimary, setIsPrimary] = useState(true);
  const [isEmergencyContact, setIsEmergencyContact] = useState(true);
  const [hasPickupPermission, setHasPickupPermission] = useState(true);
  const [studentSearchTerm, setStudentSearchTerm] = useState('');

  const { data: studentSearchResults } = useStudents({
    search: studentSearchTerm,
    limit: 5,
    status: 'ACTIVE',
  });

  // Duplicate warning state
  const [duplicateWarning, setDuplicateWarning] = useState<{
    hasExactMatch: boolean;
    hasPotentialMatch: boolean;
    duplicates: any[];
  } | null>(null);

  // Load existing data in edit mode
  useEffect(() => {
    if (existingGuardian && isEdit) {
      setFirstName(existingGuardian.firstName || '');
      setMiddleName(existingGuardian.middleName || '');
      setLastName(existingGuardian.lastName || '');
      setRelationship(existingGuardian.relationship || 'FATHER');
      setPhone(existingGuardian.phone || '');
      setAltPhone(existingGuardian.altPhone || '');
      setEmail(existingGuardian.email || '');
      setOccupation(existingGuardian.occupation || '');
      setEmployer(existingGuardian.employer || '');
      setAddress(existingGuardian.address || '');
      setCity(existingGuardian.city || '');
      setState(existingGuardian.state || '');
      setPostalCode(existingGuardian.postalCode || '');
      setCountry(existingGuardian.country || 'IN');
      setPreferredLanguage(existingGuardian.preferredLanguage || 'en');
      setEmailNotification(existingGuardian.emailNotification ?? true);
      setSmsNotification(existingGuardian.smsNotification ?? true);
      setWhatsappNotification(existingGuardian.whatsappNotification ?? false);
    }
  }, [existingGuardian, isEdit]);

  // Live duplicate check on phone or email debounce
  useEffect(() => {
    if (phone.length >= 7 || (email && email.includes('@'))) {
      const timer = setTimeout(async () => {
        try {
          const res = await checkDuplicateMutation.mutateAsync({
            phone: phone.trim() || undefined,
            email: email.trim() || undefined,
            excludeGuardianId: id,
          });
          if (res.hasPotentialMatch) {
            setDuplicateWarning(res);
          } else {
            setDuplicateWarning(null);
          }
        } catch (err) {
          // ignore error
        }
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setDuplicateWarning(null);
    }
  }, [phone, email, id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !phone.trim()) return;

    const payload: any = {
      firstName: firstName.trim(),
      middleName: middleName.trim() || null,
      lastName: lastName.trim(),
      relationship,
      phone: phone.trim(),
      altPhone: altPhone.trim() || null,
      email: email.trim() || null,
      occupation: occupation.trim() || null,
      employer: employer.trim() || null,
      address: address.trim() || null,
      city: city.trim() || null,
      state: state.trim() || null,
      postalCode: postalCode.trim() || null,
      country,
      preferredLanguage,
      emailNotification,
      smsNotification,
      whatsappNotification,
    };

    if (!isEdit && selectedStudentId) {
      payload.studentId = selectedStudentId;
      payload.isPrimary = isPrimary;
      payload.isEmergencyContact = isEmergencyContact;
      payload.hasPickupPermission = hasPickupPermission;
    }

    try {
      if (isEdit) {
        await updateMutation.mutateAsync(payload);
        navigate(`/guardians/${id}`);
      } else {
        const created = await createMutation.mutateAsync(payload);
        navigate(`/guardians/${created.id}`);
      }
    } catch (err) {
      console.error('Failed to save guardian:', err);
    }
  };

  if (isExistingLoading) {
    return (
      <div className="space-y-6 pb-12">
        <ParentsNav />
        <div className="py-20 text-center text-xs text-zinc-400">Loading guardian data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto">
      <ParentsNav />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Form Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to={isEdit ? `/guardians/${id}` : '/guardians'}
              className="p-2 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-600 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h2 className="text-xl font-black text-zinc-900 tracking-tight">
                {isEdit
                  ? t('common.actions.edit', 'Edit Guardian Profile')
                  : t('parentsModule.actions.addGuardian', 'Add New Guardian')}
              </h2>
              <p className="text-xs text-zinc-500">
                {isEdit
                  ? 'Update guardian contact and demographic details'
                  : 'Register a canonical guardian and optionally associate initial student'}
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={createMutation.isPending || updateMutation.isPending}
            className="px-5 py-2.5 rounded-xl bg-mehndi-600 hover:bg-mehndi-700 disabled:opacity-50 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>
              {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save Guardian'}
            </span>
          </button>
        </div>

        {/* Live Duplicate Warning Banner */}
        {duplicateWarning && duplicateWarning.hasPotentialMatch && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-xs text-amber-900 space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-800">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Duplicate Guardian Match Warning</span>
            </div>
            <p className="text-zinc-600 text-[11px]">
              A guardian with this phone or email already exists in the school database:
            </p>
            <div className="space-y-1">
              {duplicateWarning.duplicates.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-white border border-amber-200"
                >
                  <span className="font-bold text-zinc-900">
                    {d.name} ({d.relationship}) • {d.phone}
                  </span>
                  <Link
                    to={`/guardians/${d.id}`}
                    target="_blank"
                    className="inline-flex items-center gap-1 text-mehndi-700 hover:underline font-semibold"
                  >
                    <span>View Existing</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Demographics Card */}
        <div className="bg-white rounded-2xl border border-zinc-200/80 p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-zinc-900 border-b border-zinc-100 pb-3">
            Primary Identification & Relationship
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-bold text-zinc-700 mb-1">
                First Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50/40 focus:bg-white focus:outline-none focus:border-mehndi-500"
              />
            </div>

            <div>
              <label className="block font-bold text-zinc-700 mb-1">Middle Name</label>
              <input
                type="text"
                value={middleName}
                onChange={(e) => setMiddleName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50/40 focus:bg-white focus:outline-none focus:border-mehndi-500"
              />
            </div>

            <div>
              <label className="block font-bold text-zinc-700 mb-1">
                Last Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50/40 focus:bg-white focus:outline-none focus:border-mehndi-500"
              />
            </div>

            <div>
              <label className="block font-bold text-zinc-700 mb-1">
                Relationship <span className="text-rose-500">*</span>
              </label>
              <select
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50/40 focus:bg-white focus:outline-none focus:border-mehndi-500"
              >
                <option value="FATHER">Father</option>
                <option value="MOTHER">Mother</option>
                <option value="GUARDIAN">Guardian</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-zinc-700 mb-1">
                Primary Phone <span className="text-rose-500">*</span>
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50/40 focus:bg-white focus:outline-none focus:border-mehndi-500 font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-zinc-700 mb-1">Alternate Phone</label>
              <input
                type="tel"
                value={altPhone}
                onChange={(e) => setAltPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50/40 focus:bg-white focus:outline-none focus:border-mehndi-500 font-mono"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-bold text-zinc-700 mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50/40 focus:bg-white focus:outline-none focus:border-mehndi-500"
              />
            </div>

            <div>
              <label className="block font-bold text-zinc-700 mb-1">Occupation</label>
              <input
                type="text"
                value={occupation}
                onChange={(e) => setOccupation(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50/40 focus:bg-white focus:outline-none focus:border-mehndi-500"
              />
            </div>
          </div>
        </div>

        {/* Address Card */}
        <div className="bg-white rounded-2xl border border-zinc-200/80 p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-zinc-900 border-b border-zinc-100 pb-3">
            Address & Residence
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="sm:col-span-3">
              <label className="block font-bold text-zinc-700 mb-1">Street Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50/40 focus:bg-white focus:outline-none focus:border-mehndi-500"
              />
            </div>

            <div>
              <label className="block font-bold text-zinc-700 mb-1">City</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50/40 focus:bg-white focus:outline-none focus:border-mehndi-500"
              />
            </div>

            <div>
              <label className="block font-bold text-zinc-700 mb-1">State / Province</label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50/40 focus:bg-white focus:outline-none focus:border-mehndi-500"
              />
            </div>

            <div>
              <label className="block font-bold text-zinc-700 mb-1">Postal Code</label>
              <input
                type="text"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50/40 focus:bg-white focus:outline-none focus:border-mehndi-500"
              />
            </div>
          </div>
        </div>

        {/* Initial Student Association (Only on create) */}
        {!isEdit && (
          <div className="bg-white rounded-2xl border border-zinc-200/80 p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-zinc-900 border-b border-zinc-100 pb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-mehndi-600" />
              <span>Optional Initial Student Association</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-500 mb-1">Search Student to Link</label>
                <input
                  type="text"
                  placeholder="Type student name or ID..."
                  value={studentSearchTerm}
                  onChange={(e) => setStudentSearchTerm(e.target.value)}
                  className="w-full p-2 border border-zinc-200 rounded-xl mb-2"
                />
                <div className="max-h-32 overflow-y-auto space-y-1 border border-zinc-200 rounded-xl p-1 bg-zinc-50/30">
                  {studentSearchResults?.items?.map((st: any) => (
                    <div
                      key={st.id}
                      onClick={() => setSelectedStudentId(st.id)}
                      className={`p-2 rounded text-xs cursor-pointer ${
                        selectedStudentId === st.id ? 'bg-mehndi-100 font-bold text-mehndi-900' : 'hover:bg-zinc-100'
                      }`}
                    >
                      {st.firstName} {st.lastName} (ID: {st.studentId})
                    </div>
                  ))}
                </div>
              </div>

              {selectedStudentId && (
                <div className="pt-2 border-t border-zinc-100 grid grid-cols-3 gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isPrimary}
                      onChange={(e) => setIsPrimary(e.target.checked)}
                      className="rounded text-mehndi-600 focus:ring-mehndi-500"
                    />
                    <span className="font-semibold text-zinc-700">Primary Guardian</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isEmergencyContact}
                      onChange={(e) => setIsEmergencyContact(e.target.checked)}
                      className="rounded text-mehndi-600 focus:ring-mehndi-500"
                    />
                    <span className="text-zinc-700">Emergency Contact</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasPickupPermission}
                      onChange={(e) => setHasPickupPermission(e.target.checked)}
                      className="rounded text-mehndi-600 focus:ring-mehndi-500"
                    />
                    <span className="text-zinc-700">Pickup Authorized</span>
                  </label>
                </div>
              )}
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
