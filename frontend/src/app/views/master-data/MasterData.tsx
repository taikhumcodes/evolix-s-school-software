import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Layers,
  BookOpen,
  Users,
  CreditCard,
  Briefcase,
  Bus,
  MapPin,
  Plus,
  Search,
  Archive,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  GraduationCap,
  X,
} from 'lucide-react';
import { useTenant } from '../../../core/tenancy/TenantContext';
import { useToast } from '../../../components/ui/Toast';
import {
  useClasses,
  useCreateClass,
  useUpdateClass,
  useArchiveClass,
  useRestoreClass,
  useSections,
  useCreateSection,
  useUpdateSection,
  useArchiveSection,
  useRestoreSection,
  useClassSections,
  useCreateClassSection,
  useDeleteClassSection,
  useSubjects,
  useCreateSubject,
  useUpdateSubject,
  useArchiveSubject,
  useRestoreSubject,
  useClassSubjects,
  useCreateClassSubject,
  useDeleteClassSubject,
  useReligions,
  useCreateReligion,
  useUpdateReligion,
  useArchiveReligion,
  useCategories,
  useCreateCategory,
  useUpdateCategory,
  useArchiveCategory,
  useCastes,
  useCreateCaste,
  useUpdateCaste,
  useArchiveCaste,
  useVehicleTypes,
  useCreateVehicleType,
  useUpdateVehicleType,
  useArchiveVehicleType,
  useFeeHeads,
  useCreateFeeHead,
  useUpdateFeeHead,
  useArchiveFeeHead,
  useExpenseHeads,
  useCreateExpenseHead,
  useUpdateExpenseHead,
  useArchiveExpenseHead,
  useDepartments,
  useCreateDepartment,
  useUpdateDepartment,
  useArchiveDepartment,
  useDesignations,
  useCreateDesignation,
  useUpdateDesignation,
  useArchiveDesignation,
  useCountries,
  useCreateCountry,
  useUpdateCountry,
  useStates,
  useCreateState,
  useUpdateState,
  useCities,
  useCreateCity,
  useUpdateCity,
} from '../../../lib/api/master-data';
import { filterAndRankRecords } from '../../../lib/search/search-engine';

type TabGroup = 'academic' | 'student' | 'finance' | 'hr' | 'transport' | 'locations';
type AcademicSubTab = 'classes' | 'sections' | 'class-sections' | 'subjects' | 'class-subjects';

export default function MasterData() {
  const { t } = useTranslation();
  const { currentTenant } = useTenant();
  const { toast, confirm } = useToast();
  const schoolId = currentTenant?.schoolId;

  const [searchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as TabGroup) || 'academic';
  const initialSubTab = (searchParams.get('sub') as AcademicSubTab) || 'classes';
  const initialSearch = searchParams.get('search') || '';

  const [activeTab, setActiveTab] = useState<TabGroup>(initialTab);
  const [academicSubTab, setAcademicSubTab] = useState<AcademicSubTab>(initialSubTab);
  const [search, setSearch] = useState(initialSearch);
  const [includeArchived, setIncludeArchived] = useState(false);

  useEffect(() => {
    const tabParam = searchParams.get('tab') as TabGroup | null;
    const subParam = searchParams.get('sub') as AcademicSubTab | null;
    const qParam = searchParams.get('search');
    if (tabParam) setActiveTab(tabParam);
    if (subParam) setAcademicSubTab(subParam);
    if (qParam !== null && qParam !== undefined) setSearch(qParam);
  }, [searchParams]);

  // Dialog & Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<string>('');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Common Form Fields
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formDisplayOrder, setFormDisplayOrder] = useState(0);
  const [formLevel, setFormLevel] = useState('Primary');
  const [formType, setFormType] = useState<'THEORY' | 'PRACTICAL' | 'BOTH'>('THEORY');
  const [formCapacity, setFormCapacity] = useState<number | ''>(40);
  const [formIsElective, setFormIsElective] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  const [selectedCountryId, setSelectedCountryId] = useState('');
  const [selectedStateId, setSelectedStateId] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formIsoCode, setFormIsoCode] = useState('');
  const [formDialCode, setFormDialCode] = useState('+91');
  const [formCurrency, setFormCurrency] = useState('INR');

  // Queries
  const classesQuery = useClasses(schoolId, undefined, includeArchived);
  const sectionsQuery = useSections(schoolId, undefined);
  const classSectionsQuery = useClassSections({ schoolId, classId: selectedClassId || undefined });
  const subjectsQuery = useSubjects(schoolId, undefined);
  const classSubjectsQuery = useClassSubjects({ schoolId, classId: selectedClassId || undefined });
  const religionsQuery = useReligions();
  const categoriesQuery = useCategories();
  const castesQuery = useCastes(undefined, selectedCategoryId || undefined);
  const vehicleTypesQuery = useVehicleTypes();
  const feeHeadsQuery = useFeeHeads(schoolId);
  const expenseHeadsQuery = useExpenseHeads(schoolId);
  const departmentsQuery = useDepartments(schoolId);
  const designationsQuery = useDesignations(schoolId);
  const countriesQuery = useCountries();
  const statesQuery = useStates(selectedCountryId || undefined);
  const citiesQuery = useCities(selectedStateId || undefined);

  // Mutations
  const createClassMutation = useCreateClass(schoolId);
  const updateClassMutation = useUpdateClass(schoolId);
  const archiveClassMutation = useArchiveClass(schoolId);
  const restoreClassMutation = useRestoreClass(schoolId);

  const createSectionMutation = useCreateSection(schoolId);
  const updateSectionMutation = useUpdateSection(schoolId);
  const archiveSectionMutation = useArchiveSection(schoolId);
  const restoreSectionMutation = useRestoreSection(schoolId);

  const createClassSectionMutation = useCreateClassSection(schoolId);
  const deleteClassSectionMutation = useDeleteClassSection(schoolId);

  const createSubjectMutation = useCreateSubject(schoolId);
  const updateSubjectMutation = useUpdateSubject(schoolId);
  const archiveSubjectMutation = useArchiveSubject(schoolId);
  const restoreSubjectMutation = useRestoreSubject(schoolId);

  const createClassSubjectMutation = useCreateClassSubject(schoolId);
  const deleteClassSubjectMutation = useDeleteClassSubject(schoolId);

  const createReligionMutation = useCreateReligion(schoolId);
  const updateReligionMutation = useUpdateReligion();
  const archiveReligionMutation = useArchiveReligion();

  const createCategoryMutation = useCreateCategory(schoolId);
  const updateCategoryMutation = useUpdateCategory();
  const archiveCategoryMutation = useArchiveCategory();

  const createCasteMutation = useCreateCaste(schoolId);
  const updateCasteMutation = useUpdateCaste();
  const archiveCasteMutation = useArchiveCaste();

  const createVehicleTypeMutation = useCreateVehicleType(schoolId);
  const updateVehicleTypeMutation = useUpdateVehicleType();
  const archiveVehicleTypeMutation = useArchiveVehicleType();

  const createFeeHeadMutation = useCreateFeeHead(schoolId);
  const updateFeeHeadMutation = useUpdateFeeHead(schoolId);
  const archiveFeeHeadMutation = useArchiveFeeHead(schoolId);

  const createExpenseHeadMutation = useCreateExpenseHead(schoolId);
  const updateExpenseHeadMutation = useUpdateExpenseHead(schoolId);
  const archiveExpenseHeadMutation = useArchiveExpenseHead(schoolId);

  const createDepartmentMutation = useCreateDepartment(schoolId);
  const updateDepartmentMutation = useUpdateDepartment(schoolId);
  const archiveDepartmentMutation = useArchiveDepartment(schoolId);

  const createDesignationMutation = useCreateDesignation(schoolId);
  const updateDesignationMutation = useUpdateDesignation(schoolId);
  const archiveDesignationMutation = useArchiveDesignation(schoolId);

  const createCountryMutation = useCreateCountry();
  const updateCountryMutation = useUpdateCountry();
  const createStateMutation = useCreateState();
  const updateStateMutation = useUpdateState();
  const createCityMutation = useCreateCity();
  const updateCityMutation = useUpdateCity();

  // Filter and rank lists based on deep search engine
  const filteredClasses = useMemo(() => {
    let list = classesQuery.data || [];
    if (!includeArchived) list = list.filter((c) => !c.archivedAt);
    return filterAndRankRecords(list, search, (c) => ({
      name: c.name || '',
      code: c.code || '',
      related: [c.academicLevel],
    }));
  }, [classesQuery.data, search, includeArchived]);

  const filteredSections = useMemo(() => {
    let list = sectionsQuery.data || [];
    if (!includeArchived) list = list.filter((s) => !s.archivedAt);
    return filterAndRankRecords(list, search, (s) => ({
      name: s.name || '',
      code: s.code || '',
    }));
  }, [sectionsQuery.data, search, includeArchived]);

  const filteredClassSections = useMemo(() => {
    const list = classSectionsQuery.data || [];
    return filterAndRankRecords(list, search, (m) => ({
      name: `${m.class?.name || ''} - ${m.section?.name || ''}`,
      code: m.section?.name || '',
      related: [m.class?.name, m.section?.name, String(m.capacity || '')],
    }));
  }, [classSectionsQuery.data, search]);

  const filteredSubjects = useMemo(() => {
    let list = subjectsQuery.data || [];
    if (!includeArchived) list = list.filter((s) => !s.archivedAt);
    return filterAndRankRecords(list, search, (s) => ({
      name: s.name || '',
      code: s.code || '',
      related: [s.type],
    }));
  }, [subjectsQuery.data, search, includeArchived]);

  const filteredClassSubjects = useMemo(() => {
    const list = classSubjectsQuery.data || [];
    return filterAndRankRecords(list, search, (m) => ({
      name: m.subject?.name || '',
      code: m.subject?.code || '',
      related: [m.subject?.type, m.isElective ? 'Elective' : 'Core'],
    }));
  }, [classSubjectsQuery.data, search]);

  const filteredReligions = useMemo(() => {
    const list = religionsQuery.data || [];
    return filterAndRankRecords(list, search, (r) => ({
      name: r.name || '',
      code: r.code || '',
    }));
  }, [religionsQuery.data, search]);

  const filteredCategories = useMemo(() => {
    const list = categoriesQuery.data || [];
    return filterAndRankRecords(list, search, (c) => ({
      name: c.name || '',
      code: c.code || '',
    }));
  }, [categoriesQuery.data, search]);

  const filteredCastes = useMemo(() => {
    const list = castesQuery.data || [];
    return filterAndRankRecords(list, search, (c) => ({
      name: c.name || '',
      code: c.code || '',
      related: [c.category?.name],
    }));
  }, [castesQuery.data, search]);

  const filteredVehicleTypes = useMemo(() => {
    const list = vehicleTypesQuery.data || [];
    return filterAndRankRecords(list, search, (v) => ({
      name: v.name || '',
      code: v.code || '',
      related: [String(v.capacity || '')],
    }));
  }, [vehicleTypesQuery.data, search]);

  const filteredFeeHeads = useMemo(() => {
    const list = feeHeadsQuery.data || [];
    return filterAndRankRecords(list, search, (f) => ({
      name: f.name || '',
      code: f.code || '',
      related: [f.description],
    }));
  }, [feeHeadsQuery.data, search]);

  const filteredExpenseHeads = useMemo(() => {
    const list = expenseHeadsQuery.data || [];
    return filterAndRankRecords(list, search, (e) => ({
      name: e.name || '',
      code: e.code || '',
    }));
  }, [expenseHeadsQuery.data, search]);

  const filteredDepartments = useMemo(() => {
    const list = departmentsQuery.data || [];
    return filterAndRankRecords(list, search, (d) => ({
      name: d.name || '',
      code: d.code || '',
      related: [d.description],
    }));
  }, [departmentsQuery.data, search]);

  const filteredDesignations = useMemo(() => {
    const list = designationsQuery.data || [];
    return filterAndRankRecords(list, search, (d) => ({
      name: d.name || '',
      code: d.code || '',
      related: [d.department?.name, d.description],
    }));
  }, [designationsQuery.data, search]);

  const filteredCountries = useMemo(() => {
    const list = countriesQuery.data || [];
    return filterAndRankRecords(list, search, (c) => ({
      name: c.name || '',
      code: c.isoCode || '',
      related: [c.dialCode, c.currency],
    }));
  }, [countriesQuery.data, search]);

  const filteredStates = useMemo(() => {
    const list = statesQuery.data || [];
    return filterAndRankRecords(list, search, (s) => ({
      name: s.name || '',
      code: s.code || '',
    }));
  }, [statesQuery.data, search]);

  const filteredCities = useMemo(() => {
    const list = citiesQuery.data || [];
    return filterAndRankRecords(list, search, (c) => ({
      name: c.name || '',
      code: '',
    }));
  }, [citiesQuery.data, search]);

  // Modal open handlers
  const openCreateModal = (type: string) => {
    setEditingId(null);
    setModalType(type);
    setFormName('');
    setFormCode('');
    setFormDisplayOrder(0);
    setFormLevel('Primary');
    setFormType('THEORY');
    setFormCapacity(40);
    setFormDescription('');
    setFormIsElective(false);
    setFormIsoCode('');
    setFormDialCode('+91');
    setFormCurrency('INR');

    if (classesQuery.data?.[0]) setSelectedClassId(classesQuery.data[0].id);
    if (sectionsQuery.data?.[0]) setSelectedSectionId(sectionsQuery.data[0].id);
    if (subjectsQuery.data?.[0]) setSelectedSubjectId(subjectsQuery.data[0].id);
    if (categoriesQuery.data?.[0]) setSelectedCategoryId(categoriesQuery.data[0].id);
    if (departmentsQuery.data?.[0]) setSelectedDepartmentId(departmentsQuery.data[0].id);
    if (countriesQuery.data?.[0]) setSelectedCountryId(countriesQuery.data[0].id);
    if (statesQuery.data?.[0]) setSelectedStateId(statesQuery.data[0].id);

    setIsModalOpen(true);
  };

  const openEditModal = (type: string, record: any) => {
    setEditingId(record.id);
    setModalType(type);
    setFormName(record.name || '');
    setFormCode(record.code || '');
    setFormDisplayOrder(record.displayOrder || 0);
    setFormLevel(record.academicLevel || 'Primary');
    setFormType(record.type || 'THEORY');
    setFormCapacity(
      record.capacity !== undefined && record.capacity !== null ? record.capacity : 40
    );
    setFormDescription(record.description || '');
    setSelectedCategoryId(record.categoryId || '');
    setSelectedDepartmentId(record.departmentId || '');
    setFormIsoCode(record.isoCode || '');
    setFormDialCode(record.dialCode || '+91');
    setFormCurrency(record.currency || 'INR');
    if (record.countryId) setSelectedCountryId(record.countryId);
    if (record.stateId) setSelectedStateId(record.stateId);

    setIsModalOpen(true);
  };

  // Error handler mapping raw 500s to localized genericServerError
  const getErrorMessage = (err: any, fallbackKey: string, defaultFallback: string) => {
    console.error('[MasterData Error Details]:', err);
    const status = err?.response?.status;
    const backendMsg = err?.response?.data?.error?.message;
    const errMsg = err?.message || '';

    if (
      status === 500 ||
      errMsg.includes('500') ||
      backendMsg === 'An unexpected internal error occurred'
    ) {
      return t(
        'masterData.prompts.genericServerError',
        'Something went wrong while saving. Please try again.'
      );
    }

    return (
      backendMsg ||
      (errMsg && !errMsg.includes('Request failed') ? errMsg : t(fallbackKey, defaultFallback))
    );
  };

  // Safe Archive Confirmation
  const handleArchive = async (_title: string, onConfirm: () => Promise<any>) => {
    const ok = await confirm({
      title: t('masterData.confirm.archiveTitle', 'Archive Record'),
      message: t(
        'masterData.confirm.archiveMessage',
        'Are you sure you want to archive this record? It will be safely hidden and can be restored at any time.'
      ),
      confirmText: t('common.actions.archive', 'Archive'),
      isDestructive: true,
    });
    if (ok) {
      try {
        await onConfirm();
        toast.success(t('masterData.prompts.archiveSuccess', 'Record archived successfully.'));
      } catch (err: any) {
        toast.error(getErrorMessage(err, 'masterData.prompts.archiveError', 'Failed to archive record.'));
      }
    }
  };

  // Safe Restore Confirmation
  const handleRestore = async (onConfirm: () => Promise<any>) => {
    try {
      await onConfirm();
      toast.success(t('masterData.prompts.restoreSuccess', 'Record restored successfully.'));
    } catch (err: any) {
      toast.error(getErrorMessage(err, 'masterData.prompts.restoreError', 'Failed to restore record.'));
    }
  };

  // Safe Status Toggle
  const handleToggleActive = async (
    onToggle: (isActive: boolean) => Promise<any>,
    currentActive: boolean
  ) => {
    try {
      await onToggle(!currentActive);
      toast.success(
        currentActive
          ? t('masterData.prompts.archiveSuccess', 'Record deactivated.')
          : t('masterData.prompts.restoreSuccess', 'Record activated.')
      );
    } catch (err: any) {
      toast.error(getErrorMessage(err, 'masterData.prompts.saveError', 'Failed to update record status.'));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (modalType === 'class') {
        if (editingId) {
          await updateClassMutation.mutateAsync({
            id: editingId,
            data: {
              name: formName,
              code: formCode || undefined,
              displayOrder: Number(formDisplayOrder),
              academicLevel: formLevel,
            },
          });
        } else {
          await createClassMutation.mutateAsync({
            name: formName,
            code: formCode || formName.replace(/\s+/g, '-').toUpperCase(),
            displayOrder: Number(formDisplayOrder),
            academicLevel: formLevel,
          });
        }
      } else if (modalType === 'section') {
        if (editingId) {
          await updateSectionMutation.mutateAsync({
            id: editingId,
            data: {
              name: formName,
              code: formCode || undefined,
              displayOrder: Number(formDisplayOrder),
            },
          });
        } else {
          await createSectionMutation.mutateAsync({
            name: formName,
            code: formCode || `SEC-${formName.toUpperCase()}`,
            displayOrder: Number(formDisplayOrder),
          });
        }
      } else if (modalType === 'class-section') {
        await createClassSectionMutation.mutateAsync({
          classId: selectedClassId,
          sectionId: selectedSectionId,
          capacity: formCapacity !== '' ? Number(formCapacity) : undefined,
        });
      } else if (modalType === 'subject') {
        if (editingId) {
          await updateSubjectMutation.mutateAsync({
            id: editingId,
            data: {
              name: formName,
              code: formCode || undefined,
              type: formType,
            },
          });
        } else {
          await createSubjectMutation.mutateAsync({
            name: formName,
            code: formCode || formName.slice(0, 4).toUpperCase(),
            type: formType,
          });
        }
      } else if (modalType === 'class-subject') {
        await createClassSubjectMutation.mutateAsync({
          classId: selectedClassId,
          subjectId: selectedSubjectId,
          isElective: formIsElective,
        });
      } else if (modalType === 'religion') {
        if (editingId) {
          await updateReligionMutation.mutateAsync({
            id: editingId,
            data: { name: formName, code: formCode },
          });
        } else {
          await createReligionMutation.mutateAsync({ name: formName, code: formCode });
        }
      } else if (modalType === 'category') {
        if (editingId) {
          await updateCategoryMutation.mutateAsync({
            id: editingId,
            data: { name: formName, code: formCode },
          });
        } else {
          await createCategoryMutation.mutateAsync({ name: formName, code: formCode });
        }
      } else if (modalType === 'caste') {
        if (editingId) {
          await updateCasteMutation.mutateAsync({
            id: editingId,
            data: { name: formName, code: formCode, categoryId: selectedCategoryId || null },
          });
        } else {
          await createCasteMutation.mutateAsync({
            name: formName,
            code: formCode,
            categoryId: selectedCategoryId || null,
          });
        }
      } else if (modalType === 'vehicle-type') {
        const capacityNum = formCapacity !== '' ? Number(formCapacity) : null;
        if (editingId) {
          await updateVehicleTypeMutation.mutateAsync({
            id: editingId,
            data: {
              name: formName,
              code: formCode,
              capacity: capacityNum,
              description: formDescription,
            },
          });
        } else {
          await createVehicleTypeMutation.mutateAsync({
            name: formName,
            code: formCode,
            capacity: capacityNum,
            description: formDescription,
          });
        }
      } else if (modalType === 'fee-head') {
        if (editingId) {
          await updateFeeHeadMutation.mutateAsync({
            id: editingId,
            data: {
              name: formName,
              code: formCode,
              description: formDescription,
              displayOrder: Number(formDisplayOrder),
            },
          });
        } else {
          await createFeeHeadMutation.mutateAsync({
            name: formName,
            code: formCode || formName.replace(/\s+/g, '_').toUpperCase(),
            description: formDescription,
            displayOrder: Number(formDisplayOrder),
          });
        }
      } else if (modalType === 'expense-head') {
        if (editingId) {
          await updateExpenseHeadMutation.mutateAsync({
            id: editingId,
            data: {
              name: formName,
              code: formCode,
              description: formDescription,
              displayOrder: Number(formDisplayOrder),
            },
          });
        } else {
          await createExpenseHeadMutation.mutateAsync({
            name: formName,
            code: formCode || formName.replace(/\s+/g, '_').toUpperCase(),
            description: formDescription,
            displayOrder: Number(formDisplayOrder),
          });
        }
      } else if (modalType === 'department') {
        if (editingId) {
          await updateDepartmentMutation.mutateAsync({
            id: editingId,
            data: {
              name: formName,
              code: formCode,
              description: formDescription,
            },
          });
        } else {
          await createDepartmentMutation.mutateAsync({
            name: formName,
            code: formCode || formName.slice(0, 5).toUpperCase(),
            description: formDescription,
          });
        }
      } else if (modalType === 'designation') {
        if (editingId) {
          await updateDesignationMutation.mutateAsync({
            id: editingId,
            data: {
              name: formName,
              code: formCode,
              departmentId: selectedDepartmentId || null,
              description: formDescription,
              displayOrder: Number(formDisplayOrder),
            },
          });
        } else {
          await createDesignationMutation.mutateAsync({
            name: formName,
            code: formCode || formName.slice(0, 5).toUpperCase(),
            departmentId: selectedDepartmentId || null,
            description: formDescription,
            displayOrder: Number(formDisplayOrder),
          });
        }
      } else if (modalType === 'country') {
        if (editingId) {
          await updateCountryMutation.mutateAsync({
            id: editingId,
            data: {
              name: formName,
              isoCode: formIsoCode,
              dialCode: formDialCode,
              currency: formCurrency,
            },
          });
        } else {
          await createCountryMutation.mutateAsync({
            name: formName,
            isoCode: formIsoCode,
            dialCode: formDialCode,
            currency: formCurrency,
          });
        }
      } else if (modalType === 'state') {
        if (editingId) {
          await updateStateMutation.mutateAsync({
            id: editingId,
            data: { name: formName, code: formCode },
          });
        } else {
          await createStateMutation.mutateAsync({
            countryId: selectedCountryId,
            name: formName,
            code: formCode,
          });
        }
      } else if (modalType === 'city') {
        if (editingId) {
          await updateCityMutation.mutateAsync({
            id: editingId,
            data: { name: formName },
          });
        } else {
          await createCityMutation.mutateAsync({
            stateId: selectedStateId,
            name: formName,
          });
        }
      }

      toast.success(t('masterData.prompts.saveSuccess', 'Record saved successfully.'));
      setIsModalOpen(false);
    } catch (err: any) {
      toast.error(getErrorMessage(err, 'masterData.prompts.saveError', 'Failed to save record.'));
    }
  };

  const getAddButtonType = () => {
    if (activeTab === 'academic') {
      if (academicSubTab === 'sections') return 'section';
      if (academicSubTab === 'class-sections') return 'class-section';
      if (academicSubTab === 'subjects') return 'subject';
      if (academicSubTab === 'class-subjects') return 'class-subject';
      return 'class';
    }
    if (activeTab === 'student') return 'category';
    if (activeTab === 'finance') return 'fee-head';
    if (activeTab === 'hr') return 'department';
    if (activeTab === 'transport') return 'vehicle-type';
    if (activeTab === 'locations') return 'country';
    return 'class';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-mehndi-700 font-semibold text-xs tracking-wider uppercase">
            <Layers className="w-4 h-4" />
            <span>{t('masterData.title', 'Master Data Reference Hub')}</span>
          </div>
          <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight mt-1">
            {t('masterData.subtitle', 'Centralized School Reference Data')}
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {t(
              'masterData.description',
              'Manage reusable academic, demographic, financial, and organizational reference entities.'
            )}
          </p>
        </div>

        {/* Global Toolbar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder={t('masterData.search.placeholder', t('common.actions.search', 'Search...'))}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-9 pr-8 py-1.5 text-xs w-48 sm:w-60"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-zinc-600 p-0.5 rounded-full"
                aria-label={t('masterData.search.clear', 'Clear search')}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <label className="flex items-center gap-1.5 text-xs text-zinc-600 cursor-pointer select-none bg-zinc-50 px-2.5 py-1.5 rounded-xl border border-zinc-200 hover:bg-zinc-100 transition-colors">
            <input
              type="checkbox"
              checked={includeArchived}
              onChange={(e) => setIncludeArchived(e.target.checked)}
              className="rounded text-mehndi-600 focus:ring-mehndi-500 w-3.5 h-3.5"
            />
            <span>{t('masterData.actions.showArchived', 'Show Archived')}</span>
          </label>

          <button
            onClick={() => openCreateModal(getAddButtonType())}
            className="btn-primary py-1.5 px-3.5 text-xs flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>{t('common.actions.create', 'Add New')}</span>
          </button>
        </div>
      </div>

      {/* Primary Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-zinc-200">
        {[
          {
            id: 'academic',
            label: t('masterData.tabs.academic', 'Academic Structure'),
            icon: BookOpen,
          },
          { id: 'student', label: t('masterData.tabs.student', 'Demographics'), icon: Users },
          {
            id: 'finance',
            label: t('masterData.tabs.finance', 'Financial Heads'),
            icon: CreditCard,
          },
          { id: 'hr', label: t('masterData.tabs.hr', 'Departments & Roles'), icon: Briefcase },
          { id: 'transport', label: t('masterData.tabs.transport', 'Transport'), icon: Bus },
          { id: 'locations', label: t('masterData.tabs.locations', 'Geographic'), icon: MapPin },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as TabGroup);
                setSearch('');
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shrink-0 ${
                isActive
                  ? 'bg-mehndi-600 text-white shadow-md shadow-mehndi-600/20'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: ACADEMIC */}
      {activeTab === 'academic' && (
        <div className="space-y-4">
          {/* Secondary Sub-Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-zinc-100 rounded-xl overflow-x-auto">
            <button
              onClick={() => {
                setAcademicSubTab('classes');
                setSearch('');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                academicSubTab === 'classes'
                  ? 'bg-white text-zinc-900 shadow-sm'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              {t('masterData.academic.classes', 'Classes / Grades')}
            </button>
            <button
              onClick={() => {
                setAcademicSubTab('sections');
                setSearch('');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                academicSubTab === 'sections'
                  ? 'bg-white text-zinc-900 shadow-sm'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              {t('masterData.academic.sections', 'Sections')}
            </button>
            <button
              onClick={() => {
                setAcademicSubTab('class-sections');
                setSearch('');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                academicSubTab === 'class-sections'
                  ? 'bg-white text-zinc-900 shadow-sm'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              {t('masterData.academic.mappings', 'Class-Section Assignment')}
            </button>
            <button
              onClick={() => {
                setAcademicSubTab('subjects');
                setSearch('');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                academicSubTab === 'subjects'
                  ? 'bg-white text-zinc-900 shadow-sm'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              {t('masterData.academic.subjects', 'Subjects')}
            </button>
            <button
              onClick={() => {
                setAcademicSubTab('class-subjects');
                setSearch('');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                academicSubTab === 'class-subjects'
                  ? 'bg-white text-zinc-900 shadow-sm'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              {t('masterData.academic.classSubjects', 'Subject-Class Assignment')}
            </button>
          </div>

          {/* Sub-Tab: Classes */}
          {academicSubTab === 'classes' && (
            <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 text-xs uppercase font-semibold">
                    <tr>
                      <th className="px-5 py-3">{t('masterData.table.order', 'Order')}</th>
                      <th className="px-5 py-3">{t('masterData.table.className', 'Class Name')}</th>
                      <th className="px-5 py-3">{t('masterData.table.code', 'Code')}</th>
                      <th className="px-5 py-3">{t('masterData.table.stageLevel', 'Stage / Level')}</th>
                      <th className="px-5 py-3">{t('masterData.academic.mappings', 'Sections Assigned')}</th>
                      <th className="px-5 py-3">{t('masterData.table.status', 'Status')}</th>
                      <th className="px-5 py-3 text-right">{t('masterData.table.actions', 'Actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200">
                    {classesQuery.isLoading ? (
                      <tr>
                        <td colSpan={7} className="text-center py-6 text-zinc-400">
                          {t('admin.configuration.loading', 'Loading classes...')}
                        </td>
                      </tr>
                    ) : filteredClasses.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-6 text-zinc-400">
                          {search.trim()
                            ? t('masterData.emptyStates.searchNoResults', 'No matching records found.')
                            : t('masterData.emptyStates.noClasses', 'No classes found. Click Add New to define classes.')}
                        </td>
                      </tr>
                    ) : (
                      filteredClasses.map((c) => {
                        const isArchived = Boolean(c.archivedAt);
                        return (
                          <tr
                            key={c.id}
                            className={`hover:bg-zinc-50/50 transition-colors ${isArchived ? 'bg-zinc-50/80 opacity-75' : ''}`}
                          >
                            <td className="px-5 py-3.5 font-bold text-zinc-500">
                              {c.displayOrder}
                            </td>
                            <td className="px-5 py-3.5 font-bold text-zinc-900 flex items-center gap-2">
                              <span>{c.name}</span>
                              {isArchived && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-zinc-200 text-zinc-700">
                                  {t('masterData.status.archived', 'Archived')}
                                </span>
                              )}
                            </td>
                            <td className="px-5 py-3.5 font-mono text-xs text-mehndi-700 bg-mehndi-50 px-2 py-0.5 rounded-md inline-block mt-2">
                              {c.code}
                            </td>
                            <td className="px-5 py-3.5 text-zinc-600">{c.academicLevel || '—'}</td>
                            <td className="px-5 py-3.5 text-zinc-600">
                              {c.sections?.length
                                ? c.sections.map((s) => s.section?.name).join(', ')
                                : t('masterData.table.none', 'None')}
                            </td>
                            <td className="px-5 py-3.5">
                              <button
                                onClick={() =>
                                  handleToggleActive(
                                    (isActive) =>
                                      updateClassMutation.mutateAsync({
                                        id: c.id,
                                        data: { isActive },
                                      }),
                                    c.isActive
                                  )
                                }
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                                  c.isActive
                                    ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                                }`}
                              >
                                {c.isActive ? (
                                  <CheckCircle2 className="w-3 h-3" />
                                ) : (
                                  <XCircle className="w-3 h-3" />
                                )}
                                {c.isActive
                                  ? t('masterData.status.active', 'Active')
                                  : t('masterData.status.inactive', 'Inactive')}
                              </button>
                            </td>
                            <td className="px-5 py-3.5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {!isArchived && (
                                  <>
                                    <button
                                      onClick={() => openEditModal('class', c)}
                                      className="text-zinc-500 hover:text-zinc-900 p-1.5 rounded-lg hover:bg-zinc-100 transition-colors"
                                      title={t('common.actions.edit', 'Edit')}
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() =>
                                        handleArchive(c.name, () =>
                                          archiveClassMutation.mutateAsync(c.id)
                                        )
                                      }
                                      className="text-zinc-400 hover:text-amber-600 p-1.5 rounded-lg hover:bg-amber-50 transition-colors"
                                      title={t('common.actions.archive', 'Archive')}
                                    >
                                      <Archive className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                                {isArchived && (
                                  <button
                                    onClick={() =>
                                      handleRestore(() => restoreClassMutation.mutateAsync(c.id))
                                    }
                                    className="text-mehndi-600 hover:text-mehndi-700 p-1.5 rounded-lg hover:bg-mehndi-50 transition-colors flex items-center gap-1 text-xs font-semibold"
                                    title={t('common.actions.restore', 'Restore')}
                                  >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    <span>{t('masterData.actions.restore', 'Restore')}</span>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Sub-Tab: Sections */}
          {academicSubTab === 'sections' && (
            <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 text-xs uppercase font-semibold">
                    <tr>
                      <th className="px-5 py-3">{t('masterData.table.order', 'Order')}</th>
                      <th className="px-5 py-3">{t('masterData.table.sectionName', 'Section Name')}</th>
                      <th className="px-5 py-3">{t('masterData.table.code', 'Code')}</th>
                      <th className="px-5 py-3">{t('masterData.table.status', 'Status')}</th>
                      <th className="px-5 py-3 text-right">{t('masterData.table.actions', 'Actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200">
                    {filteredSections.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-6 text-zinc-400">
                          {search.trim()
                            ? t('masterData.emptyStates.searchNoResults', 'No matching records found.')
                            : t('masterData.emptyStates.noSections', 'No sections found. Click Add New to create sections.')}
                        </td>
                      </tr>
                    ) : (
                      filteredSections.map((s) => {
                        const isArchived = Boolean(s.archivedAt);
                        return (
                          <tr
                            key={s.id}
                            className={`hover:bg-zinc-50/50 transition-colors ${isArchived ? 'bg-zinc-50/80 opacity-75' : ''}`}
                          >
                            <td className="px-5 py-3.5 font-bold text-zinc-500">{s.displayOrder}</td>
                            <td className="px-5 py-3.5 font-bold text-zinc-900">{s.name}</td>
                            <td className="px-5 py-3.5 font-mono text-xs text-zinc-600">{s.code}</td>
                            <td className="px-5 py-3.5">
                              <button
                                onClick={() =>
                                  handleToggleActive(
                                    (isActive) =>
                                      updateSectionMutation.mutateAsync({
                                        id: s.id,
                                        data: { isActive },
                                      }),
                                    s.isActive
                                  )
                                }
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                                  s.isActive
                                    ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                                }`}
                              >
                                {s.isActive ? (
                                  <CheckCircle2 className="w-3 h-3" />
                                ) : (
                                  <XCircle className="w-3 h-3" />
                                )}
                                {s.isActive
                                  ? t('masterData.status.active', 'Active')
                                  : t('masterData.status.inactive', 'Inactive')}
                              </button>
                            </td>
                            <td className="px-5 py-3.5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {!isArchived && (
                                  <>
                                    <button
                                      onClick={() => openEditModal('section', s)}
                                      className="text-zinc-500 hover:text-zinc-900 p-1.5 rounded-lg hover:bg-zinc-100 transition-colors"
                                      title={t('common.actions.edit', 'Edit')}
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() =>
                                        handleArchive(s.name, () =>
                                          archiveSectionMutation.mutateAsync(s.id)
                                        )
                                      }
                                      className="text-zinc-400 hover:text-amber-600 p-1.5 rounded-lg hover:bg-amber-50 transition-colors"
                                      title={t('common.actions.archive', 'Archive')}
                                    >
                                      <Archive className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                                {isArchived && (
                                  <button
                                    onClick={() =>
                                      handleRestore(() => restoreSectionMutation.mutateAsync(s.id))
                                    }
                                    className="text-mehndi-600 hover:text-mehndi-700 p-1.5 rounded-lg hover:bg-mehndi-50 transition-colors flex items-center gap-1 text-xs font-semibold"
                                    title={t('common.actions.restore', 'Restore')}
                                  >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    <span>{t('masterData.actions.restore', 'Restore')}</span>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Sub-Tab: Class-Section Mappings */}
          {academicSubTab === 'class-sections' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-zinc-50 p-4 rounded-2xl border border-zinc-200">
                <div className="flex items-center gap-3">
                  <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                    {t('masterData.form.selectClass', 'Filter By Class:')}
                  </label>
                  <select
                    value={selectedClassId}
                    onChange={(e) => setSelectedClassId(e.target.value)}
                    className="input-field text-xs py-1.5"
                  >
                    <option value="">{t('masterData.form.selectClass', 'All Classes')}</option>
                    {classesQuery.data?.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={() => openCreateModal('class-section')}
                  className="btn-primary py-1.5 px-3 text-xs flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>{t('masterData.actions.assignSection', 'Assign Section to Class')}</span>
                </button>
              </div>

              <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-sm">
                  <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 text-xs uppercase font-semibold">
                    <tr>
                      <th className="px-5 py-3">{t('masterData.table.assignedClass', 'Class')}</th>
                      <th className="px-5 py-3">{t('masterData.table.assignedSection', 'Assigned Section')}</th>
                      <th className="px-5 py-3">{t('masterData.table.capacity', 'Student Capacity')}</th>
                      <th className="px-5 py-3 text-right">{t('masterData.table.actions', 'Actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200">
                    {filteredClassSections.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center py-6 text-zinc-400">
                          {search.trim()
                            ? t('masterData.emptyStates.searchNoResults', 'No matching records found.')
                            : t('masterData.emptyStates.noClassSections', 'No class-section mappings found.')}
                        </td>
                      </tr>
                    ) : (
                      filteredClassSections.map((m) => (
                        <tr key={m.id} className="hover:bg-zinc-50/50 transition-colors">
                          <td className="px-5 py-3.5 font-bold text-zinc-900">{m.class?.name}</td>
                          <td className="px-5 py-3.5 font-semibold text-mehndi-700">
                            {t('masterData.table.section', 'Section')} {m.section?.name}
                          </td>
                          <td className="px-5 py-3.5 text-zinc-600">{m.capacity} {t('masterData.table.students', 'students')}</td>
                          <td className="px-5 py-3.5 text-right">
                            <button
                              onClick={() => deleteClassSectionMutation.mutate(m.id)}
                              className="text-zinc-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                              title={t('masterData.actions.remove', 'Remove Assignment')}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Sub-Tab: Subjects */}
          {academicSubTab === 'subjects' && (
            <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 text-xs uppercase font-semibold">
                  <tr>
                    <th className="px-5 py-3">{t('masterData.table.subjectName', 'Subject Name')}</th>
                    <th className="px-5 py-3">{t('masterData.table.code', 'Code')}</th>
                    <th className="px-5 py-3">{t('masterData.table.type', 'Type')}</th>
                    <th className="px-5 py-3">{t('masterData.table.status', 'Status')}</th>
                    <th className="px-5 py-3 text-right">{t('masterData.table.actions', 'Actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {filteredSubjects.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-6 text-zinc-400">
                        {search.trim()
                          ? t('masterData.emptyStates.searchNoResults', 'No matching records found.')
                          : t('masterData.emptyStates.noSubjects', 'No subjects configured.')}
                      </td>
                    </tr>
                  ) : (
                    filteredSubjects.map((sub) => {
                      const isArchived = Boolean(sub.archivedAt);
                      return (
                        <tr
                          key={sub.id}
                          className={`hover:bg-zinc-50/50 transition-colors ${isArchived ? 'bg-zinc-50/80 opacity-75' : ''}`}
                        >
                          <td className="px-5 py-3.5 font-bold text-zinc-900">{sub.name}</td>
                          <td className="px-5 py-3.5 font-mono text-xs text-zinc-600">{sub.code}</td>
                          <td className="px-5 py-3.5 text-zinc-600">
                            {t(`masterData.enum.${sub.type}`, sub.type)}
                          </td>
                          <td className="px-5 py-3.5">
                            <button
                              onClick={() =>
                                handleToggleActive(
                                  (isActive) =>
                                    updateSubjectMutation.mutateAsync({
                                      id: sub.id,
                                      data: { isActive },
                                    }),
                                  sub.isActive
                                )
                              }
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                                sub.isActive
                                  ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                              }`}
                            >
                              {sub.isActive ? (
                                <CheckCircle2 className="w-3 h-3" />
                              ) : (
                                <XCircle className="w-3 h-3" />
                              )}
                              {sub.isActive
                                ? t('masterData.status.active', 'Active')
                                : t('masterData.status.inactive', 'Inactive')}
                            </button>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {!isArchived && (
                                <>
                                  <button
                                    onClick={() => openEditModal('subject', sub)}
                                    className="text-zinc-500 hover:text-zinc-900 p-1.5 rounded-lg hover:bg-zinc-100 transition-colors"
                                    title={t('common.actions.edit', 'Edit')}
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleArchive(sub.name, () =>
                                        archiveSubjectMutation.mutateAsync(sub.id)
                                      )
                                    }
                                    className="text-zinc-400 hover:text-amber-600 p-1.5 rounded-lg hover:bg-amber-50 transition-colors"
                                    title={t('common.actions.archive', 'Archive')}
                                  >
                                    <Archive className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                              {isArchived && (
                                <button
                                  onClick={() =>
                                    handleRestore(() => restoreSubjectMutation.mutateAsync(sub.id))
                                  }
                                  className="text-mehndi-600 hover:text-mehndi-700 p-1.5 rounded-lg hover:bg-mehndi-50 transition-colors flex items-center gap-1 text-xs font-semibold"
                                  title={t('common.actions.restore', 'Restore')}
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  <span>{t('masterData.actions.restore', 'Restore')}</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Sub-Tab: Subject-Class Assignment (UX Remediated) */}
          {academicSubTab === 'class-subjects' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-zinc-50 p-4 rounded-2xl border border-zinc-200 flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                    {t('masterData.form.selectClass', 'Select Class:')}
                  </label>
                  <select
                    value={selectedClassId}
                    onChange={(e) => setSelectedClassId(e.target.value)}
                    className="input-field text-xs py-1.5 font-semibold text-zinc-900"
                  >
                    <option value="">{t('masterData.form.selectClass', 'Choose a class to view subjects')}</option>
                    {classesQuery.data?.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>
                {selectedClassId && (
                  <button
                    onClick={() => openCreateModal('class-subject')}
                    className="btn-primary py-1.5 px-3 text-xs flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{t('masterData.actions.assignSubject', 'Assign Subject to Class')}</span>
                  </button>
                )}
              </div>

              {!selectedClassId ? (
                <div className="bg-white border border-zinc-200 rounded-2xl p-12 text-center text-zinc-500">
                  <GraduationCap className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
                  <p className="font-semibold text-zinc-700">
                    {t('masterData.emptyStates.noClassSubjects', 'Please select a class above to manage its curriculum subjects.')}
                  </p>
                </div>
              ) : (
                <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 text-xs uppercase font-semibold">
                      <tr>
                        <th className="px-5 py-3">{t('masterData.table.subjectName', 'Subject Name')}</th>
                        <th className="px-5 py-3">{t('masterData.table.code', 'Subject Code')}</th>
                        <th className="px-5 py-3">{t('masterData.table.type', 'Course Type')}</th>
                        <th className="px-5 py-3">{t('masterData.table.elective', 'Curriculum Designation')}</th>
                        <th className="px-5 py-3 text-right">{t('masterData.table.actions', 'Actions')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200">
                      {filteredClassSubjects.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center py-8 text-zinc-400">
                            {search.trim()
                              ? t('masterData.emptyStates.searchNoResults', 'No matching records found.')
                              : t('masterData.emptyStates.noClassSubjects', 'No subjects assigned to this class yet.')}
                          </td>
                        </tr>
                      ) : (
                        filteredClassSubjects.map((m) => (
                          <tr key={m.id} className="hover:bg-zinc-50/50 transition-colors">
                            <td className="px-5 py-3.5 font-bold text-zinc-900">
                              {m.subject?.name}
                            </td>
                            <td className="px-5 py-3.5 font-mono text-xs text-zinc-600">
                              {m.subject?.code}
                            </td>
                            <td className="px-5 py-3.5 text-xs text-zinc-600">
                              {m.subject?.type ? t(`masterData.enum.${m.subject.type}`, m.subject.type) : ''}
                            </td>
                            <td className="px-5 py-3.5">
                              <span
                                className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                                  m.isElective
                                    ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                }`}
                              >
                                {m.isElective
                                  ? t('masterData.status.electiveCourse', 'Elective Course')
                                  : t('masterData.status.coreRequired', 'Core Required')}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-right">
                              <button
                                onClick={() => deleteClassSubjectMutation.mutate(m.id)}
                                className="text-zinc-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                                title={t('masterData.actions.remove', 'Remove Subject Assignment')}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: DEMOGRAPHICS */}
      {activeTab === 'student' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Religions */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="font-bold text-zinc-900 text-base">{t('masterData.entity.religions', 'Religions')}</h3>
              <button
                onClick={() => openCreateModal('religion')}
                className="btn-secondary py-1 px-2.5 text-xs flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> {t('masterData.actions.add', 'Add')}
              </button>
            </div>
            <div className="divide-y divide-zinc-100 max-h-96 overflow-y-auto">
              {filteredReligions.length === 0 ? (
                <div className="text-center py-6 text-xs text-zinc-400">
                  {search.trim()
                    ? t('masterData.emptyStates.searchNoResults', 'No matching records found.')
                    : t('masterData.emptyStates.noReligions', 'No religions configured.')}
                </div>
              ) : (
                filteredReligions.map((r) => (
                  <div
                    key={r.id}
                    className="py-2.5 flex items-center justify-between text-sm hover:bg-zinc-50/50 px-2 rounded-lg"
                  >
                    <div>
                      <span className="font-semibold text-zinc-800">{r.name}</span>
                      {r.code && (
                        <span className="text-xs text-zinc-400 font-mono ml-2">({r.code})</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal('religion', r)}
                        className="text-zinc-400 hover:text-zinc-700 p-1 rounded hover:bg-zinc-100"
                        title={t('common.actions.edit', 'Edit')}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() =>
                          handleArchive(r.name, () => archiveReligionMutation.mutateAsync(r.id))
                        }
                        className="text-zinc-400 hover:text-amber-600 p-1 rounded hover:bg-amber-50"
                        title={t('common.actions.archive', 'Archive')}
                      >
                        <Archive className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Categories */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="font-bold text-zinc-900 text-base">{t('masterData.entity.categories', 'Categories')}</h3>
              <button
                onClick={() => openCreateModal('category')}
                className="btn-secondary py-1 px-2.5 text-xs flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> {t('masterData.actions.add', 'Add')}
              </button>
            </div>
            <div className="divide-y divide-zinc-100 max-h-96 overflow-y-auto">
              {filteredCategories.length === 0 ? (
                <div className="text-center py-6 text-xs text-zinc-400">
                  {search.trim()
                    ? t('masterData.emptyStates.searchNoResults', 'No matching records found.')
                    : t('masterData.emptyStates.noCategories', 'No social categories configured.')}
                </div>
              ) : (
                filteredCategories.map((c) => (
                  <div
                    key={c.id}
                    className="py-2.5 flex items-center justify-between text-sm hover:bg-zinc-50/50 px-2 rounded-lg"
                  >
                    <div>
                      <span className="font-semibold text-zinc-800">{c.name}</span>
                      {c.code && (
                        <span className="text-xs text-zinc-400 font-mono ml-2">({c.code})</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal('category', c)}
                        className="text-zinc-400 hover:text-zinc-700 p-1 rounded hover:bg-zinc-100"
                        title={t('common.actions.edit', 'Edit')}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() =>
                          handleArchive(c.name, () => archiveCategoryMutation.mutateAsync(c.id))
                        }
                        className="text-zinc-400 hover:text-amber-600 p-1 rounded hover:bg-amber-50"
                        title={t('common.actions.archive', 'Archive')}
                      >
                        <Archive className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Castes */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="font-bold text-zinc-900 text-base">{t('masterData.entity.castes', 'Castes')}</h3>
              <button
                onClick={() => openCreateModal('caste')}
                className="btn-secondary py-1 px-2.5 text-xs flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> {t('masterData.actions.add', 'Add')}
              </button>
            </div>
            <div className="divide-y divide-zinc-100 max-h-96 overflow-y-auto">
              {filteredCastes.length === 0 ? (
                <div className="text-center py-6 text-xs text-zinc-400">
                  {search.trim()
                    ? t('masterData.emptyStates.searchNoResults', 'No matching records found.')
                    : t('masterData.emptyStates.noCastes', 'No castes configured.')}
                </div>
              ) : (
                filteredCastes.map((caste) => (
                  <div
                    key={caste.id}
                    className="py-2.5 flex items-center justify-between text-sm hover:bg-zinc-50/50 px-2 rounded-lg"
                  >
                    <div>
                      <span className="font-semibold text-zinc-800">{caste.name}</span>
                      {caste.category && (
                        <span className="text-xs text-mehndi-700 bg-mehndi-50 px-1.5 py-0.5 rounded font-medium ml-2">
                          {caste.category.name}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal('caste', caste)}
                        className="text-zinc-400 hover:text-zinc-700 p-1 rounded hover:bg-zinc-100"
                        title={t('common.actions.edit', 'Edit')}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() =>
                          handleArchive(caste.name, () => archiveCasteMutation.mutateAsync(caste.id))
                        }
                        className="text-zinc-400 hover:text-amber-600 p-1 rounded hover:bg-amber-50"
                        title={t('common.actions.archive', 'Archive')}
                      >
                        <Archive className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: FINANCIAL HEADS */}
      {activeTab === 'finance' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Fee Heads */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <h3 className="font-bold text-zinc-900 text-base">{t('masterData.entity.feeHeads', 'Fee Heads')}</h3>
                <p className="text-xs text-zinc-500">
                  Standard fee categories for fee structure assignment
                </p>
              </div>
              <button
                onClick={() => openCreateModal('fee-head')}
                className="btn-primary py-1 px-3 text-xs flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> {t('masterData.actions.add', 'Add')} {t('masterData.entity.feeHead', 'Fee Head')}
              </button>
            </div>
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 text-zinc-500 text-xs uppercase font-semibold">
                <tr>
                  <th className="px-3 py-2">{t('masterData.table.headName', 'Head Name')}</th>
                  <th className="px-3 py-2">{t('masterData.table.code', 'Code')}</th>
                  <th className="px-3 py-2 text-right">{t('masterData.table.actions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredFeeHeads.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center py-6 text-zinc-400">
                      {search.trim()
                        ? t('masterData.emptyStates.searchNoResults', 'No matching records found.')
                        : t('masterData.emptyStates.noFeeHeads', 'No fee heads configured.')}
                    </td>
                  </tr>
                ) : (
                  filteredFeeHeads.map((fh) => (
                    <tr key={fh.id} className="hover:bg-zinc-50">
                      <td className="px-3 py-2.5 font-medium text-zinc-900">{fh.name}</td>
                      <td className="px-3 py-2.5 font-mono text-xs text-zinc-500">{fh.code}</td>
                      <td className="px-3 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditModal('fee-head', fh)}
                            className="text-zinc-400 hover:text-zinc-700 p-1"
                            title={t('common.actions.edit', 'Edit')}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() =>
                              handleArchive(fh.name, () => archiveFeeHeadMutation.mutateAsync(fh.id))
                            }
                            className="text-zinc-400 hover:text-amber-600 p-1"
                            title={t('common.actions.archive', 'Archive')}
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Expense Heads */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <h3 className="font-bold text-zinc-900 text-base">{t('masterData.entity.expenseHeads', 'Expense Heads')}</h3>
                <p className="text-xs text-zinc-500">Expenditure classification categories</p>
              </div>
              <button
                onClick={() => openCreateModal('expense-head')}
                className="btn-primary py-1 px-3 text-xs flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> {t('masterData.actions.add', 'Add')} {t('masterData.entity.expenseHead', 'Expense Head')}
              </button>
            </div>
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 text-zinc-500 text-xs uppercase font-semibold">
                <tr>
                  <th className="px-3 py-2">{t('masterData.table.headName', 'Expense Name')}</th>
                  <th className="px-3 py-2">{t('masterData.table.code', 'Code')}</th>
                  <th className="px-3 py-2 text-right">{t('masterData.table.actions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredExpenseHeads.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center py-6 text-zinc-400">
                      {search.trim()
                        ? t('masterData.emptyStates.searchNoResults', 'No matching records found.')
                        : t('masterData.emptyStates.noExpenseHeads', 'No expense heads configured.')}
                    </td>
                  </tr>
                ) : (
                  filteredExpenseHeads.map((eh) => (
                    <tr key={eh.id} className="hover:bg-zinc-50">
                      <td className="px-3 py-2.5 font-medium text-zinc-900">{eh.name}</td>
                      <td className="px-3 py-2.5 font-mono text-xs text-zinc-500">{eh.code}</td>
                      <td className="px-3 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditModal('expense-head', eh)}
                            className="text-zinc-400 hover:text-zinc-700 p-1"
                            title={t('common.actions.edit', 'Edit')}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() =>
                              handleArchive(eh.name, () =>
                                archiveExpenseHeadMutation.mutateAsync(eh.id)
                              )
                            }
                            className="text-zinc-400 hover:text-amber-600 p-1"
                            title={t('common.actions.archive', 'Archive')}
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: HR */}
      {activeTab === 'hr' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Departments */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <h3 className="font-bold text-zinc-900 text-base">{t('masterData.entity.departments', 'Departments')}</h3>
                <p className="text-xs text-zinc-500">School functional departments</p>
              </div>
              <button
                onClick={() => openCreateModal('department')}
                className="btn-primary py-1 px-3 text-xs flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> {t('masterData.actions.add', 'Add')} {t('masterData.entity.department', 'Department')}
              </button>
            </div>
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 text-zinc-500 text-xs uppercase font-semibold">
                <tr>
                  <th className="px-3 py-2">{t('masterData.table.department', 'Department Name')}</th>
                  <th className="px-3 py-2">{t('masterData.table.code', 'Code')}</th>
                  <th className="px-3 py-2 text-right">{t('masterData.table.actions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredDepartments.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center py-6 text-zinc-400">
                      {search.trim()
                        ? t('masterData.emptyStates.searchNoResults', 'No matching records found.')
                        : t('masterData.emptyStates.noDepartments', 'No departments configured.')}
                    </td>
                  </tr>
                ) : (
                  filteredDepartments.map((d) => (
                    <tr key={d.id} className="hover:bg-zinc-50">
                      <td className="px-3 py-2.5 font-medium text-zinc-900">{d.name}</td>
                      <td className="px-3 py-2.5 font-mono text-xs text-zinc-500">{d.code}</td>
                      <td className="px-3 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditModal('department', d)}
                            className="text-zinc-400 hover:text-zinc-700 p-1"
                            title={t('common.actions.edit', 'Edit')}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() =>
                              handleArchive(d.name, () => archiveDepartmentMutation.mutateAsync(d.id))
                            }
                            className="text-zinc-400 hover:text-amber-600 p-1"
                            title={t('common.actions.archive', 'Archive')}
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Designations */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <h3 className="font-bold text-zinc-900 text-base">{t('masterData.entity.designations', 'Designations')}</h3>
                <p className="text-xs text-zinc-500">Staff job titles and roles</p>
              </div>
              <button
                onClick={() => openCreateModal('designation')}
                className="btn-primary py-1 px-3 text-xs flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> {t('masterData.actions.add', 'Add')} {t('masterData.entity.designation', 'Designation')}
              </button>
            </div>
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 text-zinc-500 text-xs uppercase font-semibold">
                <tr>
                  <th className="px-3 py-2">{t('masterData.table.designation', 'Designation')}</th>
                  <th className="px-3 py-2">{t('masterData.table.department', 'Department')}</th>
                  <th className="px-3 py-2 text-right">{t('masterData.table.actions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredDesignations.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center py-6 text-zinc-400">
                      {search.trim()
                        ? t('masterData.emptyStates.searchNoResults', 'No matching records found.')
                        : t('masterData.emptyStates.noDesignations', 'No designations configured.')}
                    </td>
                  </tr>
                ) : (
                  filteredDesignations.map((des) => (
                    <tr key={des.id} className="hover:bg-zinc-50">
                      <td className="px-3 py-2.5 font-medium text-zinc-900">{des.name}</td>
                      <td className="px-3 py-2.5 text-xs text-zinc-500">
                        {des.department?.name || '—'}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditModal('designation', des)}
                            className="text-zinc-400 hover:text-zinc-700 p-1"
                            title={t('common.actions.edit', 'Edit')}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() =>
                              handleArchive(des.name, () =>
                                archiveDesignationMutation.mutateAsync(des.id)
                              )
                            }
                            className="text-zinc-400 hover:text-amber-600 p-1"
                            title={t('common.actions.archive', 'Archive')}
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: TRANSPORT (VEHICLE TYPES WITH FULLY EDITABLE CAPACITY) */}
      {activeTab === 'transport' && (
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm space-y-4 max-w-3xl">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
            <div>
              <h3 className="font-bold text-zinc-900 text-base">{t('masterData.entity.vehicleTypes', 'Vehicle Types')}</h3>
              <p className="text-xs text-zinc-500">Vehicle capacity and model specifications</p>
            </div>
            <button
              onClick={() => openCreateModal('vehicle-type')}
              className="btn-primary py-1.5 px-3.5 text-xs flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> {t('masterData.actions.add', 'Add')} {t('masterData.entity.vehicleType', 'Vehicle Type')}
            </button>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-zinc-500 text-xs uppercase font-semibold">
              <tr>
                <th className="px-4 py-2.5">{t('masterData.table.vehicleType', 'Type Name')}</th>
                <th className="px-4 py-2.5">{t('masterData.table.code', 'Code')}</th>
                <th className="px-4 py-2.5">{t('masterData.table.capacity', 'Configured Capacity')}</th>
                <th className="px-4 py-2.5 text-right">{t('masterData.table.actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredVehicleTypes.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-6 text-zinc-400">
                    {search.trim()
                      ? t('masterData.emptyStates.searchNoResults', 'No matching records found.')
                      : t('masterData.emptyStates.noVehicleTypes', 'No vehicle types configured.')}
                  </td>
                </tr>
              ) : (
                filteredVehicleTypes.map((vt) => (
                  <tr key={vt.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-3 font-semibold text-zinc-900">{vt.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-zinc-500">{vt.code || '—'}</td>
                    <td className="px-4 py-3 text-zinc-700 font-medium">
                      {vt.capacity ? `${vt.capacity} passenger seats` : 'Unspecified'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal('vehicle-type', vt)}
                          className="text-zinc-400 hover:text-zinc-700 p-1.5 rounded-lg hover:bg-zinc-100 transition-colors"
                          title={t('common.actions.edit', 'Edit')}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() =>
                            handleArchive(vt.name, () =>
                              archiveVehicleTypeMutation.mutateAsync(vt.id)
                            )
                          }
                          className="text-zinc-400 hover:text-amber-600 p-1.5 rounded-lg hover:bg-amber-50 transition-colors"
                          title={t('common.actions.archive', 'Archive')}
                        >
                          <Archive className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 6: LOCATIONS (COUNTRIES, STATES, CITIES) */}
      {activeTab === 'locations' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Countries */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-2.5">
              <h3 className="font-bold text-zinc-900 text-base">{t('masterData.entity.countries', 'Countries')}</h3>
              <button
                onClick={() => openCreateModal('country')}
                className="btn-secondary py-1 px-2.5 text-xs flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> {t('masterData.actions.add', 'Add')}
              </button>
            </div>
            <div className="divide-y divide-zinc-100 max-h-80 overflow-y-auto">
              {filteredCountries.length === 0 ? (
                <div className="text-center py-6 text-xs text-zinc-400">
                  {search.trim()
                    ? t('masterData.emptyStates.searchNoResults', 'No matching records found.')
                    : t('masterData.emptyStates.noCountries', 'No countries configured.')}
                </div>
              ) : (
                filteredCountries.map((c) => (
                  <div
                    key={c.id}
                    className="py-2 flex items-center justify-between text-sm hover:bg-zinc-50/50 px-2 rounded-lg"
                  >
                    <div>
                      <span className="font-semibold text-zinc-800">{c.name}</span>
                      <span className="text-xs font-mono text-zinc-400 ml-1.5">({c.isoCode})</span>
                    </div>
                    <button
                      onClick={() => openEditModal('country', c)}
                      className="text-zinc-400 hover:text-zinc-700 p-1"
                      title={t('common.actions.edit', 'Edit')}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* States */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-2.5">
              <h3 className="font-bold text-zinc-900 text-base">{t('masterData.entity.states', 'States')}</h3>
              <button
                onClick={() => openCreateModal('state')}
                className="btn-secondary py-1 px-2.5 text-xs flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> {t('masterData.actions.add', 'Add')}
              </button>
            </div>
            <div className="divide-y divide-zinc-100 max-h-80 overflow-y-auto">
              {filteredStates.length === 0 ? (
                <div className="text-center py-6 text-xs text-zinc-400">
                  {search.trim()
                    ? t('masterData.emptyStates.searchNoResults', 'No matching records found.')
                    : t('masterData.emptyStates.noStates', 'No states configured for this country.')}
                </div>
              ) : (
                filteredStates.map((s) => (
                  <div
                    key={s.id}
                    className="py-2 flex items-center justify-between text-sm hover:bg-zinc-50/50 px-2 rounded-lg"
                  >
                    <div>
                      <span className="font-semibold text-zinc-800">{s.name}</span>
                      {s.code && (
                        <span className="text-xs font-mono text-zinc-400 ml-1.5">({s.code})</span>
                      )}
                    </div>
                    <button
                      onClick={() => openEditModal('state', s)}
                      className="text-zinc-400 hover:text-zinc-700 p-1"
                      title={t('common.actions.edit', 'Edit')}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Cities */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-2.5">
              <h3 className="font-bold text-zinc-900 text-base">{t('masterData.entity.cities', 'Cities')}</h3>
              <button
                onClick={() => openCreateModal('city')}
                className="btn-secondary py-1 px-2.5 text-xs flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> {t('masterData.actions.add', 'Add')}
              </button>
            </div>
            <div className="divide-y divide-zinc-100 max-h-80 overflow-y-auto">
              {filteredCities.length === 0 ? (
                <div className="text-center py-6 text-xs text-zinc-400">
                  {search.trim()
                    ? t('masterData.emptyStates.searchNoResults', 'No matching records found.')
                    : t('masterData.emptyStates.noCities', 'No cities configured for this state.')}
                </div>
              ) : (
                filteredCities.map((city) => (
                  <div
                    key={city.id}
                    className="py-2 flex items-center justify-between text-sm hover:bg-zinc-50/50 px-2 rounded-lg"
                  >
                    <span className="font-semibold text-zinc-800">{city.name}</span>
                    <button
                      onClick={() => openEditModal('city', city)}
                      className="text-zinc-400 hover:text-zinc-700 p-1"
                      title={t('common.actions.edit', 'Edit')}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* REUSABLE MODAL DIALOG (CREATE & EDIT) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-zinc-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
              <h2 className="text-lg font-bold text-zinc-900 capitalize">
                {editingId
                  ? t('masterData.form.editTitle', 'Edit Record')
                  : t('masterData.form.createTitle', 'Add New Record')}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 p-1.5 rounded-lg"
                aria-label={t('masterData.actions.cancel', 'Cancel')}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 pt-4">
              {modalType === 'class-section' ? (
                <>
                  <div>
                    <label className="text-xs font-semibold text-zinc-700">
                      {t('masterData.form.selectClass', 'Select Class')}
                    </label>
                    <select
                      value={selectedClassId}
                      onChange={(e) => setSelectedClassId(e.target.value)}
                      className="input-field mt-1 w-full text-sm"
                      required
                    >
                      {classesQuery.data?.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-zinc-700">
                      {t('masterData.form.selectSection', 'Select Section')}
                    </label>
                    <select
                      value={selectedSectionId}
                      onChange={(e) => setSelectedSectionId(e.target.value)}
                      className="input-field mt-1 w-full text-sm"
                      required
                    >
                      {sectionsQuery.data?.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-zinc-700">
                      {t('masterData.table.capacity', 'Student Capacity')}
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formCapacity}
                      onChange={(e) =>
                        setFormCapacity(e.target.value === '' ? '' : Number(e.target.value))
                      }
                      className="input-field mt-1 w-full text-sm"
                    />
                  </div>
                </>
              ) : modalType === 'class-subject' ? (
                <>
                  <div>
                    <label className="text-xs font-semibold text-zinc-700">
                      {t('masterData.form.selectSubject', 'Select Subject *')}
                    </label>
                    <select
                      value={selectedSubjectId}
                      onChange={(e) => setSelectedSubjectId(e.target.value)}
                      className="input-field mt-1 w-full text-sm"
                      required
                    >
                      {subjectsQuery.data?.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.code}) - {s.type === 'THEORY' ? t('masterData.enum.THEORY', 'Theory') : s.type === 'PRACTICAL' ? t('masterData.enum.PRACTICAL', 'Practical') : t('masterData.enum.BOTH', 'Both (Theory + Practical)')}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="checkbox"
                      id="isElective"
                      checked={formIsElective}
                      onChange={(e) => setFormIsElective(e.target.checked)}
                      className="rounded text-mehndi-600 focus:ring-mehndi-500 w-4 h-4"
                    />
                    <label htmlFor="isElective" className="text-xs font-medium text-zinc-700">
                      {t('masterData.form.isElective', 'This is an elective / optional subject for this class')}
                    </label>
                  </div>
                </>
              ) : modalType === 'country' ? (
                <>
                  <div>
                    <label className="text-xs font-semibold text-zinc-700">
                      {t('masterData.table.country', 'Country Name')} *
                    </label>
                    <input
                      type="text"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="input-field mt-1 w-full text-sm"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-zinc-700">
                        {t('masterData.table.isoCode', 'ISO Code')} (e.g. IN, US)
                      </label>
                      <input
                        type="text"
                        value={formIsoCode}
                        onChange={(e) => setFormIsoCode(e.target.value.toUpperCase())}
                        className="input-field mt-1 w-full text-sm font-mono"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-zinc-700">
                        {t('masterData.form.countryPhone', 'Dial Code (e.g. +91)')}
                      </label>
                      <input
                        type="text"
                        value={formDialCode}
                        onChange={(e) => setFormDialCode(e.target.value)}
                        className="input-field mt-1 w-full text-sm"
                      />
                    </div>
                  </div>
                </>
              ) : modalType === 'state' ? (
                <>
                  {!editingId && (
                    <div>
                      <label className="text-xs font-semibold text-zinc-700">
                        {t('masterData.form.selectCountry', 'Select Country')}
                      </label>
                      <select
                        value={selectedCountryId}
                        onChange={(e) => setSelectedCountryId(e.target.value)}
                        className="input-field mt-1 w-full text-sm"
                        required
                      >
                        {countriesQuery.data?.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="text-xs font-semibold text-zinc-700">
                      {t('masterData.table.state', 'State Name')} *
                    </label>
                    <input
                      type="text"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="input-field mt-1 w-full text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-zinc-700">
                      {t('masterData.form.stateCode', 'State Code (e.g. MH, DL)')}
                    </label>
                    <input
                      type="text"
                      value={formCode}
                      onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                      className="input-field mt-1 w-full text-sm font-mono"
                    />
                  </div>
                </>
              ) : modalType === 'city' ? (
                <>
                  {!editingId && (
                    <div>
                      <label className="text-xs font-semibold text-zinc-700">
                        {t('masterData.form.selectState', 'Select State')}
                      </label>
                      <select
                        value={selectedStateId}
                        onChange={(e) => setSelectedStateId(e.target.value)}
                        className="input-field mt-1 w-full text-sm"
                        required
                      >
                        {statesQuery.data?.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="text-xs font-semibold text-zinc-700">
                      {t('masterData.table.city', 'City Name')} *
                    </label>
                    <input
                      type="text"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="input-field mt-1 w-full text-sm"
                      required
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="text-xs font-semibold text-zinc-700">
                      {t('masterData.form.name', 'Name *')}
                    </label>
                    <input
                      type="text"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="e.g. Class 1, Section A, Tuition Fee"
                      className="input-field mt-1 w-full text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-zinc-700">
                      {t('masterData.form.code', 'Code (Optional)')}
                    </label>
                    <input
                      type="text"
                      value={formCode}
                      onChange={(e) => setFormCode(e.target.value)}
                      placeholder="e.g. CLS-01, SEC-A"
                      className="input-field mt-1 w-full text-sm font-mono"
                    />
                  </div>

                  {modalType === 'class' && (
                    <>
                      <div>
                        <label className="text-xs font-semibold text-zinc-700">
                          {t('masterData.table.stageLevel', 'Academic Stage / Level')}
                        </label>
                        <select
                          value={formLevel}
                          onChange={(e) => setFormLevel(e.target.value)}
                          className="input-field mt-1 w-full text-sm"
                        >
                          <option value="Pre-Primary">{t('masterData.enum.PrePrimary', 'Pre-Primary')}</option>
                          <option value="Primary">{t('masterData.enum.Primary', 'Primary')}</option>
                          <option value="Middle">{t('masterData.enum.Middle', 'Middle')}</option>
                          <option value="Secondary">{t('masterData.enum.Secondary', 'Secondary')}</option>
                          <option value="Senior Secondary">{t('masterData.enum.HigherSecondary', 'Senior Secondary')}</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-zinc-700">
                          {t('masterData.table.order', 'Display Order')}
                        </label>
                        <input
                          type="number"
                          value={formDisplayOrder}
                          onChange={(e) => setFormDisplayOrder(Number(e.target.value))}
                          className="input-field mt-1 w-full text-sm"
                        />
                      </div>
                    </>
                  )}

                  {modalType === 'section' && (
                    <div>
                      <label className="text-xs font-semibold text-zinc-700">
                        {t('masterData.table.order', 'Display Order')}
                      </label>
                      <input
                        type="number"
                        value={formDisplayOrder}
                        onChange={(e) => setFormDisplayOrder(Number(e.target.value))}
                        className="input-field mt-1 w-full text-sm"
                      />
                    </div>
                  )}

                  {modalType === 'subject' && (
                    <div>
                      <label className="text-xs font-semibold text-zinc-700">
                        {t('masterData.form.subjectType', 'Subject Type')}
                      </label>
                      <select
                        value={formType}
                        onChange={(e) => setFormType(e.target.value as any)}
                        className="input-field mt-1 w-full text-sm"
                      >
                        <option value="THEORY">{t('masterData.enum.THEORY', 'Theory')}</option>
                        <option value="PRACTICAL">{t('masterData.enum.PRACTICAL', 'Practical')}</option>
                        <option value="BOTH">{t('masterData.enum.BOTH', 'Both (Theory + Practical)')}</option>
                      </select>
                    </div>
                  )}

                  {modalType === 'caste' && (
                    <div>
                      <label className="text-xs font-semibold text-zinc-700">
                        {t('masterData.table.parentCategory', 'Parent Category')}
                      </label>
                      <select
                        value={selectedCategoryId}
                        onChange={(e) => setSelectedCategoryId(e.target.value)}
                        className="input-field mt-1 w-full text-sm"
                      >
                        <option value="">{t('masterData.table.none', 'None (General)')}</option>
                        {categoriesQuery.data?.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {modalType === 'vehicle-type' && (
                    <div>
                      <label className="text-xs font-semibold text-zinc-700">
                        {t('masterData.table.capacity', 'Seat Capacity (Passengers)')}
                      </label>
                      <input
                        type="number"
                        min="1"
                        placeholder="e.g. 14, 28, 45, 52"
                        value={formCapacity}
                        onChange={(e) =>
                          setFormCapacity(e.target.value === '' ? '' : Number(e.target.value))
                        }
                        className="input-field mt-1 w-full text-sm font-semibold"
                        required
                      />
                    </div>
                  )}

                  {(modalType === 'fee-head' ||
                    modalType === 'expense-head' ||
                    modalType === 'department' ||
                    modalType === 'designation') && (
                    <div>
                      <label className="text-xs font-semibold text-zinc-700">
                        {t('masterData.form.description', 'Description')}
                      </label>
                      <textarea
                        value={formDescription}
                        onChange={(e) => setFormDescription(e.target.value)}
                        rows={2}
                        className="input-field mt-1 w-full text-sm"
                        placeholder="Optional details or instructions"
                      />
                    </div>
                  )}

                  {modalType === 'designation' && (
                    <div>
                      <label className="text-xs font-semibold text-zinc-700">
                        {t('masterData.table.department', 'Department')}
                      </label>
                      <select
                        value={selectedDepartmentId}
                        onChange={(e) => setSelectedDepartmentId(e.target.value)}
                        className="input-field mt-1 w-full text-sm"
                      >
                        <option value="">{t('masterData.table.none', 'None')}</option>
                        {departmentsQuery.data?.map((dep) => (
                          <option key={dep.id} value={dep.id}>
                            {dep.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-secondary py-2 px-4 text-sm"
                >
                  {t('masterData.actions.cancel', 'Cancel')}
                </button>
                <button type="submit" className="btn-primary py-2 px-5 text-sm">
                  {editingId
                    ? t('masterData.actions.saveChanges', 'Save Changes')
                    : t('masterData.actions.createRecord', 'Create Record')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
