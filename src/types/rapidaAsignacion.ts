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
  pickup_address: string;
  dropoff_address: string;
  pickupDistance: number;
  pickupDuration: number;
  pickupSurcharge: number | string;
  totalFare: number;
  finalFare: number;
  driverName?: string;
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
