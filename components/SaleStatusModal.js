// SaleStatusModal.js
import React from 'react'
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native'
import { Button } from 'react-native-paper'

export default function SaleStatusModal({
  visible,
  onClose,
  saleStatus,
  setSaleStatus,
  onChangeStatus,
}) {
  // 판매 상태에 따른 색상 정보를 반환하는 함수
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
            {[
              { label: '판매중', value: 0 },
              { label: '예약중', value: 1 },
              { label: '판매완료', value: 2 },
            ].map((item) => {
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
                      color: isSelected ? colors.textSelected : 'black',
                      fontSize: 14,
                    }}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
          <Button mode="contained" onPress={onClose} style={styles.closeButton}>
            닫기
          </Button>
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
})
