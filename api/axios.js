// api/axios.js

import axios from 'axios';
import config from './config';

// axios 인스턴스를 생성. BASE_URL은 config에서 가져옴
const instance = axios.create({
  baseURL: config.BASE_URL, // 기본 URL 설정
});

// POST 요청 시 JSON 형식 헤더를 기본으로 설정
instance.defaults.headers.post['Content-Type'] = 'application/json';

// 나중에 redux store를 주입받기 위한 변수
let reduxStore;

// 외부에서 redux store를 주입받는 함수
export const setReduxStore = (store) => {
  reduxStore = store; // store 저장
};

// 요청 인터셉터: redux store에서 토큰이 있으면 헤더에 추가
instance.interceptors.request.use(
  (config) => {
    if (reduxStore) {
      const state = reduxStore.getState(); // 현재 상태 가져오기
      const token = state.auth && state.auth.token; // 토큰 추출
      if (token) {
        config.headers.Authorization = `Bearer ${token}`; // 토큰 헤더 추가
      }
    }
    return config; // 변경된 config 반환
  },
  (error) => Promise.reject(error) // 에러 발생 시 바로 reject
);

export default instance; // 인스턴스 내보냄
