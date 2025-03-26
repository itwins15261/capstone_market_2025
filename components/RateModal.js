// RateModal.js
import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Modal,
  KeyboardAvoidingView,
  Platform
} from 'react-native'
import { Button, TextInput } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import axiosInstance from '../api/axios'
import { showToast } from '../state/toastUtil'

export default function RateModal({ visible, onClose, item }) {
  // item: { title, postId, revieweeId }
  const [rating, setRating] = useState(0)
  const [details, setDetails] = useState('')
  const [loading, setLoading] = useState(false)

  // 리뷰 내용 입력 시 100자 제한
  const handleDetailsChange = (text) => {
    if (text.length > 100) {
      showToast('최대 100자까지 입력 가능합니다.')
      setDetails(text.slice(0, 100))
    } else {
      setDetails(text)
    }
  }

  // 별점 선택 함수
  const handleStarPress = (starValue) => {
    setRating(starValue)
  }

  // 리뷰 등록 API 호출 함수, 폼 데이터 형식으로 전송
  const handleSubmitRate = useCallback(async () => {
    if (rating < 1) {
      showToast('별점을 선택해주세요(1점 이상).')
      return
    }
    setLoading(true)
    try {
      // 폼 데이터로 변환
      const params = new URLSearchParams()
      params.append('rating', rating)
      params.append('comment', details)
      // axios POST 호출, 문자열 형태로 전송
      await axiosInstance.post(
        `/api/posts/${item.postId}/reviews/${item.revieweeId}`,
        params.toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }
      )
      showToast(`리뷰가 등록되었습니다. (별 ${rating}개)`)
      setLoading(false)
      setRating(0)
      setDetails('')
      onClose()
    } catch (error) {
      setLoading(false)
      showToast('리뷰 등록 실패: ' + (error.message || ''))
    }
  }, [rating, details, item, onClose])

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.modalContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>
            {item?.title ? `${item.title} 거래 만족도 평가` : '거래 만족도 평가'}
          </Text>
          <View style={styles.starRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <MaterialCommunityIcons
                key={star}
                name={star <= rating ? 'star' : 'star-outline'}
                size={32}
                color={star <= rating ? '#FFD700' : '#ccc'}
                style={{ marginHorizontal: 2 }}
                onPress={() => handleStarPress(star)}
              />
            ))}
          </View>
          <TextInput
            label="리뷰 후기 (최대 100자)"
            mode="outlined"
            value={details}
            onChangeText={handleDetailsChange}
            multiline
            numberOfLines={4}
            style={styles.textInput}
          />
          <View style={styles.buttonContainer}>
            <Button
              mode="contained"
              onPress={onClose}
              style={[styles.cancelButton, { shadowOffset: { width: 0, height: 0 }, elevation: 0 }]}
              contentStyle={styles.buttonContent}
              labelStyle={styles.buttonLabel}
            >
              취소
            </Button>
            <Button
              mode="contained"
              onPress={handleSubmitRate}
              style={[styles.submitButton, { shadowOffset: { width: 0, height: 0 }, elevation: 0 }]}
              contentStyle={styles.buttonContent}
              labelStyle={styles.buttonLabel}
              loading={loading}
            >
              평가하기
            </Button>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 20,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
    textAlign: 'center',
  },
  starRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 15,
  },
  textInput: {
    marginBottom: 15,
    height: 100,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
  },
  cancelButton: {
    marginRight: 10,
    backgroundColor: '#FF6B6B',
    borderRadius: 8,
  },
  submitButton: {
    backgroundColor: '#87CEEB',
    borderRadius: 8,
  },
  buttonContent: {
    paddingVertical: 2,
    paddingHorizontal: 2,
  },
  buttonLabel: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 15,
  },
})
