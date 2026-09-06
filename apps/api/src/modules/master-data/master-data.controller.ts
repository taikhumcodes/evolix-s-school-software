import { Request, Response, NextFunction } from 'express';
import { MasterDataService } from './master-data.service.js';
import { ConfigurationService } from '../configuration/configuration.service.js';

export class MasterDataController {
  private static async getSchoolId(req: Request): Promise<string> {
    const schoolParam =
      (req.query.school_id as string) ||
      req.schoolId ||
      (req.headers['x-school-id'] as string) ||
      (req.body && typeof req.body === 'object' ? req.body.schoolId : undefined);
    const school = await ConfigurationService.resolveSchool(schoolParam, req.user!.tenantId, req.user!);
    return school.id;
  }

  // --- Classes ---
  static async listClasses(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = await MasterDataController.getSchoolId(req);
      const search = req.query.search as string | undefined;
      const isActive = req.query.is_active !== undefined ? req.query.is_active === 'true' : undefined;
      const includeArchived = req.query.include_archived === 'true';

      const classes = await MasterDataService.listClasses(req.user!.tenantId, schoolId, { search, isActive, includeArchived });
      res.json(classes);
    } catch (err) {
      next(err);
    }
  }

  static async getClassById(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = await MasterDataController.getSchoolId(req);
      const cls = await MasterDataService.getClassById(req.user!.tenantId, schoolId, req.params.id as string);
      res.json(cls);
    } catch (err) {
      next(err);
    }
  }

  static async createClass(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = await MasterDataController.getSchoolId(req);
      const created = await MasterDataService.createClass(req.user!.tenantId, schoolId, req.body, req.user!.id);
      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  }

  static async updateClass(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = await MasterDataController.getSchoolId(req);
      const updated = await MasterDataService.updateClass(req.user!.tenantId, schoolId, req.params.id as string, req.body, req.user!.id);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  }

  static async archiveClass(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = await MasterDataController.getSchoolId(req);
      const archived = await MasterDataService.archiveClass(req.user!.tenantId, schoolId, req.params.id as string, req.user!.id);
      res.json(archived);
    } catch (err) {
      next(err);
    }
  }

  static async restoreClass(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = await MasterDataController.getSchoolId(req);
      const restored = await MasterDataService.restoreClass(req.user!.tenantId, schoolId, req.params.id as string, req.user!.id);
      res.json(restored);
    } catch (err) {
      next(err);
    }
  }

  // --- Sections ---
  static async listSections(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = await MasterDataController.getSchoolId(req);
      const search = req.query.search as string | undefined;
      const isActive = req.query.is_active !== undefined ? req.query.is_active === 'true' : undefined;
      const includeArchived = req.query.include_archived === 'true';

      const sections = await MasterDataService.listSections(req.user!.tenantId, schoolId, { search, isActive, includeArchived });
      res.json(sections);
    } catch (err) {
      next(err);
    }
  }

  static async getSectionById(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = await MasterDataController.getSchoolId(req);
      const section = await MasterDataService.getSectionById(req.user!.tenantId, schoolId, req.params.id as string);
      res.json(section);
    } catch (err) {
      next(err);
    }
  }

  static async createSection(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = await MasterDataController.getSchoolId(req);
      const created = await MasterDataService.createSection(req.user!.tenantId, schoolId, req.body, req.user!.id);
      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  }

  static async updateSection(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = await MasterDataController.getSchoolId(req);
      const updated = await MasterDataService.updateSection(req.user!.tenantId, schoolId, req.params.id as string, req.body, req.user!.id);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  }

  static async archiveSection(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = await MasterDataController.getSchoolId(req);
      const archived = await MasterDataService.archiveSection(req.user!.tenantId, schoolId, req.params.id as string, req.user!.id);
      res.json(archived);
    } catch (err) {
      next(err);
    }
  }

  static async restoreSection(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = await MasterDataController.getSchoolId(req);
      const restored = await MasterDataService.restoreSection(req.user!.tenantId, schoolId, req.params.id as string, req.user!.id);
      res.json(restored);
    } catch (err) {
      next(err);
    }
  }

  // --- Class Sections ---
  static async listClassSections(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = await MasterDataController.getSchoolId(req);
      const classId = req.query.class_id as string | undefined;
      const mappings = await MasterDataService.listClassSections(req.user!.tenantId, schoolId, classId);
      res.json(mappings);
    } catch (err) {
      next(err);
    }
  }

  static async createClassSection(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = await MasterDataController.getSchoolId(req);
      const created = await MasterDataService.createClassSection(req.user!.tenantId, schoolId, req.body, req.user!.id);
      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  }

  static async deleteClassSection(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = await MasterDataController.getSchoolId(req);
      const result = await MasterDataService.deleteClassSection(req.user!.tenantId, schoolId, req.params.id as string, req.user!.id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  // --- Subjects ---
  static async listSubjects(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = await MasterDataController.getSchoolId(req);
      const search = req.query.search as string | undefined;
      const isActive = req.query.is_active !== undefined ? req.query.is_active === 'true' : undefined;
      const includeArchived = req.query.include_archived === 'true';

      const subjects = await MasterDataService.listSubjects(req.user!.tenantId, schoolId, { search, isActive, includeArchived });
      res.json(subjects);
    } catch (err) {
      next(err);
    }
  }

  static async getSubjectById(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = await MasterDataController.getSchoolId(req);
      const subject = await MasterDataService.getSubjectById(req.user!.tenantId, schoolId, req.params.id as string);
      res.json(subject);
    } catch (err) {
      next(err);
    }
  }

  static async createSubject(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = await MasterDataController.getSchoolId(req);
      const created = await MasterDataService.createSubject(req.user!.tenantId, schoolId, req.body, req.user!.id);
      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  }

  static async updateSubject(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = await MasterDataController.getSchoolId(req);
      const updated = await MasterDataService.updateSubject(req.user!.tenantId, schoolId, req.params.id as string, req.body, req.user!.id);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  }

  static async archiveSubject(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = await MasterDataController.getSchoolId(req);
      const archived = await MasterDataService.archiveSubject(req.user!.tenantId, schoolId, req.params.id as string, req.user!.id);
      res.json(archived);
    } catch (err) {
      next(err);
    }
  }

  static async restoreSubject(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = await MasterDataController.getSchoolId(req);
      const restored = await MasterDataService.restoreSubject(req.user!.tenantId, schoolId, req.params.id as string, req.user!.id);
      res.json(restored);
    } catch (err) {
      next(err);
    }
  }

  // --- Class Subjects ---
  static async listClassSubjects(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = await MasterDataController.getSchoolId(req);
      const classId = req.query.class_id as string | undefined;
      const mappings = await MasterDataService.listClassSubjects(req.user!.tenantId, schoolId, classId);
      res.json(mappings);
    } catch (err) {
      next(err);
    }
  }

  static async createClassSubject(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = await MasterDataController.getSchoolId(req);
      const created = await MasterDataService.createClassSubject(req.user!.tenantId, schoolId, req.body, req.user!.id);
      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  }

  static async deleteClassSubject(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = await MasterDataController.getSchoolId(req);
      const deleted = await MasterDataService.deleteClassSubject(req.user!.tenantId, schoolId, req.params.id as string, req.user!.id);
      res.json(deleted);
    } catch (err) {
      next(err);
    }
  }

  // --- Religions ---
  static async listReligions(req: Request, res: Response, next: NextFunction) {
    try {
      const search = req.query.search as string | undefined;
      const isActive = req.query.is_active !== undefined ? req.query.is_active === 'true' : undefined;
      const includeArchived = req.query.include_archived === 'true';
      const list = await MasterDataService.listReligions(req.user!.tenantId, { search, isActive, includeArchived });
      res.json(list);
    } catch (err) {
      next(err);
    }
  }

  static async createReligion(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = await MasterDataController.getSchoolId(req);
      const created = await MasterDataService.createReligion(req.user!.tenantId, schoolId, req.body, req.user!.id);
      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  }

  static async updateReligion(req: Request, res: Response, next: NextFunction) {
    try {
      const updated = await MasterDataService.updateReligion(req.user!.tenantId, req.params.id as string, req.body, req.user!.id);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  }

  static async archiveReligion(req: Request, res: Response, next: NextFunction) {
    try {
      const archived = await MasterDataService.archiveReligion(req.user!.tenantId, req.params.id as string, req.user!.id);
      res.json(archived);
    } catch (err) {
      next(err);
    }
  }

  static async restoreReligion(req: Request, res: Response, next: NextFunction) {
    try {
      const restored = await MasterDataService.restoreReligion(req.user!.tenantId, req.params.id as string, req.user!.id);
      res.json(restored);
    } catch (err) {
      next(err);
    }
  }

  // --- Categories ---
  static async listCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const search = req.query.search as string | undefined;
      const isActive = req.query.is_active !== undefined ? req.query.is_active === 'true' : undefined;
      const includeArchived = req.query.include_archived === 'true';
      const list = await MasterDataService.listCategories(req.user!.tenantId, { search, isActive, includeArchived });
      res.json(list);
    } catch (err) {
      next(err);
    }
  }

  static async createCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = await MasterDataController.getSchoolId(req);
      const created = await MasterDataService.createCategory(req.user!.tenantId, schoolId, req.body, req.user!.id);
      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  }

  static async updateCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const updated = await MasterDataService.updateCategory(req.user!.tenantId, req.params.id as string, req.body, req.user!.id);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  }

  static async archiveCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const archived = await MasterDataService.archiveCategory(req.user!.tenantId, req.params.id as string, req.user!.id);
      res.json(archived);
    } catch (err) {
      next(err);
    }
  }

  static async restoreCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const restored = await MasterDataService.restoreCategory(req.user!.tenantId, req.params.id as string, req.user!.id);
      res.json(restored);
    } catch (err) {
      next(err);
    }
  }

  // --- Castes ---
  static async listCastes(req: Request, res: Response, next: NextFunction) {
    try {
      const search = req.query.search as string | undefined;
      const categoryId = req.query.category_id as string | undefined;
      const isActive = req.query.is_active !== undefined ? req.query.is_active === 'true' : undefined;
      const includeArchived = req.query.include_archived === 'true';
      const list = await MasterDataService.listCastes(req.user!.tenantId, { search, categoryId, isActive, includeArchived });
      res.json(list);
    } catch (err) {
      next(err);
    }
  }

  static async createCaste(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = await MasterDataController.getSchoolId(req);
      const created = await MasterDataService.createCaste(req.user!.tenantId, schoolId, req.body, req.user!.id);
      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  }

  static async updateCaste(req: Request, res: Response, next: NextFunction) {
    try {
      const updated = await MasterDataService.updateCaste(req.user!.tenantId, req.params.id as string, req.body, req.user!.id);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  }

  static async archiveCaste(req: Request, res: Response, next: NextFunction) {
    try {
      const archived = await MasterDataService.archiveCaste(req.user!.tenantId, req.params.id as string, req.user!.id);
      res.json(archived);
    } catch (err) {
      next(err);
    }
  }

  static async restoreCaste(req: Request, res: Response, next: NextFunction) {
    try {
      const restored = await MasterDataService.restoreCaste(req.user!.tenantId, req.params.id as string, req.user!.id);
      res.json(restored);
    } catch (err) {
      next(err);
    }
  }

  // --- Vehicle Types ---
  static async listVehicleTypes(req: Request, res: Response, next: NextFunction) {
    try {
      const search = req.query.search as string | undefined;
      const isActive = req.query.is_active !== undefined ? req.query.is_active === 'true' : undefined;
      const includeArchived = req.query.include_archived === 'true';
      const list = await MasterDataService.listVehicleTypes(req.user!.tenantId, { search, isActive, includeArchived });
      res.json(list);
    } catch (err) {
      next(err);
    }
  }

  static async createVehicleType(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = await MasterDataController.getSchoolId(req);
      const created = await MasterDataService.createVehicleType(req.user!.tenantId, schoolId, req.body, req.user!.id);
      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  }

  static async updateVehicleType(req: Request, res: Response, next: NextFunction) {
    try {
      const updated = await MasterDataService.updateVehicleType(req.user!.tenantId, req.params.id as string, req.body, req.user!.id);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  }

  static async archiveVehicleType(req: Request, res: Response, next: NextFunction) {
    try {
      const archived = await MasterDataService.archiveVehicleType(req.user!.tenantId, req.params.id as string, req.user!.id);
      res.json(archived);
    } catch (err) {
      next(err);
    }
  }

  static async restoreVehicleType(req: Request, res: Response, next: NextFunction) {
    try {
      const restored = await MasterDataService.restoreVehicleType(req.user!.tenantId, req.params.id as string, req.user!.id);
      res.json(restored);
    } catch (err) {
      next(err);
    }
  }

  // --- Fee Heads ---
  static async listFeeHeads(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = await MasterDataController.getSchoolId(req);
      const search = req.query.search as string | undefined;
      const isActive = req.query.is_active !== undefined ? req.query.is_active === 'true' : undefined;
      const includeArchived = req.query.include_archived === 'true';

      const heads = await MasterDataService.listFeeHeads(req.user!.tenantId, schoolId, { search, isActive, includeArchived });
      res.json(heads);
    } catch (err) {
      next(err);
    }
  }

  static async getFeeHeadById(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = await MasterDataController.getSchoolId(req);
      const head = await MasterDataService.getFeeHeadById(req.user!.tenantId, schoolId, req.params.id as string);
      res.json(head);
    } catch (err) {
      next(err);
    }
  }

  static async createFeeHead(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = await MasterDataController.getSchoolId(req);
      const created = await MasterDataService.createFeeHead(req.user!.tenantId, schoolId, req.body, req.user!.id);
      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  }

  static async updateFeeHead(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = await MasterDataController.getSchoolId(req);
      const updated = await MasterDataService.updateFeeHead(req.user!.tenantId, schoolId, req.params.id as string, req.body, req.user!.id);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  }

  static async archiveFeeHead(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = await MasterDataController.getSchoolId(req);
      const archived = await MasterDataService.archiveFeeHead(req.user!.tenantId, schoolId, req.params.id as string, req.user!.id);
      res.json(archived);
    } catch (err) {
      next(err);
    }
  }

  static async restoreFeeHead(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = await MasterDataController.getSchoolId(req);
      const restored = await MasterDataService.restoreFeeHead(req.user!.tenantId, schoolId, req.params.id as string, req.user!.id);
      res.json(restored);
    } catch (err) {
      next(err);
    }
  }

  // --- Expense Heads ---
  static async listExpenseHeads(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = await MasterDataController.getSchoolId(req);
      const search = req.query.search as string | undefined;
      const isActive = req.query.is_active !== undefined ? req.query.is_active === 'true' : undefined;
      const includeArchived = req.query.include_archived === 'true';

      const heads = await MasterDataService.listExpenseHeads(req.user!.tenantId, schoolId, { search, isActive, includeArchived });
      res.json(heads);
    } catch (err) {
      next(err);
    }
  }

  static async getExpenseHeadById(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = await MasterDataController.getSchoolId(req);
      const head = await MasterDataService.getExpenseHeadById(req.user!.tenantId, schoolId, req.params.id as string);
      res.json(head);
    } catch (err) {
      next(err);
    }
  }

  static async createExpenseHead(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = await MasterDataController.getSchoolId(req);
      const created = await MasterDataService.createExpenseHead(req.user!.tenantId, schoolId, req.body, req.user!.id);
      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  }

  static async updateExpenseHead(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = await MasterDataController.getSchoolId(req);
      const updated = await MasterDataService.updateExpenseHead(req.user!.tenantId, schoolId, req.params.id as string, req.body, req.user!.id);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  }

  static async archiveExpenseHead(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = await MasterDataController.getSchoolId(req);
      const archived = await MasterDataService.archiveExpenseHead(req.user!.tenantId, schoolId, req.params.id as string, req.user!.id);
      res.json(archived);
    } catch (err) {
      next(err);
    }
  }

  static async restoreExpenseHead(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = await MasterDataController.getSchoolId(req);
      const restored = await MasterDataService.restoreExpenseHead(req.user!.tenantId, schoolId, req.params.id as string, req.user!.id);
      res.json(restored);
    } catch (err) {
      next(err);
    }
  }

  // --- Departments ---
  static async listDepartments(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = await MasterDataController.getSchoolId(req);
      const search = req.query.search as string | undefined;
      const isActive = req.query.is_active !== undefined ? req.query.is_active === 'true' : undefined;
      const includeArchived = req.query.include_archived === 'true';

      const deps = await MasterDataService.listDepartments(req.user!.tenantId, schoolId, { search, isActive, includeArchived });
      res.json(deps);
    } catch (err) {
      next(err);
    }
  }

  static async getDepartmentById(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = await MasterDataController.getSchoolId(req);
      const dep = await MasterDataService.getDepartmentById(req.user!.tenantId, schoolId, req.params.id as string);
      res.json(dep);
    } catch (err) {
      next(err);
    }
  }

  static async createDepartment(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = await MasterDataController.getSchoolId(req);
      const created = await MasterDataService.createDepartment(req.user!.tenantId, schoolId, req.body, req.user!.id);
      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  }

  static async updateDepartment(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = await MasterDataController.getSchoolId(req);
      const updated = await MasterDataService.updateDepartment(req.user!.tenantId, schoolId, req.params.id as string, req.body, req.user!.id);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  }

  static async archiveDepartment(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = await MasterDataController.getSchoolId(req);
      const archived = await MasterDataService.archiveDepartment(req.user!.tenantId, schoolId, req.params.id as string, req.user!.id);
      res.json(archived);
    } catch (err) {
      next(err);
    }
  }

  static async restoreDepartment(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = await MasterDataController.getSchoolId(req);
      const restored = await MasterDataService.restoreDepartment(req.user!.tenantId, schoolId, req.params.id as string, req.user!.id);
      res.json(restored);
    } catch (err) {
      next(err);
    }
  }

  // --- Designations ---
  static async listDesignations(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = await MasterDataController.getSchoolId(req);
      const search = req.query.search as string | undefined;
      const departmentId = req.query.department_id as string | undefined;
      const isActive = req.query.is_active !== undefined ? req.query.is_active === 'true' : undefined;
      const includeArchived = req.query.include_archived === 'true';

      const des = await MasterDataService.listDesignations(req.user!.tenantId, schoolId, { search, departmentId, isActive, includeArchived });
      res.json(des);
    } catch (err) {
      next(err);
    }
  }

  static async getDesignationById(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = await MasterDataController.getSchoolId(req);
      const des = await MasterDataService.getDesignationById(req.user!.tenantId, schoolId, req.params.id as string);
      res.json(des);
    } catch (err) {
      next(err);
    }
  }

  static async createDesignation(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = await MasterDataController.getSchoolId(req);
      const created = await MasterDataService.createDesignation(req.user!.tenantId, schoolId, req.body, req.user!.id);
      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  }

  static async updateDesignation(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = await MasterDataController.getSchoolId(req);
      const updated = await MasterDataService.updateDesignation(req.user!.tenantId, schoolId, req.params.id as string, req.body, req.user!.id);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  }

  static async archiveDesignation(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = await MasterDataController.getSchoolId(req);
      const archived = await MasterDataService.archiveDesignation(req.user!.tenantId, schoolId, req.params.id as string, req.user!.id);
      res.json(archived);
    } catch (err) {
      next(err);
    }
  }

  static async restoreDesignation(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = await MasterDataController.getSchoolId(req);
      const restored = await MasterDataService.restoreDesignation(req.user!.tenantId, schoolId, req.params.id as string, req.user!.id);
      res.json(restored);
    } catch (err) {
      next(err);
    }
  }

  // --- Locations ---
  static async listCountries(_req: Request, res: Response, next: NextFunction) {
    try {
      const countries = await MasterDataService.listCountries();
      res.json(countries);
    } catch (err) {
      next(err);
    }
  }

  static async createCountry(req: Request, res: Response, next: NextFunction) {
    try {
      const created = await MasterDataService.createCountry(req.body);
      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  }

  static async updateCountry(req: Request, res: Response, next: NextFunction) {
    try {
      const updated = await MasterDataService.updateCountry(req.params.id as string, req.body);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  }

  static async listStates(req: Request, res: Response, next: NextFunction) {
    try {
      const countryId = req.query.country_id as string | undefined;
      const states = await MasterDataService.listStates(countryId);
      res.json(states);
    } catch (err) {
      next(err);
    }
  }

  static async createState(req: Request, res: Response, next: NextFunction) {
    try {
      const created = await MasterDataService.createState(req.body);
      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  }

  static async updateState(req: Request, res: Response, next: NextFunction) {
    try {
      const updated = await MasterDataService.updateState(req.params.id as string, req.body);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  }

  static async listCities(req: Request, res: Response, next: NextFunction) {
    try {
      const stateId = req.query.state_id as string | undefined;
      const cities = await MasterDataService.listCities(stateId);
      res.json(cities);
    } catch (err) {
      next(err);
    }
  }

  static async createCity(req: Request, res: Response, next: NextFunction) {
    try {
      const created = await MasterDataService.createCity(req.body);
      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  }

  static async updateCity(req: Request, res: Response, next: NextFunction) {
    try {
      const updated = await MasterDataService.updateCity(req.params.id as string, req.body);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  }
}
