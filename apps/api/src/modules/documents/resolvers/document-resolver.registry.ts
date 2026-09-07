import { StudentDocumentResolver } from './student-document.resolver.js';
import { AcademicDocumentResolver } from './academic-document.resolver.js';
import { FinanceDocumentResolver } from './finance-document.resolver.js';
import { HrDocumentResolver } from './hr-document.resolver.js';
import { OperationsDocumentResolver } from './operations-document.resolver.js';
import { DocumentCategory, DocumentType } from '../documents.types.js';

export class DocumentResolverRegistry {
  public static async resolve(params: {
    tenantId: string;
    schoolId: string;
    documentType: DocumentType;
    category: DocumentCategory;
    sourceId: string;
    isOfficialFinalize?: boolean;
    customVariables?: Record<string, any>;
  }): Promise<Record<string, any>> {
    const {
      tenantId,
      schoolId,
      documentType,
      category,
      sourceId,
      isOfficialFinalize,
      customVariables,
    } = params;

    let baseData: Record<string, any> = {};

    if (
      category === 'STUDENT' ||
      [
        'BONAFIDE_CERTIFICATE',
        'TRANSFER_CERTIFICATE',
        'CHARACTER_CERTIFICATE',
        'STUDENT_ID_CARD',
        'ADMISSION_FORM',
        'STUDENT_PROFILE',
      ].includes(documentType)
    ) {
      baseData = await StudentDocumentResolver.resolve(
        tenantId,
        schoolId,
        sourceId,
        isOfficialFinalize
      );
    } else if (
      category === 'ACADEMIC' ||
      ['REPORT_CARD', 'EXAM_RESULT', 'MARKS_STATEMENT'].includes(documentType)
    ) {
      baseData = await AcademicDocumentResolver.resolve(
        tenantId,
        schoolId,
        sourceId,
        isOfficialFinalize
      );
    } else if (
      category === 'FINANCE' ||
      ['FEE_RECEIPT', 'FEE_STATEMENT', 'STUDENT_LEDGER_STATEMENT'].includes(documentType)
    ) {
      baseData = await FinanceDocumentResolver.resolve(
        tenantId,
        schoolId,
        sourceId,
        isOfficialFinalize
      );
    } else if (
      category === 'HR' ||
      category === 'PAYROLL' ||
      [
        'PAYSLIP',
        'SALARY_CERTIFICATE',
        'EMPLOYEE_ID_CARD',
        'EMPLOYMENT_CERTIFICATE',
        'EXPERIENCE_CERTIFICATE',
        'APPOINTMENT_LETTER',
        'RELIEVING_LETTER',
      ].includes(documentType)
    ) {
      baseData = await HrDocumentResolver.resolve(
        tenantId,
        schoolId,
        sourceId,
        documentType,
        isOfficialFinalize
      );
    } else if (
      category === 'OPERATIONS' ||
      [
        'ROUTE_MANIFEST',
        'VISITOR_PASS',
        'STUDENT_PICKUP_RECORD',
        'EVENT_PARTICIPANT_LIST',
      ].includes(documentType)
    ) {
      baseData = await OperationsDocumentResolver.resolve(
        tenantId,
        schoolId,
        sourceId,
        documentType,
        isOfficialFinalize
      );
    } else {
      // General fallback
      baseData = {};
    }

    const today = new Date();
    const dateFormatted = today.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

    const merged = {
      ...baseData,
      document: {
        type: documentType,
        category,
        date: today.toISOString().split('T')[0],
        dateFormatted,
        number: 'DRAFT',
        status: 'DRAFT',
        ...(baseData.document || {}),
      },
      ...(customVariables || {}),
    };

    return merged;
  }
}
