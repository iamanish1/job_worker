import dayjs from 'dayjs';
import 'dayjs/locale/en-in';

dayjs.locale('en-in');

export const formatCurrency = (amount: number | null | undefined): string => {
  if (amount == null) return '—';
  return '₹' + amount.toLocaleString('en-IN');
};

export const formatDate = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  return dayjs(iso).format('D MMM YYYY, h:mm A');
};

export const formatShortDate = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  return dayjs(iso).format('D MMM, h:mm A');
};

export const formatRating = (rating: number): string =>
  rating.toFixed(1);

export const formatPhone = (phone: string): string =>
  phone.replace('+91', '').replace(/(\d{5})(\d{5})/, '$1 $2');
