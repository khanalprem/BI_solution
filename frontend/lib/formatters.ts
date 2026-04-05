// NPR Currency Formatter (Indian numbering system)
export function formatNPR(amount: number, showDecimals: boolean = false): string {
  if (amount === null || amount === undefined || isNaN(amount)) return 'Rs. 0';
  
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  
  // Format based on magnitude
  if (absAmount >= 10000000) { // 1 Crore+
    const crores = absAmount / 10000000;
    return `${isNegative ? '-' : ''}Rs. ${crores.toFixed(2)}Cr`;
  } else if (absAmount >= 100000) { // 1 Lakh+
    const lakhs = absAmount / 100000;
    return `${isNegative ? '-' : ''}Rs. ${lakhs.toFixed(2)}L`;
  }
  
  // Standard formatting
  const [whole, decimal] = absAmount.toFixed(2).split('.');
  
  // Indian numbering: 12,34,567.89
  const lastThree = whole.slice(-3);
  const rest = whole.slice(0, -3);
  
  let formatted = lastThree;
  if (rest) {
    const restFormatted = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    formatted = `${restFormatted},${lastThree}`;
  }
  
  const decimalPart = showDecimals && decimal !== '00' ? `.${decimal}` : '';
  const result = `Rs. ${formatted}${decimalPart}`;
  return isNegative ? `-${result}` : result;
}

function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseISODateToLocal(dateString?: string | null): Date | null {
  if (!dateString) return null;
  const normalized = dateString.trim();
  if (!normalized) return null;

  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const [, year, month, day] = match;
    const parsed = new Date(Number(year), Number(month) - 1, Number(day));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

// Format large numbers with K, M, B suffixes
export function formatNumber(num: number): string {
  if (num === null || num === undefined || isNaN(num)) return '0';
  
  const absNum = Math.abs(num);
  const isNegative = num < 0;
  
  let formatted: string;
  if (absNum >= 1000000000) {
    formatted = (absNum / 1000000000).toFixed(1) + 'B';
  } else if (absNum >= 1000000) {
    formatted = (absNum / 1000000).toFixed(1) + 'M';
  } else if (absNum >= 1000) {
    formatted = (absNum / 1000).toFixed(1) + 'K';
  } else {
    formatted = absNum.toFixed(0);
  }
  
  return isNegative ? `-${formatted}` : formatted;
}

// Format percentage
export function formatPercent(value: number, decimals: number = 1): string {
  if (value === null || value === undefined || isNaN(value)) return '0.0%';
  return `${value.toFixed(decimals)}%`;
}

// Format date
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-NP', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

// Get date range for period
export function getDateRange(
  period: string,
  referenceDate?: Date,
  minReferenceDate?: Date
): { startDate: string; endDate: string } {
  const today = referenceDate ? new Date(referenceDate) : new Date();
  const endDate = toLocalDateString(today);
  let startDate: string;
  
  switch (period) {
    case '1D':
      startDate = endDate;
      break;
    case 'WTD':
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      startDate = toLocalDateString(weekStart);
      break;
    case 'MTD':
      startDate = toLocalDateString(new Date(today.getFullYear(), today.getMonth(), 1));
      break;
    case 'QTD':
      const quarter = Math.floor(today.getMonth() / 3);
      startDate = toLocalDateString(new Date(today.getFullYear(), quarter * 3, 1));
      break;
    case 'YTD':
      startDate = toLocalDateString(new Date(today.getFullYear(), 0, 1));
      break;
    case 'FY':
      // Nepal fiscal year: Mid-July to Mid-July
      const fiscalYear = today.getMonth() >= 6 ? today.getFullYear() : today.getFullYear() - 1;
      startDate = `${fiscalYear}-07-16`;
      break;
    case 'ALL':
      startDate = minReferenceDate ? toLocalDateString(minReferenceDate) : toLocalDateString(new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000));
      break;
    default:
      startDate = toLocalDateString(new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000));
  }
  
  return { startDate, endDate };
}

// Nepal provinces
export const NEPAL_PROVINCES = [
  { value: '', label: 'All Provinces' },
  { value: 'Bagmati', label: 'Bagmati Province' },
  { value: 'Gandaki', label: 'Gandaki Province' },
  { value: 'Lumbini', label: 'Lumbini Province' },
  { value: 'Madhesh', label: 'Madhesh Province' },
  { value: 'Koshi', label: 'Koshi Province' },
  { value: 'Karnali', label: 'Karnali Province' },
  { value: 'Sudurpashchim', label: 'Sudurpashchim Province' },
];
