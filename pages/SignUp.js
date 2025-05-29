// Pages/SignUp.js
// 회원가입 페이지 컴포넌트
// 이메일, 비밀번호, 닉네임, 프로필 사진을 입력하여 회원가입 가능

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
  Image
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useDispatch, useSelector } from 'react-redux'
import { signupAsync } from '../state/authSlice'
import * as ImagePicker from 'expo-image-picker'
import { showToast } from '../state/toastUtil'

export default function SignUp() {
  const navigation = useNavigation() 
  const dispatch = useDispatch()
  const authStatus = useSelector((state) => state.auth.status)
  const [emailLocal, setEmailLocal] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [nickname, setNickname] = useState('')
  const [profileImage, setProfileImage] = useState(null)
  const [signupTimeoutTriggered, setSignupTimeoutTriggered] = useState(false)
  
  // 에러 상태 관리
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [nicknameError, setNicknameError] = useState('')
  const [passwordConfirmError, setPasswordConfirmError] = useState('')
  
  // 프로필 이미지 선택 함수
  const pickProfileImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      alert('갤러리 접근 권한이 필요합니다.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    })
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setProfileImage(result.assets[0])
    }
  }
  
  // 입력값 검증 함수
  const validateInputs = () => {
    let valid = true
    if (!emailLocal.trim()) {
      setEmailError('이메일 아이디를 입력해주세요.')
      valid = false
    } else {
      setEmailError('')
    }
    if (password.length < 6) {
      setPasswordError('비밀번호는 6자 이상 입력해야 합니다.')
      valid = false
    } else {
      setPasswordError('')
    }
    if (nickname.trim().length < 2) {
      setNicknameError('닉네임은 2자 이상 입력해야 합니다.')
      valid = false
    } else {
      setNicknameError('')
    }
    if (password !== passwordConfirm) {
      setPasswordConfirmError('비밀번호가 일치하지 않습니다.')
      valid = false
    } else {
      setPasswordConfirmError('')
    }
    return valid
  }
  
  // 회원가입 처리 함수
  const handleSignUp = async () => {
    if (!validateInputs()) {
      return
    }
    setSignupTimeoutTriggered(false)
    const timer = setTimeout(() => {
      setSignupTimeoutTriggered(true)
      showToast('네트워크 오류입니다. 다시 시도하세요')
    }, 10000)
  
    try {
      await dispatch(signupAsync({ email: emailLocal + '@hansung.ac.kr', password, nickname, profileImage })).unwrap()
      clearTimeout(timer)
      if (!signupTimeoutTriggered) {
        showToast('회원가입 성공! 로그인 해주세요.')
        navigation.replace('Login')
      }
    } catch (error) {
      clearTimeout(timer)
      if (!signupTimeoutTriggered) {
        showToast('회원가입 실패: ' + (error.message || JSON.stringify(error)))
      }
    }
  }
  
  return (
    <SafeAreaView style={[styles.safeArea, Platform.OS === 'android' && { paddingTop: StatusBar.currentHeight }]}>
      <View style={[styles.header, { height: 60 }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="black" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>회원가입</Text>
        </View>
      </View>
  
      <View style={styles.container}>
        <View style={styles.row}>
          <RNTextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="이메일 아이디"
            value={emailLocal}
            onChangeText={text => {
              const noSpaces = text.replace(/\s/g, '');
              setEmailLocal(noSpaces);
            }}
          />
          <Text style={styles.domain}>@hansung.ac.kr</Text>
        </View>
        {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
        {/* <View style={styles.row}>
          <RNTextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="인증번호 입력"
            value={verificationCode}
            onChangeText={setVerificationCode}
          />
          <TouchableOpacity style={styles.verifyButton} onPress={() => {}}>
            <Text style={styles.verifyButtonText}>인증하기</Text>
          </TouchableOpacity>
        </View> */}
        <RNTextInput
          style={[styles.input, styles.inputMargin]}
          placeholder="비밀번호"
          secureTextEntry
          value={password}
          onChangeText={text => {
            const noSpaces = text.replace(/\s/g, '');
            setPassword(noSpaces);
          }}
        />
        {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
        <RNTextInput
          style={[styles.input, styles.inputMargin]}
          placeholder="비밀번호 확인"
          secureTextEntry
          value={passwordConfirm}
          onChangeText={text => {
            const noSpaces = text.replace(/\s/g, '');
            setPasswordConfirm(noSpaces);
          }}
        />
        {passwordConfirmError ? <Text style={styles.errorText}>{passwordConfirmError}</Text> : null}
        <RNTextInput
          style={[styles.input, styles.inputMargin]}
          placeholder="닉네임"
          value={nickname}
          onChangeText={text => {
            const noSpaces = text.replace(/\s/g, '');
            setNickname(noSpaces);
          }}
        />
        {nicknameError ? <Text style={styles.errorText}>{nicknameError}</Text> : null}
  
        <View style={styles.profileImageContainer}>
          {profileImage ? (
            <Image source={{ uri: profileImage.uri }} style={styles.profileImagePreview} />
          ) : (
            <View style={styles.profileImagePlaceholder}>
              <MaterialCommunityIcons name="account-circle-outline" size={80} color="#ccc" />
            </View>
          )}
          <TouchableOpacity style={styles.pickImageButton} onPress={pickProfileImage}>
            <Text style={styles.pickImageButtonText}>프로필 사진 선택</Text>
          </TouchableOpacity>
        </View>
  
        <TouchableOpacity style={styles.signUpButton} onPress={handleSignUp}>
          <Text style={styles.signUpButtonText}>회원가입</Text>
        </TouchableOpacity>
      </View>
  
      {authStatus === 'loading' && !signupTimeoutTriggered && (
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
  container: { flex: 1, padding: 20 },
  row: { flexDirection: 'row', alignItems: 'center', marginVertical: 8 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, fontSize: 16, backgroundColor: '#fff' },
  inputMargin: { marginVertical: 8 },
  domain: { marginLeft: 10, fontSize: 16, color: '#555' },
  verifyButton: { backgroundColor: '#87CEEB', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, marginLeft: 10 },
  verifyButtonText: { color: '#fff', fontSize: 14 },
  signUpButton: { backgroundColor: '#87CEEB', paddingVertical: 15, borderRadius: 8, alignItems: 'center', marginTop: 20 },
  signUpButtonText: { color: '#fff', fontSize: 18 },
  loadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'center', alignItems: 'center' },
  profileImageContainer: { alignItems: 'center', marginVertical: 20 },
  profileImagePreview: { width: 100, height: 100, borderRadius: 50 },
  profileImagePlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' },
  pickImageButton: { marginTop: 10, backgroundColor: '#87CEEB', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 8 },
  pickImageButtonText: { color: '#fff', fontSize: 16 },
  errorText: { color: 'red', fontSize: 14, marginTop: 4 },
})
