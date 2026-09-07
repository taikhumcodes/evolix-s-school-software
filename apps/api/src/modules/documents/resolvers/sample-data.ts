export function isValidUuid(id: string | null | undefined): boolean {
  if (!id || typeof id !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export function getSampleStudentData(school: any = null) {
  const addressParts = [
    school?.configuration?.addressLine1 || '123 Academic Avenue',
    school?.configuration?.city || 'New Delhi',
    school?.configuration?.state || 'Delhi',
  ].filter(Boolean);

  return {
    student: {
      id: '00000000-0000-0000-0000-000000000099',
      admissionNumber: 'ADM-2026-0042',
      firstName: 'Aarav',
      lastName: 'Sharma',
      fullName: 'Aarav Sharma',
      gender: 'MALE',
      dateOfBirth: '2012-05-15',
      dateOfBirthFormatted: '15 May 2012',
      bloodGroup: 'B+',
      emergencyContact: '+91 98765 43210',
      photoUrl: '',
      status: 'ACTIVE',
      fatherName: 'Rajesh Sharma',
      motherName: 'Sunita Sharma',
      guardianName: 'Rajesh Sharma',
      guardianPhone: '+91 98765 43210',
    },
    academic: {
      className: 'Class X',
      sectionName: 'Section A',
      academicYear: '2026-2027',
      rollNumber: '14',
    },
    school: {
      id: school?.id || '00000000-0000-0000-0000-000000000002',
      name: school?.name || 'Greenwood High School',
      shortName: school?.configuration?.shortName || school?.name || 'GHS',
      code: school?.code || 'GHS01',
      board: school?.configuration?.board || 'CBSE',
      affiliationNumber: school?.configuration?.affiliationNumber || 'CBSE/AFF/2026/889',
      address: addressParts.join(', '),
      phone: school?.configuration?.primaryPhone || '+91 11 2345 6789',
      email: school?.configuration?.contactEmail || 'contact@greenwood.edu.in',
      logoUrl: school?.branding?.logoStorageKey || '',
    },
  };
}

export function getSampleFinanceData(school: any = null) {
  return {
    finance: {
      id: '00000000-0000-0000-0000-000000000099',
      receiptNumber: 'RCPT-2026-00108',
      totalAmount: 15000,
      totalAmountFormatted: '₹ 15,000.00',
      paymentMethod: 'ONLINE_UPI',
      referenceNumber: 'UPI/628192837/REF',
      paymentDate: new Date().toISOString().split('T')[0],
      paymentDateFormatted: new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      }),
      items: [
        { name: 'Tuition Fee (Q2)', amountFormatted: '₹ 12,000.00', paidAmountFormatted: '₹ 12,000.00' },
        { name: 'Laboratory & Library Fee', amountFormatted: '₹ 3,000.00', paidAmountFormatted: '₹ 3,000.00' },
      ],
    },
    student: {
      id: '00000000-0000-0000-0000-000000000099',
      admissionNumber: 'ADM-2026-0042',
      fullName: 'Aarav Sharma',
      firstName: 'Aarav',
      lastName: 'Sharma',
    },
    academic: {
      className: 'Class X',
      sectionName: 'Section A',
      academicYear: '2026-2027',
      rollNumber: '14',
    },
    school: {
      name: school?.name || 'Greenwood High School',
      shortName: school?.configuration?.shortName || school?.name || 'GHS',
      code: school?.code || 'GHS01',
    },
  };
}

export function getSampleHrData(school: any = null, documentType = 'PAYSLIP') {
  return {
    employee: {
      id: '00000000-0000-0000-0000-000000000099',
      code: 'EMP-0142',
      firstName: 'Vikram',
      lastName: 'Mehta',
      fullName: 'Vikram Mehta',
      department: 'Mathematics',
      designation: 'Senior Faculty',
      dateOfJoining: '2021-06-01',
    },
    payroll: {
      runNumber: 'PR-2026-08',
      period: 'August 2026',
      grossEarnings: 65000,
      grossEarningsFormatted: '₹ 65,000.00',
      monthlyGrossFormatted: '₹ 65,000.00',
      totalDeductions: 5000,
      totalDeductionsFormatted: '₹ 5,000.00',
      netPay: 60000,
      netPayFormatted: '₹ 60,000.00',
      paymentStatus: 'PAID',
      earnings: [
        { name: 'Basic Salary', amountFormatted: '₹ 45,000.00' },
        { name: 'House Rent Allowance (HRA)', amountFormatted: '₹ 15,000.00' },
        { name: 'Special Allowance', amountFormatted: '₹ 5,000.00' },
      ],
      deductions: [
        { name: 'Provident Fund (PF)', amountFormatted: '₹ 3,600.00' },
        { name: 'Professional Tax', amountFormatted: '₹ 1,400.00' },
      ],
      workingDays: 26,
      presentDays: 26,
    },
    school: {
      name: school?.name || 'Greenwood High School',
      shortName: school?.configuration?.shortName || school?.name || 'GHS',
      code: school?.code || 'GHS01',
    },
  };
}

export function getSampleOperationsData(school: any = null, documentType = 'ROUTE_MANIFEST') {
  return {
    transport: {
      routeName: 'North Campus Shuttle Route 4',
      routeCode: 'R-NORTH-04',
      vehiclePlate: 'DL-01-AB-1234',
      driverName: 'Ramesh Kumar',
      driverPhone: '+91 98111 22334',
      passengers: [
        { seq: 1, studentName: 'Aarav Sharma', className: 'Class X-A', stopName: 'Civil Lines Gate 2', guardianPhone: '+91 98765 43210' },
        { seq: 2, studentName: 'Ananya Verma', className: 'Class IX-B', stopName: 'Model Town Metro', guardianPhone: '+91 98765 43211' },
        { seq: 3, studentName: 'Rohan Gupta', className: 'Class XI-A', stopName: 'Ashok Vihar Phase 1', guardianPhone: '+91 98765 43212' },
      ],
    },
    gate: {
      passNumber: 'VP-2026-0042',
      visitorName: 'Suresh Patel',
      phone: '+91 99887 76655',
      purpose: 'Parent-Teacher Interaction',
      hostName: 'Principal Office',
      checkInFormatted: '07 September 2026, 10:30 AM',
    },
    school: {
      name: school?.name || 'Greenwood High School',
      shortName: school?.configuration?.shortName || school?.name || 'GHS',
      code: school?.code || 'GHS01',
    },
  };
}

export function getSampleAcademicData(school: any = null) {
  return {
    student: {
      id: '00000000-0000-0000-0000-000000000099',
      admissionNumber: 'ADM-2026-0042',
      fullName: 'Aarav Sharma',
      firstName: 'Aarav',
      lastName: 'Sharma',
    },
    academic: {
      className: 'Class X',
      sectionName: 'Section A',
      academicYear: '2026-2027',
      rollNumber: '14',
    },
    exam: {
      name: 'Mid-Term Examination 2026',
      termName: 'Term 1',
    },
    marks: {
      records: [
        { subject: 'Mathematics', maxMarks: 100, marksObtained: 94, grade: 'A1' },
        { subject: 'Science', maxMarks: 100, marksObtained: 89, grade: 'A2' },
        { subject: 'English', maxMarks: 100, marksObtained: 91, grade: 'A1' },
        { subject: 'Social Studies', maxMarks: 100, marksObtained: 86, grade: 'A2' },
      ],
      totalObtained: 360,
      totalMax: 400,
      percentageFormatted: '90.0%',
      overallGrade: 'A1',
      resultStatus: 'PASSED',
    },
    school: {
      name: school?.name || 'Greenwood High School',
      shortName: school?.configuration?.shortName || school?.name || 'GHS',
      code: school?.code || 'GHS01',
    },
  };
}
