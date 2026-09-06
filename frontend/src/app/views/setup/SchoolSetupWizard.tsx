import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Building2,
  Image as ImageIcon,
  Calendar,
  Layers,
  Grid,
  BookOpen,
  CreditCard,
  Users,
  Bus,
  Sparkles,
  Plus,
  Upload,
  UserPlus,
  Trash2,
  Copy,
  ShieldAlert,
} from 'lucide-react';
import { useTenant } from '../../../core/tenancy/TenantContext';
import { useAuth } from '../../../core/auth/AuthContext';
import { useToast } from '../../../components/ui/Toast';
import {
  useSetupStatus,
  useExecuteSetupStep,
  useCompleteSetup,
  useCreateSchool,
} from '../../../lib/api/setup';
import {
  useBranding,
  useUploadBranding,
  useDeleteBrandingAsset,
} from '../../../lib/api/configuration';

const WIZARD_STEPS = [
  { id: 'school_name', label: 'School Profile', icon: Building2 },
  { id: 'logo', label: 'Logo & Branding', icon: ImageIcon },
  { id: 'academic_year', label: 'Academic Year', icon: Calendar },
  { id: 'classes', label: 'Classes / Grades', icon: Layers },
  { id: 'sections', label: 'Sections', icon: Grid },
  { id: 'subjects', label: 'Subjects', icon: BookOpen },
  { id: 'fee_structure', label: 'Fee Heads', icon: CreditCard },
  { id: 'users', label: 'Staff Users', icon: Users },
  { id: 'transport', label: 'Transport', icon: Bus },
  { id: 'summary', label: 'Complete', icon: Sparkles },
];

export default function SchoolSetupWizard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { currentTenant, switchSchool } = useTenant();
  const { hasPermission, user } = useAuth();
  const { toast } = useToast();
  const schoolId = currentTenant?.schoolId;

  const { data: statusData, isLoading } = useSetupStatus(schoolId);
  const executeStepMutation = useExecuteSetupStep(schoolId);
  const completeSetupMutation = useCompleteSetup(schoolId);
  const createSchoolMutation = useCreateSchool();

  // Branding queries & mutations
  const brandingQuery = useBranding(schoolId);
  const uploadBrandingMutation = useUploadBranding(schoolId);
  const deleteBrandingMutation = useDeleteBrandingAsset(schoolId);

  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // New School Modal state
  const [isNewSchoolModalOpen, setIsNewSchoolModalOpen] = useState(false);
  const [newSchoolName, setNewSchoolName] = useState('');
  const [newSchoolCode, setNewSchoolCode] = useState('');

  // Form states per step
  // Step 1: School Profile
  const [schoolName, setSchoolName] = useState('');
  const [shortName, setShortName] = useState('');
  const [board, setBoard] = useState('CBSE');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [address, setAddress] = useState('');

  // Step 2: Logo preview
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 3: Academic Year
  const [academicYearName, setAcademicYearName] = useState('2026-2027');
  const [academicStartDate, setAcademicStartDate] = useState('2026-04-01');
  const [academicEndDate, setAcademicEndDate] = useState('2027-03-31');

  // Step 4: Classes (Multi-select / presets)
  const defaultClassPresets = [
    'Nursery',
    'LKG',
    'UKG',
    'Grade 1',
    'Grade 2',
    'Grade 3',
    'Grade 4',
    'Grade 5',
    'Grade 6',
    'Grade 7',
    'Grade 8',
    'Grade 9',
    'Grade 10',
    'Grade 11',
    'Grade 12',
  ];
  const [selectedClasses, setSelectedClasses] = useState<string[]>([
    'Grade 1',
    'Grade 2',
    'Grade 3',
    'Grade 4',
    'Grade 5',
  ]);

  // Step 5: Sections
  const [sectionsList, setSectionsList] = useState<string[]>(['A', 'B']);

  // Step 6: Subjects
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([
    'English',
    'Mathematics',
    'Science',
    'Social Studies',
    'Hindi',
  ]);

  // Step 7: Fee Heads
  const [selectedFeeHeads, setSelectedFeeHeads] = useState<string[]>([
    'Tuition Fee',
    'Admission Fee',
    'Examination Fee',
    'Annual Charges',
  ]);

  // Step 8: Staff Users List
  interface StaffUserDraft {
    fullName: string;
    email: string;
    roleCode: string;
    temporaryPassword?: string;
  }
  const [staffUsers, setStaffUsers] = useState<StaffUserDraft[]>([]);
  const [currentStaffName, setCurrentStaffName] = useState('');
  const [currentStaffEmail, setCurrentStaffEmail] = useState('');
  const [currentStaffRole, setCurrentStaffRole] = useState('principal');
  const [currentStaffPassword, setCurrentStaffPassword] = useState('');
  const [createdStaffResults, setCreatedStaffResults] = useState<
    Array<{
      id: string;
      email: string;
      temporaryPassword: string;
      firstName: string;
      lastName: string | null;
    }>
  >([]);
  const [showStaffSuccessModal, setShowStaffSuccessModal] = useState(false);

  // Step 9: Transport
  const [transportEnabled, setTransportEnabled] = useState(true);

  // Initialize from server progress
  useEffect(() => {
    if (statusData?.progress?.currentStep) {
      const idx = WIZARD_STEPS.findIndex((s) => s.id === statusData.progress.currentStep);
      if (idx !== -1) {
        setCurrentStepIndex(idx);
      }
    }
    if (statusData?.summary?.school?.name) {
      setSchoolName(statusData.summary.school.name);
    }
  }, [statusData]);

  // Initialize existing logo if present in branding
  useEffect(() => {
    const existingLogo = (brandingQuery.data?.values as any)?.logo_url;
    if (existingLogo) {
      setLogoPreviewUrl(existingLogo);
    }
  }, [brandingQuery.data]);

  const canCreateNewSchool = hasPermission('school.create') || Boolean(user?.isSuperadmin);

  // Handle Logo file select
  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size exceeds 5 MB limit.');
      return;
    }

    try {
      setIsUploadingLogo(true);
      const res = await uploadBrandingMutation.mutateAsync({
        file,
        assetType: 'logo',
      });
      const uploadedUrl = (res.values as any)?.logo_url || URL.createObjectURL(file);
      setLogoPreviewUrl(uploadedUrl);
      toast.success('Logo uploaded successfully.');
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || err.message || 'Failed to upload logo.');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleRemoveLogo = async () => {
    try {
      await deleteBrandingMutation.mutateAsync('logo');
      setLogoPreviewUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      toast.success('Logo removed.');
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || err.message || 'Failed to remove logo.');
    }
  };

  // Add staff user to list
  const handleAddStaffUser = () => {
    if (!currentStaffEmail.trim() || !currentStaffName.trim()) {
      toast.error('Please enter both name and email for the staff member.');
      return;
    }
    setStaffUsers((prev) => [
      ...prev,
      {
        fullName: currentStaffName.trim(),
        email: currentStaffEmail.trim(),
        roleCode: currentStaffRole,
        temporaryPassword: currentStaffPassword.trim() || undefined,
      },
    ]);
    setCurrentStaffName('');
    setCurrentStaffEmail('');
    setCurrentStaffPassword('');
    toast.success(`Added ${currentStaffName} to draft list.`);
  };

  const handleRemoveStaffUser = (idx: number) => {
    setStaffUsers((prev) => prev.filter((_, i) => i !== idx));
  };

  // Step transitions
  const handleNextStep = async () => {
    const activeStep = WIZARD_STEPS[currentStepIndex];

    try {
      if (activeStep.id === 'school_name') {
        if (!schoolName.trim()) {
          toast.error('Official school name is required.');
          return;
        }
        await executeStepMutation.mutateAsync({
          stepName: 'school_name',
          payload: {
            name: schoolName,
            shortName: shortName || undefined,
            board,
            contactEmail: contactEmail || undefined,
            contactPhone: contactPhone || undefined,
            address: address || undefined,
          },
        });
      } else if (activeStep.id === 'logo') {
        await executeStepMutation.mutateAsync({
          stepName: 'logo',
          payload: {
            logoUrl: logoPreviewUrl || undefined,
          },
        });
      } else if (activeStep.id === 'academic_year') {
        if (!academicYearName.trim()) {
          toast.error('Academic year name is required.');
          return;
        }
        await executeStepMutation.mutateAsync({
          stepName: 'academic_year',
          payload: {
            name: academicYearName,
            startDate: new Date(academicStartDate).toISOString(),
            endDate: new Date(academicEndDate).toISOString(),
          },
        });
      } else if (activeStep.id === 'classes') {
        if (selectedClasses.length === 0) {
          toast.error('Please select at least one class.');
          return;
        }
        await executeStepMutation.mutateAsync({
          stepName: 'classes',
          payload: {
            classes: selectedClasses.map((name, i) => ({
              name,
              code: name.replace(/\s+/g, '-').toUpperCase(),
              displayOrder: i + 1,
            })),
          },
        });
      } else if (activeStep.id === 'sections') {
        if (sectionsList.length === 0) {
          toast.error('Please specify at least one section letter (e.g. A).');
          return;
        }
        await executeStepMutation.mutateAsync({
          stepName: 'sections',
          payload: {
            mappings: selectedClasses.map((cls) => ({
              classCode: cls.replace(/\s+/g, '-').toUpperCase(),
              sectionNames: sectionsList,
            })),
          },
        });
      } else if (activeStep.id === 'subjects') {
        await executeStepMutation.mutateAsync({
          stepName: 'subjects',
          payload: {
            subjects: selectedSubjects.map((name) => ({
              name,
              code: name.slice(0, 4).toUpperCase(),
              type: 'THEORY',
              classCodes: selectedClasses.map((c) => c.replace(/\s+/g, '-').toUpperCase()),
            })),
          },
        });
      } else if (activeStep.id === 'fee_structure') {
        await executeStepMutation.mutateAsync({
          stepName: 'fee_structure',
          payload: {
            feeHeads: selectedFeeHeads.map((name) => ({
              name,
              code: name.replace(/\s+/g, '_').toUpperCase(),
              isRefundable: false,
            })),
          },
        });
      } else if (activeStep.id === 'users') {
        // If user entered single staff fields without clicking add, include it
        const finalUsers = [...staffUsers];
        if (currentStaffEmail.trim() && currentStaffName.trim()) {
          finalUsers.push({
            fullName: currentStaffName.trim(),
            email: currentStaffEmail.trim(),
            roleCode: currentStaffRole,
            temporaryPassword: currentStaffPassword.trim() || undefined,
          });
        }
        if (finalUsers.length > 0) {
          const res: any = await executeStepMutation.mutateAsync({
            stepName: 'users',
            payload: {
              users: finalUsers.map((u) => ({
                email: u.email,
                fullName: u.fullName,
                roleCode: u.roleCode,
                password: u.temporaryPassword,
              })),
            },
          });
          if (res?.createdUsers && res.createdUsers.length > 0) {
            setCreatedStaffResults(res.createdUsers);
            setShowStaffSuccessModal(true);
            return; // Wait for explicit user acknowledgment of temporary passwords before proceeding
          }
        }
      } else if (activeStep.id === 'transport') {
        await executeStepMutation.mutateAsync({
          stepName: 'transport',
          payload: {
            transportEnabled,
            vehicleTypes: transportEnabled
              ? [
                  { name: 'Standard School Bus', code: 'BUS_STD', capacity: 45 },
                  { name: 'Mini Van', code: 'VAN_MINI', capacity: 18 },
                ]
              : [],
          },
        });
      }

      if (currentStepIndex < WIZARD_STEPS.length - 1) {
        setCurrentStepIndex((prev) => prev + 1);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || err.message || 'Failed to advance step');
    }
  };

  const handleFinishSetup = async () => {
    try {
      await completeSetupMutation.mutateAsync();
      toast.success('School setup completed successfully!');
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || err.message || 'Failed to complete setup');
    }
  };

  // Handle Create New School
  const handleCreateNewSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSchoolName.trim() || !newSchoolCode.trim()) {
      toast.error('Please enter school name and code.');
      return;
    }
    try {
      const created = await createSchoolMutation.mutateAsync({
        name: newSchoolName.trim(),
        code: newSchoolCode.trim().toUpperCase(),
      });
      toast.success(`School "${created.name}" created successfully.`);
      setIsNewSchoolModalOpen(false);
      setNewSchoolName('');
      setNewSchoolCode('');
      // Switch active school context to newly created school
      switchSchool(created.id, created.name);
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || err.message || 'Failed to create school.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-mehndi-600"></div>
      </div>
    );
  }

  const completedSteps = statusData?.progress?.completedSteps || [];
  const isSetupDone = statusData?.progress?.setupStatus === 'COMPLETED';
  const activeStep = WIZARD_STEPS[currentStepIndex];

  return (
    <div className="max-w-5xl mx-auto py-4 space-y-8">
      {/* Top Banner with Create New School Action */}
      <div className="bg-gradient-to-r from-mehndi-900 via-mehndi-800 to-zinc-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="relative z-10 space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-semibold text-mehndi-200">
            <Sparkles className="w-3.5 h-3.5 text-mehndi-300" />
            <span>
              {isSetupDone
                ? t('setup.completed', 'School Setup Completed')
                : t('setup.badge', 'School Onboarding & Setup')}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {t('setup.title', 'Complete Your School Setup')}
          </h1>
          <p className="text-zinc-300 text-sm">
            {t(
              'setup.description',
              'Configure essential school parameters, classes, academic years, and baseline structure to get your school fully operational.'
            )}
          </p>
        </div>

        {canCreateNewSchool && (
          <div className="relative z-10 shrink-0">
            <button
              onClick={() => setIsNewSchoolModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-white text-mehndi-900 hover:bg-mehndi-50 text-xs font-extrabold flex items-center gap-2 shadow-lg transition-all"
            >
              <Plus className="w-4 h-4 text-mehndi-700" />
              <span>{t('setup.createNewSchool', 'Create New School')}</span>
            </button>
          </div>
        )}
      </div>

      {/* Stepper Navigation */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm overflow-x-auto">
        <div className="flex items-center justify-between min-w-[700px] gap-2">
          {WIZARD_STEPS.map((step, idx) => {
            const Icon = step.icon;
            const isDone = completedSteps.includes(step.id);
            const isCurrent = currentStepIndex === idx;

            return (
              <button
                key={step.id}
                onClick={() => setCurrentStepIndex(idx)}
                className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all ${
                  isCurrent
                    ? 'text-mehndi-700 font-bold'
                    : isDone
                      ? 'text-emerald-700'
                      : 'text-zinc-400'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                    isCurrent
                      ? 'bg-mehndi-600 text-white shadow-lg shadow-mehndi-600/30 ring-4 ring-mehndi-100'
                      : isDone
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-zinc-100 text-zinc-400'
                  }`}
                >
                  {isDone && !isCurrent ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                </div>
                <span className="text-xs tracking-tight whitespace-nowrap">{step.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step Content Card */}
      <div className="bg-white border border-zinc-200 rounded-3xl p-6 sm:p-8 shadow-sm">
        {/* STEP 1: SCHOOL PROFILE */}
        {activeStep.id === 'school_name' && (
          <div className="space-y-6 max-w-xl">
            <div>
              <h2 className="text-xl font-bold text-zinc-900">Step 1: School Identity</h2>
              <p className="text-sm text-zinc-500">Provide legal school identification details.</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-zinc-700">
                  Official School Name *
                </label>
                <input
                  type="text"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  placeholder="e.g. Delhi Public Academy"
                  className="input-field mt-1 w-full"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-zinc-700">
                    Short Name / Acronym
                  </label>
                  <input
                    type="text"
                    value={shortName}
                    onChange={(e) => setShortName(e.target.value)}
                    placeholder="e.g. DPA"
                    className="input-field mt-1 w-full"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-700">
                    {t('setup.educationalBoard', 'Educational Board')}
                  </label>
                  <select
                    value={board}
                    onChange={(e) => setBoard(e.target.value)}
                    className="input-field mt-1 w-full"
                  >
                    <option value="CBSE">{t('setup.boards.cbse', 'CBSE')}</option>
                    <option value="ICSE">{t('setup.boards.icse', 'ICSE')}</option>
                    <option value="STATE_BOARD">{t('setup.boards.stateBoard', 'State Board')}</option>
                    <option value="IB">{t('setup.boards.ib', 'International Baccalaureate (IB)')}</option>
                    <option value="CAMBRIDGE">{t('setup.boards.cambridge', 'Cambridge (IGCSE)')}</option>
                    <option value="OTHER">{t('setup.boards.other', 'Other')}</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-zinc-700">
                    {t('setup.contactEmail', 'Contact Email')}
                  </label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="admin@school.edu"
                    className="input-field mt-1 w-full"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-700">
                    {t('setup.contactPhone', 'Contact Phone')}
                  </label>
                  <input
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="+91 9876543210"
                    className="input-field mt-1 w-full"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-700">
                  {t('setup.campusAddress', 'Campus Address')}
                </label>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street address, City, State"
                  className="input-field mt-1 w-full"
                  rows={2}
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: LOGO & BRANDING (WIRED LIVE FILE UPLOAD) */}
        {activeStep.id === 'logo' && (
          <div className="space-y-6 max-w-xl">
            <div>
              <h2 className="text-xl font-bold text-zinc-900">Step 2: School Logo & Branding</h2>
              <p className="text-sm text-zinc-500">
                Upload your official school crest or badge for receipts, student IDs, and reports.
              </p>
            </div>

            <div className="border-2 border-dashed border-zinc-200 rounded-3xl p-8 text-center space-y-4">
              {logoPreviewUrl ? (
                <div className="space-y-4">
                  <div className="w-28 h-28 mx-auto rounded-2xl border border-zinc-200 p-2 bg-white shadow-md flex items-center justify-center overflow-hidden">
                    <img
                      src={logoPreviewUrl}
                      alt="School Crest Preview"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <div>
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Logo Uploaded
                    </span>
                  </div>
                  <div className="flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="btn-secondary py-1.5 px-3 text-xs"
                    >
                      {t('setup.changeLogo', 'Change Logo')}
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="text-xs text-red-600 hover:text-red-700 py-1.5 px-3"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="w-16 h-16 rounded-full bg-mehndi-50 text-mehndi-600 flex items-center justify-center mx-auto">
                    <Upload className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-zinc-900">Choose School Crest or Logo</h3>
                    <p className="text-xs text-zinc-500">PNG, JPG, WebP, or ICO. Max 5 MB.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingLogo}
                    className="btn-primary py-2 px-5 text-xs inline-flex items-center gap-2"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>
                      {isUploadingLogo ? 'Uploading...' : t('setup.uploadLogo', 'Select Logo File')}
                    </span>
                  </button>
                </div>
              )}

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleLogoFileChange}
                accept="image/png,image/jpeg,image/webp,image/x-icon"
                className="hidden"
              />
            </div>
            <p className="text-xs text-zinc-400">
              Note: You can skip this step and adjust branding anytime under Configuration →
              Branding.
            </p>
          </div>
        )}

        {/* STEP 3: ACADEMIC YEAR */}
        {activeStep.id === 'academic_year' && (
          <div className="space-y-6 max-w-xl">
            <div>
              <h2 className="text-xl font-bold text-zinc-900">Step 3: Initial Academic Year</h2>
              <p className="text-sm text-zinc-500">
                Define the current operational academic session.
              </p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-zinc-700">Session Name *</label>
                <input
                  type="text"
                  value={academicYearName}
                  onChange={(e) => setAcademicYearName(e.target.value)}
                  placeholder="e.g. 2026-2027"
                  className="input-field mt-1 w-full"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-zinc-700">Start Date</label>
                  <input
                    type="date"
                    value={academicStartDate}
                    onChange={(e) => setAcademicStartDate(e.target.value)}
                    className="input-field mt-1 w-full"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-700">End Date</label>
                  <input
                    type="date"
                    value={academicEndDate}
                    onChange={(e) => setAcademicEndDate(e.target.value)}
                    className="input-field mt-1 w-full"
                    required
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: CLASSES / GRADES */}
        {activeStep.id === 'classes' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-zinc-900">Step 4: Academic Classes / Grades</h2>
              <p className="text-sm text-zinc-500">
                Select the classes taught at this campus. You can easily add more later in Master
                Data.
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {defaultClassPresets.map((cls) => {
                const isSelected = selectedClasses.includes(cls);
                return (
                  <button
                    key={cls}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        setSelectedClasses(selectedClasses.filter((c) => c !== cls));
                      } else {
                        setSelectedClasses([...selectedClasses, cls]);
                      }
                    }}
                    className={`p-3.5 rounded-2xl border text-sm font-semibold flex items-center justify-between transition-all ${
                      isSelected
                        ? 'bg-mehndi-50 border-mehndi-500 text-mehndi-800 shadow-xs'
                        : 'bg-white border-zinc-200 text-zinc-600 hover:border-zinc-300'
                    }`}
                  >
                    <span>{cls}</span>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-mehndi-600" />}
                  </button>
                );
              })}
            </div>
            <div className="text-xs text-zinc-500">
              {selectedClasses.length} classes currently selected.
            </div>
          </div>
        )}

        {/* STEP 5: SECTIONS */}
        {activeStep.id === 'sections' && (
          <div className="space-y-6 max-w-xl">
            <div>
              <h2 className="text-xl font-bold text-zinc-900">Step 5: Class Sections</h2>
              <p className="text-sm text-zinc-500">
                Default sections to instantiate for all selected classes (e.g. A, B, C).
              </p>
            </div>
            <div className="flex items-center gap-3">
              {['A', 'B', 'C', 'D'].map((sec) => {
                const isSelected = sectionsList.includes(sec);
                return (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        if (sectionsList.length > 1) {
                          setSectionsList(sectionsList.filter((s) => s !== sec));
                        }
                      } else {
                        setSectionsList([...sectionsList, sec]);
                      }
                    }}
                    className={`w-12 h-12 rounded-2xl border text-sm font-bold flex items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-mehndi-600 border-mehndi-600 text-white shadow-md'
                        : 'bg-white border-zinc-200 text-zinc-600 hover:border-zinc-300'
                    }`}
                  >
                    {sec}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-zinc-500">
              Each of your {selectedClasses.length} classes will automatically have sections{' '}
              <strong>{sectionsList.join(', ')}</strong> mapped.
            </p>
          </div>
        )}

        {/* STEP 6: SUBJECTS */}
        {activeStep.id === 'subjects' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-zinc-900">Step 6: Baseline Subjects</h2>
              <p className="text-sm text-zinc-500">
                Select standard curriculum subjects to initialize.
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {[
                'English',
                'Mathematics',
                'Science',
                'Social Studies',
                'Hindi',
                'Computer Science',
                'Environmental Studies',
                'Physics',
                'Chemistry',
                'Biology',
              ].map((sub) => {
                const isSelected = selectedSubjects.includes(sub);
                return (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        setSelectedSubjects(selectedSubjects.filter((s) => s !== sub));
                      } else {
                        setSelectedSubjects([...selectedSubjects, sub]);
                      }
                    }}
                    className={`p-3 rounded-2xl border text-sm font-semibold flex items-center justify-between transition-all ${
                      isSelected
                        ? 'bg-mehndi-50 border-mehndi-500 text-mehndi-800 shadow-xs'
                        : 'bg-white border-zinc-200 text-zinc-600'
                    }`}
                  >
                    <span>{sub}</span>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-mehndi-600" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 7: FEE HEADS */}
        {activeStep.id === 'fee_structure' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-zinc-900">Step 7: Standard Fee Heads</h2>
              <p className="text-sm text-zinc-500">
                Initialize primary recurring fee collection heads.
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                'Tuition Fee',
                'Admission Fee',
                'Examination Fee',
                'Annual Charges',
                'Library Fee',
                'Computer Lab Fee',
                'Sports Fee',
                'Transport Fee',
              ].map((fee) => {
                const isSelected = selectedFeeHeads.includes(fee);
                return (
                  <button
                    key={fee}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        setSelectedFeeHeads(selectedFeeHeads.filter((f) => f !== fee));
                      } else {
                        setSelectedFeeHeads([...selectedFeeHeads, fee]);
                      }
                    }}
                    className={`p-3 rounded-2xl border text-sm font-semibold flex items-center justify-between transition-all ${
                      isSelected
                        ? 'bg-mehndi-50 border-mehndi-500 text-mehndi-800 shadow-xs'
                        : 'bg-white border-zinc-200 text-zinc-600'
                    }`}
                  >
                    <span>{fee}</span>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-mehndi-600" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 8: STAFF USERS (NO IMAGINARY EMAIL INVITATIONS, DIRECT CREATION WITH PASSWORDS) */}
        {activeStep.id === 'users' && (
          <div className="space-y-6 max-w-2xl">
            <div>
              <h2 className="text-xl font-bold text-zinc-900">Step 8: Staff User Setup</h2>
              <p className="text-sm text-zinc-500">
                Add administrative or academic staff to this school. Accounts are created
                immediately with login access.
              </p>
            </div>

            <div className="bg-zinc-50 rounded-2xl p-5 border border-zinc-200 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-zinc-700">Staff Full Name *</label>
                  <input
                    type="text"
                    value={currentStaffName}
                    onChange={(e) => setCurrentStaffName(e.target.value)}
                    placeholder="e.g. Dr. Rajesh Sharma"
                    className="input-field mt-1 w-full text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-700">
                    Staff Email Address *
                  </label>
                  <input
                    type="email"
                    value={currentStaffEmail}
                    onChange={(e) => setCurrentStaffEmail(e.target.value)}
                    placeholder="rajesh@school.edu"
                    className="input-field mt-1 w-full text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-zinc-700">
                    {t('setup.assignedRole', 'Assigned Role')}
                  </label>
                  <select
                    value={currentStaffRole}
                    onChange={(e) => setCurrentStaffRole(e.target.value)}
                    className="input-field mt-1 w-full text-sm"
                  >
                    <option value="principal">{t('setup.roles.principal', 'Principal / Head of School')}</option>
                    <option value="school_admin">{t('setup.roles.schoolAdmin', 'School Administrator')}</option>
                    <option value="teacher">{t('setup.roles.teacher', 'Teacher')}</option>
                    <option value="accountant">{t('setup.roles.accountant', 'Accountant / Bursar')}</option>
                    <option value="staff">{t('setup.roles.staff', 'General Staff')}</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-700">
                    {t('setup.initialPasswordOptional', 'Initial Password (Optional)')}
                  </label>
                  <input
                    type="text"
                    value={currentStaffPassword}
                    onChange={(e) => setCurrentStaffPassword(e.target.value)}
                    placeholder="Leave blank to auto-generate unique secure password"
                    className="input-field mt-1 w-full text-sm font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-zinc-500">
                  {t(
                    'setup.passwordHelp',
                    'Leaving blank auto-generates a unique cryptographically secure temporary password, shown once after saving.'
                  )}
                </span>
                <button
                  type="button"
                  onClick={handleAddStaffUser}
                  className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1.5 font-bold"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{t('setup.addToList', 'Add to List')}</span>
                </button>
              </div>
            </div>

            {/* Added Staff Members List */}
            {staffUsers.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                  {t('setup.staffMembersToCreate', 'Staff Members to Create')} ({staffUsers.length}):
                </h4>
                <div className="divide-y divide-zinc-200 border border-zinc-200 rounded-2xl overflow-hidden bg-white">
                  {staffUsers.map((u, idx) => (
                    <div key={idx} className="p-3.5 flex items-center justify-between text-sm">
                      <div>
                        <span className="font-bold text-zinc-900">{u.fullName}</span>
                        <span className="text-zinc-500 text-xs ml-2">({u.email})</span>
                        <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-semibold bg-mehndi-50 text-mehndi-700">
                          {u.roleCode}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveStaffUser(idx)}
                        className="text-zinc-400 hover:text-red-600 p-1 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 9: TRANSPORT */}
        {activeStep.id === 'transport' && (
          <div className="space-y-6 max-w-xl">
            <div>
              <h2 className="text-xl font-bold text-zinc-900">Step 9: Transport Readiness</h2>
              <p className="text-sm text-zinc-500">
                Configure whether this school operates transportation fleets.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={transportEnabled}
                  onChange={(e) => setTransportEnabled(e.target.checked)}
                  className="w-5 h-5 rounded text-mehndi-600 focus:ring-mehndi-500"
                />
                <span className="text-sm font-semibold text-zinc-900">
                  Enable student bus and transport tracking for this campus
                </span>
              </label>
            </div>
          </div>
        )}

        {/* STEP 10: SUMMARY / COMPLETE */}
        {activeStep.id === 'summary' && (
          <div className="space-y-6 max-w-2xl">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                <Sparkles className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-zinc-900">Ready to Launch!</h2>
              <p className="text-sm text-zinc-500">
                Review your configured operational structure before marking setup complete.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 bg-zinc-50 p-5 rounded-2xl border border-zinc-200 text-sm">
              <div>
                <span className="text-xs text-zinc-500 block">School Name</span>
                <strong className="text-zinc-900">
                  {statusData?.summary?.school?.name || schoolName}
                </strong>
              </div>
              <div>
                <span className="text-xs text-zinc-500 block">Board</span>
                <strong className="text-zinc-900">
                  {statusData?.summary?.school?.board || board}
                </strong>
              </div>
              <div>
                <span className="text-xs text-zinc-500 block">Classes</span>
                <strong className="text-zinc-900">
                  {statusData?.summary?.classesCount || selectedClasses.length} Defined
                </strong>
              </div>
              <div>
                <span className="text-xs text-zinc-500 block">Academic Year</span>
                <strong className="text-zinc-900">
                  {statusData?.summary?.hasAcademicYear ? 'Active' : academicYearName}
                </strong>
              </div>
            </div>

            <button
              onClick={handleFinishSetup}
              disabled={completeSetupMutation.isPending}
              className="btn-primary w-full py-3.5 text-base font-bold flex items-center justify-center gap-2 shadow-lg shadow-mehndi-600/20"
            >
              <Sparkles className="w-5 h-5" />
              <span>
                {completeSetupMutation.isPending
                  ? 'Finalizing Setup...'
                  : 'Complete School Setup & Go to Dashboard'}
              </span>
            </button>
          </div>
        )}

        {/* Action Controls (Back / Skip / Continue) */}
        {activeStep.id !== 'summary' && (
          <div className="flex items-center justify-between pt-8 mt-8 border-t border-zinc-100">
            <button
              type="button"
              onClick={() => setCurrentStepIndex((prev) => Math.max(0, prev - 1))}
              disabled={currentStepIndex === 0}
              className="btn-secondary py-2 px-4 text-sm flex items-center gap-2 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>{t('setup.previousStep', 'Back')}</span>
            </button>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  setCurrentStepIndex((prev) => Math.min(WIZARD_STEPS.length - 1, prev + 1))
                }
                className="text-xs text-zinc-500 hover:text-zinc-900 px-3 py-2 font-medium"
              >
                {t('setup.skipStep', 'Skip Step')}
              </button>
              <button
                type="button"
                onClick={handleNextStep}
                disabled={executeStepMutation.isPending}
                className="btn-primary py-2.5 px-6 text-sm flex items-center gap-2 shadow-sm"
              >
                <span>
                  {executeStepMutation.isPending
                    ? 'Saving...'
                    : t('setup.nextStep', 'Save & Continue')}
                </span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CREATE NEW SCHOOL MODAL */}
      {isNewSchoolModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-zinc-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
              <div className="flex items-center gap-2 text-mehndi-700">
                <Building2 className="w-5 h-5" />
                <h2 className="text-lg font-bold text-zinc-900">Create New School</h2>
              </div>
              <button
                onClick={() => setIsNewSchoolModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 p-1.5 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNewSchool} className="space-y-4 pt-4">
              <div>
                <label className="text-xs font-semibold text-zinc-700">
                  Official School Legal Name *
                </label>
                <input
                  type="text"
                  value={newSchoolName}
                  onChange={(e) => setNewSchoolName(e.target.value)}
                  placeholder="e.g. Saint Jude International School"
                  className="input-field mt-1 w-full text-sm"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-700">School Code *</label>
                <input
                  type="text"
                  value={newSchoolCode}
                  onChange={(e) => setNewSchoolCode(e.target.value.toUpperCase())}
                  placeholder="e.g. SJIS-01"
                  className="input-field mt-1 w-full text-sm font-mono"
                  required
                />
              </div>
              <p className="text-xs text-zinc-500">
                The new school will be initialized with dedicated configurations and will
                immediately open in onboarding.
              </p>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsNewSchoolModalOpen(false)}
                  className="btn-secondary py-2 px-4 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createSchoolMutation.isPending}
                  className="btn-primary py-2 px-5 text-sm"
                >
                  {createSchoolMutation.isPending ? 'Creating...' : 'Create & Launch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STAFF CREATION SUCCESS SECURE MODAL */}
      {showStaffSuccessModal && createdStaffResults.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-zinc-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-zinc-900">
                  {t('setup.staffCreatedSuccess', 'Staff User Created Successfully')}
                </h3>
                <p className="text-xs text-zinc-500">
                  {t('setup.staffCreatedSubtitle', 'Secure one-time temporary credentials generated')}
                </p>
              </div>
            </div>

            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl mb-5 text-xs text-amber-900 leading-relaxed flex gap-2.5">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong>{t('setup.importantNotice', 'Important Notice:')}</strong>{' '}
                {t(
                  'setup.tempPasswordNotice',
                  'This temporary password is shown only once. The user will be required to change it after signing in.'
                )}
              </div>
            </div>

            <div className="space-y-3 max-h-64 overflow-y-auto pr-1 mb-6">
              {createdStaffResults.map((u, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-zinc-50 border border-zinc-200 rounded-2xl space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-zinc-900">
                        {u.firstName} {u.lastName || ''}
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-0.5">
                      Email:
                    </div>
                    <div className="text-xs font-mono font-medium text-zinc-800">{u.email}</div>
                  </div>

                  <div>
                    <div className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-0.5">
                      Temporary Password:
                    </div>
                    <div className="flex items-center justify-between bg-white border border-zinc-300 rounded-xl px-3 py-2">
                      <span className="font-mono text-xs font-bold text-zinc-900 select-all">
                        {u.temporaryPassword}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(u.temporaryPassword);
                          toast.success(`Temporary password for ${u.email} copied!`);
                        }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-medium transition-colors"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>{t('setup.copyPassword', 'Copy Password')}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowStaffSuccessModal(false);
                  setCreatedStaffResults([]);
                  setStaffUsers([]);
                  setCurrentStaffName('');
                  setCurrentStaffEmail('');
                  setCurrentStaffPassword('');
                  setCurrentStepIndex((prev) => Math.min(prev + 1, WIZARD_STEPS.length - 1));
                }}
                className="w-full btn-primary py-3 text-sm font-bold flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>I have saved these details</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
