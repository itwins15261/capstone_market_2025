// pages/Wishlist.js
// 탭 네비게이터의 위시리스트 탭 (즐겨찾기기)

import React, { useState, useCallback, useEffect } from 'react'
import {
  StyleSheet,
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
  StatusBar,
  ActivityIndicator,
  FlatList,
} from 'react-native'
import axiosInstance from '../api/axios'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import { useSelector } from 'react-redux'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { showToast } from '../state/toastUtil'
import config from '../api/config'

const formatPrice = (price) => {
  if (!price) return ''
  return parseInt(price, 10).toLocaleString() + '원'
}

const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleDateString()
}

export default function Wishlist() {
  const navigation = useNavigation()
  const isLoggedIn = useSelector((state) => state.auth.isLoggedIn)
  const [wishlistItems, setWishlistItems] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchWishlist = async () => {
    if (!isLoggedIn) return
    try {
      setLoading(true)
      const response = await axiosInstance.get('/api/wishlist/getmywishlist')
      let data = response.data || []
      if (!Array.isArray(data) && data.data) data = data.data
      setWishlistItems(Array.isArray(data) ? data.filter((i) => i && i.post) : [])
    } catch (error) {
      console.error('위시리스트 불러오기 오류:', error)
      showToast('위시리스트 로딩 실패')
    } finally {
      setLoading(false)
    }
  }

  useFocusEffect(
    useCallback(() => {
      if (isLoggedIn) fetchWishlist()
      else setWishlistItems([])
    }, [isLoggedIn])
  )

  useEffect(() => {
    if (!isLoggedIn) setWishlistItems([])
  }, [isLoggedIn])

  const handleRemove = (postId) => {
    Alert.alert('확인', '정말 삭제하시겠습니까?', [
      { text: '아니오' },
      {
        text: '예',
        onPress: async () => {
          try {
            await axiosInstance.delete(`/api/wishlist/${postId}`)
            setWishlistItems((prev) => prev.filter((i) => i.post.id !== postId))
          } catch {
            Alert.alert('오류', '위시리스트 삭제에 실패했습니다.')
          }
        },
      },
    ])
  }

  const renderItem = ({ item }) => {
    const post = item.post
    const firstImageUrl =
      post.images?.length > 0
        ? `${config.BASE_URL}/images/${post.images[0].imageUrl}`
        : 'https://via.placeholder.com/150'

    return (
      <TouchableOpacity
        style={styles.itemContainer}
        activeOpacity={0.9}
        onPress={() => navigation.navigate('ProductDetail', { postId: post.id })}
      >
        <Image source={{ uri: firstImageUrl }} style={styles.itemImage} />
        <View style={styles.infoContainer}>
          <Text style={styles.itemTitle} numberOfLines={1}>{post.title}</Text>
          <Text style={styles.itemPrice}>{formatPrice(post.price)}</Text>
          <View style={styles.rowBetween}>
            <View>
              <Text style={styles.itemDate}>{formatDate(post.createdAt)}</Text>
              <Text style={styles.itemDate}>조회수: {post.viewCount || 0}</Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                post.status === 0
                  ? { backgroundColor: '#E9F9EE' }
                  : post.status === 1
                  ? { backgroundColor: '#D0E8FF' }
                  : { backgroundColor: '#F0F0F0' },
              ]}
            >
              <Text
                style={[
                  styles.statusBadgeText,
                  post.status === 0
                    ? { color: '#4CAF50' }
                    : post.status === 1
                    ? { color: '#007bff' }
                    : { color: 'black' },
                ]}
              >
                {post.status === 0 ? '판매중' : post.status === 1 ? '예약중' : '판매완료'}
              </Text>
            </View>
          </View>
          <View style={styles.countContainer}>
            {/* <View style={styles.countItem}>
              <MaterialCommunityIcons name="message-outline" size={16} color="#666" />
              <Text style={styles.countText}>0</Text>
            </View> */}
            <View style={styles.countItem}>
              <MaterialCommunityIcons name="heart-outline" size={16} color="#666" />
              <Text style={styles.countText}>{post.wishlistCount}</Text>
            </View>
          </View>
        </View>
        <TouchableOpacity style={styles.deleteIcon} onPress={() => handleRemove(post.id)}>
          <MaterialCommunityIcons name="heart" size={24} color="red" />
        </TouchableOpacity>
      </TouchableOpacity>
    )
  }

  return (
    <SafeAreaView style={[styles.safeArea, Platform.OS === 'android' && { paddingTop: StatusBar.currentHeight }]}>
      <View style={[styles.header, { height: 60 }]}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>위시리스트</Text>
        </View>
      </View>
      <View style={styles.container}>
        {loading && wishlistItems.length === 0 ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#87CEEB" />
          </View>
        ) : !isLoggedIn ? (
          <View style={styles.center}>
            <MaterialCommunityIcons name="account-circle-outline" size={80} color="#ccc" />
            <Text style={styles.loginMessage}>
              <Text
                style={styles.loginLink}
                onPress={() => navigation.navigate('Login')}
              >
                로그인
              </Text>
              이 필요합니다.
            </Text>
          </View>
        ) : wishlistItems.length === 0 ? (
          <View style={styles.center}>
            <MaterialCommunityIcons name="heart-outline" size={60} color="#ccc" />
            <Text style={styles.emptyMessage}>위시리스트가 비어있습니다.</Text>
          </View>
        ) : (
          <FlatList
            data={wishlistItems}
            keyExtractor={(item, idx) =>
              item.post?.id ? item.post.id.toString() : idx.toString()
            }
            renderItem={renderItem}
            contentContainerStyle={[styles.listContainer, { paddingTop: 10 }]}
          />
        )}
      </View>
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
  },
  headerContent: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: 'black' },

  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  loginMessage: { fontSize: 18, color: '#666', marginTop: 12, textAlign: 'center' },
  loginLink: { color: '#007bff', textDecorationLine: 'underline' },

  emptyMessage: { fontSize: 18, color: '#666', marginTop: 12, textAlign: 'center' },

  listContainer: { padding: 15 },
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
    alignItems: 'center',
    position: 'relative',
  },
  itemImage: { width: 90, height: 90, borderRadius: 8, backgroundColor: '#eee', marginRight: 12 },
  infoContainer: { flex: 1, justifyContent: 'center' },
  itemTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 2 },
  itemPrice: { fontSize: 15, color: '#333', fontWeight: '600', marginBottom: 6 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  itemDate: { fontSize: 13, color: '#999' },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 },
  statusBadgeText: { fontSize: 12, fontWeight: '600' },
  countContainer: { flexDirection: 'row', marginTop: 8, justifyContent: 'flex-end' },
  countItem: { flexDirection: 'row', alignItems: 'center', marginLeft: 15 },
  countText: { fontSize: 14, color: '#666', marginLeft: 3 },
  deleteIcon: { position: 'absolute', top: 8, right: 8 },
})
