import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface AuthState {
  userId:      string | null;
  phone:       string | null;
  name:        string | null;
  role:        'CUSTOMER' | 'WORKER' | 'ADMIN' | null;
  isLoggedIn:  boolean;
}

const initialState: AuthState = {
  userId:     null,
  phone:      null,
  name:       null,
  role:       null,
  isLoggedIn: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuth: (state, action: PayloadAction<{
      userId: string; phone: string; name: string | null;
      role: 'CUSTOMER' | 'WORKER' | 'ADMIN';
    }>) => {
      state.userId    = action.payload.userId;
      state.phone     = action.payload.phone;
      state.name      = action.payload.name;
      state.role      = action.payload.role;
      state.isLoggedIn = true;
    },
    clearAuth: () => initialState,
    updateName: (state, action: PayloadAction<string>) => {
      state.name = action.payload;
    },
  },
});

export const { setAuth, clearAuth, updateName } = authSlice.actions;
export default authSlice.reducer;
