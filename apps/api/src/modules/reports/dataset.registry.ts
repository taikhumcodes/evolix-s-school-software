export interface ReportDataset {
  id: string;
  name: string;
  description: string;
  requiredPermissions: string[];
  dimensions: Array<{
    id: string;
    name: string;
    type: 'string' | 'number' | 'date' | 'boolean';
    dbField: string;
  }>;
  metrics: Array<{
    id: string;
    name: string;
    type: 'sum' | 'count' | 'avg' | 'min' | 'max';
    dbField: string;
    isNumeric: boolean;
  }>;
  baseQuery: string; // The base table/joins
}

export const DatasetRegistry: Record<string, ReportDataset> = {
  'FINANCE_INVOICES': {
    id: 'FINANCE_INVOICES',
    name: 'Finance Invoices',
    description: 'Detailed analysis of fee invoices and collections.',
    requiredPermissions: ['finance.view'],
    dimensions: [
      { id: 'status', name: 'Invoice Status', type: 'string', dbField: 'i."status"' },
      { id: 'financialYear', name: 'Financial Year', type: 'string', dbField: 'fy."name"' },
      { id: 'class', name: 'Class', type: 'string', dbField: 'c."name"' },
    ],
    metrics: [
      { id: 'totalAmount', name: 'Total Amount', type: 'sum', dbField: 'i."total_amount"', isNumeric: true },
      { id: 'paidAmount', name: 'Paid Amount', type: 'sum', dbField: 'i."paid_amount"', isNumeric: true },
      { id: 'outstandingAmount', name: 'Outstanding', type: 'sum', dbField: 'i."outstanding_amount"', isNumeric: true },
      { id: 'invoiceCount', name: 'Invoice Count', type: 'count', dbField: 'i."id"', isNumeric: false },
    ],
    baseQuery: `
      FROM "fee_invoices" i
      LEFT JOIN "financial_years" fy ON fy."id" = i."financial_year_id"
      LEFT JOIN "student_enrollments" se ON se."student_id" = i."student_id" AND se."status" = 'ACTIVE'
      LEFT JOIN "classes" c ON c."id" = se."class_id"
    `
  },
  'STUDENT_ENROLLMENTS': {
    id: 'STUDENT_ENROLLMENTS',
    name: 'Student Enrollments',
    description: 'Analysis of active student enrollments.',
    requiredPermissions: ['students.view'],
    dimensions: [
      { id: 'status', name: 'Enrollment Status', type: 'string', dbField: 'se."status"' },
      { id: 'class', name: 'Class', type: 'string', dbField: 'c."name"' },
      { id: 'gender', name: 'Gender', type: 'string', dbField: 's."gender"' },
    ],
    metrics: [
      { id: 'studentCount', name: 'Student Count', type: 'count', dbField: 'se."id"', isNumeric: false },
    ],
    baseQuery: `
      FROM "student_enrollments" se
      JOIN "students" s ON s."id" = se."student_id"
      JOIN "classes" c ON c."id" = se."class_id"
    `
  },
  'HR_PAYROLL': {
    id: 'HR_PAYROLL',
    name: 'Payroll Costs',
    description: 'Detailed analysis of payroll expenses.',
    requiredPermissions: ['hr.view', 'payroll.view'],
    dimensions: [
      { id: 'runStatus', name: 'Run Status', type: 'string', dbField: 'pr."status"' },
      { id: 'department', name: 'Department', type: 'string', dbField: 'd."name"' },
      { id: 'designation', name: 'Designation', type: 'string', dbField: 'des."name"' },
    ],
    metrics: [
      { id: 'totalGross', name: 'Total Gross', type: 'sum', dbField: 'pre."gross_earnings"', isNumeric: true },
      { id: 'netPay', name: 'Net Pay', type: 'sum', dbField: 'pre."net_pay"', isNumeric: true },
      { id: 'deductions', name: 'Total Deductions', type: 'sum', dbField: 'pre."total_deductions"', isNumeric: true },
    ],
    baseQuery: `
      FROM "payroll_run_employees" pre
      JOIN "payroll_runs" pr ON pr."id" = pre."payroll_run_id"
      JOIN "employees" e ON e."id" = pre."employee_id"
      LEFT JOIN "departments" d ON d."id" = e."department_id"
      LEFT JOIN "designations" des ON des."id" = e."designation_id"
    `
  }
};
