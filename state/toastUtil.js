// state/toastUtil.js
import { ToastAndroid, Platform } from 'react-native'

// 토스트 메시지 표시 함수, 안드로이드에서는 ToastAndroid 사용
export const showToast = (message) => {
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.SHORT)
  } else {
    console.log('Toast:', message)
  }
}
