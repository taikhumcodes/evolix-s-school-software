import { Request, Response, NextFunction } from 'express';
import { SetupService } from './setup.service.js';
import { ConfigurationService } from '../configuration/configuration.service.js';
import {
  SetupSchoolNameSchema,
  SetupAcademicYearSchema,
  SetupClassesSchema,
  SetupSectionsSchema,
  SetupSubjectsSchema,
  SetupFeeStructureSchema,
  SetupUsersSchema,
  SetupTransportSchema,
} from './setup.schema.js';
import { ValidationError } from '../../lib/errors.js';

export class SetupController {
  private static async getSchoolId(req: Request): Promise<string> {
    const schoolParam = (req.query.school_id as string) || (req.body.schoolId as string);
    const school = await ConfigurationService.resolveSchool(schoolParam, req.user!.tenantId, req.user!);
    return school.id;
  }

  static async getStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = await SetupController.getSchoolId(req);
      const status = await SetupService.getStatus(req.user!.tenantId, schoolId);
      res.json(status);
    } catch (err) {
      next(err);
    }
  }

  static async executeStep(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = await SetupController.getSchoolId(req);
      const stepName = req.params.step_name;

      let validatedPayload = req.body;
      switch (stepName) {
        case 'school_name':
          validatedPayload = SetupSchoolNameSchema.parse(req.body);
          break;
        case 'academic_year':
          validatedPayload = SetupAcademicYearSchema.parse(req.body);
          break;
        case 'classes':
          validatedPayload = SetupClassesSchema.parse(req.body);
          break;
        case 'sections':
          validatedPayload = SetupSectionsSchema.parse(req.body);
          break;
        case 'subjects':
          validatedPayload = SetupSubjectsSchema.parse(req.body);
          break;
        case 'fee_structure':
          validatedPayload = SetupFeeStructureSchema.parse(req.body);
          break;
        case 'users':
          validatedPayload = SetupUsersSchema.parse(req.body);
          break;
        case 'transport':
          validatedPayload = SetupTransportSchema.parse(req.body);
          break;
        case 'logo':
        case 'done':
          break;
        default:
          throw new ValidationError(`Unsupported setup step: ${stepName}`);
      }

      const result = await SetupService.executeStep(req.user!.tenantId, schoolId, stepName, validatedPayload, req.user!.id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  static async completeSetup(req: Request, res: Response, next: NextFunction) {
    try {
      const schoolId = await SetupController.getSchoolId(req);
      const result = await SetupService.completeSetup(req.user!.tenantId, schoolId, req.user!.id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}
