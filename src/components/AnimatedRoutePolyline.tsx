import React, { useEffect, useRef, useState } from 'react';
import { LatLng, Polyline } from 'react-native-maps';

interface Props {
  coordinates: LatLng[];
  strokeColor: string;
  strokeWidth?: number;
  onStart?: () => void;
  onComplete?: () => void;
}

export const AnimatedRoutePolyline = React.memo(({
  coordinates,
  strokeColor,
  strokeWidth = 6,
  onStart,
  onComplete,
}: Props) => {
  const [displayedCoords, setDisplayedCoords] = useState<LatLng[]>(() => coordinates.slice(0, 2));
  const onStartRef = useRef(onStart);
  onStartRef.current = onStart;
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (coordinates.length < 2) {
      setDisplayedCoords(coordinates);
      return;
    }

    // Keep the native polyline mounted throughout the animation.
    setDisplayedCoords(coordinates.slice(0, 2));
    const longitudeScale = Math.cos(coordinates[0].latitude * Math.PI / 180);
    const distances = [0];
    for (let i = 1; i < coordinates.length; i++) {
      const previous = coordinates[i - 1];
      const current = coordinates[i];
      distances.push(distances[i - 1] + Math.hypot(
        current.latitude - previous.latitude,
        (current.longitude - previous.longitude) * longitudeScale,
      ));
    }

    const totalDistance = distances[distances.length - 1];
    let frameId: number | null = null;
    let startedAt: number | null = null;
    const animate = (timestamp: number) => {
      if (startedAt === null) startedAt = timestamp;
      const progress = Math.min((timestamp - startedAt) / 2000, 1);
      if (progress === 1) {
        setDisplayedCoords(coordinates);
        frameId = requestAnimationFrame(() => onCompleteRef.current?.());
        return;
      }

      const easedProgress = (1 - Math.cos(Math.PI * progress)) / 2;
      const targetDistance = easedProgress * totalDistance;
      let low = 1;
      let high = distances.length - 1;
      while (low < high) {
        const middle = Math.floor((low + high) / 2);
        if (distances[middle] < targetDistance) low = middle + 1;
        else high = middle;
      }
      const segment = low;
      const segmentLength = distances[segment] - distances[segment - 1];
      const fraction = segmentLength > 0
        ? (targetDistance - distances[segment - 1]) / segmentLength
        : 0;
      const from = coordinates[segment - 1];
      const to = coordinates[segment];
      setDisplayedCoords([
        ...coordinates.slice(0, segment),
        {
          latitude: from.latitude + (to.latitude - from.latitude) * fraction,
          longitude: from.longitude + (to.longitude - from.longitude) * fraction,
        },
      ]);
      frameId = requestAnimationFrame(animate);
    };
    onStartRef.current?.();
    frameId = requestAnimationFrame(animate);
    return () => {
      if (frameId !== null) cancelAnimationFrame(frameId);
    };
  }, [coordinates]);

  if (displayedCoords.length < 2) return null;
  return (
    <Polyline
      coordinates={displayedCoords}
      strokeColor={strokeColor}
      strokeWidth={strokeWidth}
      lineCap="round"
      lineJoin="round"
    />
  );
});
