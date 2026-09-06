import { z } from 'zod';

// Common Pagination & Filter Schemas
export const paginationQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// 1. Financial Year Schemas
export const createFinancialYearSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  startDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  endDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
});

export const updateFinancialYearSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  startDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  endDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  status: z.enum(['OPEN', 'CLOSED']).optional(),
});

// 2. Accounting Period Schemas
export const createAccountingPeriodSchema = z.object({
  financialYearId: z.string().uuid(),
  name: z.string().min(1).max(100),
  startDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  endDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
});

export const closePeriodSchema = z.object({
  reason: z.string().max(255).optional(),
});

export const reopenPeriodSchema = z.object({
  reason: z.string().min(3, 'Mandatory reason is required to reopen a closed period').max(255),
});

// 3. Chart of Accounts Schemas
export const createAccountSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(150),
  type: z.enum(['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE']),
  normalBalance: z.enum(['DEBIT', 'CREDIT']),
  parentAccountId: z.string().uuid().optional().nullable(),
  description: z.string().max(255).optional().nullable(),
  systemMapping: z.string().max(100).optional().nullable(),
});

export const updateAccountSchema = z.object({
  name: z.string().min(1).max(150).optional(),
  description: z.string().max(255).optional().nullable(),
  parentAccountId: z.string().uuid().optional().nullable(),
  isActive: z.boolean().optional(),
});

// 4. Journal Entry Schemas
export const journalLineInputSchema = z.object({
  accountId: z.string().uuid(),
  description: z.string().max(255).optional().nullable(),
  debit: z.coerce.number().min(0).default(0),
  credit: z.coerce.number().min(0).default(0),
  studentId: z.string().uuid().optional().nullable(),
  vendorId: z.string().uuid().optional().nullable(),
  feeHeadId: z.string().uuid().optional().nullable(),
  expenseHeadId: z.string().uuid().optional().nullable(),
});

export const createJournalEntrySchema = z.object({
  financialYearId: z.string().uuid().optional(),
  accountingPeriodId: z.string().uuid().optional(),
  postingDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  description: z.string().min(1, 'Description is required').max(255),
  lines: z.array(journalLineInputSchema).min(2, 'Journal entry must contain at least 2 lines'),
});

export const reverseJournalSchema = z.object({
  reason: z.string().min(3, 'Reason for reversal is required').max(255),
  postingDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
});

// 5. Fee Structure Schemas
export const feeStructureItemInputSchema = z.object({
  feeHeadId: z.string().uuid(),
  amount: z.coerce.number().min(0),
  frequency: z.enum(['ONE_TIME', 'MONTHLY', 'QUARTERLY', 'TERMLY', 'ANNUALLY']),
  isOptional: z.boolean().default(false),
  displayOrder: z.number().int().default(0),
});

export const feeInstallmentInputSchema = z.object({
  name: z.string().min(1).max(100),
  dueDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  percentage: z.coerce.number().min(0).max(100).optional().nullable(),
  amount: z.coerce.number().min(0).optional().nullable(),
  sequence: z.number().int().default(1),
});

export const createFeeStructureSchema = z.object({
  name: z.string().min(1).max(150),
  academicYearId: z.string().uuid(),
  classId: z.string().uuid().optional().nullable(),
  studentCategoryId: z.string().uuid().optional().nullable(),
  effectiveDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  items: z.array(feeStructureItemInputSchema).min(1, 'At least one fee structure item is required'),
  installments: z.array(feeInstallmentInputSchema).optional(),
});

export const updateFeeStructureSchema = z.object({
  name: z.string().min(1).max(150).optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']).optional(),
  items: z.array(feeStructureItemInputSchema).optional(),
  installments: z.array(feeInstallmentInputSchema).optional(),
});

// 6. Student Fee Assignment
export const assignStudentFeeSchema = z.object({
  studentId: z.string().uuid(),
  academicYearId: z.string().uuid(),
  feeStructureId: z.string().uuid(),
  customTotalAmount: z.coerce.number().min(0).optional().nullable(),
  remarks: z.string().max(255).optional().nullable(),
});

export const bulkAssignStudentFeeSchema = z.object({
  classId: z.string().uuid(),
  academicYearId: z.string().uuid(),
  feeStructureId: z.string().uuid(),
});

// 7. Concessions & Scholarships
export const createConcessionSchema = z.object({
  studentId: z.string().uuid(),
  academicYearId: z.string().uuid(),
  feeHeadId: z.string().uuid().optional().nullable(),
  type: z.enum(['SCHOLARSHIP', 'SIBLING_DISCOUNT', 'STAFF_CHILD', 'MANAGEMENT_CONCESSION', 'OTHER']),
  method: z.enum(['FIXED_AMOUNT', 'PERCENTAGE']),
  value: z.coerce.number().min(0),
  reason: z.string().min(1).max(255),
});

export const approveConcessionSchema = z.object({
  approved: z.boolean(),
  remarks: z.string().max(255).optional(),
});

// 8. Fee Invoices
export const createFeeInvoiceSchema = z.object({
  studentId: z.string().uuid(),
  academicYearId: z.string().uuid(),
  financialYearId: z.string().uuid().optional(),
  invoiceDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  dueDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  lines: z.array(
    z.object({
      feeHeadId: z.string().uuid(),
      description: z.string().min(1).max(255),
      rate: z.coerce.number().min(0),
      quantity: z.coerce.number().min(1).default(1),
      concession: z.coerce.number().min(0).default(0),
    })
  ).min(1, 'Invoice must contain at least one line item'),
});

export const batchGenerateInvoicesSchema = z.object({
  academicYearId: z.string().uuid(),
  financialYearId: z.string().uuid().optional(),
  classId: z.string().uuid(),
  sectionId: z.string().uuid().optional().nullable(),
  installmentName: z.string().min(1).max(100),
  invoiceDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  dueDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
});

// 9. Fee Collections & Payments
export const paymentAllocationInputSchema = z.object({
  invoiceId: z.string().uuid(),
  allocatedAmount: z.coerce.number().min(0.01),
});

export const collectFeePaymentSchema = z.object({
  studentId: z.string().uuid(),
  receivingAccountId: z.string().uuid(),
  paymentDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  paymentMethod: z.enum(['CASH', 'BANK_TRANSFER', 'CHEQUE', 'UPI', 'CARD', 'ONLINE', 'OTHER']),
  totalAmount: z.coerce.number().min(0.01),
  referenceNumber: z.string().max(100).optional().nullable(),
  chequeNumber: z.string().max(50).optional().nullable(),
  chequeDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional().nullable(),
  chequeBankName: z.string().max(100).optional().nullable(),
  remarks: z.string().max(255).optional().nullable(),
  allocations: z.array(paymentAllocationInputSchema).optional(),
  idempotencyKey: z.string().max(100).optional().nullable(),
});

export const reverseReceiptSchema = z.object({
  reason: z.string().min(3, 'Reason for reversal is required').max(255),
  isBouncedCheque: z.boolean().default(false),
});

// 10. Credit Notes & Write-Offs
export const createCreditNoteSchema = z.object({
  invoiceId: z.string().uuid(),
  feeHeadId: z.string().uuid().optional().nullable(),
  amount: z.coerce.number().min(0.01),
  reason: z.string().min(1).max(255),
});

export const writeOffInvoiceSchema = z.object({
  invoiceId: z.string().uuid().optional(),
  amount: z.coerce.number().min(0.01),
  reason: z.string().min(3, 'Detailed justification required for write-off').max(255),
});

// 11. Refunds
export const createRefundSchema = z.object({
  studentId: z.string().uuid(),
  disbursingAccountId: z.string().uuid(),
  feePaymentId: z.string().uuid().optional().nullable(),
  amount: z.coerce.number().min(0.01),
  refundMethod: z.enum(['CASH', 'BANK_TRANSFER', 'CHEQUE', 'UPI', 'OTHER']),
  reason: z.string().min(3).max(255),
  referenceNumber: z.string().max(100).optional().nullable(),
});

// 12. Vendors
export const createVendorSchema = z.object({
  name: z.string().min(1).max(150),
  contactPerson: z.string().max(100).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal('')),
  address: z.string().max(255).optional().nullable(),
  taxId: z.string().max(50).optional().nullable(),
  bankDetails: z.string().max(255).optional().nullable(),
});

export const updateVendorSchema = createVendorSchema.partial().extend({
  isActive: z.boolean().optional(),
});

// 13. Expense Bills & Vouchers
export const expenseBillLineInputSchema = z.object({
  expenseHeadId: z.string().uuid().optional().nullable(),
  accountId: z.string().uuid(),
  description: z.string().min(1).max(255),
  amount: z.coerce.number().min(0.01),
});

export const createExpenseBillSchema = z.object({
  vendorId: z.string().uuid().optional().nullable(),
  billDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  dueDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional().nullable(),
  description: z.string().min(1).max(255),
  lines: z.array(expenseBillLineInputSchema).min(1, 'At least one expense line is required'),
  attachmentUrl: z.string().optional().nullable(),
  isImmediatePayment: z.boolean().default(false),
  disbursingAccountId: z.string().uuid().optional().nullable(),
  paymentMethod: z.enum(['CASH', 'BANK_TRANSFER', 'CHEQUE', 'UPI', 'OTHER']).optional(),
  paymentReference: z.string().max(100).optional().nullable(),
});

export const approveExpenseBillSchema = z.object({
  approved: z.boolean(),
  remarks: z.string().max(255).optional(),
});

export const createVendorPaymentSchema = z.object({
  vendorId: z.string().uuid(),
  disbursingAccountId: z.string().uuid(),
  paymentDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  paymentMethod: z.enum(['CASH', 'BANK_TRANSFER', 'CHEQUE', 'UPI', 'OTHER']),
  amount: z.coerce.number().min(0.01),
  referenceNumber: z.string().max(100).optional().nullable(),
  remarks: z.string().max(255).optional().nullable(),
  expenseBillId: z.string().uuid().optional().nullable(),
  idempotencyKey: z.string().max(100).optional().nullable(),
  allocations: z.array(
    z.object({
      expenseBillId: z.string().uuid(),
      allocatedAmount: z.coerce.number().min(0.01),
    })
  ).optional(),
});

// 14. Bank Accounts & Transfers
export const createBankAccountSchema = z.object({
  accountId: z.string().uuid(),
  bankName: z.string().min(1).max(100),
  accountDisplayName: z.string().min(1).max(100),
  accountNumber: z.string().min(4).max(100),
  ifscCode: z.string().max(30).optional().nullable(),
  branchName: z.string().max(100).optional().nullable(),
});

export const updateBankAccountSchema = z.object({
  accountDisplayName: z.string().min(1).max(100).optional(),
  branchName: z.string().max(100).optional().nullable(),
  isActive: z.boolean().optional(),
});

export const createBankTransferSchema = z.object({
  fromAccountId: z.string().uuid(),
  toAccountId: z.string().uuid(),
  transferDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  amount: z.coerce.number().min(0.01),
  referenceNumber: z.string().max(100).optional().nullable(),
  remarks: z.string().max(255).optional().nullable(),
});

// 15. Bank Statement Import & Reconciliation
export const bankStatementLineInputSchema = z.object({
  transactionDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  description: z.string().min(1).max(255),
  referenceNumber: z.string().max(100).optional().nullable(),
  debit: z.coerce.number().min(0).default(0),
  credit: z.coerce.number().min(0).default(0),
  balanceAfter: z.coerce.number().optional().nullable(),
});

export const importBankStatementSchema = z.object({
  bankAccountId: z.string().uuid(),
  statementStartDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  statementEndDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  lines: z.array(bankStatementLineInputSchema).min(1, 'Statement must contain at least one line'),
});

export const matchStatementLineSchema = z.object({
  statementLineId: z.string().uuid(),
  journalLineId: z.string().uuid(),
});

export const ignoreStatementLineSchema = z.object({
  statementLineId: z.string().uuid(),
  reason: z.string().min(1).max(255),
});

export const closeReconciliationSchema = z.object({
  bankAccountId: z.string().uuid(),
  periodStartDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  periodEndDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  closingBalanceBank: z.coerce.number(),
});

export const reopenReconciliationSchema = z.object({
  reconciliationId: z.string().uuid().optional(),
  reason: z.string().min(3, 'Mandatory reason required to reopen bank reconciliation').max(255),
});

// 16. Opening Balances
export const openingBalanceLineSchema = z.object({
  accountId: z.string().uuid(),
  debit: z.coerce.number().min(0).default(0),
  credit: z.coerce.number().min(0).default(0),
  description: z.string().max(255).optional().nullable(),
});

export const postOpeningBalanceBatchSchema = z.object({
  financialYearId: z.string().uuid(),
  postingDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  description: z.string().min(1).max(255),
  lines: z.array(openingBalanceLineSchema).min(1, 'At least one account balance is required'),
});

// 17. Late Fee Rules
export const applyLateFeeSchema = z.object({
  academicYearId: z.string().uuid(),
  asOfDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  fixedAmount: z.coerce.number().min(0).default(50),
  gracePeriodDays: z.coerce.number().min(0).default(0),
});
