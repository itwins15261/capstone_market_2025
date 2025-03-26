// pages/Home.js
import React, { useState, useRef, useEffect } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
  Animated,
  Platform,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
  TouchableWithoutFeedback,
} from 'react-native'
import DropDownPicker from 'react-native-dropdown-picker'
import { useNavigation } from '@react-navigation/native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { FAB, IconButton } from 'react-native-paper'
import { useSelector, useDispatch } from 'react-redux'
import { logout } from '../state/authSlice'
import { showToast } from '../state/toastUtil'
import axiosInstance from '../api/axios'
import config from '../api/config'

const formatPrice = (price) => {
  if (!price) return ''
  return parseInt(price, 10).toLocaleString() + '원'
}

const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleDateString()
}

export default function Home() {
  const navigation = useNavigation() // 내비게이션 사용
  const dispatch = useDispatch()
  const isLoggedIn = useSelector((state) => state.auth.isLoggedIn)

  // 정렬 관련 드롭다운 상태
  const [sortOpen, setSortOpen] = useState(false)
  const [sortValue, setSortValue] = useState('latest')
  const [sortItems, setSortItems] = useState([
    { label: '최신순', value: 'latest' },
    { label: '조회순', value: 'viewCount' },
  ])

  const [refreshing, setRefreshing] = useState(false)
  const [posts, setPosts] = useState([])
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  
  // 앱바 메뉴 표시 상태
  const [showMenu, setShowMenu] = useState(false)
  
  const scrollY = useRef(new Animated.Value(0)).current
  const clampedScroll = useRef(
    Animated.diffClamp(
      scrollY, 
      0, 
      120 + (Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0)
    )
  ).current

  const headerTranslateY = clampedScroll.interpolate({
    inputRange: [0, 120 + (Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0)],
    outputRange: [0, -(60 + (Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0))],
    extrapolate: 'clamp',
  })

  const flatListRef = useRef(null)

  // 페이지 초기 로딩 시 게시글 불러오기
  useEffect(() => {
    fetchPosts(0)
  }, [])

  // 게시글 불러오기 API 호출 함수
  const fetchPosts = async (pageToFetch) => {
    try {
      if (pageToFetch === 0) setLoading(true)
      const response = await axiosInstance.get('/api/posts', {
        params: { page: pageToFetch, size: 10 },
      })
      const data = response.data || {}
      const content = Array.isArray(data.content) ? data.content.filter((item) => item) : []
      if (pageToFetch === 0) {
        setPosts(content)
      } else {
        setPosts((prev) => [...prev, ...content])
      }
      setTotalPages(data.totalPages || 1)
      setPage(pageToFetch)
    } catch (error) {
      console.error('Error fetching posts:', error)
      showToast('게시글을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
      setRefreshing(false)
      setLoadingMore(false)
    }
  }

  // 새로고침 함수
  const onRefresh = () => {
    setRefreshing(true)
    fetchPosts(0)
    showToast('새로고침 완료!')
  }

  // 추가 데이터 로드 함수
  const loadMoreData = () => {
    if (page + 1 < totalPages && !loadingMore) {
      setLoadingMore(true)
      fetchPosts(page + 1)
    }
  }

  const validPosts = posts.filter((item) => item !== undefined && item !== null)
  const sortedData = [...validPosts].sort((a, b) => {
    if (sortValue === 'latest') {
      return new Date(b.createdAt) - new Date(a.createdAt)
    } else {
      return b.viewCount - a.viewCount
    }
  })

  // 스크롤 이벤트 핸들러, 드롭다운 닫기 처리 포함
  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    {
      listener: () => {
        if (sortOpen) setSortOpen(false)
      },
      useNativeDriver: false,
    }
  )

  // 게시글 항목 렌더링 함수
  const renderItem = ({ item }) => {
    if (!item) return null
    const firstImageUrl =
      item.images && item.images.length > 0
        ? `${config.BASE_URL}/images/${item.images[0].imageUrl}`
        : 'https://via.placeholder.com/150'

    return (
      <TouchableOpacity
        style={styles.itemContainer}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('ProductDetail', { postId: item.id })}
      >
        <Image source={{ uri: firstImageUrl }} style={styles.itemImage} />
        <View style={styles.infoContainer}>
          <Text style={styles.itemTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.itemPrice}>{formatPrice(item.price)}</Text>
          <View style={styles.rowBetween}>
            <View style={styles.dateContainer}>
              <Text style={styles.itemDate}>{formatDate(item.createdAt)}</Text>
              <Text style={styles.itemDate}>{`조회수: ${item.viewCount || 0}`}</Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                item.status === 0
                  ? { backgroundColor: '#E9F9EE' }
                  : item.status === 1
                  ? { backgroundColor: '#D0E8FF' }
                  : { backgroundColor: '#F0F0F0' },
              ]}
            >
              <Text
                style={[
                  styles.statusBadgeText,
                  item.status === 0
                    ? { color: '#4CAF50' }
                    : item.status === 1
                    ? { color: '#007bff' }
                    : { color: 'black' },
                ]}
              >
                {item.status === 0 ? '판매중' : item.status === 1 ? '예약중' : '판매완료'}
              </Text>
            </View>
          </View>
          <View style={styles.countContainer}>
            <View style={styles.countItem}>
              <MaterialCommunityIcons name="message-outline" size={16} color="#666" />
              <Text style={styles.countText}>0</Text>
            </View>
            <View style={styles.countItem}>
              <MaterialCommunityIcons name="heart-outline" size={16} color="#666" />
              <Text style={styles.countText}>{item.wishlistCount}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    )
  }

  // 글쓰기 화면으로 이동하는 함수
  const handleWritePress = () => {
    if (!isLoggedIn) {
      showToast('로그인 후 이용 가능합니다.')
      return
    }
    navigation.navigate('Post')
  }

  // 스크롤 탑 이동 함수
  const scrollToTop = () => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true })
  }

  // 스크롤 값에 따라 맨위로 버튼 표시 상태 관리
  useEffect(() => {
    const listener = scrollY.addListener(({ value }) => {
      if (value > 500 && !showScrollTop) {
        setShowScrollTop(true)
      } else if (value <= 500 && showScrollTop) {
        setShowScrollTop(false)
      }
    })
    return () => scrollY.removeListener(listener)
  }, [scrollY, showScrollTop])

  const [showScrollTop, setShowScrollTop] = useState(false)

  // 로그인 상태에 따라 인증, 공지, 테마 관련 메뉴 핸들러
  const handleAuthPress = () => {
    if (isLoggedIn) {
      dispatch(logout())
      showToast('로그아웃되었습니다.')
    } else {
      navigation.navigate('Login')
    }
    setShowMenu(false)
  }

  const handleNoticePress = () => {
    if (isLoggedIn) {
      navigation.navigate('Notice')
    } else {
      showToast('로그인 이후 이용 가능합니다.')
    }
    setShowMenu(false)
  }

  const handleThemePress = () => {
    showToast('아직 미구현입니다.')
    setShowMenu(false)
  }

  return (
    <TouchableWithoutFeedback onPress={() => { 
      if (sortOpen) setSortOpen(false) 
      if(showMenu) setShowMenu(false)
    }}>
      <SafeAreaView style={styles.safeArea}>
        {/* 앱바 영역 */}
        <Animated.View
          style={[
            styles.header,
            {
              height: 60 + (Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0),
              transform: [{ translateY: headerTranslateY }],
            },
          ]}
        >
          <View style={[styles.headerContent, { marginTop: Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0 }]}>
            <Text style={styles.headerTitle}>한성당근</Text>
            <View style={styles.headerRight}>
              <DropDownPicker
                open={sortOpen}
                value={sortValue}
                items={sortItems}
                setOpen={setSortOpen}
                setValue={setSortValue}
                setItems={setSortItems}
                style={styles.dropdown}
                containerStyle={{ width: 120, marginRight: 10 }}
                dropDownContainerStyle={styles.dropdownContainer}
                labelStyle={styles.dropdownLabel}
                arrowIconStyle={styles.dropdownArrow}
                tickIconStyle={styles.dropdownTick}
                itemSeparator={true}
                itemSeparatorStyle={styles.dropdownSeparator}
                placeholder="정렬"
                zIndex={3000}
                zIndexInverse={2000}
                onClose={() => setSortOpen(false)}
              />
              <IconButton
                icon="magnify"
                size={24}
                onPress={() => navigation.navigate('Search')}
                style={styles.iconButton}
                color="black"
              />
              <IconButton
                icon="dots-vertical"
                size={24}
                onPress={() => setShowMenu(!showMenu)}
                style={styles.iconButton}
                color="black"
              />
            </View>
          </View>
          {/* 메뉴 영역 */}
          {showMenu && (
            <View style={styles.menuContainer}>
              <TouchableOpacity style={styles.menuItem} onPress={handleAuthPress}>
                <MaterialCommunityIcons 
                  name={isLoggedIn ? "logout" : "login"} 
                  size={20} 
                  color="#333" 
                  style={styles.menuIcon} 
                />
                <Text style={styles.menuText}>{isLoggedIn ? '로그아웃' : '로그인'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuItem} onPress={handleNoticePress}>
                <MaterialCommunityIcons 
                  name="bell-outline" 
                  size={20} 
                  color="#333" 
                  style={styles.menuIcon} 
                />
                <Text style={styles.menuText}>키워드 알림</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuItem} onPress={handleThemePress}>
                <MaterialCommunityIcons 
                  name="theme-light-dark" 
                  size={20} 
                  color="#333" 
                  style={styles.menuIcon} 
                />
                <Text style={styles.menuText}>테마 변경</Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>

        {/* 게시글 목록 영역 */}
        {loading && page === 0 ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#87CEEB" />
          </View>
        ) : !isLoggedIn ? (
          <View style={styles.center}>
            <Text>로그인 해야 목록을 볼 수 있습니다.</Text>
          </View>
        ) : sortedData.length === 0 ? (
          <View style={styles.center}>
            <Text>작성된 판매글이 없습니다.</Text>
          </View>
        ) : (
          <Animated.FlatList
            ref={flatListRef}
            data={sortedData}
            keyExtractor={(item, index) =>
              item && item.id ? item.id.toString() : index.toString()
            }
            renderItem={renderItem}
            contentContainerStyle={[
              styles.listContainer,
              {
                marginTop:
                  60 +
                  (Platform.OS === 'android'
                    ? StatusBar.currentHeight || 0
                    : 0) +
                  10,
                paddingBottom: 120,
              },
            ]}
            scrollEventThrottle={16}
            onScroll={handleScroll}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                progressViewOffset={70}
                tintColor="#87CEEB"
              />
            }
            onEndReached={loadMoreData}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              loadingMore ? (
                <ActivityIndicator size="large" color="#87CEEB" style={{ marginVertical: 20 }} />
              ) : page + 1 >= totalPages ? (
                <View style={{ alignItems: 'center', marginVertical: 5 }}>
                  <Text style={styles.dotText}>.</Text>
                  <Text style={styles.dotText}>.</Text>
                  <Text style={styles.dotText}>.</Text>
                  <Text style={styles.footerText}>더 이상 판매글이 없습니다.</Text>
                </View>
              ) : null
            }
          />
        )}

        {/* 글쓰기 버튼 */}
        <FAB style={[styles.fab, { opacity: 0.6 }]} icon="plus" color="#000" onPress={handleWritePress} />

        {/* 스크롤 탑 버튼 */}
        {showScrollTop && (
          <FAB
            style={styles.scrollTopFab}
            icon="arrow-up"
            small
            onPress={scrollToTop}
            color="#000"
          />
        )}
      </SafeAreaView>
    </TouchableWithoutFeedback>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: '#87CEEB',
    borderBottomWidth: 1,
    borderColor: '#ddd',
    paddingHorizontal: 15,
    justifyContent: 'center',
  },
  headerContent: { flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'space-between' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#000' },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  dropdown: { backgroundColor: '#fff', borderColor: '#ccc', borderWidth: 1 },
  dropdownContainer: { borderColor: '#ccc' },
  dropdownLabel: { color: '#333', fontSize: 16 },
  dropdownArrow: { tintColor: 'black' },
  dropdownTick: { tintColor: 'black' },
  dropdownSeparator: { backgroundColor: '#ccc', height: 1 },
  iconButton: { marginLeft: 5 },
  listContainer: { paddingHorizontal: 15, paddingBottom: 120 },
  itemContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    alignItems: 'center',
  },
  itemImage: { width: 90, height: 90, borderRadius: 8, backgroundColor: '#eee', marginRight: 12 },
  infoContainer: { flex: 1, justifyContent: 'center' },
  itemTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 2 },
  itemPrice: { fontSize: 15, color: '#333', fontWeight: '600', marginBottom: 6 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  dateContainer: { flexDirection: 'column', justifyContent: 'center' },
  itemDate: { fontSize: 13, color: '#999', lineHeight: 15 },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 },
  statusBadgeText: { fontSize: 12, fontWeight: '600' },
  countContainer: { flexDirection: 'row', marginTop: 8, justifyContent: 'flex-end' },
  countItem: { flexDirection: 'row', alignItems: 'center', marginLeft: 15 },
  countText: { fontSize: 14, color: '#666', marginLeft: 3 },
  fab: { position: 'absolute', right: 20, bottom: 30, backgroundColor: '#87CEEB', elevation: 5 },
  scrollTopFab: {
    position: 'absolute',
    left: 20,
    bottom: 30,
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#87CEEB',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  footerText: { textAlign: 'center', paddingVertical: 10, marginTop: 10, color: '#999', fontSize: 14 },
})
