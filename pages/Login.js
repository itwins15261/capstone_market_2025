// pages/Login.js
import React, { useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  TextInput as RNTextInput,
  Platform,
  StatusBar,
  ActivityIndicator,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useDispatch, useSelector } from 'react-redux'
import { loginAsync } from '../state/authSlice'
import { MaterialCommunityIcons } from '@expo/vector-icons'

export default function Login() {
  const navigation = useNavigation() // 내비게이션 사용
  const dispatch = useDispatch()

  const [userId, setUserId] = useState('')
  const [password, setPassword] = useState('')

  const authStatus = useSelector((state) => state.auth.status)
  const authError = useSelector((state) => state.auth.error)

  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [loginError, setLoginError] = useState('')

  const [loginTimeoutTriggered, setLoginTimeoutTriggered] = useState(false)

  // 입력값 검증 함수, 이메일과 비밀번호 확인
  const validateInputs = () => {
    if (!userId.trim()) {
      setEmailError('이메일을 입력해주세요.')
      setPasswordError('')
      return false
    } else {
      setEmailError('')
    }
    if (password.length < 6) {
      setPasswordError('비밀번호는 최소 6자 이상 입력해야 합니다.')
      return false
    } else {
      setPasswordError('')
    }
    return true
  }

  // 로그인 처리 함수, 타임아웃 처리 포함
  const handleLogin = async () => {
    if (!validateInputs()) {
      return
    }
    setLoginError('')
    setLoginTimeoutTriggered(false)
    const timer = setTimeout(() => {
      setLoginTimeoutTriggered(true)
      setLoginError('네트워크 오류입니다. 연결을 확인해주세요.')
    }, 5000)

    try {
      await dispatch(loginAsync({ email: userId, password })).unwrap()
      clearTimeout(timer)
      if (!loginTimeoutTriggered) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'MainTab' }],
        })
      }
    } catch (error) {
      clearTimeout(timer)
      if (!loginTimeoutTriggered) {
        setLoginError('이메일 또는 비밀번호가 틀렸습니다.')
      }
    }
  }

  // 에러 메시지 우선순위에 따라 반환하는 함수
  const getErrorMessage = () => {
    if (emailError) return emailError
    if (passwordError) return passwordError
    if (loginError) return loginError
    return ''
  }

  return (
    <SafeAreaView style={[styles.safeArea, Platform.OS === 'android' && { paddingTop: StatusBar.currentHeight }]}>
      <View style={[styles.header, { height: 60 }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="black" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>로그인</Text>
        </View>
      </View>

      <View style={styles.logoContainer}>
        <Text style={styles.logoText}>로고자리</Text>
      </View>
      
      <View style={styles.container}>
        <RNTextInput
          style={styles.input}
          placeholder="아이디"
          value={userId}
          onChangeText={setUserId}
        />
        <RNTextInput
          style={styles.input}
          placeholder="비밀번호"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{getErrorMessage()}</Text>
        </View>
        {authError && (
          <Text style={{ color: 'red', marginTop: 10 }}>
            {authError.message || JSON.stringify(authError)}
          </Text>
        )}
        <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
          <Text style={styles.loginButtonText}>로그인</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.signUpButton} onPress={() => navigation.navigate('SignUp')}>
          <Text style={styles.signUpButtonText}>회원가입</Text>
        </TouchableOpacity>
        <View style={styles.findContainer}>
          <TouchableOpacity onPress={() => navigation.navigate('FindId')}>
            <Text style={styles.findText}>아이디 찾기</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('FindPwd')}>
            <Text style={styles.findText}>비밀번호 찾기</Text>
          </TouchableOpacity>
        </View>
      </View>

      {authStatus === 'loading' && !loginTimeoutTriggered && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#87CEEB" />
        </View>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  header: { backgroundColor: '#87CEEB', borderBottomWidth: 1, borderColor: '#ddd', paddingHorizontal: 15, justifyContent: 'center' },
  headerContent: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', marginLeft: 10, color: 'black' },
  logoContainer: { alignItems: 'center', marginVertical: 20 },
  logoText: { fontSize: 32, fontWeight: 'bold', color: '#333', marginVertical: 50 },
  container: { flex: 1, padding: 20 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, marginBottom: 15, padding: 10, fontSize: 16 },
  errorContainer: { height: 30, justifyContent: 'center', marginBottom: 20 },
  errorText: { color: 'red', fontSize: 14 },
  loginButton: { backgroundColor: '#87CEEB', paddingVertical: 15, borderRadius: 8, alignItems: 'center', marginBottom: 10 },
  loginButtonText: { color: '#fff', fontSize: 18 },
  signUpButton: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#87CEEB', paddingVertical: 15, borderRadius: 8, alignItems: 'center', marginBottom: 20 },
  signUpButtonText: { color: '#87CEEB', fontSize: 18 },
  findContainer: { flexDirection: 'row', justifyContent: 'space-around' },
  findText: { fontSize: 16, textDecorationLine: 'underline', color: '#007bff' },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
})
