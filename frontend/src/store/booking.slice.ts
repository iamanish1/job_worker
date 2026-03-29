import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Booking } from '../types/api.types';

interface BookingState {
  activeBooking: Booking | null;
  bookings:      Booking[];
  loading:       boolean;
  error:         string | null;
}

const initialState: BookingState = {
  activeBooking: null,
  bookings:      [],
  loading:       false,
  error:         null,
};

const bookingSlice = createSlice({
  name: 'booking',
  initialState,
  reducers: {
    setActiveBooking: (state, action: PayloadAction<Booking | null>) => {
      state.activeBooking = action.payload;
    },
    setBookings: (state, action: PayloadAction<Booking[]>) => {
      state.bookings = action.payload;
    },
    updateBookingStatus: (state, action: PayloadAction<Booking>) => {
      const idx = state.bookings.findIndex(b => b.id === action.payload.id);
      if (idx !== -1) state.bookings[idx] = action.payload;
      if (state.activeBooking?.id === action.payload.id) {
        state.activeBooking = action.payload;
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const { setActiveBooking, setBookings, updateBookingStatus,
               setLoading, setError } = bookingSlice.actions;
export default bookingSlice.reducer;
