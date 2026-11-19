// ============================================================================
// Audit Log Types (JIH-004: Individual Family Member Audit Recording)
// ============================================================================

// Member snapshot captured in audit records
export interface BookingMemberAuditSnapshot {
  bookingMemberId?: number;
  memberName: string;
  hissaCount: number;
}

// Complete audit snapshot for Hissa Booking entity
export interface HissaBookingAuditSnapshot {
  receiptNumber?: string;
  qurbaniPersonName?: string;
  bookedByAdminName?: string;
  address?: string;
  totalHissa?: number;
  perHissaCost?: number;
  totalHissaCost?: number;
  meatWanted?: boolean;
  animalId?: number;
  animalType?: string;
  qurbaniDayId?: number;
  qurbaniDayNumber?: number;
  collectionCentreId?: number;
  collectionCentreName?: string;
  createdAt?: string;

  // === JIH-004 Fields ===
  familyMembersSummary?: string;
  members?: BookingMemberAuditSnapshot[];
}

// Top-level Audit Log record
export interface AuditLogItem<T = Record<string, any>> {
  auditId: number;
  adminId: number;
  adminName: string;
  action: 'HISSA_BOOKING_CREATED' | 'HISSA_BOOKING_UPDATED' | 'HISSA_BOOKING_DELETED' | string;
  entityType: 'HISSA_BOOKING' | 'ANIMAL' | 'QURBANI_DAY' | 'COLLECTION_CENTRE' | 'EXPENSE' | 'USER' | string;
  entityId: number;
  oldValue: T | null;
  newValue: T | null;
  createdAt: string;
}

export type HissaBookingAuditLogItem = AuditLogItem<HissaBookingAuditSnapshot>;
