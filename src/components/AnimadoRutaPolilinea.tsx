import React, { useEffect as usarEfecto, useRef as usarReferencia, useState as usarEstado } from 'react';
import { LatLng as LatitudLongitud, Polyline } from 'react-native-maps';

interface Propiedades {
  coordinates: LatitudLongitud[];
  strokeColor: string;
  strokeWidth?: number;
  onStart?: () => void;
  onComplete?: () => void;
}

const AnimadoRutaPolilinea = React.memo(({
  coordinates: coordenadas,
  strokeColor: trazoColor,
  strokeWidth: trazoAncho = 6,
  onStart: alInicio,
  onComplete: alCompletar
}: Propiedades) => {
  const [mostradoCoordenadas, establecerMostradoCoordenadas] = usarEstado<LatitudLongitud[]>(() => coordenadas.slice(0, 2));
  const alInicioReferencia = usarReferencia(alInicio);
  alInicioReferencia.current = alInicio;
  const alCompletarReferencia = usarReferencia(alCompletar);
  alCompletarReferencia.current = alCompletar;

  usarEfecto(() => {
    if (coordenadas.length < 2) {
      establecerMostradoCoordenadas(coordenadas);
      return;
    }

    // Keep the native polyline mounted throughout the animation.
    establecerMostradoCoordenadas(coordenadas.slice(0, 2));
    const longitudEscala = Math.cos(coordenadas[0].latitude * Math.PI / 180);
    const distances = [0];
    for (let indice = 1; indice < coordenadas.length; indice++) {
      const anterior = coordenadas[indice - 1];
      const real = coordenadas[indice];
      distances.push(distances[indice - 1] + Math.hypot(
        real.latitude - anterior.latitude,
        (real.longitude - anterior.longitude) * longitudEscala
      ));
    }

    const totalDistancia = distances[distances.length - 1];
    let fotogramaId: number | null = null;
    let iniciadoEn: number | null = null;
    const animar = (marcaTiempo: number) => {
      if (iniciadoEn === null) iniciadoEn = marcaTiempo;
      const progreso = Math.min((marcaTiempo - iniciadoEn) / 2000, 1);
      if (progreso === 1) {
        establecerMostradoCoordenadas(coordenadas);
        fotogramaId = requestAnimationFrame(() => alCompletarReferencia.current?.());
        return;
      }

      const easedProgreso = (1 - Math.cos(Math.PI * progreso)) / 2;
      const objetivoDistancia = easedProgreso * totalDistancia;
      let low = 1;
      let high = distances.length - 1;
      while (low < high) {
        const middle = Math.floor((low + high) / 2);
        if (distances[middle] < objetivoDistancia) low = middle + 1;else
        high = middle;
      }
      const segmento = low;
      const segmentoLongitud = distances[segmento] - distances[segmento - 1];
      const fraction = segmentoLongitud > 0 ?
      (objetivoDistancia - distances[segmento - 1]) / segmentoLongitud :
      0;
      const desde = coordenadas[segmento - 1];
      const hasta = coordenadas[segmento];
      establecerMostradoCoordenadas([
      ...coordenadas.slice(0, segmento),
      {
        latitude: desde.latitude + (hasta.latitude - desde.latitude) * fraction,
        longitude: desde.longitude + (hasta.longitude - desde.longitude) * fraction
      }]
      );
      fotogramaId = requestAnimationFrame(animar);
    };
    alInicioReferencia.current?.();
    fotogramaId = requestAnimationFrame(animar);
    return () => {
      if (fotogramaId !== null) cancelAnimationFrame(fotogramaId);
    };
  }, [coordenadas]);

  if (mostradoCoordenadas.length < 2) return null;
  return (
    <Polyline
      coordinates={mostradoCoordenadas}
      strokeColor={trazoColor}
      strokeWidth={trazoAncho}
      lineCap="round"
      lineJoin="round" />);


});export { AnimadoRutaPolilinea };
