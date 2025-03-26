// pages/ChatList.js
import React, { useEffect, useState, useCallback } from 'react'
import {
  StyleSheet,
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  Image,
  Platform,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import axiosInstance from '../api/axios'
import { useSelector } from 'react-redux'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { showToast } from '../state/toastUtil'
import config from '../api/config'

export default function ChatList() {
  const navigation = useNavigation() // 내비게이션 사용
  const currentUserId = useSelector((state) => state.auth.user.id) // 현재 사용자 id
  const isLoggedIn = useSelector((state) => state.auth.isLoggedIn) // 로그인 상태

  const [chatRooms, setChatRooms] = useState([]) // 채팅방 목록 상태
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  // 로그인 시 채팅방 목록을 불러옴
  useEffect(() => {
    if (!isLoggedIn) return
    fetchChatRooms()
  }, [isLoggedIn])

  // 채팅방 목록 API 호출 함수
  const fetchChatRooms = async () => {
    try {
      setLoading(true)
      // 사용자 채팅방 목록 가져오기
      const response = await axiosInstance.get(`/api/users/${currentUserId}/chatrooms`)
      const rooms = response.data || []

      // 각 채팅방마다 최근 메시지와 읽지 않은 메시지 수 추가
      const roomsWithLastMsg = await Promise.all(
        rooms.map(async (room) => {
          try {
            const msgRes = await axiosInstance.get(`/api/chatroom/${room.id}/recent?size=1`)
            const lastMsg = (msgRes.data || [])[0]
            const unreadCount = room.unreadCount || 0
            return { ...room, lastMsg, unreadCount }
          } catch (err) {
            console.log('Fetch last message error:', err)
            return { ...room, lastMsg: null, unreadCount: 0 }
          }
        })
      )
      setChatRooms(roomsWithLastMsg)
    } catch (error) {
      console.error(error)
      showToast('채팅 목록을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 새로고침 함수
  const onRefresh = async () => {
    setRefreshing(true)
    try {
      await fetchChatRooms()
    } finally {
      setRefreshing(false)
    }
  }

  // 채팅방 선택 시 해당 채팅방으로 이동하는 함수
  const handleRoomPress = (room) => {
    let roomName = '상대방'
    if (room.seller && room.buyer) {
      if (room.seller.id === currentUserId) {
        roomName = room.buyer.nickname || '구매자'
      } else {
        roomName = room.seller.nickname || '판매자'
      }
    }
    navigation.navigate('Chat', {
      roomId: room.id,
      roomName,
      postId: room.postId,
      productTitle: room.productTitle,
      productPrice: room.productPrice,
      productImage: room.productImage,
      sellerId: room.seller ? room.seller.id : null,
    })
  }

  // 채팅방 목록 항목 렌더링 함수
  const renderItem = ({ item }) => {
    const isSeller = item.seller?.id === currentUserId
    const partner = isSeller ? item.buyer : item.seller
    const partnerName = partner?.nickname || '상대방'
    const profileUrl = partner?.profileImageUrl
      ? `${config.BASE_URL}/images/profile/${partner.profileImageUrl.replace('/profile/', '')}`
      : `https://via.placeholder.com/80/87CEEB/000000?text=${encodeURIComponent(partnerName.slice(0,2))}`

    // 최근 메시지 시간 포맷팅
    const recentTime = item.lastMsg
      ? new Date(item.lastMsg.sentAt).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        })
      : ''

    const recentMsg = item.lastMsg
      ? item.lastMsg.content || '(이미지 메시지)'
      : '새로운 채팅방입니다.'

    return (
      <TouchableOpacity style={styles.roomItem} onPress={() => handleRoomPress(item)}>
        <View style={styles.imageContainer}>
          <Image source={{ uri: profileUrl }} style={styles.profileImage} />
          {item.unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.unreadCount}</Text>
            </View>
          )}
        </View>
        <View style={styles.roomInfo}>
          <Text style={styles.roomName}>{partnerName}</Text>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {recentMsg}
          </Text>
        </View>
        <Text style={styles.messageTime}>{recentTime}</Text>
      </TouchableOpacity>
    )
  }

  // 로그인하지 않은 경우 렌더링
  if (!isLoggedIn) {
    return (
      <SafeAreaView style={[styles.safeArea, Platform.OS === 'android' && { paddingTop: StatusBar.currentHeight }]}>
        <View style={[styles.header, { height: 60 }]}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>채팅</Text>
          </View>
        </View>
        <View style={styles.center}>
          <Text>로그인해야 채팅 목록을 볼 수 있습니다.</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={[styles.safeArea, Platform.OS === 'android' && { paddingTop: StatusBar.currentHeight }]}>
      <View style={[styles.header, { height: 60 }]}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>채팅</Text>
        </View>
      </View>
      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#87CEEB" />
        </View>
      ) : chatRooms.length === 0 ? (
        <View style={styles.center}>
          <Text>참여중인 채팅방이 없습니다.</Text>
        </View>
      ) : (
        <FlatList
          data={chatRooms}
          keyExtractor={(item) => item.id?.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              progressViewOffset={-50}
              tintColor="#87CEEB"
            />
          }
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  header: { backgroundColor: '#87CEEB', borderBottomWidth: 1, borderColor: '#ddd', paddingHorizontal: 15, justifyContent: 'center' },
  headerContent: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: 'black' },
  listContainer: { padding: 15 },
  roomItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  imageContainer: { position: 'relative' },
  profileImage: { width: 50, height: 50, borderRadius: 25, marginRight: 10 },
  badge: { position: 'absolute', top: -4, right: -4, backgroundColor: 'red', borderRadius: 10, paddingHorizontal: 4, paddingVertical: 1, minWidth: 20, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  roomInfo: { flex: 1 },
  roomName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  lastMessage: { fontSize: 14, color: '#666', marginTop: 4 },
  messageTime: { fontSize: 12, color: '#999' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
})
