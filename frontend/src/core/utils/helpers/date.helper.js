import { format, isToday, isYesterday, differenceInDays } from 'date-fns';

const IST_TIMEZONE = 'Asia/Kolkata';
const SEC_MS = 1000;
const MIN_MS = 60000;
const HOUR_MS = 3600000;
const DAY_MS = 86400000;

const getISTDate = (date = new Date()) => {
    if (!date) return new Date(NaN);
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return new Date(NaN);
    const ms = Date.parse(d.toLocaleString('en-US', { timeZone: IST_TIMEZONE }));
    return new Date(ms);
};

export const isTodayIST = (date) => {
    try {
        return isToday(getISTDate(date));
    } catch {
        return false;
    }
};

export const isYesterdayIST = (date) => {
    try {
        return isYesterday(getISTDate(date));
    } catch {
        return false;
    }
};

export const formatInIST = (date, formatStr) => {
    try {
        const d = date instanceof Date ? date : new Date(date);
        if (isNaN(d.getTime())) return '';
        const istDate = getISTDate(d);
        return format(istDate, formatStr);
    } catch {
        return '';
    }
};

export const formatRelativeTime = (dateStr) => {
    if (!dateStr) return '';
    try {
        const date = dateStr instanceof Date ? dateStr : new Date(dateStr);
        if (isNaN(date.getTime())) return '';
        const diffMs = Date.now() - date.getTime();
        if (diffMs < SEC_MS) return 'Just now';
        if (diffMs < MIN_MS) return `${Math.floor(diffMs / SEC_MS)}s ago`;
        if (diffMs < HOUR_MS) return `${Math.floor(diffMs / MIN_MS)}m ago`;
        if (diffMs < DAY_MS) return `${Math.floor(diffMs / HOUR_MS)}h ago`;
        if (diffMs < 7 * DAY_MS) return `${Math.floor(diffMs / DAY_MS)}d ago`;
        return formatInIST(date, 'MMM d');
    } catch {
        return '';
    }
};

export const formatActivityDate = (dateStr) => {
    if (!dateStr) return '';
    try {
        const date = dateStr instanceof Date ? dateStr : new Date(dateStr);
        if (isNaN(date.getTime())) return '';

        const diffMs = Date.now() - date.getTime();

        if (diffMs < MIN_MS) return 'Just now';
        if (diffMs < HOUR_MS) return `${Math.floor(diffMs / MIN_MS)}m ago`;
        if (isTodayIST(date)) return formatInIST(date, "'Today,' h:mm a");
        if (isYesterdayIST(date)) return formatInIST(date, "'Yesterday,' h:mm a");
        if (diffMs < 7 * DAY_MS) return formatInIST(date, "EEEE, h:mm a");
        if (differenceInDays(new Date(), date) < 365) return formatInIST(date, 'MMM d, h:mm a');
        return formatInIST(date, 'MMM d, yyyy');
    } catch {
        return '';
    }
};

// new comment
export const formatSmartDate = (dateStr) => {
    if (!dateStr) return { primary: '', secondary: '' };
    try {
        const date = dateStr instanceof Date ? dateStr : new Date(dateStr);
        if (isNaN(date.getTime())) return { primary: '', secondary: '' };

        if (isTodayIST(date)) return { primary: 'Today', secondary: formatInIST(date, 'MMM d') };
        if (isYesterdayIST(date)) return { primary: 'Yesterday', secondary: formatInIST(date, 'MMM d') };
        if (differenceInDays(new Date(), date) < 7)
            return { primary: formatInIST(date, 'EEEE'), secondary: formatInIST(date, 'MMM d') };
        return { primary: formatInIST(date, 'MMM d'), secondary: formatInIST(date, 'yyyy') };
    } catch {
        return { primary: '', secondary: '' };
    }
};
