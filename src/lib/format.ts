/**
 * Dates on Campus Connect are read on Indian time, in Indian English.
 *
 * Formatting with the runtime's defaults made every date depend on where it
 * was rendered: the server (UTC, en-US) and the browser (IST, en-IN) printed
 * different text for the same instant, which React reports as a hydration
 * error and which showed events at the wrong hour, sometimes on the wrong
 * day. Everything goes through here instead, so both sides agree.
 */
export const IST = 'Asia/Kolkata';

export function formatIST(value: Date | string | number, options: Intl.DateTimeFormatOptions): string {
    const d = new Date(value);
    if (isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('en-IN', { timeZone: IST, ...options }).format(d);
}
