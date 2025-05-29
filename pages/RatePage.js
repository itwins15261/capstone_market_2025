// pages/RatePage.js (예시 구상도, 미사용)
import React, { useState } from 'react'
import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  Image,
  Platform,
  StatusBar,
  StyleSheet,
  FlatList,
} from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import RateModal from '../components/RateModal'

// 예시 데이터로 구매한 상품 목록 제공
const purchasedItems = [
  {
    id: '1',
    title: '구매 상품1',
    price: 10000,
    imageUrl: 'https://via.placeholder.com/150',
  },
  {
    id: '2',
    title: '구매 상품2',
    price: 20000,
    imageUrl: 'https://via.placeholder.com/150/87CEEB/000000?text=Purchased2',
  },
]

export default function RatePage() {
  const navigation = useNavigation()
  const [rateModalVisible, setRateModalVisible] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  
  // 평가 모달 열기
  const handleOpenRateModal = (item) => {
    setSelectedItem(item)
    setRateModalVisible(true)
  }
  
  // 평가 모달 닫기
  const handleCloseRateModal = () => {
    setRateModalVisible(false)
    setSelectedItem(null)
  }
  
  // 각 상품 항목 렌더링
  const renderItem = ({ item }) => (
    <View style={styles.itemContainer}>
      <Image source={{ uri: item.imageUrl }} style={styles.itemImage} />
      <View style={styles.infoContainer}>
        <Text style={styles.itemTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.itemPrice}>{item.price.toLocaleString()}원</Text>
        <TouchableOpacity
          style={styles.rateButton}
          onPress={() => handleOpenRateModal(item)}
        >
          <Text style={styles.rateButtonText}>거래 만족도 평가</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
  
  return (
    <SafeAreaView style={[styles.safeArea, Platform.OS === 'android' && { paddingTop: StatusBar.currentHeight }]}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="black" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>거래 만족도 평가</Text>
        </View>
      </View>
  
      <FlatList
        data={purchasedItems}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
      />
  
      <RateModal
        visible={rateModalVisible}
        onClose={handleCloseRateModal}
        item={selectedItem}
      />
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
    height: 60,
  },
  headerContent: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', marginLeft: 10, color: 'black' },
  listContent: { padding: 15 },
  itemContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  itemImage: { width: 90, height: 90, borderRadius: 8, backgroundColor: '#eee', marginRight: 12 },
  infoContainer: { flex: 1, justifyContent: 'center' },
  itemTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 2 },
  itemPrice: { fontSize: 15, color: '#333', fontWeight: '600', marginBottom: 6 },
  rateButton: {
    backgroundColor: '#87CEEB',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
    marginTop: 5,
  },
  rateButtonText: { fontSize: 14, color: '#000' },
})