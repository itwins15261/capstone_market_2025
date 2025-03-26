// components/ProfileModal.js
import React, { useState, useCallback } from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { Button, TextInput } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import { useDispatch, useSelector } from 'react-redux'
import { updateUserAsync } from '../state/authSlice'

export default function ProfileModal({
  modalType,
  onClose,
  setModalType,
  showSnackbar,
}) {
  const dispatch = useDispatch()
  const currentNickname = useSelector((state) => state.auth.user.nickname)

  // 닉네임 변경용 상태
  const [newNickname, setNewNickname] = useState('')

  // 비밀번호 변경용 상태
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')

  // 갤러리에서 이미지 선택, 자르기 이후 프로필 사진 변경
  const handleChangeProfile = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      showSnackbar('갤러리 접근 권한이 필요합니다.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    })
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const selectedImage = result.assets[0]
      dispatch(
        updateUserAsync({
          nickname: null,
          password: null,
          profileImage: selectedImage,
        })
      )
        .unwrap()
        .then(() => {
          showSnackbar('프로필 사진이 업데이트되었습니다.')
          onClose()
        })
        .catch((error) => {
          showSnackbar(
            '프로필 사진 업데이트 실패: ' + (error.message || JSON.stringify(error))
          )
        })
    }
  }, [dispatch, onClose, showSnackbar])

  // 닉네임 변경 함수, 유효성 검사 포함
  const handleUpdateNickname = useCallback(async () => {
    const trimmedNickname = newNickname.trim()
    if (!trimmedNickname) {
      showSnackbar('새 닉네임을 입력해주세요.')
      return
    }
    if (trimmedNickname === currentNickname) {
      showSnackbar('현재 닉네임과 동일합니다.')
      return
    }
    if (trimmedNickname.length < 4) {
      showSnackbar('닉네임은 최소 4자리 이상이어야 합니다.')
      return
    }
    try {
      await dispatch(
        updateUserAsync({
          nickname: trimmedNickname,
          password: null,
          profileImage: null,
        })
      ).unwrap()
      showSnackbar('닉네임이 변경되었습니다.')
      onClose()
      setNewNickname('')
    } catch (error) {
      showSnackbar('닉네임 변경 실패: ' + (error.message || JSON.stringify(error)))
    }
  }, [dispatch, newNickname, currentNickname, onClose, showSnackbar])

  // 비밀번호 변경 함수, 입력값과 길이 검증 포함
  const handleUpdatePassword = useCallback(async () => {
    if (!newPassword || !confirmNewPassword) {
      showSnackbar('새 비밀번호와 비밀번호 확인을 입력해주세요.')
      return
    }
    if (newPassword !== confirmNewPassword) {
      showSnackbar('새 비밀번호가 일치하지 않습니다.')
      return
    }
    if (newPassword.length < 4) {
      showSnackbar('비밀번호는 최소 4자리 이상이어야 합니다.')
      return
    }
    try {
      await dispatch(
        updateUserAsync({
          nickname: currentNickname,
          password: newPassword,
          profileImage: null,
        })
      ).unwrap()
      showSnackbar('비밀번호가 변경되었습니다.')
      onClose()
      setNewPassword('')
      setConfirmNewPassword('')
    } catch (error) {
      showSnackbar('비밀번호 변경 실패: ' + (error.message || JSON.stringify(error)))
    }
  }, [dispatch, newPassword, confirmNewPassword, currentNickname, onClose, showSnackbar])

  return (
    <View style={styles.modalContent}>
      {modalType === 'profile' && (
        <View>
          <TouchableOpacity style={styles.modalButton} onPress={handleChangeProfile}>
            <MaterialCommunityIcons name="camera-plus" size={20} color="#fff" />
            <Text style={styles.modalButtonText}>프로필 사진 선택</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.modalButton}
            onPress={() => setModalType('nickname')}
          >
            <MaterialCommunityIcons name="account-circle" size={20} color="#fff" />
            <Text style={styles.modalButtonText}>닉네임 변경</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.modalButton}
            onPress={() => setModalType('password')}
          >
            <MaterialCommunityIcons name="lock-reset" size={20} color="#fff" />
            <Text style={styles.modalButtonText}>비밀번호 변경</Text>
          </TouchableOpacity>
        </View>
      )}
      {modalType === 'nickname' && (
        <View>
          <TextInput
            label="새 닉네임"
            mode="outlined"
            value={newNickname}
            onChangeText={setNewNickname}
            style={styles.input}
          />
          <Button
            mode="contained"
            onPress={handleUpdateNickname}
            style={styles.submitButton}
            contentStyle={styles.buttonContent}
          >
            변경하기
          </Button>
        </View>
      )}
      {modalType === 'password' && (
        <View>
          <TextInput
            label="새 비밀번호"
            mode="outlined"
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
            style={styles.input}
          />
          <TextInput
            label="새 비밀번호 확인"
            mode="outlined"
            secureTextEntry
            value={confirmNewPassword}
            onChangeText={setConfirmNewPassword}
            style={styles.input}
          />
          <Button
            mode="contained"
            onPress={handleUpdatePassword}
            style={styles.submitButton}
            contentStyle={styles.buttonContent}
          >
            변경하기
          </Button>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  modalContent: {
    padding: 20,
  },
  modalButton: {
    flexDirection: 'row',
    backgroundColor: '#87CEEB',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 15,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 0,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 10,
  },
  input: {
    marginBottom: 15,
    backgroundColor: '#fff',
  },
  submitButton: {
    marginTop: 10,
    backgroundColor: '#87CEEB',
    elevation: 0,
  },
  buttonContent: {
    paddingVertical: 8,
  },
})
