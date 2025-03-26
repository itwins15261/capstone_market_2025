// pages/Chat.js
import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  StatusBar,
  ActivityIndicator,
  TouchableWithoutFeedback,
} from 'react-native'
import { IconButton } from 'react-native-paper'
import { useRoute, useNavigation } from '@react-navigation/native'
import * as ImagePicker from 'expo-image-picker'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import UserReportModal from '../components/UserReportModal'
import SaleStatusModal from '../components/SaleStatusModal'
import RateModal from '../components/RateModal'
import axiosInstance from '../api/axios'
import { useSelector } from 'react-redux'
import { showToast } from '../state/toastUtil'
import config from '../api/config'

// 판매 상태 값을 텍스트로 변환하는 함수
function saleStatusText(value) {
  switch (value) {
    case 0: return '판매중'
    case 1: return '예약중'
    case 2: return '판매완료'
    default: return '알 수 없음'
  }
}

// 이미지 URL이 이미지 파일인지 검사하는 함수
const isImageUrl = (url) => {
  return /\.(jpeg|jpg|gif|png|bmp)$/i.test(url)
}

export default function Chat() {
  const route = useRoute() // 현재 route 정보를 가져옴
  const navigation = useNavigation() // navigation 객체 사용

  // route 파라미터로 전달된 값들을 구조분해 할당
  const {
    roomId,
    roomName,
    productTitle,
    productPrice,
    productImage,
    postId,
    sellerId,
    buyerId, // 구매자 ID 추가
  } = route.params || {}

  const token = useSelector((state) => state.auth.token) // auth 토큰 가져옴
  const currentUserId = useSelector((state) => state.auth.user.id) // 현재 사용자 ID
  const isLoggedIn = useSelector((state) => state.auth.isLoggedIn) // 로그인 상태

  // 상품 정보 및 채팅 메시지 상태 관리
  const [productInfo, setProductInfo] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(false)

  // 모달 및 메뉴 상태 관리
  const [reportModalVisible, setReportModalVisible] = useState(false)
  const [chatMenuVisible, setChatMenuVisible] = useState(false)
  const [isProductInfoExpanded, setProductInfoExpanded] = useState(false)
  const [rateModalVisible, setRateModalVisible] = useState(false) // 리뷰 모달 상태

  // 리뷰 대상 정보 상태
  const [rateItem, setRateItem] = useState(null)

  // 판매 상태 모달 및 판매 상태 값 관리
  const [saleStatusModalVisible, setSaleStatusModalVisible] = useState(false)
  const [saleStatus, setSaleStatus] = useState(0)

  // WebSocket 연결을 위한 ref
  const wsRef = useRef(null)

  // 상품 정보 로딩 (postId가 있을 때)
  useEffect(() => {
    if (postId) {
      axiosInstance.get(`/api/post/${postId}`)
        .then(res => {
          setProductInfo(res.data)
          setSaleStatus(res.data?.status || 0)
        })
        .catch(err => {
          console.error(err)
          showToast('상품 정보를 불러오지 못했습니다.')
        })
    }
  }, [postId])

  // 채팅 내역 및 WebSocket 연결 설정
  useEffect(() => {
    if (!roomId || !isLoggedIn) return
    fetchRecentMessages()
    connectWebSocket()
    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [roomId, isLoggedIn])

  // 최근 채팅 메시지 로딩 함수
  const fetchRecentMessages = async () => {
    setLoading(true)
    try {
      const res = await axiosInstance.get(`/api/chatroom/${roomId}/recent?size=20`)
      const reversed = (res.data || []).reverse()
      setMessages(reversed)
    } catch (e) {
      console.error(e)
      showToast('채팅 내역을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // WebSocket 연결 함수
  const connectWebSocket = () => {
    try {
      const wsUrl = `${config.WS_URL}/ws/chat/${roomId}`
      const ws = new WebSocket(wsUrl, [], {
        headers: { Authorization: `Bearer ${token}` },
      })
      wsRef.current = ws

      ws.onopen = () => console.log('WebSocket connected')
      ws.onclose = () => console.log('WebSocket closed')
      ws.onerror = err => console.log('WebSocket error:', err)
      ws.onmessage = evt => {
        let data
        try {
          data = JSON.parse(evt.data)
        } catch (e) {
          data = { content: evt.data }
        }
        setMessages(prev => [...prev, data])
      }
    } catch (err) {
      console.error(err)
    }
  }

  // 일반 텍스트 메시지 전송 함수
  const handleSend = () => {
    if (!newMessage.trim() || !wsRef.current) return
    wsRef.current.send(newMessage.trim())
    setNewMessage('')
  }

  // 이미지 전송 함수 (갤러리에서 선택)
  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      alert('갤러리 접근 권한이 필요합니다.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 1 })
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const uri = result.assets[0].uri
      wsRef.current.send(uri)
    }
  }

  // 판매 상태 모달 열기 함수
  const handlePressSaleStatus = () => {
    setChatMenuVisible(false)
    setSaleStatusModalVisible(true)
  }

  // 판매 상태 변경 (DB 업데이트) 함수
  const handleChangeSaleStatus = async (value) => {
    try {
      const formData = new FormData()
      formData.append('title', productInfo?.title || productTitle)
      formData.append('content', productInfo?.content || '')
      formData.append('price', productInfo?.price || productPrice)
      formData.append('status', value)

      await axiosInstance.patch(`/api/post/${postId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      setProductInfo(prev => ({ ...prev, status: value }))
      setSaleStatus(value)
      showToast(`판매 상태가 "${saleStatusText(value)}" 으로 변경되었습니다.`)
    } catch (err) {
      console.error(err)
      showToast('판매 상태 변경에 실패했습니다.')
    } finally {
      setSaleStatusModalVisible(false)
    }
  }

  // 리뷰 작성 함수 (판매완료인 경우만 허용)
  const handleReview = () => {
    if (saleStatus === 2) {
      const revieweeId = currentUserId === sellerId ? buyerId : sellerId
      setRateItem({
        title: productInfo?.title || productTitle || '상품 정보 없음',
        postId,
        revieweeId,
      })
      setRateModalVisible(true)
    } else {
      showToast('판매완료된 상품에 대해서만 리뷰를 작성할 수 있습니다.')
    }
  }

  // 채팅 메시지 렌더링 함수, 이미지 메시지와 텍스트 메시지 구분
  const renderItem = ({ item }) => {
    let parsedItem = item
    if (typeof item === 'string') {
      try {
        parsedItem = JSON.parse(item)
      } catch (e) {
        parsedItem = { content: item }
      }
    }
    if (!parsedItem.content) {
      parsedItem = { content: String(parsedItem) }
    }
    const isMe = parsedItem.sender && parsedItem.sender.id === currentUserId
    return (
      <View style={[styles.messageContainer, isMe ? styles.myMessage : styles.otherMessage]}>
        {isImageUrl(parsedItem.content) ? (
          <Image source={{ uri: parsedItem.content }} style={styles.chatImage} />
        ) : (
          <Text style={styles.messageText}>{parsedItem.content}</Text>
        )}
      </View>
    )
  }

  // 배경 터치 시 메뉴를 닫는 함수
  const handleBgPress = () => {
    if (chatMenuVisible) setChatMenuVisible(false)
  }

  // 헤더 왼쪽 컴포넌트 (뒤로가기, 채팅방 이름, 신고 버튼)
  const renderLeftHeader = () => (
    <View style={styles.leftHeader}>
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <MaterialCommunityIcons name="arrow-left" size={24} color="black" />
      </TouchableOpacity>
      <Text style={styles.userNickname}>{roomName || '채팅방'}</Text>
      <TouchableOpacity onPress={() => setReportModalVisible(true)} style={styles.reportButton}>
        <MaterialCommunityIcons name="account-alert" size={24} color="red" />
      </TouchableOpacity>
    </View>
  )

  // 헤더 오른쪽 컴포넌트 (메뉴 버튼)
  const renderRightHeader = () => (
    <View style={styles.rightHeader}>
      <TouchableOpacity onPress={() => setChatMenuVisible(!chatMenuVisible)} style={styles.menuButton}>
        <MaterialCommunityIcons name="dots-vertical" size={24} color="black" />
      </TouchableOpacity>
    </View>
  )

  // 판매자와 구매자에 따라 메뉴 항목이 달라짐
  const menuItems = currentUserId === sellerId
    ? [
        { id: '0', label: '판매 상태 변경', icon: 'store-edit', onPress: handlePressSaleStatus },
        { id: '1', label: '리뷰 작성하기', icon: 'star-outline', onPress: handleReview },
        { id: '2', label: '채팅방 나가기', icon: 'exit-to-app', onPress: () => {} },
      ]
    : [
        { id: '0', label: '리뷰 작성하기', icon: 'star-outline', onPress: handleReview },
        { id: '1', label: '채팅방 나가기', icon: 'exit-to-app', onPress: () => {} },
      ]

  // 상품 정보 패널에 표시할 제목, 가격, 이미지 처리
  const displayTitle = productInfo?.title || productTitle || '상품 정보 없음'
  const displayPrice = productInfo?.price
    ? `${Number(productInfo.price).toLocaleString()}원`
    : productPrice
    ? `${Number(productPrice).toLocaleString()}원`
    : '가격 정보 없음'
  const displayImage =
      productInfo?.images && productInfo.images.length > 0
      ? `${config.BASE_URL}/images/${productInfo.images[0].imageUrl}`
      : productImage || 'https://via.placeholder.com/80'

  return (
    <TouchableWithoutFeedback onPress={() => { 
      if (sortOpen) setSortOpen(false) 
      if (showMenu) setShowMenu(false)
    }}>
      <SafeAreaView style={styles.safeArea}>
        {/* 헤더 영역 */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            {renderLeftHeader()}
            {renderRightHeader()}
          </View>
        </View>

        {/* 메뉴 영역 (조건부 렌더링) */}
        {chatMenuVisible && (
          <View style={[styles.menuContainer, { top: 60 + (Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0) }]}>
            {menuItems.map((item, idx) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.menuItem, idx === menuItems.length - 1 && { borderBottomWidth: 0 }]}
                onPress={() => {
                  setChatMenuVisible(false)
                  item.onPress()
                }}
              >
                <View style={styles.menuItemRow}>
                  <MaterialCommunityIcons name={item.icon} size={20} style={styles.menuIcon} color="#666" />
                  <Text style={styles.menuText}>{item.label}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* 상품 정보 패널 (조건부 렌더링) */}
        {isProductInfoExpanded && (
          <View style={styles.productInfoPanelModern}>
            <View style={styles.productInfoRowModern}>
              <Image source={{ uri: displayImage }} style={styles.productThumbnailModern} />
              <View style={styles.productDetailsModern}>
                <Text style={styles.productTitleModern}>{displayTitle}</Text>
                <Text style={styles.productPriceModern}>{displayPrice}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.goToPostButtonModern} onPress={() => navigation.navigate('ProductDetail', { postId })}>
              <Text style={styles.goToPostButtonTextModern}>판매글로 이동</Text>
            </TouchableOpacity>
          </View>
        )}
        <TouchableOpacity onPress={() => setProductInfoExpanded(!isProductInfoExpanded)} style={styles.productInfoToggle}>
          <Text style={styles.productInfoToggleText}>
            {isProductInfoExpanded ? '접기 ▲' : '상품 정보 펼치기 ▼'}
          </Text>
        </TouchableOpacity>

        {/* 채팅 목록 및 입력 영역 */}
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={80}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#87CEEB" />
            </View>
          ) : (
            <FlatList
              data={messages}
              keyExtractor={(item, index) => (item.id ? item.id.toString() : `msg-${index}`)}
              renderItem={renderItem}
              contentContainerStyle={styles.chatContainer}
            />
          )}
          <View style={styles.inputContainer}>
            <IconButton icon="camera" size={24} onPress={handlePickImage} style={styles.iconButton} />
            <TextInput style={styles.textInput} value={newMessage} onChangeText={setNewMessage} placeholder="메시지 입력" />
            <IconButton icon="send" size={24} onPress={handleSend} style={styles.iconButton} />
          </View>
        </KeyboardAvoidingView>

        {/* 신고 모달 컴포넌트 */}
        <UserReportModal visible={reportModalVisible} onClose={() => setReportModalVisible(false)} />

        {/* 판매 상태 모달 컴포넌트 */}
        <SaleStatusModal
          visible={saleStatusModalVisible}
          onClose={() => setSaleStatusModalVisible(false)}
          saleStatus={saleStatus}
          setSaleStatus={setSaleStatus}
          onChangeStatus={handleChangeSaleStatus}
        />

        {/* 리뷰 작성 모달 컴포넌트 */}
        {rateModalVisible && (
          <RateModal
            visible={rateModalVisible}
            onClose={() => setRateModalVisible(false)}
            item={rateItem}
          />
        )}
      </SafeAreaView>
    </TouchableWithoutFeedback>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  header: { backgroundColor: '#87CEEB', borderBottomWidth: 1, borderColor: '#ddd', paddingHorizontal: 15, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', zIndex: 1000 },
  headerContent: { flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'space-between' },
  leftHeader: { flexDirection: 'row', alignItems: 'center' },
  rightHeader: {},
  userNickname: { marginLeft: 8, fontSize: 16, fontWeight: '500', color: '#000' },
  reportButton: { padding: 5, marginLeft: 8 },
  menuButton: { padding: 5 },
  menuContainer: { position: 'absolute', right: 10, backgroundColor: '#fff', borderRadius: 8, elevation: 5, shadowColor: Platform.OS === 'ios' ? '#000' : undefined, shadowOpacity: Platform.OS === 'ios' ? 0.2 : undefined, shadowOffset: Platform.OS === 'ios' ? { width: 0, height: 2 } : undefined, shadowRadius: Platform.OS === 'ios' ? 4 : undefined, zIndex: 1100 },
  menuItem: { paddingVertical: 10, paddingHorizontal: 15, borderBottomWidth: 1, borderColor: '#eee' },
  menuItemRow: { flexDirection: 'row', alignItems: 'center' },
  menuIcon: { marginRight: 10 },
  menuText: { fontSize: 16, color: '#333' },
  productInfoPanelModern: { backgroundColor: '#fff', borderRadius: 8, padding: 15, marginHorizontal: 15, marginVertical: 10, elevation: 3, shadowColor: Platform.OS === 'ios' ? '#000' : undefined, shadowOffset: Platform.OS === 'ios' ? { width: 0, height: 2 } : undefined, shadowOpacity: Platform.OS === 'ios' ? 0.1 : undefined, shadowRadius: Platform.OS === 'ios' ? 4 : undefined },
  productInfoRowModern: { flexDirection: 'row', alignItems: 'center' },
  productThumbnailModern: { width: 80, height: 80, borderRadius: 8, backgroundColor: '#eee' },
  productDetailsModern: { flex: 1, marginLeft: 15 },
  productTitleModern: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  productPriceModern: { fontSize: 16, color: '#888' },
  goToPostButtonModern: { marginTop: 15, backgroundColor: '#87CEEB', paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  goToPostButtonTextModern: { fontSize: 16, color: '#000', fontWeight: 'bold' },
  productInfoToggle: { padding: 5, alignItems: 'flex-end' },
  productInfoToggleText: { fontSize: 14, color: '#007bff' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  chatContainer: { padding: 10 },
  messageContainer: { maxWidth: '70%', padding: 10, marginVertical: 5, borderRadius: 10 },
  myMessage: { alignSelf: 'flex-end', backgroundColor: '#f0f0f0' },
  otherMessage: { alignSelf: 'flex-start', backgroundColor: '#87CEEB' },
  messageText: { fontSize: 16, color: '#000' },
  chatImage: { width: 150, height: 150, resizeMode: 'cover', borderRadius: 8 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderColor: '#ddd', backgroundColor: '#fff', paddingHorizontal: 5, paddingVertical: 8 },
  textInput: { flex: 1, backgroundColor: '#fff', borderRadius: 5, paddingHorizontal: 10, borderWidth: 1, borderColor: '#ccc' },
  iconButton: { marginHorizontal: 5 },
})
