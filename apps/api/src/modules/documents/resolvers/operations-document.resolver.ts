import { prisma } from '../../../lib/prisma.js';
import { isValidUuid, getSampleOperationsData } from './sample-data.js';

export class OperationsDocumentResolver {
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

    if (documentType === 'ROUTE_MANIFEST') {
      let route = null;
      if (isValidUuid(sourceId)) {
        route = await prisma.transportRoute.findFirst({
          where: { id: sourceId, schoolId, tenantId },
          include: {
            stops: {
              orderBy: { sequence: 'asc' },
            },
            vehicleAssignments: {
              where: { isActive: true },
              include: {
                vehicle: true,
              },
              take: 1,
            },
          },
        });
      }

      if (!route && !isOfficialFinalize) {
        route = await prisma.transportRoute.findFirst({
          where: { schoolId, tenantId },
          include: {
            stops: {
              orderBy: { sequence: 'asc' },
            },
            vehicleAssignments: {
              where: { isActive: true },
              include: {
                vehicle: true,
              },
              take: 1,
            },
          },
        });
      }

      if (!route) {
        if (isOfficialFinalize) {
          throw new Error(`Transport route not found or inaccessible for ID: ${sourceId}`);
        }
        return getSampleOperationsData(school, documentType);
      }

      const assignment = route.vehicleAssignments?.[0];
      const vehicle = assignment?.vehicle;

      // Passengers: students enrolled or assigned
      const students = await prisma.student.findMany({
        where: { schoolId, tenantId, status: 'ACTIVE' },
        take: 30,
        include: {
          enrollments: {
            where: { status: 'ACTIVE' },
            include: { class: true },
            take: 1,
          },
          guardians: {
            include: { guardian: true },
            take: 1,
          },
        },
      });

      const passengers = students.map((s, idx) => ({
        seq: idx + 1,
        studentName: `${s.firstName} ${s.lastName}`.trim(),
        className: s.enrollments?.[0]?.class?.name || 'Class',
        stopName: route.stops?.[idx % (route.stops.length || 1)]?.stopName || 'Main Gate',
        guardianPhone: s.guardians?.[0]?.guardian?.phone || '-',
      }));

      return {
        transport: {
          routeId: route.id,
          routeName: route.routeName,
          routeCode: route.routeCode,
          vehiclePlate: vehicle?.registrationNumber || 'TBD',
          driverName: 'Assigned Transport Driver',
          passengers,
        },
        school: {
          name: school?.name || '',
          shortName: school?.configuration?.shortName || school?.name || '',
          code: school?.code || '',
        },
      };
    }

    if (documentType === 'VISITOR_PASS') {
      let visit = null;
      if (isValidUuid(sourceId)) {
        visit = await prisma.visitorVisit.findFirst({
          where: { id: sourceId, schoolId, tenantId },
          include: {
            visitor: true,
            personToMeet: true,
          },
        });
      }

      if (!visit && !isOfficialFinalize) {
        visit = await prisma.visitorVisit.findFirst({
          where: { schoolId, tenantId },
          orderBy: { createdAt: 'desc' },
          include: {
            visitor: true,
            personToMeet: true,
          },
        });
      }

      if (!visit) {
        if (isOfficialFinalize) {
          throw new Error(`Visitor visit record not found or inaccessible for ID: ${sourceId}`);
        }
        return getSampleOperationsData(school, documentType);
      }

      const checkInFormatted = visit.checkInAt
        ? new Date(visit.checkInAt).toLocaleString('en-IN')
        : new Date().toLocaleString('en-IN');

      return {
        gate: {
          passNumber: visit.visitNumber, // Authoritative M09 visitNumber strictly reused
          visitorName: visit.visitor.name,
          phone: visit.visitor.phone,
          purpose: visit.purpose,
          hostName: visit.personToMeet ? `${visit.personToMeet.firstName} ${visit.personToMeet.lastName}`.trim() : 'Administration',
          checkInFormatted,
          badgeIssued: visit.badgeNumber || '-',
        },
        school: {
          name: school?.name || '',
          shortName: school?.configuration?.shortName || school?.name || '',
          code: school?.code || '',
        },
      };
    }

    if (documentType === 'EVENT_PARTICIPANT_LIST') {
      let event = null;
      if (isValidUuid(sourceId)) {
        event = await prisma.schoolEvent.findFirst({
          where: { id: sourceId, schoolId, tenantId },
          include: {
            category: true,
            participants: {
              include: {
                student: true,
              },
            },
          },
        });
      }

      if (!event && !isOfficialFinalize) {
        event = await prisma.schoolEvent.findFirst({
          where: { schoolId, tenantId },
          include: {
            category: true,
            participants: {
              include: {
                student: true,
              },
            },
          },
        });
      }

      if (!event) {
        if (isOfficialFinalize) {
          throw new Error(`School event record not found or inaccessible for ID: ${sourceId}`);
        }
        return getSampleOperationsData(school, documentType);
      }

      const participants = event.participants.map((p, idx) => ({
        seq: idx + 1,
        name: p.student ? `${p.student.firstName} ${p.student.lastName}`.trim() : 'Participant',
        type: p.participantType,
        status: p.status,
      }));

      return {
        event: {
          id: event.id,
          title: event.title,
          category: event.category?.name || 'School Activity',
          startDate: event.startDateTime ? event.startDateTime.toISOString().split('T')[0] : '',
          venue: event.venue || 'Campus Auditorium',
          participants,
        },
        school: {
          name: school?.name || '',
          shortName: school?.configuration?.shortName || school?.name || '',
          code: school?.code || '',
        },
      };
    }

    throw new Error(`Unsupported operational document type: ${documentType}`);
  }
}
