// components/RateModal.js
// 마이페이지 -> 리뷰 작성 페이지에서 리뷰 작성 및 수정할 때 사용하는 모달 컴포넌트

import React, { useState, useCallback, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native'
import { Button, TextInput } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import axiosInstance from '../api/axios'
import { showToast } from '../state/toastUtil'

export default function RateModal({ visible, onClose, item }) {
  // item: { title, postId, revieweeId, id?, rating?, comment? }
  const [rating, setRating] = useState(item.rating || 0)
  const [details, setDetails] = useState(item.comment || '')
  const [loading, setLoading] = useState(false)

  // item 바뀔 때마다 초기값 세팅
  useEffect(() => {
    setRating(item.rating || 0)
    setDetails(item.comment || '')
  }, [item])

  // 리뷰 내용 100자 제한
  const handleDetailsChange = (text) => {
    if (text.length > 100) {
      showToast('최대 100자까지 입력 가능합니다.')
      setDetails(text.slice(0, 100))
    } else {
      setDetails(text)
    }
  }

  // 별점 누르기
  const handleStarPress = (starValue) => {
    setRating(starValue)
  }

  // 리뷰 등록/수정
  const handleSubmit = useCallback(async () => {
    if (rating < 1) {
      showToast('별점을 선택해주세요(1점 이상).')
      return
    }
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.append('rating', rating)
      params.append('comment', details)

      if (item.id) {
        // 리뷰 수정
        await axiosInstance.put(
          `/api/reviews/${item.id}`,
          params.toString(),
          { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        )
        showToast('리뷰가 수정되었습니다.')
      } else {
        // 리뷰 새로 작성
        await axiosInstance.post(
          `/api/posts/${item.postId}/reviews/${item.revieweeId}`,
          params.toString(),
          { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        )
        showToast('리뷰가 등록되었습니다.')
      }
      onClose()
    } catch (error) {
      showToast((item.id ? '수정' : '등록') + ' 실패: ' + (error.message || ''))
    } finally {
      setLoading(false)
    }
  }, [rating, details, item, onClose])

  // 리뷰 삭제
  const handleDelete = useCallback(async () => {
    if (!item.id) return
    setLoading(true)
    try {
      await axiosInstance.delete(`/api/reviews/${item.id}`)
      showToast('리뷰가 삭제되었습니다.')
      onClose()
    } catch (error) {
      showToast('삭제 실패: ' + (error.message || ''))
    } finally {
      setLoading(false)
    }
  }, [item, onClose])

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
            {item.title
              ? `${item.title} 거래 만족도 평가`
              : '거래 만족도 평가'}
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
            mode="flat"
            value={details}
            onChangeText={handleDetailsChange}
            multiline
            numberOfLines={6}
            style={[styles.input, styles.modernMultiline, { backgroundColor: '#fff' }]}
          />

          <View style={styles.buttonContainer}>
            {/* 리뷰 삭제 (수정 모드일 때만) */}
            {item.id && (
              <Button
                mode="contained"
                onPress={() =>
                  Alert.alert(
                    '삭제 확인',
                    '정말 이 리뷰를 삭제하시겠습니까?',
                    [
                      { text: '취소', style: 'cancel' },
                      { text: '삭제', style: 'destructive', onPress: handleDelete },
                    ],
                    { cancelable: true }
                  )
                }
                style={[styles.deleteButton, { shadowOffset: { width: 0, height: 0 }, elevation: 0 }]}
                contentStyle={styles.buttonContent}
                labelStyle={styles.buttonLabel}
                loading={loading}
              >
                삭제
              </Button>
            )}

            {/* 취소 */}
            <Button
              mode="contained"
              onPress={onClose}
              style={[styles.cancelButton, { shadowOffset: { width: 0, height: 0 }, elevation: 0 }]}
              contentStyle={styles.buttonContent}
              labelStyle={styles.buttonLabel}
              disabled={loading}
            >
              취소
            </Button>

            {/* 등록/수정 */}
            <Button
              mode="contained"
              onPress={handleSubmit}
              style={[styles.submitButton, { shadowOffset: { width: 0, height: 0 }, elevation: 0 }]}
              contentStyle={styles.buttonContent}
              labelStyle={styles.buttonLabel}
              loading={loading}
            >
              {item.id ? '수정하기' : '평가하기'}
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
  // textInput: {
  //   marginBottom: 15,
  // },
  // textInputInner: {
  //   height: 100,                
  //   textAlignVertical: 'top',     
  //   paddingTop: 8,               
  // },
  input: {
    marginVertical: 10,
  },
  modernMultiline: {
    textAlignVertical: 'top',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    height: 150,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
  },
  deleteButton: {
    backgroundColor: '#FFB3B3',
    borderRadius: 8,
    marginRight: 8,
  },
  cancelButton: {
    backgroundColor: '#FFB3B3',
    borderRadius: 8,
    marginRight: 8,
  },
  submitButton: {
    backgroundColor: '#87CEEB',
    borderRadius: 8,
  },
  buttonContent: {
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  buttonLabel: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 15,
  },
})
