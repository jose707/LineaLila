export interface RapidaAsignacionViaje {
  id: string;
  status:
  'solicitado' |
  'aceptado' |
  'llegado' |
  'en_curso' |
  'completado' |
  'cancelado' |
  'vencido';
  requestMode: 'asignacion_rapida';
  expiresAt: string;
  venceOfertaEn?: string;
  pickup_address: string;
  dropoff_address: string;
  pickupDistance: number;
  pickupDuration: number;
  pickupSurcharge: number | string;
  totalFare: number;
  finalFare: number;
  driverName?: string | null;
  driverRating?: number;
  driverTrips?: number;
  passenger?: { name: string | null; photo: string | null; verified: boolean; rating?: number; trips?: number };
  vehicle?: {brand: string;model: string;color?: string;plate: string;};
  stops?: {address: string;sequence: number;}[];
  distance?: number;
  duration?: number;
  paymentMethod?: 'efectivo' | 'qr';
}

export interface RapidaAsignacionRespuesta {
  ride: RapidaAsignacionViaje | null;
  serverTime: string;
  segundosRestantes?: number;
}
