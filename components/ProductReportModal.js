// components/ProductReportModal.js
// 상품 신고 모달 컴포넌트 (미사용)
import React, { useState, useCallback } from 'react'
import { View, Text, StyleSheet, Modal } from 'react-native'
import { Button, TextInput } from 'react-native-paper'
import DropDownPicker from 'react-native-dropdown-picker'
import { showToast } from '../state/toastUtil'

export default function ProductReportModal({ visible, onClose }) {
  // 신고 사유 선택 드롭다운 관련 상태 관리
  const [reasonOpen, setReasonOpen] = useState(false)
  const [reasonValue, setReasonValue] = useState(null)
  const [reasonItems, setReasonItems] = useState([
    { label: '허위 매물', value: 'false_listing' },
    { label: '사기 의심', value: 'fraud' },
    { label: '부적절한 내용', value: 'inappropriate_content' },
    { label: '비매너 사용자', value: 'rude_user' },
    { label: '기타', value: 'other' },
  ])

  // 신고 상세 내용과 로딩 상태 관리
  const [details, setDetails] = useState('')
  const [loading, setLoading] = useState(false)

  // 상세 내용 입력 시 100자 제한 처리
  const handleDetailsChange = (text) => {
    if (text.length > 100) {
      showToast('최대 100자까지 입력 가능합니다.')
      setDetails(text.slice(0, 100))
    } else {
      setDetails(text)
    }
  }

  // 신고 제출 함수, API 연동 시 구현 예정이었으나 구현 X
  const handleSubmitReport = useCallback(async () => {
    if (!reasonValue) {
      showToast('신고 사유를 선택해주세요.')
      return
    }
    setLoading(true)
    try {
      // 임시로 지정한 2초 딜레이
      await new Promise((resolve) => setTimeout(resolve, 2000))
      setLoading(false)
      showToast('신고가 접수되었습니다.')
      setReasonValue(null)
      setDetails('')
      onClose()
    } catch (error) {
      setLoading(false)
      showToast('신고 실패: ' + (error.message || ''))
    }
  }, [reasonValue, details, onClose])

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>상품 신고하기</Text>
          <DropDownPicker
            open={reasonOpen}
            value={reasonValue}
            items={reasonItems}
            setOpen={setReasonOpen}
            setValue={setReasonValue}
            setItems={setReasonItems}
            placeholder="신고 사유 선택"
            containerStyle={{ marginBottom: 10 }}
            zIndex={1000}
            zIndexInverse={3000}
            style={styles.dropdown}
            dropDownContainerStyle={styles.dropdownContainer}
            itemSeparator={true}
            itemSeparatorStyle={styles.dropdownSeparator}
          />
          <TextInput
            label="상세 내용 (최대 100자)"
            mode="flat"
            value={details}
            onChangeText={handleDetailsChange}
            multiline
            numberOfLines={6}           
            style={[styles.input, styles.modernMultiline, { backgroundColor: '#fff' }]}
          />

          <View style={styles.buttonContainer}>
            <Button
              mode="contained"
              onPress={onClose}
              style={[
                styles.cancelButton,
                { shadowColor: 'transparent', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0, shadowRadius: 0 },
              ]}
              contentStyle={styles.buttonContent}
              labelStyle={styles.buttonLabel}
            >
              취소
            </Button>
            <Button
              mode="contained"
              onPress={handleSubmitReport}
              style={[
                styles.submitButton,
                { shadowColor: 'transparent', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0, shadowRadius: 0 },
              ]}
              contentStyle={styles.buttonContent}
              labelStyle={styles.buttonLabel}
              loading={loading}
            >
              신고하기
            </Button>
          </View>
        </View>
      </View>
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
  },
  dropdown: {
    backgroundColor: '#fff',
    borderColor: '#ccc',
    borderWidth: 1,
  },
  dropdownContainer: {
    borderColor: '#ccc',
    maxHeight: 250,
  },
  dropdownSeparator: {
    backgroundColor: '#ccc',
    height: 1,
  },
  textInput: {
    marginVertical: 10,
    height: 180,
    textAlignVertical: 'top',
  },
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
  cancelButton: {
    marginLeft: 10,
    backgroundColor: '#FF6B6B',
    borderRadius: 8,
  },
  submitButton: {
    marginLeft: 10,
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
