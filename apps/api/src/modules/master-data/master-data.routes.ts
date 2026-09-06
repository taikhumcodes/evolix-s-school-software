import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requirePermissions } from '../../middleware/rbac.js';
import { validateRequest } from '../../middleware/validate.js';
import { MasterDataController } from './master-data.controller.js';
import {
  CreateClassSchema,
  UpdateClassSchema,
  CreateSectionSchema,
  UpdateSectionSchema,
  CreateClassSectionSchema,
  CreateSubjectSchema,
  UpdateSubjectSchema,
  CreateClassSubjectSchema,
  CreateReligionSchema,
  UpdateReligionSchema,
  CreateCategorySchema,
  UpdateCategorySchema,
  CreateCasteSchema,
  UpdateCasteSchema,
  CreateCountrySchema,
  UpdateCountrySchema,
  CreateStateSchema,
  UpdateStateSchema,
  CreateCitySchema,
  UpdateCitySchema,
  CreateVehicleTypeSchema,
  UpdateVehicleTypeSchema,
  CreateFeeHeadSchema,
  UpdateFeeHeadSchema,
  CreateExpenseHeadSchema,
  UpdateExpenseHeadSchema,
  CreateDepartmentSchema,
  UpdateDepartmentSchema,
  CreateDesignationSchema,
  UpdateDesignationSchema,
} from './master-data.schema.js';

const router = Router();

router.use(authenticate);

const validate = (schema: any) => validateRequest({ body: schema });
const canView = requirePermissions(['master_data.view', 'settings.manage']);
const canManage = requirePermissions(['master_data.manage', 'settings.manage']);

// 1. Classes
router.get('/classes', canView, MasterDataController.listClasses);
router.get('/classes/:id', canView, MasterDataController.getClassById);
router.post('/classes', canManage, validate(CreateClassSchema), MasterDataController.createClass);
router.patch('/classes/:id', canManage, validate(UpdateClassSchema), MasterDataController.updateClass);
router.delete('/classes/:id/archive', canManage, MasterDataController.archiveClass);
router.post('/classes/:id/restore', canManage, MasterDataController.restoreClass);

// 2. Sections
router.get('/sections', canView, MasterDataController.listSections);
router.get('/sections/:id', canView, MasterDataController.getSectionById);
router.post('/sections', canManage, validate(CreateSectionSchema), MasterDataController.createSection);
router.patch('/sections/:id', canManage, validate(UpdateSectionSchema), MasterDataController.updateSection);
router.delete('/sections/:id/archive', canManage, MasterDataController.archiveSection);
router.post('/sections/:id/restore', canManage, MasterDataController.restoreSection);

// 3. Class Sections
router.get('/class-sections', canView, MasterDataController.listClassSections);
router.post('/class-sections', canManage, validate(CreateClassSectionSchema), MasterDataController.createClassSection);
router.delete('/class-sections/:id', canManage, MasterDataController.deleteClassSection);

// 4. Subjects
router.get('/subjects', canView, MasterDataController.listSubjects);
router.get('/subjects/:id', canView, MasterDataController.getSubjectById);
router.post('/subjects', canManage, validate(CreateSubjectSchema), MasterDataController.createSubject);
router.patch('/subjects/:id', canManage, validate(UpdateSubjectSchema), MasterDataController.updateSubject);
router.delete('/subjects/:id/archive', canManage, MasterDataController.archiveSubject);
router.post('/subjects/:id/restore', canManage, MasterDataController.restoreSubject);

// 5. Class Subjects
router.get('/class-subjects', canView, MasterDataController.listClassSubjects);
router.post('/class-subjects', canManage, validate(CreateClassSubjectSchema), MasterDataController.createClassSubject);
router.delete('/class-subjects/:id', canManage, MasterDataController.deleteClassSubject);

// 6. Demographics: Religions, Categories, Castes
router.get('/religions', canView, MasterDataController.listReligions);
router.post('/religions', canManage, validate(CreateReligionSchema), MasterDataController.createReligion);
router.patch('/religions/:id', canManage, validate(UpdateReligionSchema), MasterDataController.updateReligion);
router.delete('/religions/:id/archive', canManage, MasterDataController.archiveReligion);
router.post('/religions/:id/restore', canManage, MasterDataController.restoreReligion);

router.get('/categories', canView, MasterDataController.listCategories);
router.post('/categories', canManage, validate(CreateCategorySchema), MasterDataController.createCategory);
router.patch('/categories/:id', canManage, validate(UpdateCategorySchema), MasterDataController.updateCategory);
router.delete('/categories/:id/archive', canManage, MasterDataController.archiveCategory);
router.post('/categories/:id/restore', canManage, MasterDataController.restoreCategory);

router.get('/castes', canView, MasterDataController.listCastes);
router.post('/castes', canManage, validate(CreateCasteSchema), MasterDataController.createCaste);
router.patch('/castes/:id', canManage, validate(UpdateCasteSchema), MasterDataController.updateCaste);
router.delete('/castes/:id/archive', canManage, MasterDataController.archiveCaste);
router.post('/castes/:id/restore', canManage, MasterDataController.restoreCaste);

// 7. Transport: Vehicle Types
router.get('/vehicle-types', canView, MasterDataController.listVehicleTypes);
router.post('/vehicle-types', canManage, validate(CreateVehicleTypeSchema), MasterDataController.createVehicleType);
router.patch('/vehicle-types/:id', canManage, validate(UpdateVehicleTypeSchema), MasterDataController.updateVehicleType);
router.delete('/vehicle-types/:id/archive', canManage, MasterDataController.archiveVehicleType);
router.post('/vehicle-types/:id/restore', canManage, MasterDataController.restoreVehicleType);

// 8. Finance: Fee Heads & Expense Heads
router.get('/fee-heads', canView, MasterDataController.listFeeHeads);
router.get('/fee-heads/:id', canView, MasterDataController.getFeeHeadById);
router.post('/fee-heads', canManage, validate(CreateFeeHeadSchema), MasterDataController.createFeeHead);
router.patch('/fee-heads/:id', canManage, validate(UpdateFeeHeadSchema), MasterDataController.updateFeeHead);
router.delete('/fee-heads/:id/archive', canManage, MasterDataController.archiveFeeHead);
router.post('/fee-heads/:id/restore', canManage, MasterDataController.restoreFeeHead);

router.get('/expense-heads', canView, MasterDataController.listExpenseHeads);
router.get('/expense-heads/:id', canView, MasterDataController.getExpenseHeadById);
router.post('/expense-heads', canManage, validate(CreateExpenseHeadSchema), MasterDataController.createExpenseHead);
router.patch('/expense-heads/:id', canManage, validate(UpdateExpenseHeadSchema), MasterDataController.updateExpenseHead);
router.delete('/expense-heads/:id/archive', canManage, MasterDataController.archiveExpenseHead);
router.post('/expense-heads/:id/restore', canManage, MasterDataController.restoreExpenseHead);

// 9. HR: Departments & Designations
router.get('/departments', canView, MasterDataController.listDepartments);
router.get('/departments/:id', canView, MasterDataController.getDepartmentById);
router.post('/departments', canManage, validate(CreateDepartmentSchema), MasterDataController.createDepartment);
router.patch('/departments/:id', canManage, validate(UpdateDepartmentSchema), MasterDataController.updateDepartment);
router.delete('/departments/:id/archive', canManage, MasterDataController.archiveDepartment);
router.post('/departments/:id/restore', canManage, MasterDataController.restoreDepartment);

router.get('/designations', canView, MasterDataController.listDesignations);
router.get('/designations/:id', canView, MasterDataController.getDesignationById);
router.post('/designations', canManage, validate(CreateDesignationSchema), MasterDataController.createDesignation);
router.patch('/designations/:id', canManage, validate(UpdateDesignationSchema), MasterDataController.updateDesignation);
router.delete('/designations/:id/archive', canManage, MasterDataController.archiveDesignation);
router.post('/designations/:id/restore', canManage, MasterDataController.restoreDesignation);

// 10. Locations: Countries, States, Cities
router.get('/countries', canView, MasterDataController.listCountries);
router.post('/countries', canManage, validate(CreateCountrySchema), MasterDataController.createCountry);
router.patch('/countries/:id', canManage, validate(UpdateCountrySchema), MasterDataController.updateCountry);

router.get('/states', canView, MasterDataController.listStates);
router.post('/states', canManage, validate(CreateStateSchema), MasterDataController.createState);
router.patch('/states/:id', canManage, validate(UpdateStateSchema), MasterDataController.updateState);

router.get('/cities', canView, MasterDataController.listCities);
router.post('/cities', canManage, validate(CreateCitySchema), MasterDataController.createCity);
router.patch('/cities/:id', canManage, validate(UpdateCitySchema), MasterDataController.updateCity);

export default router;
