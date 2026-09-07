import { prisma } from '../../../lib/prisma.js';
import { isValidUuid, getSampleFinanceData } from './sample-data.js';

export class FinanceDocumentResolver {
  public static async resolve(
    tenantId: string,
    schoolId: string,
    paymentId: string,
    isOfficialFinalize = false
  ): Promise<Record<string, any>> {
    const school = await prisma.school.findFirst({
      where: { id: schoolId, tenantId },
      include: { configuration: true, branding: true },
    });

    let payment = null;
    if (isValidUuid(paymentId)) {
      payment = await prisma.feePayment.findFirst({
        where: { id: paymentId, schoolId, tenantId },
        include: {
          student: {
            include: {
              enrollments: {
                where: { status: 'ACTIVE' },
                include: { class: true, section: true, academicYear: true },
                take: 1,
              },
            },
          },
          allocations: {
            include: {
              feeInvoice: {
                include: {
                  lines: true,
                },
              },
            },
          },
        },
      });
    }

    if (!payment && !isOfficialFinalize) {
      payment = await prisma.feePayment.findFirst({
        where: { schoolId, tenantId },
        orderBy: { createdAt: 'desc' },
        include: {
          student: {
            include: {
              enrollments: {
                where: { status: 'ACTIVE' },
                include: { class: true, section: true, academicYear: true },
                take: 1,
              },
            },
          },
          allocations: {
            include: {
              feeInvoice: {
                include: {
                  lines: true,
                },
              },
            },
          },
        },
      });
    }

    if (!payment) {
      if (isOfficialFinalize) {
        throw new Error(`Fee payment record not found or inaccessible for ID: ${paymentId}`);
      }
      return getSampleFinanceData(school);
    }

    const student = payment.student;
    const currentEnrollment = student.enrollments?.[0];

    const items = payment.allocations.map((alloc: any) => ({
      name: alloc.feeInvoice?.invoiceNumber ? `Invoice #${alloc.feeInvoice.invoiceNumber}` : 'Fee Payment Allocation',
      amountFormatted: `₹ ${Number(alloc.allocatedAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      paidAmountFormatted: `₹ ${Number(alloc.allocatedAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
    }));

    if (items.length === 0) {
      items.push({
        name: 'Tuition & Academic Fees',
        amountFormatted: `₹ ${Number(payment.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
        paidAmountFormatted: `₹ ${Number(payment.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      });
    }

    const totalNum = Number(payment.totalAmount);
    const dateFormatted = payment.paymentDate
      ? new Date(payment.paymentDate).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        })
      : '';

    return {
      finance: {
        receiptNumber: payment.receiptNumber, // Authoritative M07 receiptNumber strictly reused
        paymentId: payment.id,
        paymentDateFormatted: dateFormatted,
        paymentMode: payment.paymentMethod,
        transactionReference: payment.transactionReference || '-',
        totalAmount: totalNum,
        totalAmountFormatted: `₹ ${totalNum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
        items,
        status: payment.status,
      },
      student: {
        id: student.id,
        admissionNumber: student.admissionNumber,
        fullName: `${student.firstName} ${student.lastName}`.trim(),
      },
      academic: {
        className: currentEnrollment?.class?.name || '',
        sectionName: currentEnrollment?.section?.name || '',
        academicYear: currentEnrollment?.academicYear?.name || '',
      },
      school: {
        name: school?.name || '',
        shortName: school?.configuration?.shortName || school?.name || '',
        code: school?.code || '',
      },
    };
  }
}
