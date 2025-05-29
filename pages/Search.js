// pages/Search.js, 미사용
import React, { useState } from 'react'
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Alert,
  FlatList,
  Image,
  SafeAreaView,
  Platform,
  StatusBar,
} from 'react-native'
import { TextInput, Card, IconButton } from 'react-native-paper'
import { useNavigation } from '@react-navigation/native'
import { MaterialCommunityIcons } from '@expo/vector-icons'

// 샘플 상품 데이터 생성
const sampleProducts = Array.from({ length: 20 }, (_, i) => ({
  id: String(i + 1),
  title: `테스트${i + 1}`,
  price: `${(i + 1) * 1000}원`,
  image: 'https://via.placeholder.com/150',
}))

export default function Search() {
  const navigation = useNavigation()
  const [searchText, setSearchText] = useState('')
  const [recentSearches, setRecentSearches] = useState([
    { id: '1', term: 'React Native', date: new Date() },
    { id: '2', term: 'Expo', date: new Date() },
    { id: '3', term: 'JavaScript', date: new Date() },
  ])
  const [searchResults, setSearchResults] = useState([])
  
  // 검색 실행 함수, 입력된 검색어로 필터링
  const handleSearch = () => {
    if (searchText.trim() === '') return
    const newSearch = { id: Date.now().toString(), term: searchText, date: new Date() }
    setRecentSearches([newSearch, ...recentSearches])
    const results = sampleProducts.filter((product) =>
      product.title.toLowerCase().includes(searchText.toLowerCase())
    )
    setSearchResults(results)
  }
  
  // 개별 검색어 삭제
  const removeSearch = (id) => {
    setRecentSearches(recentSearches.filter((item) => item.id !== id))
  }
  
  // 전체 검색어 삭제
  const removeAllSearches = () => {
    Alert.alert('전체 삭제', '전체 검색어를 삭제하시겠습니까?', [
      { text: '취소' },
      { text: '예', onPress: () => setRecentSearches([]) },
    ])
  }
  
  // 날짜 포맷
  const formatDate = (date) => {
    const options = { month: 'numeric', day: 'numeric' }
    return date.toLocaleDateString('ko-KR', options)
  }
  
  // 최근 검색어 항목
  const renderRecentItem = ({ item }) => (
    <Card mode="outlined" style={styles.searchCard}>
      <Card.Title
        title={item.term}
        left={() => (
          <TouchableOpacity onLongPress={() => Alert.alert('검색 날짜', formatDate(item.date))}>
            <MaterialCommunityIcons name="clock-outline" size={20} color="black" style={{ marginRight: 5 }} />
          </TouchableOpacity>
        )}
        right={() => <IconButton icon="close" size={20} onPress={() => removeSearch(item.id)} />}
      />
    </Card>
  )
  
  // 검색 결과 항목 렌더링
  const renderResultItem = ({ item }) => (
    <TouchableOpacity style={styles.resultItem} onPress={() => navigation.navigate('ProductDetail', { item })}>
      <Image source={{ uri: item.image }} style={styles.resultImage} />
      <View style={styles.resultTextContainer}>
        <Text style={styles.resultTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.resultPrice}>{item.price}</Text>
      </View>
    </TouchableOpacity>
  )
  
  return (
    <SafeAreaView style={[styles.safeArea, Platform.OS === 'android' && { paddingTop: StatusBar.currentHeight }]}>
      <View style={[styles.header, { height: 60 }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="black" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>검색</Text>
        </View>
      </View>
      <View style={styles.container}>
        <TextInput
          placeholder="검색어 입력"
          value={searchText}
          onChangeText={setSearchText}
          mode="outlined"
          right={<TextInput.Icon name="magnify" onPress={handleSearch} color="black" />}
          style={styles.searchInput}
        />
        {searchResults.length > 0 ? (
          <FlatList data={searchResults} keyExtractor={(item) => item.id} renderItem={renderResultItem} style={styles.searchList} />
        ) : (
          <>
            <View style={styles.headerRow}>
              <Text style={styles.headerText}>최근 검색어</Text>
              <TouchableOpacity onPress={removeAllSearches}>
                <Text style={styles.clearText}>전체 삭제</Text>
              </TouchableOpacity>
            </View>
            <FlatList data={recentSearches} keyExtractor={(item) => item.id} renderItem={renderRecentItem} style={styles.searchList} />
          </>
        )}
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  header: { backgroundColor: '#87CEEB', borderBottomWidth: 1, borderColor: '#ddd', paddingHorizontal: 15, justifyContent: 'center' },
  headerContent: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', marginLeft: 10, color: 'black' },
  container: { flex: 1, padding: 15, backgroundColor: '#fff' },
  searchInput: { marginBottom: 15 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  headerText: { fontSize: 18, fontWeight: 'bold' },
  clearText: { color: 'red', fontSize: 16 },
  searchCard: { marginBottom: 10 },
  searchList: { flex: 1 },
  resultItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderColor: '#eee' },
  resultImage: { width: 60, height: 60, borderRadius: 8, marginRight: 10 },
  resultTextContainer: { flex: 1 },
  resultTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  resultPrice: { fontSize: 14, color: '#666', marginTop: 4 },
})
