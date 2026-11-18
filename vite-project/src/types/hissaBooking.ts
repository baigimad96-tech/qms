// ============================================================================
// Hissa Booking Types (Updated for JIH-003)
// ============================================================================

export interface BookingMemberRequest {
  memberName: string;
  hissaCount: number;
}

export interface BookingMemberResponse {
  bookingMemberId: number;
  memberName: string;
  hissaCount: number;
  createdAt: string;
}

export interface CreateHissaBookingRequest {
  animalId: number;
  qurbaniDayId: number;
  collectionCentreId?: number | null;
  bookedByAdminName: string;
  qurbaniPersonName: string;
  address: string; // MANDATORY in JIH-003: Physical / contact address (max 255 chars)
  totalHissa?: number; // Optional if members[] provided
  perHissaCost: number;
  meatWanted: boolean;
  members?: BookingMemberRequest[];
}

export interface UpdateHissaBookingRequest {
  animalId?: number;
  qurbaniDayId?: number;
  collectionCentreId?: number | null;
  bookedByAdminName?: string;
  qurbaniPersonName?: string;
  address?: string; // Optional patch address (max 255 chars)
  totalHissa?: number;
  perHissaCost?: number;
  meatWanted?: boolean;
  members?: BookingMemberRequest[];
}

export interface HissaBookingResponse {
  hissaBookingId: number;
  receiptNumber: string;
  animalId: number;
  animalType: string;
  qurbaniDayId: number;
  qurbaniDay: number;
  collectionCentreId?: number | null;
  collectionCentreName?: string | null;
  bookedByAdminName: string;
  qurbaniPersonName: string;
  address: string; // NEW in JIH-003
  totalHissa: number;
  perHissaCost: number;
  totalHissaCost: number;
  meatWanted: boolean;
  members: BookingMemberResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface HissaBookingDetailResponse {
  hissaBookingId: number;
  receiptNumber: string;
  animal: {
    animalId: number;
    animalType: string;
    batchYear: number;
  };
  qurbaniDay: {
    qurbaniDayId: number;
    dayNumber: number;
  };
  collectionCentre?: {
    collectionCentreId: number;
    name: string;
    address: string;
    contactNumber: string;
  } | null;
  bookedByAdminName: string;
  qurbaniPersonName: string;
  address: string; // NEW in JIH-003
  totalHissa: number;
  perHissaCost: number;
  totalHissaCost: number;
  meatWanted: boolean;
  members: BookingMemberResponse[];
  createdAt: string;
  updatedAt: string;
}
