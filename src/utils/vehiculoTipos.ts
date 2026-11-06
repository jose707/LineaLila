export type VehiculoTipoValor = 'TAXI' | 'MINIBUS' | 'BUS' | 'MOTORCYCLE';

const VEHICULO_TIPOS: Array<{value: VehiculoTipoValor;label: string;}> = [
{ value: 'TAXI', label: 'Taxi' },
{ value: 'MINIBUS', label: 'Minibús' },
{ value: 'BUS', label: 'Bus' },
{ value: 'MOTORCYCLE', label: 'Motocicleta' }];export { VEHICULO_TIPOS };


function vehiculoTipoEtiqueta(valor: string | null | undefined): string {
  if (!valor) return '';
  return VEHICULO_TIPOS.find((v) => v.value === valor)?.label ?? valor;
}export { vehiculoTipoEtiqueta };
