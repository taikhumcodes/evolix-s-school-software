import { prisma } from '../apps/api/src/lib/prisma.js';
import { Prisma } from '@prisma/client';

async function main() {
  console.log('===============================================================');
  console.log('EVOLIX SCHOOL ERP — MODULE 09 5 OPERATIONAL INVARIANTS AUDIT');
  console.log('===============================================================');

  // ---------------------------------------------------------------------------
  // INVARIANT 1: Transport Seating Capacity Enforcement
  // Applicable active passengers <= vehicle seating capacity
  // ---------------------------------------------------------------------------
  console.log('\n>>> CHECKING INVARIANT 1: Transport Seating Capacity vs Active Assignments');
  const vehicles = await prisma.vehicle.findMany({
    include: {
      studentAssignments: {
        where: { status: 'ACTIVE' },
      },
    },
  });

  let invariant1Violations = 0;
  let totalActiveAssignments = 0;
  for (const v of vehicles) {
    const activeCount = v.studentAssignments.length;
    totalActiveAssignments += activeCount;
    const isExceeded = activeCount > v.seatingCapacity;
    if (isExceeded) {
      invariant1Violations++;
      console.error(`[VIOLATION] Vehicle ${v.registrationNumber} (ID: ${v.id}) capacity: ${v.seatingCapacity}, active passengers: ${activeCount}`);
    } else {
      console.log(`[PASS] Vehicle ${v.registrationNumber}: Capacity = ${v.seatingCapacity}, Active Passengers = ${activeCount} (Compliant)`);
    }
  }
  console.log(`Summary Invariant 1: ${vehicles.length} vehicles audited, ${totalActiveAssignments} active assignments. Violations: ${invariant1Violations}`);

  // ---------------------------------------------------------------------------
  // INVARIANT 2: Stock Balance Mathematical Integrity
  // Current stock balance == signed sum of movements
  // ---------------------------------------------------------------------------
  console.log('\n>>> CHECKING INVARIANT 2: Inventory Stock Balance == Signed Sum of Movements');
  const balances = await prisma.inventoryStockBalance.findMany({
    include: {
      item: true,
      location: true,
    },
  });

  let invariant2Violations = 0;
  let totalBalanceRecords = 0;
  for (const bal of balances) {
    totalBalanceRecords++;
    const movements = await prisma.stockMovement.findMany({
      where: {
        itemId: bal.itemId,
        locationId: bal.locationId,
      },
    });

    let signedSum = new Prisma.Decimal(0);
    for (const m of movements) {
      const q = new Prisma.Decimal(m.quantity);
      if (['OPENING', 'INWARD', 'RETURN', 'TRANSFER_IN', 'ADJUSTMENT_IN'].includes(m.movementType)) {
        signedSum = signedSum.add(q);
      } else {
        signedSum = signedSum.sub(q);
      }
    }

    const currentQty = new Prisma.Decimal(bal.currentQuantity);
    const diff = currentQty.sub(signedSum);
    if (!diff.equals(0)) {
      invariant2Violations++;
      console.error(`[VIOLATION] Item ${bal.item?.name} at Loc ${bal.location?.name}: Cached = ${currentQty.toFixed(3)}, Signed Sum = ${signedSum.toFixed(3)}`);
    } else {
      console.log(`[PASS] Item "${bal.item?.name}" @ "${bal.location?.name}": Cached = ${currentQty.toFixed(3)}, Signed Sum = ${signedSum.toFixed(3)} (Delta = 0.000)`);
    }
  }
  console.log(`Summary Invariant 2: ${totalBalanceRecords} stock balance locations audited. Violations: ${invariant2Violations}`);

  // ---------------------------------------------------------------------------
  // INVARIANT 3: Asset Custody Uniqueness
  // Asset has at most one active assignment (active = true, returnedAt = null)
  // ---------------------------------------------------------------------------
  console.log('\n>>> CHECKING INVARIANT 3: Fixed Asset Single Active Custody');
  const assets = await prisma.asset.findMany({
    include: {
      assignments: {
        where: { returnedAt: null, isActive: true },
      },
    },
  });

  let invariant3Violations = 0;
  for (const a of assets) {
    const activeAssignments = a.assignments.length;
    if (activeAssignments > 1) {
      invariant3Violations++;
      console.error(`[VIOLATION] Asset ${a.assetTag} (ID: ${a.id}) has ${activeAssignments} active assignments!`);
    } else {
      console.log(`[PASS] Asset ${a.assetTag}: Status = ${a.status}, Active Assignments = ${activeAssignments} (Max <= 1 compliant)`);
    }
  }
  console.log(`Summary Invariant 3: ${assets.length} assets audited. Violations: ${invariant3Violations}`);

  // ---------------------------------------------------------------------------
  // INVARIANT 4: Student Pickup Guardian Authorization
  // Normal pickup requires StudentGuardian.hasPickupPermission == true
  // ---------------------------------------------------------------------------
  console.log('\n>>> CHECKING INVARIANT 4: Student Pickup Authorization Adherence');
  const pickups = await prisma.studentPickupRelease.findMany({
    include: {
      student: true,
      guardian: true,
    },
  });

  let invariant4Violations = 0;
  for (const p of pickups) {
    if (p.pickupType === 'AUTHORIZED_GUARDIAN') {
      const link = await prisma.studentGuardian.findFirst({
        where: {
          studentId: p.studentId,
          guardianId: p.guardianId!,
        },
      });

      if (!link || !link.hasPickupPermission) {
        invariant4Violations++;
        console.error(`[VIOLATION] Pickup ID ${p.id} student ${p.student?.admissionNumber} released to guardian without pickup permission!`);
      } else {
        console.log(`[PASS] Pickup ${p.id.slice(0, 8)}: Normal pickup of student ${p.student?.admissionNumber} by authorized guardian ${p.guardianSnapshotName} (hasPickupPermission = true)`);
      }
    } else if (p.isOverride) {
      if (!p.overrideReason || p.overrideReason.length < 5) {
        invariant4Violations++;
        console.error(`[VIOLATION] Pickup ID ${p.id} exceptional release missing valid override reason!`);
      } else {
        console.log(`[PASS] Pickup ${p.id.slice(0, 8)}: Exceptional release with recorded reason: "${p.overrideReason}" (Supervised Override)`);
      }
    }
  }
  console.log(`Summary Invariant 4: ${pickups.length} pickup releases audited. Violations: ${invariant4Violations}`);

  // ---------------------------------------------------------------------------
  // INVARIANT 5: Event Participant Capacity Adherence
  // Active participants <= event capacity
  // ---------------------------------------------------------------------------
  console.log('\n>>> CHECKING INVARIANT 5: School Event Participant Capacity');
  const events = await prisma.schoolEvent.findMany({
    include: {
      participants: {
        where: { status: { not: 'CANCELLED' } },
      },
    },
  });

  let invariant5Violations = 0;
  for (const e of events) {
    const activeCount = e.participants.length;
    if (e.capacity && activeCount > e.capacity) {
      invariant5Violations++;
      console.error(`[VIOLATION] Event ${e.eventCode} (ID: ${e.id}) capacity: ${e.capacity}, active participants: ${activeCount}`);
    } else {
      console.log(`[PASS] Event "${e.title}" (${e.eventCode}): Capacity = ${e.capacity || 'Unlimited'}, Active Participants = ${activeCount} (Compliant)`);
    }
  }
  console.log(`Summary Invariant 5: ${events.length} events audited. Violations: ${invariant5Violations}`);

  console.log('\n===============================================================');
  const allClear = invariant1Violations === 0 &&
                   invariant2Violations === 0 &&
                   invariant3Violations === 0 &&
                   invariant4Violations === 0 &&
                   invariant5Violations === 0;
  if (allClear) {
    console.log('ALL 5 OPERATIONAL INVARIANTS: 100% STRICTLY ENFORCED & VERIFIED');
  } else {
    console.error('INVARIANT AUDIT ENCOUNTERED VIOLATIONS!');
    process.exit(1);
  }
  console.log('===============================================================');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
