import apiClient from '../api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export interface ClassMaster {
  id: string;
  name: string;
  code: string;
  displayOrder: number;
  academicLevel: string | null;
  isActive: boolean;
  archivedAt: string | null;
  sections?: ClassSectionMapping[];
  subjects?: ClassSubjectMapping[];
}

export interface SectionMaster {
  id: string;
  name: string;
  code: string;
  displayOrder: number;
  isActive: boolean;
  archivedAt: string | null;
}

export interface ClassSectionMapping {
  id: string;
  classId: string;
  sectionId: string;
  capacity: number;
  isActive: boolean;
  class?: ClassMaster;
  section?: SectionMaster;
}

export interface SubjectMaster {
  id: string;
  name: string;
  code: string;
  type: 'THEORY' | 'PRACTICAL' | 'BOTH';
  creditHours: number | null;
  isActive: boolean;
  archivedAt: string | null;
}

export interface ClassSubjectMapping {
  id: string;
  classId: string;
  subjectId: string;
  isElective: boolean;
  isActive: boolean;
  class?: ClassMaster;
  subject?: SubjectMaster;
}

export interface Religion {
  id: string;
  name: string;
  code: string | null;
  isActive: boolean;
}

export interface StudentCategory {
  id: string;
  name: string;
  code: string | null;
  isActive: boolean;
  castes?: Caste[];
}

export interface Caste {
  id: string;
  name: string;
  code: string | null;
  categoryId: string | null;
  isActive: boolean;
  category?: StudentCategory;
}

export interface VehicleType {
  id: string;
  name: string;
  code: string | null;
  capacity: number | null;
  description: string | null;
  isActive: boolean;
}

export interface FeeHead {
  id: string;
  name: string;
  code: string;
  description: string | null;
  displayOrder: number;
  isRefundable: boolean;
  isActive: boolean;
}

export interface ExpenseHead {
  id: string;
  name: string;
  code: string;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
  designations?: Designation[];
}

export interface Designation {
  id: string;
  name: string;
  code: string;
  departmentId: string | null;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
  department?: Department;
}

export interface Country {
  id: string;
  name: string;
  isoCode: string;
  dialCode: string | null;
  currency: string | null;
}

export interface State {
  id: string;
  countryId: string;
  name: string;
  code: string | null;
}

export interface City {
  id: string;
  stateId: string;
  name: string;
}

// ==========================================
// HOOKS
// ==========================================

const resolveSchoolId = (schoolId?: string): string | undefined =>
  schoolId || localStorage.getItem('selected_school_id') || undefined;

export interface ClassSectionsQueryOptions {
  schoolId?: string;
  classId?: string;
}

export interface ClassSubjectsQueryOptions {
  schoolId?: string;
  classId?: string;
}


// 1. Classes
export const useClasses = (schoolId?: string, search?: string, includeArchived = false) => {
  const activeSchoolId = resolveSchoolId(schoolId);
  return useQuery<ClassMaster[]>({
    queryKey: ['master-data', 'classes', activeSchoolId, search, includeArchived],
    queryFn: async () =>
      (
        await apiClient.get('/master-data/classes', {
          params: {
            school_id: activeSchoolId,
            search: search || undefined,
            include_archived: includeArchived,
          },
        })
      ).data,
    enabled: Boolean(activeSchoolId),
  });
};

export const useCreateClass = (schoolId?: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<ClassMaster>) =>
      (await apiClient.post('/master-data/classes', data, { params: { school_id: schoolId } }))
        .data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['master-data', 'classes'] }),
  });
};

export const useUpdateClass = (schoolId?: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ClassMaster> }) =>
      (
        await apiClient.patch(`/master-data/classes/${id}`, data, {
          params: { school_id: schoolId },
        })
      ).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['master-data', 'classes'] }),
  });
};

export const useArchiveClass = (schoolId?: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      (
        await apiClient.delete(`/master-data/classes/${id}/archive`, {
          params: { school_id: schoolId },
        })
      ).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['master-data', 'classes'] }),
  });
};

export const useRestoreClass = (schoolId?: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      (
        await apiClient.post(
          `/master-data/classes/${id}/restore`,
          {},
          { params: { school_id: schoolId } }
        )
      ).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['master-data', 'classes'] }),
  });
};

// 2. Sections
export const useSections = (schoolId?: string, search?: string) => {
  const activeSchoolId = resolveSchoolId(schoolId);
  return useQuery<SectionMaster[]>({
    queryKey: ['master-data', 'sections', activeSchoolId, search],
    queryFn: async () =>
      (
        await apiClient.get('/master-data/sections', {
          params: { school_id: activeSchoolId, search: search || undefined },
        })
      ).data,
    enabled: Boolean(activeSchoolId),
  });
};

export const useCreateSection = (schoolId?: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<SectionMaster>) =>
      (await apiClient.post('/master-data/sections', data, { params: { school_id: schoolId } }))
        .data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['master-data', 'sections'] }),
  });
};

export const useUpdateSection = (schoolId?: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<SectionMaster> }) =>
      (
        await apiClient.patch(`/master-data/sections/${id}`, data, {
          params: { school_id: schoolId },
        })
      ).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['master-data', 'sections'] }),
  });
};

export const useArchiveSection = (schoolId?: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      (
        await apiClient.delete(`/master-data/sections/${id}/archive`, {
          params: { school_id: schoolId },
        })
      ).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['master-data', 'sections'] }),
  });
};

export const useRestoreSection = (schoolId?: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      (
        await apiClient.post(
          `/master-data/sections/${id}/restore`,
          {},
          { params: { school_id: schoolId } }
        )
      ).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['master-data', 'sections'] }),
  });
};

// 3. Class-Sections
export const useClassSections = (options?: ClassSectionsQueryOptions) => {
  const schoolId = options?.schoolId;
  const classId = options?.classId;
  return useQuery<ClassSectionMapping[]>({
    queryKey: ['master-data', 'class-sections', schoolId, classId],
    queryFn: async () =>
      (
        await apiClient.get('/master-data/class-sections', {
          params: { school_id: schoolId, class_id: classId || undefined },
        })
      ).data,
    enabled: Boolean(schoolId),
  });
};

export const useCreateClassSection = (schoolId?: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { classId: string; sectionId: string; capacity?: number }) =>
      (
        await apiClient.post('/master-data/class-sections', data, {
          params: { school_id: schoolId },
        })
      ).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['master-data', 'class-sections'] });
      qc.invalidateQueries({ queryKey: ['master-data', 'classes'] });
    },
  });
};

export const useDeleteClassSection = (schoolId?: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      (
        await apiClient.delete(`/master-data/class-sections/${id}`, {
          params: { school_id: schoolId },
        })
      ).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['master-data', 'class-sections'] });
      qc.invalidateQueries({ queryKey: ['master-data', 'classes'] });
    },
  });
};

// 4. Subjects
export const useSubjects = (schoolId?: string, search?: string) => {
  const activeSchoolId = resolveSchoolId(schoolId);
  return useQuery<SubjectMaster[]>({
    queryKey: ['master-data', 'subjects', activeSchoolId, search],
    queryFn: async () =>
      (
        await apiClient.get('/master-data/subjects', {
          params: { school_id: activeSchoolId, search: search || undefined },
        })
      ).data,
    enabled: Boolean(activeSchoolId),
  });
};

export const useCreateSubject = (schoolId?: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<SubjectMaster>) =>
      (await apiClient.post('/master-data/subjects', data, { params: { school_id: schoolId } }))
        .data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['master-data', 'subjects'] }),
  });
};

export const useUpdateSubject = (schoolId?: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<SubjectMaster> }) =>
      (
        await apiClient.patch(`/master-data/subjects/${id}`, data, {
          params: { school_id: schoolId },
        })
      ).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['master-data', 'subjects'] }),
  });
};

export const useArchiveSubject = (schoolId?: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      (
        await apiClient.delete(`/master-data/subjects/${id}/archive`, {
          params: { school_id: schoolId },
        })
      ).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['master-data', 'subjects'] }),
  });
};

export const useRestoreSubject = (schoolId?: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      (
        await apiClient.post(
          `/master-data/subjects/${id}/restore`,
          {},
          { params: { school_id: schoolId } }
        )
      ).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['master-data', 'subjects'] }),
  });
};

// 5. Class-Subjects
export const useClassSubjects = (options?: ClassSubjectsQueryOptions) => {
  const schoolId = options?.schoolId;
  const classId = options?.classId;
  return useQuery<ClassSubjectMapping[]>({
    queryKey: ['master-data', 'class-subjects', schoolId, classId],
    queryFn: async () =>
      (
        await apiClient.get('/master-data/class-subjects', {
          params: { school_id: schoolId, class_id: classId || undefined },
        })
      ).data,
    enabled: Boolean(schoolId),
  });
};

export const useCreateClassSubject = (schoolId?: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { classId: string; subjectId: string; isElective?: boolean }) =>
      (
        await apiClient.post('/master-data/class-subjects', data, {
          params: { school_id: schoolId },
        })
      ).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['master-data', 'class-subjects'] });
      qc.invalidateQueries({ queryKey: ['master-data', 'classes'] });
    },
  });
};

export const useDeleteClassSubject = (schoolId?: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      (
        await apiClient.delete(`/master-data/class-subjects/${id}`, {
          params: { school_id: schoolId },
        })
      ).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['master-data', 'class-subjects'] });
      qc.invalidateQueries({ queryKey: ['master-data', 'classes'] });
    },
  });
};

// 6. Demographics
export const useReligions = (search?: string) =>
  useQuery<Religion[]>({
    queryKey: ['master-data', 'religions', search],
    queryFn: async () =>
      (await apiClient.get('/master-data/religions', { params: { search: search || undefined } }))
        .data,
  });

export const useCreateReligion = (schoolId?: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; code?: string | null }) =>
      (await apiClient.post('/master-data/religions', data, { params: { school_id: schoolId } }))
        .data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['master-data', 'religions'] }),
  });
};

export const useUpdateReligion = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Religion> }) =>
      (await apiClient.patch(`/master-data/religions/${id}`, data)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['master-data', 'religions'] }),
  });
};

export const useArchiveReligion = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      (await apiClient.delete(`/master-data/religions/${id}/archive`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['master-data', 'religions'] }),
  });
};

export const useRestoreReligion = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      (await apiClient.post(`/master-data/religions/${id}/restore`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['master-data', 'religions'] }),
  });
};

export const useCategories = (search?: string) =>
  useQuery<StudentCategory[]>({
    queryKey: ['master-data', 'categories', search],
    queryFn: async () =>
      (await apiClient.get('/master-data/categories', { params: { search: search || undefined } }))
        .data,
  });

export const useCreateCategory = (schoolId?: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; code?: string | null }) =>
      (await apiClient.post('/master-data/categories', data, { params: { school_id: schoolId } }))
        .data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['master-data', 'categories'] }),
  });
};

export const useUpdateCategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<StudentCategory> }) =>
      (await apiClient.patch(`/master-data/categories/${id}`, data)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['master-data', 'categories'] }),
  });
};

export const useArchiveCategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      (await apiClient.delete(`/master-data/categories/${id}/archive`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['master-data', 'categories'] }),
  });
};

export const useRestoreCategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      (await apiClient.post(`/master-data/categories/${id}/restore`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['master-data', 'categories'] }),
  });
};

export const useCastes = (search?: string, categoryId?: string) =>
  useQuery<Caste[]>({
    queryKey: ['master-data', 'castes', search, categoryId],
    queryFn: async () =>
      (
        await apiClient.get('/master-data/castes', {
          params: { search: search || undefined, category_id: categoryId || undefined },
        })
      ).data,
  });

export const useCreateCaste = (schoolId?: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; code?: string | null; categoryId?: string | null }) =>
      (await apiClient.post('/master-data/castes', data, { params: { school_id: schoolId } })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['master-data', 'castes'] }),
  });
};

export const useUpdateCaste = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Caste> }) =>
      (await apiClient.patch(`/master-data/castes/${id}`, data)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['master-data', 'castes'] }),
  });
};

export const useArchiveCaste = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      (await apiClient.delete(`/master-data/castes/${id}/archive`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['master-data', 'castes'] }),
  });
};

export const useRestoreCaste = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      (await apiClient.post(`/master-data/castes/${id}/restore`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['master-data', 'castes'] }),
  });
};

// 7. Transport
export const useVehicleTypes = (search?: string) =>
  useQuery<VehicleType[]>({
    queryKey: ['master-data', 'vehicle-types', search],
    queryFn: async () =>
      (
        await apiClient.get('/master-data/vehicle-types', {
          params: { search: search || undefined },
        })
      ).data,
  });

export const useCreateVehicleType = (schoolId?: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<VehicleType>) =>
      (
        await apiClient.post('/master-data/vehicle-types', data, {
          params: { school_id: schoolId },
        })
      ).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['master-data', 'vehicle-types'] }),
  });
};

export const useUpdateVehicleType = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<VehicleType> }) =>
      (await apiClient.patch(`/master-data/vehicle-types/${id}`, data)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['master-data', 'vehicle-types'] }),
  });
};

export const useArchiveVehicleType = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      (await apiClient.delete(`/master-data/vehicle-types/${id}/archive`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['master-data', 'vehicle-types'] }),
  });
};

export const useRestoreVehicleType = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      (await apiClient.post(`/master-data/vehicle-types/${id}/restore`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['master-data', 'vehicle-types'] }),
  });
};

// 8. Finance
export const useFeeHeads = (schoolId?: string, search?: string) => {
  const activeSchoolId = resolveSchoolId(schoolId);
  return useQuery<FeeHead[]>({
    queryKey: ['master-data', 'fee-heads', activeSchoolId, search],
    queryFn: async () =>
      (
        await apiClient.get('/master-data/fee-heads', {
          params: { school_id: activeSchoolId, search: search || undefined },
        })
      ).data,
    enabled: Boolean(activeSchoolId),
  });
};

export const useCreateFeeHead = (schoolId?: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<FeeHead>) =>
      (await apiClient.post('/master-data/fee-heads', data, { params: { school_id: schoolId } }))
        .data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['master-data', 'fee-heads'] }),
  });
};

export const useUpdateFeeHead = (schoolId?: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<FeeHead> }) =>
      (
        await apiClient.patch(`/master-data/fee-heads/${id}`, data, {
          params: { school_id: schoolId },
        })
      ).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['master-data', 'fee-heads'] }),
  });
};

export const useArchiveFeeHead = (schoolId?: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      (
        await apiClient.delete(`/master-data/fee-heads/${id}/archive`, {
          params: { school_id: schoolId },
        })
      ).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['master-data', 'fee-heads'] }),
  });
};

export const useRestoreFeeHead = (schoolId?: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      (
        await apiClient.post(
          `/master-data/fee-heads/${id}/restore`,
          {},
          { params: { school_id: schoolId } }
        )
      ).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['master-data', 'fee-heads'] }),
  });
};

export const useExpenseHeads = (schoolId?: string, search?: string) => {
  const activeSchoolId = resolveSchoolId(schoolId);
  return useQuery<ExpenseHead[]>({
    queryKey: ['master-data', 'expense-heads', activeSchoolId, search],
    queryFn: async () =>
      (
        await apiClient.get('/master-data/expense-heads', {
          params: { school_id: activeSchoolId, search: search || undefined },
        })
      ).data,
    enabled: Boolean(activeSchoolId),
  });
};

export const useCreateExpenseHead = (schoolId?: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<ExpenseHead>) =>
      (
        await apiClient.post('/master-data/expense-heads', data, {
          params: { school_id: schoolId },
        })
      ).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['master-data', 'expense-heads'] }),
  });
};

export const useUpdateExpenseHead = (schoolId?: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ExpenseHead> }) =>
      (
        await apiClient.patch(`/master-data/expense-heads/${id}`, data, {
          params: { school_id: schoolId },
        })
      ).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['master-data', 'expense-heads'] }),
  });
};

export const useArchiveExpenseHead = (schoolId?: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      (
        await apiClient.delete(`/master-data/expense-heads/${id}/archive`, {
          params: { school_id: schoolId },
        })
      ).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['master-data', 'expense-heads'] }),
  });
};

export const useRestoreExpenseHead = (schoolId?: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      (
        await apiClient.post(
          `/master-data/expense-heads/${id}/restore`,
          {},
          { params: { school_id: schoolId } }
        )
      ).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['master-data', 'expense-heads'] }),
  });
};

// 9. HR
export const useDepartments = (schoolId?: string, search?: string) => {
  const activeSchoolId = resolveSchoolId(schoolId);
  return useQuery<Department[]>({
    queryKey: ['master-data', 'departments', activeSchoolId, search],
    queryFn: async () =>
      (
        await apiClient.get('/master-data/departments', {
          params: { school_id: activeSchoolId, search: search || undefined },
        })
      ).data,
    enabled: Boolean(activeSchoolId),
  });
};

export const useCreateDepartment = (schoolId?: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<Department>) =>
      (await apiClient.post('/master-data/departments', data, { params: { school_id: schoolId } }))
        .data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['master-data', 'departments'] }),
  });
};

export const useUpdateDepartment = (schoolId?: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Department> }) =>
      (
        await apiClient.patch(`/master-data/departments/${id}`, data, {
          params: { school_id: schoolId },
        })
      ).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['master-data', 'departments'] }),
  });
};

export const useArchiveDepartment = (schoolId?: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      (
        await apiClient.delete(`/master-data/departments/${id}/archive`, {
          params: { school_id: schoolId },
        })
      ).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['master-data', 'departments'] }),
  });
};

export const useRestoreDepartment = (schoolId?: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      (
        await apiClient.post(
          `/master-data/departments/${id}/restore`,
          {},
          { params: { school_id: schoolId } }
        )
      ).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['master-data', 'departments'] }),
  });
};

export const useDesignations = (schoolId?: string, search?: string) => {
  const activeSchoolId = resolveSchoolId(schoolId);
  return useQuery<Designation[]>({
    queryKey: ['master-data', 'designations', activeSchoolId, search],
    queryFn: async () =>
      (
        await apiClient.get('/master-data/designations', {
          params: { school_id: activeSchoolId, search: search || undefined },
        })
      ).data,
    enabled: Boolean(activeSchoolId),
  });
};

export const useCreateDesignation = (schoolId?: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<Designation>) =>
      (await apiClient.post('/master-data/designations', data, { params: { school_id: schoolId } }))
        .data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['master-data', 'designations'] }),
  });
};

export const useUpdateDesignation = (schoolId?: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Designation> }) =>
      (
        await apiClient.patch(`/master-data/designations/${id}`, data, {
          params: { school_id: schoolId },
        })
      ).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['master-data', 'designations'] }),
  });
};

export const useArchiveDesignation = (schoolId?: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      (
        await apiClient.delete(`/master-data/designations/${id}/archive`, {
          params: { school_id: schoolId },
        })
      ).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['master-data', 'designations'] }),
  });
};

export const useRestoreDesignation = (schoolId?: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      (
        await apiClient.post(
          `/master-data/designations/${id}/restore`,
          {},
          { params: { school_id: schoolId } }
        )
      ).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['master-data', 'designations'] }),
  });
};

// 10. Locations
export const useCountries = () =>
  useQuery<Country[]>({
    queryKey: ['master-data', 'countries'],
    queryFn: async () => (await apiClient.get('/master-data/countries')).data,
  });

export const useCreateCountry = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<Country>) =>
      (await apiClient.post('/master-data/countries', data)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['master-data', 'countries'] }),
  });
};

export const useUpdateCountry = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Country> }) =>
      (await apiClient.patch(`/master-data/countries/${id}`, data)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['master-data', 'countries'] }),
  });
};

export const useStates = (countryId?: string) =>
  useQuery<State[]>({
    queryKey: ['master-data', 'states', countryId],
    queryFn: async () =>
      (
        await apiClient.get('/master-data/states', {
          params: { country_id: countryId || undefined },
        })
      ).data,
  });

export const useCreateState = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { countryId: string; name: string; code?: string | null }) =>
      (await apiClient.post('/master-data/states', data)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['master-data', 'states'] }),
  });
};

export const useUpdateState = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<State> }) =>
      (await apiClient.patch(`/master-data/states/${id}`, data)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['master-data', 'states'] }),
  });
};

export const useCities = (stateId?: string) =>
  useQuery<City[]>({
    queryKey: ['master-data', 'cities', stateId],
    queryFn: async () =>
      (await apiClient.get('/master-data/cities', { params: { state_id: stateId || undefined } }))
        .data,
  });

export const useCreateCity = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { stateId: string; name: string }) =>
      (await apiClient.post('/master-data/cities', data)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['master-data', 'cities'] }),
  });
};

export const useUpdateCity = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<City> }) =>
      (await apiClient.patch(`/master-data/cities/${id}`, data)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['master-data', 'cities'] }),
  });
};
