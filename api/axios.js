// api/axios.js
import axios from 'axios'
import config from './config'

// axios 인스턴스 생성, 기본 URL은 config.BASE_URL 사용
const instance = axios.create({
  baseURL: config.BASE_URL,
})

// POST 요청시 JSON 형식 헤더 설정
instance.defaults.headers.post['Content-Type'] = 'application/json'

// 나중에 redux store를 저장할 변수
let reduxStore

// 외부에서 redux store를 설정할 수 있게 함수 제공
export const setReduxStore = (store) => {
  reduxStore = store
}

// 요청 인터셉터로 토큰이 있으면 헤더에 Authorization 추가
instance.interceptors.request.use(
  (config) => {
    if (reduxStore) {
      const state = reduxStore.getState()
      const token = state.auth && state.auth.token
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    }
    return config
  },
  (error) => Promise.reject(error)
)

export default instance
