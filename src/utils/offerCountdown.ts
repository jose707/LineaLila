export function offerSecondsLeft(
  expiresAt?: string,
  now = Date.now(),
  serverOffsetMs = 0,
) {
  const deadline = Date.parse(expiresAt ?? '');
  return Number.isFinite(deadline)
    ? Math.max(0, Math.ceil((deadline - now - serverOffsetMs) / 1000))
    : 0;
}

export function serverClockOffset(
  clientSentAt: number,
  clientReceivedAt: number,
  clock?: { receivedAt: string; sentAt: string },
) {
  const serverReceivedAt = Date.parse(clock?.receivedAt ?? '');
  const serverSentAt = Date.parse(clock?.sentAt ?? '');
  if (!Number.isFinite(serverReceivedAt) || !Number.isFinite(serverSentAt)) return 0;
  return ((serverReceivedAt - clientSentAt) + (serverSentAt - clientReceivedAt)) / 2;
}
