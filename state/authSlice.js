// state/authSlice.js

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import axiosInstance from '../api/axios'
import AsyncStorage from '@react-native-async-storage/async-storage'

const initialState = {
  isLoggedIn: false,
  user: {
    id: null,
    email: '',
    nickname: '',
    profileImage: '',
  },
  token: '',
  status: 'idle',
  error: null,
}

// 로그인 API 호출 비동기 액션 생성
export const loginAsync = createAsyncThunk(
  'auth/loginAsync',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams()
      params.append('email', email)
      params.append('password', password)

      const response = await axiosInstance.post('/api/signin', params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })

      const authHeader = response.headers['authorization']
      const userIdHeader = response.headers['id']
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1]
        let storedNickname = await AsyncStorage.getItem('userNickname')
        if (!storedNickname) {
          storedNickname = email.split('@')[0]
          await AsyncStorage.setItem('userNickname', storedNickname)
        }
        // 로그인에 성공하면 AsyncStorage에도 persistToken, persistUser 저장
        await AsyncStorage.setItem('persistToken', token)
        await AsyncStorage.setItem('persistUser', JSON.stringify({
          id: userIdHeader ? parseInt(userIdHeader, 10) : null,
          email,
          nickname: storedNickname,
          profileImage: '',
        }))

        return {
          token,
          email,
          nickname: storedNickname,
          id: userIdHeader ? parseInt(userIdHeader, 10) : null,
        }
      } else {
        return rejectWithValue('토큰이 전달되지 않았습니다.')
      }
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message)
    }
  }
)

// 회원가입 API 호출 비동기 액션 생성
export const signupAsync = createAsyncThunk(
  'auth/signupAsync',
  async ({ email, password, nickname, profileImage }, { rejectWithValue }) => {
    try {
      let response
      if (profileImage) {
        const formData = new FormData()
        formData.append('email', email)
        formData.append('password', password)
        formData.append('nickname', nickname)
        formData.append('profileImage', {
          uri: profileImage.uri,
          name: 'profile.jpg',
          type: 'image/jpeg',
        })
        response = await axiosInstance.post('/api/signup', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        })
      } else {
        const params = new URLSearchParams()
        params.append('email', email)
        params.append('password', password)
        params.append('nickname', nickname)
        response = await axiosInstance.post('/api/signup', params, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        })
      }
      if (response.data === 'ok') {
        await AsyncStorage.setItem('userNickname', nickname)
        return { email, nickname }
      } else {
        return rejectWithValue('회원가입에 실패하였습니다.')
      }
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message)
    }
  }
)

// 현재 사용자 정보를 가져오는 API 호출 비동기 액션 생성
export const fetchCurrentUserAsync = createAsyncThunk(
  'auth/fetchCurrentUserAsync',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState()
      const userId = state.auth.user.id
      if (!userId) throw new Error("User ID not found")
      const response = await axiosInstance.get(`/api/user?userid=${userId}`)
      return response.data // UserDTO: { id, email, nickname, profileImageUrl }
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message)
    }
  }
)

// 회원정보 수정 API 호출 비동기 액션 생성
export const updateUserAsync = createAsyncThunk(
  'auth/updateUserAsync',
  async ({ nickname, password, profileImage }, { rejectWithValue }) => {
    try {
      let response
      if (profileImage) {
        const formData = new FormData()
        if (nickname !== null) formData.append('nickname', nickname)
        if (password !== null) formData.append('password', password)
        formData.append('profileImage', {
          uri: profileImage.uri,
          name: 'profile.jpg',
          type: 'image/jpeg',
        })
        response = await axiosInstance.put('/api/updateuser', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      } else {
        const params = new URLSearchParams()
        if (nickname !== null) params.append('nickname', nickname)
        if (password !== null) params.append('password', password)
        response = await axiosInstance.put('/api/updateuser', params, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        })
      }
      if (response.data && response.data.profileImage) {
        return {
          nickname: response.data.nickname ?? nickname,
          profileImage: response.data.profileImage,
        }
      } else if (response.data === 'updated') {
        return { nickname }
      } else {
        return rejectWithValue('회원정보 수정 실패')
      }
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message)
    }
  }
)

// 앱 재시작 후 저장된 토큰, 유저 복원
export const loadPersistedAuth = createAsyncThunk(
  'auth/loadPersistedAuth',
  async () => {
    const token = await AsyncStorage.getItem('persistToken')
    const userJson = await AsyncStorage.getItem('persistUser')
    const user = userJson ? JSON.parse(userJson) : null
    return { token, user }
  }
)

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // 로그아웃 처리 함수
    logout(state) {
      state.isLoggedIn = false
      state.user.id = null
      state.user.email = ''
      state.user.nickname = ''
      state.user.profileImage = ''
      state.token = ''
      state.status = 'idle'
      state.error = null
      AsyncStorage.removeItem('userNickname')
      AsyncStorage.removeItem('persistToken')
      AsyncStorage.removeItem('persistUser')
    },
    // 프로필 이미지 업데이트 함수
    updateProfileImage(state, action) {
      state.user.profileImage = action.payload
    },
  },
  extraReducers: (builder) => {
    builder
      // loginAsync
      .addCase(loginAsync.pending, (state) => {
        state.status = 'loading'
      })
      .addCase(loginAsync.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.isLoggedIn = true
        state.token = action.payload.token
        state.user.email = action.payload.email
        state.user.nickname = action.payload.nickname
        state.user.id = action.payload.id
      })
      .addCase(loginAsync.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload
      })
      // signupAsync
      .addCase(signupAsync.pending, (state) => {
        state.status = 'loading'
      })
      .addCase(signupAsync.fulfilled, (state) => {
        state.status = 'succeeded'
      })
      .addCase(signupAsync.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload
      })
      // fetchCurrentUserAsync
      .addCase(fetchCurrentUserAsync.pending, (state) => {
        state.status = 'loading'
      })
      .addCase(fetchCurrentUserAsync.fulfilled, (state, action) => {
        state.status = 'succeeded'
        const data = action.payload
        state.user.id = data.id || state.user.id
        state.user.email = data.email || state.user.email
        state.user.nickname = data.nickname || state.user.nickname
        state.user.profileImage = data.profileImageUrl || state.user.profileImage
      })
      .addCase(fetchCurrentUserAsync.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload
      })
      // updateUserAsync
      .addCase(updateUserAsync.pending, (state) => {
        state.status = 'loading'
      })
      .addCase(updateUserAsync.fulfilled, (state, action) => {
        state.status = 'succeeded'
        if (action.payload.nickname) {
          state.user.nickname = action.payload.nickname
        }
        if (action.payload.profileImage) {
          state.user.profileImage = action.payload.profileImage
        }
      })
      .addCase(updateUserAsync.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload
      })
      // loadPersistedAuth 처리
      .addCase(loadPersistedAuth.fulfilled, (state, { payload }) => {
        if (payload.token && payload.user) {
          state.token = payload.token
          state.user = {
            id: payload.user.id,
            email: payload.user.email,
            nickname: payload.user.nickname,
            profileImage: payload.user.profileImage ?? '',
          }
          state.isLoggedIn = true
        }
      })
  },
})

export const { logout, updateProfileImage } = authSlice.actions
export default authSlice.reducer
