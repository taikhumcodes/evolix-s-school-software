import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requirePermissions, requireAnyPermission } from '../../middleware/rbac.js';
import { validateRequest } from '../../middleware/validate.js';
import { FinanceController } from './finance.controller.js';
import {
  createFinancialYearSchema,
  createAccountingPeriodSchema,
  reopenPeriodSchema,
  createAccountSchema,
  createJournalEntrySchema,
  reverseJournalSchema,
  createFeeStructureSchema,
  assignStudentFeeSchema,
  createFeeInvoiceSchema,
  batchGenerateInvoicesSchema,
  collectFeePaymentSchema,
  reverseReceiptSchema,
  createConcessionSchema,
  approveConcessionSchema,
  createCreditNoteSchema,
  writeOffInvoiceSchema,
  createRefundSchema,
  createVendorSchema,
  createExpenseBillSchema,
  createVendorPaymentSchema,
  createBankAccountSchema,
  createBankTransferSchema,
  importBankStatementSchema,
  matchStatementLineSchema,
  closeReconciliationSchema,
  reopenReconciliationSchema,
  postOpeningBalanceBatchSchema,
} from './finance.schema.js';

export const financeRouter = Router();
financeRouter.use(authenticate);

// 1. Dashboard Overview
financeRouter.get(
  '/overview',
  requireAnyPermission(['finance.view']),
  FinanceController.getOverview
);

// 2. Financial Years
financeRouter.get(
  '/financial-years',
  requireAnyPermission(['finance.view', 'finance.accounts.view']),
  FinanceController.listFinancialYears
);
financeRouter.post(
  '/financial-years',
  requirePermissions(['finance.accounts.manage']),
  validateRequest({ body: createFinancialYearSchema }),
  FinanceController.createFinancialYear
);

// 3. Accounting Periods
financeRouter.get(
  '/accounting-periods',
  requireAnyPermission(['finance.view', 'finance.accounts.view']),
  FinanceController.listAccountingPeriods
);
financeRouter.post(
  '/accounting-periods',
  requirePermissions(['finance.accounts.manage']),
  validateRequest({ body: createAccountingPeriodSchema }),
  FinanceController.createAccountingPeriod
);
financeRouter.post(
  '/accounting-periods/:id/close',
  requirePermissions(['finance.period.close']),
  FinanceController.closeAccountingPeriod
);
financeRouter.post(
  '/accounting-periods/:id/reopen',
  requirePermissions(['finance.period.reopen']),
  validateRequest({ body: reopenPeriodSchema }),
  FinanceController.reopenAccountingPeriod
);

// 4. Chart of Accounts
financeRouter.get(
  '/accounts',
  requireAnyPermission(['finance.view', 'finance.accounts.view']),
  FinanceController.listAccounts
);
financeRouter.post(
  '/accounts',
  requirePermissions(['finance.accounts.manage']),
  validateRequest({ body: createAccountSchema }),
  FinanceController.createAccount
);
financeRouter.post(
  '/accounts/initialize-defaults',
  requireAnyPermission(['finance.accounts.manage', 'finance.manage', 'finance.view']),
  FinanceController.initializeDefaultAccounts
);
financeRouter.post(
  '/accounts/:id/archive',
  requirePermissions(['finance.accounts.manage']),
  FinanceController.archiveAccount
);

// 5. General Ledger Journals
financeRouter.get(
  '/journals',
  requireAnyPermission(['finance.journals.view', 'finance.view']),
  FinanceController.listJournals
);
financeRouter.post(
  '/journals',
  requirePermissions(['finance.journals.post']),
  validateRequest({ body: createJournalEntrySchema }),
  FinanceController.createJournalEntry
);
financeRouter.post(
  '/journals/:id/reverse',
  requirePermissions(['finance.journals.reverse']),
  validateRequest({ body: reverseJournalSchema }),
  FinanceController.reverseJournalEntry
);

// 6. Fee Structures
financeRouter.get(
  '/fee-structures',
  requireAnyPermission(['finance.fees.view', 'finance.view']),
  FinanceController.listFeeStructures
);
financeRouter.post(
  '/fee-structures',
  requirePermissions(['finance.fees.manage']),
  validateRequest({ body: createFeeStructureSchema }),
  FinanceController.createFeeStructure
);

// 7. Student Fee Assignments
financeRouter.get(
  '/student-fees',
  requireAnyPermission(['finance.fees.view', 'finance.view']),
  FinanceController.listStudentFeeAssignments
);
financeRouter.post(
  '/student-fees/assign',
  requirePermissions(['finance.fees.manage']),
  validateRequest({ body: assignStudentFeeSchema }),
  FinanceController.assignStudentFee
);

// 8. Fee Invoices
financeRouter.get(
  '/invoices',
  requireAnyPermission(['finance.fees.view', 'finance.view']),
  FinanceController.listInvoices
);
financeRouter.get(
  '/invoices/:id',
  requireAnyPermission(['finance.fees.view', 'finance.view']),
  FinanceController.getInvoice
);
financeRouter.post(
  '/invoices',
  requirePermissions(['finance.fees.manage']),
  validateRequest({ body: createFeeInvoiceSchema }),
  FinanceController.createInvoice
);
financeRouter.post(
  '/invoices/batch-generate',
  requirePermissions(['finance.fees.manage']),
  validateRequest({ body: batchGenerateInvoicesSchema }),
  FinanceController.batchGenerateInvoices
);
financeRouter.post(
  '/invoices/:id/write-off',
  requirePermissions(['finance.writeoff.manage']),
  validateRequest({ body: writeOffInvoiceSchema }),
  FinanceController.writeOffInvoice
);

// 9. Collections & Receipts
financeRouter.post(
  '/collections/pay',
  requirePermissions(['finance.collect']),
  validateRequest({ body: collectFeePaymentSchema }),
  FinanceController.collectFeePayment
);
financeRouter.get(
  '/collections/receipts',
  requireAnyPermission(['finance.collect', 'finance.view']),
  FinanceController.listReceipts
);
financeRouter.post(
  '/collections/receipts/:id/reverse',
  requirePermissions(['finance.collect', 'finance.journals.reverse']),
  validateRequest({ body: reverseReceiptSchema }),
  FinanceController.reverseReceipt
);

// 10. Concessions
financeRouter.get(
  '/concessions',
  requireAnyPermission(['finance.concession.manage', 'finance.fees.view', 'finance.view']),
  FinanceController.listConcessions
);
financeRouter.post(
  '/concessions',
  requirePermissions(['finance.concession.manage']),
  validateRequest({ body: createConcessionSchema }),
  FinanceController.createConcession
);
financeRouter.post(
  '/concessions/:id/approve',
  requirePermissions(['finance.concession.approve']),
  validateRequest({ body: approveConcessionSchema }),
  FinanceController.approveConcession
);

// 11. Credit Notes
financeRouter.post(
  '/credit-notes',
  requirePermissions(['finance.fees.manage']),
  validateRequest({ body: createCreditNoteSchema }),
  FinanceController.createCreditNote
);

// 12. Refunds
financeRouter.get(
  '/refunds',
  requireAnyPermission(['finance.refunds.manage', 'finance.view']),
  FinanceController.listRefunds
);
financeRouter.post(
  '/refunds',
  requirePermissions(['finance.refunds.manage']),
  validateRequest({ body: createRefundSchema }),
  FinanceController.createRefund
);

// 13. Student Ledger & Aging
financeRouter.get(
  '/student-ledger/:studentId',
  requireAnyPermission(['finance.fees.view', 'finance.view']),
  FinanceController.getStudentLedger
);
financeRouter.get(
  '/aging',
  requireAnyPermission(['finance.reports.view', 'finance.view']),
  FinanceController.getAgingReport
);

// 14. Vendors
financeRouter.get(
  '/vendors',
  requireAnyPermission(['finance.expenses.view', 'finance.view']),
  FinanceController.listVendors
);
financeRouter.post(
  '/vendors',
  requirePermissions(['finance.expenses.manage']),
  validateRequest({ body: createVendorSchema }),
  FinanceController.createVendor
);

// 15. Expenses & Vendor Payments
financeRouter.get(
  '/expenses',
  requireAnyPermission(['finance.expenses.view', 'finance.view']),
  FinanceController.listExpenseBills
);
financeRouter.post(
  '/expenses',
  requirePermissions(['finance.expenses.manage']),
  validateRequest({ body: createExpenseBillSchema }),
  FinanceController.createExpenseBill
);
financeRouter.post(
  '/expenses/pay',
  requirePermissions(['finance.expenses.manage']),
  validateRequest({ body: createVendorPaymentSchema }),
  FinanceController.createVendorPayment
);

// 16. Banking & Transfers
financeRouter.get(
  '/banking/accounts',
  requireAnyPermission(['finance.bank.view', 'finance.view']),
  FinanceController.listBankAccounts
);
financeRouter.post(
  '/banking/accounts',
  requirePermissions(['finance.bank.manage']),
  validateRequest({ body: createBankAccountSchema }),
  FinanceController.createBankAccount
);
financeRouter.post(
  '/banking/transfers',
  requirePermissions(['finance.bank.manage']),
  validateRequest({ body: createBankTransferSchema }),
  FinanceController.createBankTransfer
);
financeRouter.post(
  '/banking/statements/import',
  requirePermissions(['finance.bank.manage']),
  validateRequest({ body: importBankStatementSchema }),
  FinanceController.importBankStatement
);
financeRouter.get(
  '/banking/statements/lines',
  requireAnyPermission(['finance.bank.view']),
  FinanceController.listStatementLines
);
financeRouter.post(
  '/banking/reconciliation/match',
  requirePermissions(['finance.bank.reconcile']),
  validateRequest({ body: matchStatementLineSchema }),
  FinanceController.matchStatementLine
);
financeRouter.post(
  '/banking/reconciliation/close',
  requirePermissions(['finance.bank.reconcile']),
  validateRequest({ body: closeReconciliationSchema }),
  FinanceController.closeReconciliation
);
financeRouter.post(
  '/banking/reconciliation/:id/reopen',
  requirePermissions(['finance.bank.reconcile']),
  validateRequest({ body: reopenReconciliationSchema }),
  FinanceController.reopenReconciliation
);

// 17. Reports & CSV Export
financeRouter.get(
  '/reports/trial-balance',
  requireAnyPermission(['finance.reports.view', 'finance.view']),
  FinanceController.getTrialBalance
);
financeRouter.get(
  '/reports/profit-and-loss',
  requireAnyPermission(['finance.reports.view', 'finance.view']),
  FinanceController.getProfitAndLoss
);
financeRouter.get(
  '/reports/balance-sheet',
  requireAnyPermission(['finance.reports.view', 'finance.view']),
  FinanceController.getBalanceSheet
);
financeRouter.get(
  '/reports/export',
  requirePermissions(['finance.export']),
  FinanceController.exportCsv
);

// 18. Opening Balances
financeRouter.post(
  '/opening-balances',
  requirePermissions(['finance.opening_balance.manage']),
  validateRequest({ body: postOpeningBalanceBatchSchema }),
  FinanceController.postOpeningBalances
);

// 19. Parent Access (Scoped to linked child only)
financeRouter.get(
  '/parent/student/:studentId',
  requireAnyPermission(['parent.finance.view', 'parent.children.view']),
  FinanceController.getParentChildFinance
);

export default financeRouter;
