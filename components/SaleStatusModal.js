// SaleStatusModal.js
// 채팅방(Chat.js)에서 판매 상태 변경 모달 컴포넌트 (판매중, 예약중, 판매완료)

import React from 'react'
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native'

export default function SaleStatusModal({
  visible,
  onClose,
  saleStatus,
  setSaleStatus,
  onChangeStatus,
  price,
}) {
  // 판매 상태에 따른 색상 정보 반환 (가독성 향상을 위함)
  const getStatusColors = (value) => {
    switch (value) {
      case 0:
        return {
          selected: '#E9F9EE',
          unselected: '#E9F9EE',
          textSelected: '#4CAF50',
          textUnselected: 'black',
        }
      case 1:
        return {
          selected: '#D0E8FF',
          unselected: '#D0E8FF',
          textSelected: '#007bff',
          textUnselected: 'black',
        }
      case 2:
        return {
          selected: '#F0F0F0',
          unselected: '#F0F0F0',
          textSelected: 'black',
          textUnselected: 'black',
        }
      default:
        return {
          selected: '#E9F9EE',
          unselected: '#E9F9EE',
          textSelected: '#4CAF50',
          textUnselected: 'black',
        }
    }
  }

  // 선택한 상태 값을 상위 컴포넌트로 전달
  const handlePressStatus = (value) => {
    onChangeStatus(value)
  }

  // 가격이 0원일 때는 나눔, 아니라면 판매로 옵션 구성
  const statusOptions = price === 0
    ? [
        { label: '나눔중', value: 0 },
        { label: '예약중', value: 1 },
        { label: '나눔완료', value: 2 },
      ]
    : [
        { label: '판매중', value: 0 },
        { label: '예약중', value: 1 },
        { label: '판매완료', value: 2 },
      ]

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>판매 상태 변경</Text>
          <View style={styles.statusContainer}>
            {statusOptions.map((item) => {
              const colors = getStatusColors(item.value)
              const isSelected = saleStatus === item.value
              return (
                <TouchableOpacity
                  key={item.value}
                  style={[
                    styles.statusButton,
                    {
                      backgroundColor: isSelected ? colors.selected : '#fff',
                      borderColor: colors.unselected,
                    },
                  ]}
                  onPress={() => handlePressStatus(item.value)}
                >
                  <Text
                    style={{
                      color: isSelected
                        ? colors.textSelected
                        : colors.textUnselected,
                      fontSize: 14,
                    }}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={[styles.closeButton, styles.closeBtnCustom]}>
            <Text style={styles.closeBtnText}>닫기</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 20,
  },
  statusButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 6,
    marginHorizontal: 5,
  },
  closeButton: {
    marginTop: 10,
    alignSelf: 'flex-end',
  },
  closeBtnCustom: {
    backgroundColor: '#87CEEB',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  closeBtnText: {
    color: '#000',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
})
