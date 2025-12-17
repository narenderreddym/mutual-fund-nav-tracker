/**
 * @fileoverview Central configuration file for NSE/BSE market holidays.
 * This file is used by all scripts to maintain a single source of truth for holidays.
 */

/**
 * Returns array of NSE/BSE market holidays in yyyy-MM-dd format
 * @returns {string[]} Array of holiday dates
 */
function getMarketHolidays() {
  return [
    // 2025 Holidays
    "2025-01-26", // Republic Day
    "2025-03-29", // Good Friday
    "2025-04-14", // Dr. Ambedkar Jayanti
    "2025-05-01", // Maharashtra Day
    "2025-08-15", // Independence Day
    "2025-10-02", // Gandhi Jayanti
    "2025-10-24", // Dussehra
    "2025-12-25", // Christmas
    
    // 2026 Holidays
    "2026-01-26", // Republic Day
    "2026-03-03", // Holi
    "2026-03-26", // Shri Ram Navami
    "2026-03-31", // Shri Mahavir Jayanti
    "2026-04-03", // Good Friday
    "2026-04-14", // Dr. Baba Saheb Ambedkar Jayanti
    "2026-05-01", // Maharashtra Day
    "2026-05-28", // Bakri Eid
    "2026-06-26", // Moharram
    "2026-09-14", // Ganesh Chaturthi
    "2026-10-02", // Mahatma Gandhi Jayanti
    "2026-10-20", // Dussehra
    "2026-11-10", // Diwali-Balipratipada
    "2026-11-24", // Prakash Gurpurb Sri Guru Nanak Dev
    "2026-12-25"  // Christmas
  ];
}

/**
 * Checks if a given date is a weekend or NSE/BSE holiday
 * @param {Date} date - The date to check
 * @returns {boolean} True if it's a weekend or holiday, false otherwise
 */
function isWeekendOrHoliday(date) {
  const day = date.getDay(); // 0 for Sunday, 6 for Saturday
  const dateStr = Utilities.formatDate(date, "GMT+5:30", "yyyy-MM-dd");
  const holidays = getMarketHolidays();
  return day === 0 || day === 6 || holidays.includes(dateStr);
}
