export type VehicleTypeValue = 'TAXI' | 'MINIBUS' | 'BUS' | 'MOTORCYCLE';

export const VEHICLE_TYPES: Array<{ value: VehicleTypeValue; label: string }> = [
  { value: 'TAXI', label: 'Taxi' },
  { value: 'MINIBUS', label: 'Minibús' },
  { value: 'BUS', label: 'Bus' },
  { value: 'MOTORCYCLE', label: 'Motocicleta' },
];

export function vehicleTypeLabel(value: string | null | undefined): string {
  if (!value) return '';
  return VEHICLE_TYPES.find(v => v.value === value)?.label ?? value;
}

