// components/EditReviewModal.js
// 리뷰 수정 모달 컴포넌트 (미사용, RateModal.js로 대체됨)
import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { Button, TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import axiosInstance from '../api/axios';
import { showToast } from '../state/toastUtil';

export default function EditReviewModal({
  visible,
  onClose,
  review,
  onReviewUpdated,
}) {
  // review: { id, rating, comment, post }
  const [rating, setRating] = useState(review.rating || 0);
  const [details, setDetails] = useState(review.comment || '');
  const [loading, setLoading] = useState(false);

  // 리뷰 내용 입력 시 100자 제한
  const handleDetailsChange = (text) => {
    if (text.length > 100) {
      showToast('최대 100자까지 입력 가능합니다.');
      setDetails(text.slice(0, 100));
    } else {
      setDetails(text);
    }
  };

  // 별점 선택 함수
  const handleStarPress = (starValue) => {
    setRating(starValue);
  };

  // 리뷰 수정 API 호출 (PUT)
  const handleSubmitEdit = useCallback(async () => {
    if (rating < 1) {
      showToast('별점을 선택해주세요(1점 이상).');
      return;
    }
    setLoading(true);
    try {
      await axiosInstance.put(`/api/reviews/${review.id}`, {
        rating: rating,
        comment: details,
      });
      showToast(`리뷰가 수정되었습니다. (별 ${rating}개)`);
      onReviewUpdated?.(); // 수정 후 목록 갱신
      onClose?.();         // 모달 닫기
    } catch (error) {
      showToast('리뷰 수정 실패: ' + (error.message || ''));
    } finally {
      setLoading(false);
    }
  }, [rating, details, review.id, onClose, onReviewUpdated]);

  // 모달이 열릴 때 기존 리뷰 데이터 초기화
  useEffect(() => {
    if (visible) {
      setRating(review.rating || 0);
      setDetails(review.comment || '');
    }
  }, [visible, review]);

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

          {/* 상단 헤더 영역: 왼쪽 제목, 오른쪽 닫기(X) 버튼 */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>리뷰 수정</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialCommunityIcons name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>

          {/* 별점 선택 */}
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

          {/* 리뷰 내용 입력 */}
          <TextInput
            label="리뷰 후기 (최대 100자)"
            mode="outlined"
            value={details}
            onChangeText={handleDetailsChange}
            multiline
            numberOfLines={4}
            style={styles.textInput}
          />

          {/* 수정하기 버튼 */}
          <View style={styles.bottomRow}>
            <Button
              mode="contained"
              onPress={handleSubmitEdit}
              style={styles.editButton}
              loading={loading}
              labelStyle={styles.buttonText}
            >
              수정하기
            </Button>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
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
    borderRadius: 12,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  closeButton: {
    padding: 2,
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
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  editButton: {
    backgroundColor: '#87CEEB',
    borderRadius: 8,
    elevation: 0,
    shadowOffset: { width: 0, height: 0 },
  },
  buttonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
