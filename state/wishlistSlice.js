// state/wishlistSlice.js
import { createSlice } from '@reduxjs/toolkit'

const initialState = { items: [] }

// 위시리스트 상태 관리를 위한 슬라이스 생성
export const wishlistSlice = createSlice({
  name: 'wishlist',
  initialState,
  reducers: {
    addItem(state, action) {
      const item = action.payload
      const exists = state.items.find((i) => i.id === item.id)
      if (!exists) {
        state.items.push(item)
      }
    },
    removeItem(state, action) {
      const itemId = action.payload
      state.items = state.items.filter((i) => i.id !== itemId)
    },
  },
})

export const { addItem, removeItem } = wishlistSlice.actions
export default wishlistSlice.reducer
