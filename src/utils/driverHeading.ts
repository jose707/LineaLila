export interface DriverPoint {
  latitude: number;
  longitude: number;
  heading?: number;
  accuracy?: number;
}

const MIN_MOVEMENT_METERS = 5;
const toRadians = (degrees: number) => degrees * Math.PI / 180;

export interface DriverHeadingState {
  anchor: DriverPoint;
  heading?: number;
  timestamp?: number;
}

export function normalizeHeading(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const heading = Number(value);
  return Number.isFinite(heading) && heading >= 0 ? heading % 360 : undefined;
}

function distanceMeters(from: DriverPoint, to: DriverPoint): number {
  const latDelta = toRadians(to.latitude - from.latitude);
  const lonDelta = toRadians(to.longitude - from.longitude);
  const arc = Math.sin(latDelta / 2) ** 2
    + Math.cos(toRadians(from.latitude)) * Math.cos(toRadians(to.latitude))
      * Math.sin(lonDelta / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(arc), Math.sqrt(1 - arc));
}

function bearingDegrees(from: DriverPoint, to: DriverPoint): number {
  const fromLat = toRadians(from.latitude);
  const toLat = toRadians(to.latitude);
  const lonDelta = toRadians(to.longitude - from.longitude);
  const east = Math.sin(lonDelta) * Math.cos(toLat);
  const north = Math.cos(fromLat) * Math.sin(toLat)
    - Math.sin(fromLat) * Math.cos(toLat) * Math.cos(lonDelta);
  return (Math.atan2(east, north) * 180 / Math.PI + 360) % 360;
}

function accuracyMeters(point: DriverPoint): number {
  return typeof point.accuracy === 'number' && Number.isFinite(point.accuracy)
    && point.accuracy > 0 ? point.accuracy : 0;
}

function movementThreshold(previous: DriverPoint, current: DriverPoint): number {
  // No interpretar pequeños saltos dentro del margen de error del GPS como giros.
  return Math.max(MIN_MOVEMENT_METERS, accuracyMeters(previous), accuracyMeters(current));
}

/** El rumbo sigue el desplazamiento, no la orientación del teléfono. */
export function resolveDriverHeading(
  previous: DriverPoint | null | undefined,
  current: DriverPoint,
): number | undefined {
  const priorHeading = normalizeHeading(previous?.heading);
  if (previous && distanceMeters(previous, current) >= movementThreshold(previous, current)) {
    return bearingDegrees(previous, current);
  }
  return priorHeading;
}

/** Acumula pasos cortos y descarta ubicaciones repetidas o fuera de orden. */
export function updateDriverHeading(
  previous: DriverHeadingState | null | undefined,
  current: DriverPoint,
  fixTimestamp?: number,
): DriverHeadingState {
  const timestamp = Number.isFinite(fixTimestamp) && (fixTimestamp ?? 0) > 0
    ? fixTimestamp
    : undefined;
  if (previous?.timestamp !== undefined && timestamp !== undefined
    && timestamp <= previous.timestamp) return previous;

  if (!previous) {
    return { anchor: current, heading: normalizeHeading(current.heading), timestamp };
  }
  const accuracy = accuracyMeters(current);
  if (accuracy > 0 && accuracy < accuracyMeters(previous.anchor) / 2) {
    // Una mejora de precisión no es movimiento: sustituir el punto impreciso.
    return { anchor: current, heading: previous.heading, timestamp: timestamp ?? previous.timestamp };
  }
  const moved = distanceMeters(previous.anchor, current)
    >= movementThreshold(previous.anchor, current);
  return {
    anchor: moved ? current : previous.anchor,
    heading: moved ? bearingDegrees(previous.anchor, current) : previous.heading,
    timestamp: timestamp ?? previous.timestamp,
  };
}
