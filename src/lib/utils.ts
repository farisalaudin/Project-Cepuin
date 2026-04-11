// ============================
// General Utility Functions
// ============================

/**
 * Formats a date string or Date object into a relative time string.
 * e.g., "5 menit yang lalu", "2 jam yang lalu", "3 hari yang lalu"
 * @param date - The date to format
 * @returns A relative time string
 */
export function formatTimeAgo(date: string | Date): string {
  const now = new Date();
  const past = new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

  const secondsInMinute = 60;
  const secondsInHour = secondsInMinute * 60;
  const secondsInDay = secondsInHour * 24;
  const secondsInMonth = secondsInDay * 30; // Approximation
  const secondsInYear = secondsInDay * 365; // Approximation

  if (diffInSeconds < secondsInMinute) {
    return `${diffInSeconds} detik yang lalu`;
  } else if (diffInSeconds < secondsInHour) {
    const minutes = Math.floor(diffInSeconds / secondsInMinute);
    return `${minutes} menit yang lalu`;
  } else if (diffInSeconds < secondsInDay) {
    const hours = Math.floor(diffInSeconds / secondsInHour);
    return `${hours} jam yang lalu`;
  } else if (diffInSeconds < secondsInMonth) {
    const days = Math.floor(diffInSeconds / secondsInDay);
    return `${days} hari yang lalu`;
  } else if (diffInSeconds < secondsInYear) {
    const months = Math.floor(diffInSeconds / secondsInMonth);
    return `${months} bulan yang lalu`;
  } else {
    const years = Math.floor(diffInSeconds / secondsInYear);
    return `${years} tahun yang lalu`;
  }
}