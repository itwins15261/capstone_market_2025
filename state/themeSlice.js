// state/themeSlice.js, 미사용
import { createSlice } from '@reduxjs/toolkit'

const initialState = { isDarkMode: false }

// 다크 모드 상태 관리를 위한 슬라이스 생성
const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    toggleDarkMode(state) {
      state.isDarkMode = !state.isDarkMode
    },
    setDarkMode(state, action) {
      state.isDarkMode = action.payload
    },
  },
})

export const { toggleDarkMode, setDarkMode } = themeSlice.actions
export default themeSlice.reducer
