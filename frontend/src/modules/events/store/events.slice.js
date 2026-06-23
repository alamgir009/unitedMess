import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  view: 'meals',
  currentMonth: new Date().toISOString(),
  isLoading: false,
};

export const eventsSlice = createSlice({
  name: 'events',
  initialState,
  reducers: {
    setView: (state, action) => { state.view = action.payload; },
    setCurrentMonth: (state, action) => { state.currentMonth = action.payload; },
    setLoading: (state, action) => { state.isLoading = action.payload; },
  },
});

export const { setView, setCurrentMonth, setLoading } = eventsSlice.actions;
export default eventsSlice.reducer;
