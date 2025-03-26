// pages/ProductDetail.js
import React, { useState, useEffect, useRef } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  Platform,
  StatusBar,
  ActivityIndicator,
  Image,
  FlatList,
  Dimensions,
  Animated,
  RefreshControl,
  Modal,
} from 'react-native'
import { useRoute, useNavigation } from '@react-navigation/native'
import axiosInstance from '../api/axios'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import ProductReportModal from '../components/ProductReportModal'
import { showToast } from '../state/toastUtil'
import { useSelector } from 'react-redux'
import config from '../api/config'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
// 날짜와 시간을 포맷팅하는 함수
const formatFullDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  let hours = date.getHours()
  const minutes = date.getMinutes()
  const ampm = hours >= 12 ? '오후' : '오전'
  hours = hours % 12
  if (hours === 0) hours = 12
  return `${year}. ${month}. ${day}. ${ampm} ${hours}시 ${minutes}분`
}
// 가격 포맷팅 함수
const formatPrice = (price) => {
  if (!price) return ''
  return parseInt(price, 10).toLocaleString() + '원'
}

export default function ProductDetail() {
  const route = useRoute() // 라우트 파라미터 접근
  const navigation = useNavigation() // 내비게이션 기능 사용
  const { postId } = route.params || {}
  
  const currentUserId = useSelector((state) => state.auth.user.id)
  const isLoggedIn = useSelector((state) => state.auth.isLoggedIn)
  
  const [postData, setPostData] = useState(null)
  const [alreadyWished, setAlreadyWished] = useState(false)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [reportModalVisible, setReportModalVisible] = useState(false)
  
  // 이미지 슬라이더 관련 상태
  const [activeIndex, setActiveIndex] = useState(0)
  const scrollX = useRef(new Animated.Value(0)).current
  
  // 전체 화면 이미지 모달 상태
  const [fullScreenVisible, setFullScreenVisible] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null)
  
  useEffect(() => {
    if (!postId) {
      Alert.alert('오류', '상품 정보가 없습니다.')
      return
    }
    fetchPostDetail()
  }, [postId])
  
  // 상품 상세 정보를 API로 불러오는 함수
  const fetchPostDetail = async () => {
    try {
      setLoading(true)
      const response = await axiosInstance.get(`/api/post/${postId}`)
      const post = response.data || {}
      setAlreadyWished(false)
      setPostData(post)
    } catch (error) {
      console.log('상품 상세 정보 불러오기 오류:', error)
      Alert.alert('오류', '상품 정보를 가져오지 못했습니다.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }
  
  // 새로고침 함수
  const onRefresh = () => {
    setRefreshing(true)
    fetchPostDetail()
    showToast('새로고침 완료!')
  }
  
  // 자신의 글인지 여부 판단
  const isMyPost = postData?.user?.id === currentUserId
  
  // 채팅하기 버튼 동작 함수
  const handleChat = async () => {
    if (!isLoggedIn) {
      showToast('로그인이 필요합니다.')
      return
    }
    if (isMyPost) {
      showToast('자신의 판매글에는 채팅을 할 수 없습니다.')
      return
    }
    try {
      const response = await axiosInstance.post(`/api/post/${postId}/chatroom`)
      const createdChatRoom = response.data
      navigation.navigate('Chat', {
        roomId: createdChatRoom.id,
        roomName: postData?.user?.nickname || '상대방',
      })
    } catch (error) {
      console.error(error)
      showToast('채팅방 생성 중 오류가 발생했습니다.')
    }
  }
  
  // 위시리스트 추가 버튼 동작 함수
  const handleWishlist = async () => {
    if (!isLoggedIn) {
      showToast('로그인이 필요합니다.')
      return
    }
    if (isMyPost) {
      showToast('자신의 판매글을 위시리스트에 추가할 수 없습니다.')
      return
    }
    if (alreadyWished) {
      showToast('이미 위시리스트에 추가된 상품입니다.')
      return
    }
    try {
      const response = await axiosInstance.post(`/api/wishlist/${postId}`)
      if (response.status === 200) {
        showToast('위시리스트에 추가되었습니다.')
        setPostData((prev) => ({
          ...prev,
          wishlistCount: (prev?.wishlistCount || 0) + 1,
        }))
        setAlreadyWished(true)
      } else {
        Alert.alert('위시리스트', '추가에 실패하였습니다.')
      }
    } catch (error) {
      console.error(error)
      Alert.alert('위시리스트', '추가 중 오류가 발생했습니다.')
    }
  }
  
  // 판매 상태에 따른 배지 스타일 반환 함수
  const getBadgeStyle = () => {
    if (!postData) return {}
    switch (postData.status) {
      case 0:
        return { backgroundColor: '#E9F9EE', textColor: '#4CAF50' }
      case 1:
        return { backgroundColor: '#D0E8FF', textColor: '#007bff' }
      case 2:
        return { backgroundColor: '#F0F0F0', textColor: 'black' }
      default:
        return { backgroundColor: '#E9F9EE', textColor: '#4CAF50' }
    }
  }
  
  // 별점 렌더링 함수
  const renderStars = (rating) => {
    const stars = []
    const fullStars = Math.floor(rating)
    const halfStar = rating - fullStars >= 0.5
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0)
  
    for (let i = 0; i < fullStars; i++) {
      stars.push(<MaterialCommunityIcons key={`full-${i}`} name="star" size={20} color="#FFD700" />)
    }
    if (halfStar) {
      stars.push(<MaterialCommunityIcons key="half" name="star-half-full" size={20} color="#FFD700" />)
    }
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<MaterialCommunityIcons key={`empty-${i}`} name="star-outline" size={20} color="#FFD700" />)
    }
    return <View style={styles.starsContainer}>{stars}</View>
  }
  
  // 사용자 프로필 이미지 URL 생성 함수
  const getUserProfileImageUrl = (profileImageUrl) => {
    if (!profileImageUrl) return null
    let filename = profileImageUrl
    if (filename.startsWith('/profile/')) {
      filename = filename.substring(9)
    }
    return `${config.BASE_URL}/images/profile/${filename}`
  }
  
  // 이미지 슬라이더 아이템 렌더링, 클릭 시 전체 화면 모달 오픈
  const renderImageItem = ({ item }) => {
    const imageUrl = item?.imageUrl
      ? `${config.BASE_URL}/images/${item.imageUrl}`
      : 'https://via.placeholder.com/500'
    return (
      <TouchableOpacity 
        style={{ width: SCREEN_WIDTH, justifyContent: 'center', alignItems: 'center' }}
        onPress={() => {
          setSelectedImage(imageUrl)
          setFullScreenVisible(true)
        }}
      >
        <Image source={{ uri: imageUrl }} style={{ width: '100%', height: 300, resizeMode: 'cover' }} />
      </TouchableOpacity>
    )
  }
  
  // 슬라이더 스크롤 이벤트 처리 함수
  const onScroll = (e) => {
    const contentOffsetX = e.nativeEvent.contentOffset.x
    const currentIndex = Math.round(contentOffsetX / SCREEN_WIDTH)
    setActiveIndex(currentIndex)
  }
  
  // 글 수정 버튼 동작 함수
  const handleEdit = () => {
    if (!postData) return
    navigation.navigate('Post', { editMode: true, existingPost: postData })
  }
  
  // 글 삭제 버튼 동작 함수
  const handleDelete = () => {
    Alert.alert('삭제 확인', '정말 이 글을 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            await axiosInstance.delete(`/api/post/${postId}`)
            showToast('글이 삭제되었습니다.')
            navigation.goBack()
          } catch (error) {
            console.error(error)
            showToast('삭제 중 오류가 발생했습니다.')
          }
        },
      },
    ])
  }
  
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#87CEEB" />
        </View>
      </SafeAreaView>
    )
  }
  
  if (!postData) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <Text>상품 정보를 찾을 수 없습니다.</Text>
        </View>
      </SafeAreaView>
    )
  }
  
  const user = postData.user || {}
  const userNickname = user.nickname || '알 수 없음'
  const userProfileUrl = getUserProfileImageUrl(user.profileImageUrl)
  const rating = user.rating || 0
  const imagesArr = postData.images || []
  const badgeStyle = getBadgeStyle()
  
  return (
    <SafeAreaView style={[styles.safeArea, Platform.OS === 'android' && { paddingTop: StatusBar.currentHeight }]}>
      {/* 전체 화면 이미지 모달 */}
      <Modal
        visible={fullScreenVisible}
        transparent={false}
        animationType="fade"
        onRequestClose={() => setFullScreenVisible(false)}
      >
        <SafeAreaView style={styles.fullScreenContainer}>
          <TouchableOpacity style={styles.closeButton} onPress={() => setFullScreenVisible(false)}>
            <MaterialCommunityIcons name="close" size={30} color="#fff" />
          </TouchableOpacity>
          {selectedImage && (
            <Image source={{ uri: selectedImage }} style={styles.fullScreenImage} resizeMode="contain" />
          )}
        </SafeAreaView>
      </Modal>
  
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>상품 상세</Text>
        {isMyPost ? (
          <View style={styles.iconRow}>
            <TouchableOpacity onPress={handleEdit} style={styles.iconButton}>
              <MaterialCommunityIcons name="pencil-outline" size={24} color="black" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDelete} style={styles.iconButton}>
              <MaterialCommunityIcons name="trash-can-outline" size={24} color="black" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity onPress={() => setReportModalVisible(true)} style={styles.reportButton}>
            <MaterialCommunityIcons name="alert-circle-outline" size={24} color="red" />
          </TouchableOpacity>
        )}
      </View>
  
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            progressViewOffset={-50}
            tintColor="#87CEEB"
          />
        }
      >
        {/* 이미지 슬라이더 */}
        <View style={{ width: SCREEN_WIDTH, height: 300 }}>
          <FlatList
            data={imagesArr}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            renderItem={renderImageItem}
            keyExtractor={(item, idx) => `img-${idx}`}
            onScroll={onScroll}
          />
          {imagesArr.length > 1 && (
            <View style={styles.paginationWrapper}>
              {imagesArr.map((_, i) => (
                <View key={i} style={[styles.dot, activeIndex === i ? styles.dotActive : styles.dotInactive]} />
              ))}
            </View>
          )}
        </View>
  
        {/* 작성자 정보 */}
        <View style={styles.userInfoContainer}>
          {userProfileUrl ? (
            <Image source={{ uri: userProfileUrl }} style={styles.userProfileImage} />
          ) : (
            <View style={styles.userProfilePlaceholder}>
              <MaterialCommunityIcons name="account-circle-outline" size={60} color="#ccc" />
            </View>
          )}
          <View style={styles.userInfo}>
            <Text style={styles.userNickname}>{userNickname}</Text>
            <View style={styles.ratingContainer}>
              {renderStars(rating)}
              <Text style={styles.ratingText}>별점: {rating}점 / 5점</Text>
            </View>
          </View>
        </View>
  
        {/* 상품 상세 정보 영역 */}
        <View style={styles.detailInfoContainer}>
          <View style={styles.titlePriceContainer}>
            <Text style={styles.detailTitle}>{postData.title}</Text>
            <Text style={styles.detailPrice}>{formatPrice(postData.price)}</Text>
          </View>
          <View style={styles.rowBetween}>
            <View>
              <Text style={styles.detailDate}>등록일: {formatFullDate(postData.createdAt)}</Text>
              {postData.updatedAt && postData.updatedAt !== postData.createdAt && (
                <Text style={styles.detailDate}>수정일: {formatFullDate(postData.updatedAt)}</Text>
              )}
            </View>
            <View style={[styles.statusBadge, { backgroundColor: badgeStyle.backgroundColor }]}>
              <Text style={[styles.statusBadgeText, { color: badgeStyle.textColor }]}>
                {postData.status === 0 ? '판매중' : postData.status === 1 ? '예약중' : '판매완료'}
              </Text>
            </View>
          </View>
          <View style={styles.separator} />
          <Text style={styles.detailDescription}>{postData.content || '상품에 대한 설명이 없습니다.'}</Text>
        </View>
  
        {/* 채팅 및 위시리스트 정보 */}
        <View style={styles.countSection}>
          <View style={styles.countItem}>
            <MaterialCommunityIcons name="message-outline" size={20} color="#666" />
            <Text style={styles.countText}>채팅 0</Text>
          </View>
          <View style={styles.countItem}>
            <MaterialCommunityIcons name="heart-outline" size={20} color="#666" />
            <Text style={styles.countText}>위시리스트 {postData.wishlistCount || 0}</Text>
          </View>
        </View>
      </ScrollView>
  
      {/* 하단 버튼 영역 */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.footerButton} onPress={handleChat}>
          <Text style={styles.footerButtonText}>채팅하기</Text>
        </TouchableOpacity>
        <View style={styles.divider} />
        <TouchableOpacity style={styles.footerButton} onPress={handleWishlist}>
          <Text style={styles.footerButtonText}>위시리스트 추가</Text>
        </TouchableOpacity>
      </View>
  
      {/* 신고 모달 컴포넌트 */}
      <ProductReportModal visible={reportModalVisible} onClose={() => setReportModalVisible(false)} />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f9f9f9' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#87CEEB',
    borderBottomWidth: 1,
    borderColor: '#eee',
    elevation: 2,
  },
  backButton: { padding: 5 },
  iconRow: { flexDirection: 'row', alignItems: 'center' },
  iconButton: { padding: 5, marginLeft: 5 },
  reportButton: { padding: 5 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#000' },
  scrollContainer: { paddingBottom: 100 },
  paginationWrapper: {
    position: 'absolute',
    bottom: 10,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  dot: { width: 8, height: 8, borderRadius: 4, marginHorizontal: 4 },
  dotActive: { backgroundColor: '#87CEEB' },
  dotInactive: { backgroundColor: '#ccc' },
  userInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginTop: 10,
    marginHorizontal: 15,
    padding: 15,
    borderRadius: 10,
    elevation: 1,
  },
  userProfileImage: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#eee' },
  userProfilePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfo: { marginLeft: 15, flex: 1 },
  userNickname: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 6 },
  ratingContainer: { flexDirection: 'row', alignItems: 'center' },
  starsContainer: { flexDirection: 'row', marginRight: 8 },
  ratingText: { fontSize: 14, color: '#666' },
  detailInfoContainer: {
    backgroundColor: '#fff',
    marginTop: 10,
    marginHorizontal: 15,
    padding: 15,
    borderRadius: 10,
    elevation: 1,
  },
  titlePriceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailTitle: { fontSize: 20, fontWeight: '700', color: '#333', flex: 1, marginRight: 10 },
  detailPrice: { fontSize: 20, fontWeight: '700', color: '#FF3B30' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  detailDate: { fontSize: 14, color: '#999' },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 },
  statusBadgeText: { fontSize: 12, fontWeight: '600' },
  separator: { height: 1, backgroundColor: '#eee', marginVertical: 15 },
  detailDescription: { fontSize: 16, color: '#444', lineHeight: 22 },
  countSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    margin: 15,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderRadius: 10,
    elevation: 1,
  },
  countItem: { flexDirection: 'row', alignItems: 'center' },
  countText: { fontSize: 14, color: '#666', marginLeft: 5 },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    borderTopWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
  },
  footerButton: { flex: 1, paddingVertical: 15, alignItems: 'center' },
  footerButtonText: { fontSize: 16, color: '#87CEEB', fontWeight: '600' },
  divider: { width: 1, backgroundColor: '#ddd', marginVertical: 10 },
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImage: {
    width: SCREEN_WIDTH,
    height: '80%',
  },
  closeButton: {
    position: 'absolute',
    top: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 10,
    left: 10,
    zIndex: 10,
  },
  menuContainer: {
    position: 'absolute',
    top: 60 + (Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0),
    right: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    zIndex: 1100,
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 15, borderBottomWidth: 1, borderColor: '#eee' },
  menuIcon: { marginRight: 10 },
  menuText: { fontSize: 16, color: '#333' },
})
