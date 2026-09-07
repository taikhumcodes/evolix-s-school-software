import { prisma } from '../../../lib/prisma.js';
import { isValidUuid, getSampleHrData } from './sample-data.js';

export class HrDocumentResolver {
  public static async resolve(
    tenantId: string,
    schoolId: string,
    sourceId: string,
    documentType: string,
    isOfficialFinalize = false
  ): Promise<Record<string, any>> {
    const school = await prisma.school.findFirst({
      where: { id: schoolId, tenantId },
      include: { configuration: true, branding: true },
    });

    if (documentType === 'PAYSLIP') {
      let runEmp = null;
      if (isValidUuid(sourceId)) {
        // sourceId is either PayrollRunEmployee ID or Employee ID
        runEmp = await prisma.payrollRunEmployee.findFirst({
          where: { id: sourceId },
          include: {
            payrollRun: {
              include: { period: true },
            },
            employee: {
              include: {
                department: true,
                designation: true,
              },
            },
            lineItems: true,
          },
        });

        if (!runEmp) {
          // Try finding latest for employee
          runEmp = await prisma.payrollRunEmployee.findFirst({
            where: { employeeId: sourceId },
            orderBy: { createdAt: 'desc' },
            include: {
              payrollRun: {
                include: { period: true },
              },
              employee: {
                include: {
                  department: true,
                  designation: true,
                },
              },
              lineItems: true,
            },
          });
        }
      }

      if (!runEmp && !isOfficialFinalize) {
        runEmp = await prisma.payrollRunEmployee.findFirst({
          where: { employee: { schoolId, tenantId } },
          orderBy: { createdAt: 'desc' },
          include: {
            payrollRun: {
              include: { period: true },
            },
            employee: {
              include: {
                department: true,
                designation: true,
              },
            },
            lineItems: true,
          },
        });
      }

      if (!runEmp) {
        if (isOfficialFinalize) {
          throw new Error(`Payroll run employee record not found or inaccessible for ID: ${sourceId}`);
        }
        return getSampleHrData(school, documentType);
      }

      const emp = runEmp.employee;
      const earnings = runEmp.lineItems
        .filter((item) => item.componentType === 'EARNING')
        .map((item) => ({
          name: item.componentName,
          amountFormatted: `₹ ${Number(item.calculatedAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
        }));

      const deductions = runEmp.lineItems
        .filter((item) => item.componentType === 'DEDUCTION')
        .map((item) => ({
          name: item.componentName,
          amountFormatted: `₹ ${Number(item.calculatedAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
        }));

      const netNum = Number(runEmp.netPay);
      const grossNum = Number(runEmp.grossEarnings);
      const dedNum = Number(runEmp.totalDeductions);

      return {
        employee: {
          id: emp.id,
          code: emp.employeeNumber,
          firstName: emp.firstName,
          lastName: emp.lastName,
          fullName: `${emp.firstName} ${emp.lastName}`.trim(),
          department: emp.department?.name || '',
          designation: emp.designation?.name || '',
          dateOfJoining: emp.joiningDate ? emp.joiningDate.toISOString().split('T')[0] : '',
        },
        payroll: {
          runNumber: runEmp.payrollRun.runNumber,
          period: runEmp.payrollRun.period?.periodName || 'Current Month',
          grossEarnings: grossNum,
          grossEarningsFormatted: `₹ ${grossNum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
          totalDeductions: dedNum,
          totalDeductionsFormatted: `₹ ${dedNum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
          netPay: netNum,
          netPayFormatted: `₹ ${netNum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
          paymentStatus: runEmp.paymentStatus,
          earnings,
          deductions,
          workingDays: Number(runEmp.workingDays),
          presentDays: Number(runEmp.presentDays),
          lossOfPayDays: Number(runEmp.lossOfPayDays),
        },
        school: {
          name: school?.name || '',
          shortName: school?.configuration?.shortName || school?.name || '',
          code: school?.code || '',
        },
      };
    }

    // Default: Employee-based certificate (SALARY_CERTIFICATE, EMPLOYMENT_CERTIFICATE, RELIEVING_LETTER, etc.)
    let employee = null;
    if (isValidUuid(sourceId)) {
      employee = await prisma.employee.findFirst({
        where: { id: sourceId, schoolId, tenantId },
        include: {
          department: true,
          designation: true,
          salaryAssignments: {
            where: { isCurrent: true },
            include: { salaryStructure: true },
            take: 1,
          },
        },
      });
    }

    if (!employee && !isOfficialFinalize) {
      employee = await prisma.employee.findFirst({
        where: { schoolId, tenantId, status: 'ACTIVE' },
        include: {
          department: true,
          designation: true,
          salaryAssignments: {
            where: { isCurrent: true },
            include: { salaryStructure: true },
            take: 1,
          },
        },
      });
    }

    if (!employee) {
      if (isOfficialFinalize) {
        throw new Error(`Employee record not found or inaccessible for ID: ${sourceId}`);
      }
      return getSampleHrData(school, documentType);
    }

    const dojFormatted = employee.joiningDate
      ? new Date(employee.joiningDate).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        })
      : '';

    const activeSalary = employee.salaryAssignments?.[0];
    const baseSalaryNum = activeSalary?.baseSalary ? Number(activeSalary.baseSalary) : 0;

    return {
      employee: {
        id: employee.id,
        code: employee.employeeNumber,
        firstName: employee.firstName,
        lastName: employee.lastName,
        fullName: `${employee.firstName} ${employee.lastName}`.trim(),
        gender: employee.gender || '',
        department: employee.department?.name || '',
        designation: employee.designation?.name || '',
        dateOfJoiningFormatted: dojFormatted,
        status: employee.status,
      },
      payroll: {
        monthlyGrossFormatted: `₹ ${baseSalaryNum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      },
      school: {
        name: school?.name || '',
        shortName: school?.configuration?.shortName || school?.name || '',
        code: school?.code || '',
      },
    };
  }
}
