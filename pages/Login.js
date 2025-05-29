// pages/Login.js
// 로그인 페이지 컴포넌트, 사용자가 이메일과 비밀번호로 로그인하는 화면

import React, { useState } from 'react'
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  TextInput as RNTextInput,
  Platform,
  StatusBar,
  ActivityIndicator,
  LogBox,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useDispatch, useSelector } from 'react-redux'
import { loginAsync } from '../state/authSlice'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Checkbox } from 'react-native-paper'
import AsyncStorage from '@react-native-async-storage/async-storage'

LogBox.ignoreLogs(['Request failed with status code'])

const logoImage = require('../assets/icon.png')

export default function Login() {
  const navigation = useNavigation()
  const dispatch   = useDispatch()

  const [userId, setUserId]           = useState('')
  const [password, setPassword]       = useState('')
  const [stayLoggedIn, setStayLogged] = useState(false)

  const authStatus = useSelector((state) => state.auth.status)

  const [emailError, setEmailError]       = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [loginError, setLoginError]       = useState('')
  const [loginTimeoutTriggered, setLoginTimeoutTriggered] = useState(false)

  const validateInputs = () => {
    if (!userId.trim()) {
      setEmailError('이메일을 입력해주세요.')
      setPasswordError('')
      return false
    } else setEmailError('')
    if (password.length < 6) {
      setPasswordError('비밀번호는 최소 6자 이상 입력해야 합니다.')
      return false
    } else setPasswordError('')
    return true
  }

  const handleLogin = async () => {
    if (!validateInputs()) return

    setLoginError('')
    setLoginTimeoutTriggered(false)
    const timer = setTimeout(() => {
      setLoginTimeoutTriggered(true)
      setLoginError('네트워크 오류입니다. 연결을 확인해주세요.')
    }, 5000)

    try {
      const result = await dispatch(
        loginAsync({ email: userId, password })
      ).unwrap()

      clearTimeout(timer)

      // 로그인 유지
      if (stayLoggedIn && result?.token) {
        try {
          await AsyncStorage.setItem('persistToken', result.token)
          await AsyncStorage.setItem('persistUser', JSON.stringify({
            id: result.id,
            email: result.email,
            nickname: result.nickname,
            profileImage: '',
          }))
          console.log('토큰 저장 성공:', result.token)
        } catch (e) {
          console.log('토큰 저장 실패', e)
        }
      } else {
        await AsyncStorage.removeItem('persistToken')
        await AsyncStorage.removeItem('persistUser')
      }

      if (!loginTimeoutTriggered) {
        navigation.reset({ index: 0, routes: [{ name: 'MainTab' }] })
      }
    } catch {
      clearTimeout(timer)
      setLoginError('이메일 또는 비밀번호가 틀렸습니다.')
    }
  }

  const getErrorMessage = () => emailError || passwordError || loginError || ''

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        Platform.OS === 'android' && { paddingTop: StatusBar.currentHeight },
      ]}
    >
      {/* 헤더 */}
      <View style={[styles.header, { height: 60 }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="black" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>로그인</Text>
        </View>
      </View>

      {/* 로고 */}
      <View style={styles.logoContainer}>
        <Image source={logoImage} style={styles.logoImage} />
      </View>

      {/* 입력 폼 */}
      <View style={styles.container}>
        <RNTextInput
          style={styles.input}
          placeholder="아이디"
          value={userId}
          onChangeText={text => setUserId(text.replace(/\s+/g, ''))}
        />
        <RNTextInput
          style={styles.input}
          placeholder="비밀번호"
          value={password}
          secureTextEntry
          onChangeText={text => setPassword(text.replace(/\s+/g, ''))}
        />

        {/* 로그인 상태 유지 */}
        <View style={styles.stayBox}>
          <Checkbox
            status={stayLoggedIn ? 'checked' : 'unchecked'}
            onPress={() => setStayLogged(!stayLoggedIn)}
            color="#87CEEB"
          />
          <Text onPress={() => setStayLogged(!stayLoggedIn)} style={styles.stayText}>
            로그인 상태 유지
          </Text>
        </View>

        {/* 에러 메시지 */}
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{getErrorMessage()}</Text>
        </View>

        {/* 버튼 */}
        <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
          <Text style={styles.loginButtonText}>로그인</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.signUpButton}
          onPress={() => navigation.navigate('SignUp')}
        >
          <Text style={styles.signUpButtonText}>회원가입</Text>
        </TouchableOpacity>
      </View>

      {/* 로딩 */}
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
  header: {
    backgroundColor: '#87CEEB',
    borderBottomWidth: 1,
    borderColor: '#ddd',
    paddingHorizontal: 15,
    justifyContent: 'center',
  },
  headerContent: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', marginLeft: 10, color: 'black' },

  logoContainer: { alignItems: 'center', marginVertical: 30 },
  logoImage: { width: 180, height: 180, borderRadius: 90 },

  container: { flex: 1, paddingHorizontal: 20 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 15,
    padding: 10,
    fontSize: 16,
  },
  stayBox: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  stayText: { fontSize: 15, color: '#333' },
  errorContainer: { height: 30, justifyContent: 'center', marginBottom: 20 },
  errorText: { color: 'red', fontSize: 14 },
  loginButton: {
    backgroundColor: '#87CEEB',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  loginButtonText: { color: '#000', fontSize: 18, fontWeight: 'bold' },
  signUpButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#87CEEB',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  signUpButtonText: { color: '#000', fontSize: 18, fontWeight: 'bold' },
  loadingOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'center', alignItems: 'center',
  },
})
