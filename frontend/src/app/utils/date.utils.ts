export const MAX_STAY_NIGHTS = 30;

/**
 * Returns today's date in YYYY-MM-DD format using the browser's local timezone
 * (avoids UTC drift from Date.toISOString()).
 */
export function getLocalTodayIso(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Computes whole nights between two YYYY-MM-DD strings.
 */
export function calculateNights(checkIn: string, checkOut: string): number {
  const [inY, inM, inD] = checkIn.split('-').map(Number);
  const [outY, outM, outD] = checkOut.split('-').map(Number);
  const startUtc = Date.UTC(inY, inM - 1, inD);
  const endUtc = Date.UTC(outY, outM - 1, outD);
  return Math.round((endUtc - startUtc) / 86_400_000);
}

