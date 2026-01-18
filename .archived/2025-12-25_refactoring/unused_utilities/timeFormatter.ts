// Time formatting utilities for business master data

/**
 * Convert numeric time to HH:MM format
 * @param numericTime - Time as number (e.g., 710 for 07:10, 1700 for 17:00)
 * @returns Formatted time string (HH:MM)
 */
export function formatTimeFromNumber(numericTime: number | string): string {
  if (!numericTime && numericTime !== 0) return '';
  
  const timeStr = numericTime.toString().padStart(4, '0');
  const hours = timeStr.substring(0, timeStr.length - 2);
  const minutes = timeStr.substring(timeStr.length - 2);
  
  return `${hours.padStart(2, '0')}:${minutes}`;
}

/**
 * Convert HH:MM format to numeric time
 * @param timeString - Time in HH:MM format
 * @returns Numeric time (e.g., "07:10" -> 710, "17:00" -> 1700)
 */
export function parseTimeToNumber(timeString: string): number {
  if (!timeString) return 0;
  
  const [hours, minutes] = timeString.split(':').map(str => parseInt(str, 10));
  return (hours * 100) + (minutes || 0);
}

/**
 * Validate time format
 * @param timeString - Time string to validate
 * @returns True if valid HH:MM format
 */
export function isValidTimeFormat(timeString: string): boolean {
  if (!timeString) return false;
  
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(timeString);
}

/**
 * Get current time in HH:MM format
 * @returns Current time as HH:MM string
 */
export function getCurrentTime(): string {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}