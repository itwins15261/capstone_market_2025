// state/store.js
import { configureStore } from '@reduxjs/toolkit'
import authReducer from './authSlice'
import wishlistReducer from './wishlistSlice'
import themeReducer from './themeSlice'

// Redux 스토어 구성 함수
const store = configureStore({
  reducer: {
    auth: authReducer,
    wishlist: wishlistReducer,
    theme: themeReducer,
  },
})

export default store
