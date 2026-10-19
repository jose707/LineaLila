export interface QuickAssignmentRide {
  id: string;
  status:
    | 'requested'
    | 'accepted'
    | 'arrived'
    | 'in_progress'
    | 'completed'
    | 'cancelled'
    | 'expired';
  requestMode: 'quick_assignment';
  expiresAt: string;
  pickup_address: string;
  dropoff_address: string;
  pickupDistance: number;
  pickupDuration: number;
  pickupSurcharge: number | string;
  totalFare: number;
  finalFare: number;
  driverName?: string;
  vehicle?: { brand: string; model: string; color?: string; plate: string };
  stops?: { address: string; sequence: number }[];
  distance?: number;
  duration?: number;
  paymentMethod?: 'cash' | 'qr';
}

export interface QuickAssignmentResponse {
  ride: QuickAssignmentRide | null;
  serverTime: string;
}
