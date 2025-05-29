// pages/PurchaseHistory.js (구매내역 페이지 -> 리뷰 작성 페이지로 변경)
// 판매가 완료된 게시글에 대해서, 상대방에게 리뷰를 작성할 수 있는 페이지
// 판매자는 구매자에게, 구매자는 판매자에게 리뷰 작성 및 수정, 삭제 가능

import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  SafeAreaView,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Platform,
  StatusBar,
  Alert,
} from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import axiosInstance from '../api/axios'
import { showToast } from '../state/toastUtil'
import RateModal from '../components/RateModal'
import config from '../api/config'
import { useSelector } from 'react-redux'
import { useNavigation } from '@react-navigation/native'

export default function PurchaseHistory() {
  const navigation      = useNavigation()
  const currentUserId   = useSelector((state) => state.auth.user.id)

  const [history, setHistory]               = useState([])
  const [loading, setLoading]               = useState(false)
  const [selectedItem, setSelectedItem]     = useState(null) 
  const [modalVisible, setModalVisible]     = useState(false)

  // 거래 내역 (구매, 판매) 집계
  const fetchHistory = useCallback(async () => {
  setLoading(true);
  try {
    // 채팅방, 보낸 리뷰 목록 먼저 가져오기
    const [chatRes, sentRes] = await Promise.all([
      axiosInstance.get(`/api/users/${currentUserId}/chatrooms`),
      axiosInstance.get('/api/reviews/sent'),
    ]);
    const chatRooms   = chatRes.data || [];
    const sentReviews = sentRes.data || [];

    // 내가 거래한 postId
    const postIds = Array.from(new Set(chatRooms.map(cr => cr.postId)));

    const bulk = await axiosInstance.get('/api/posts', {
      params: { page: 0, size: postIds.length || 1 },
    });
    const list = bulk.data?.content || [];

    // 목록 결과를 id -> Post 로 매핑
    const postMap = Object.fromEntries(list.map(p => [p.id, p]));

    // 5) 목록 안에 없던 postId만 예외적으로 개별 호출
    const missingIds = postIds.filter(id => !postMap[id]);
    if (missingIds.length) {
      const extra = await Promise.all(
        missingIds.map(async pid => {
          try {
            const r = await axiosInstance.get(`/api/post/${pid}`);
            return r.data;
          } catch { return null; }
        }),
      );
      extra.forEach(p => p && (postMap[p.id] = p));
    }

    // 내가 보낸 리뷰를 (postId-revieweeId) 키로 매핑
    const sentReviewMap = {};
    sentReviews.forEach(rv => {
      sentReviewMap[`${rv.post.id}-${rv.reviewee.id}`] = rv;
    });

    // 리스트 구성
    const items = chatRooms
      .map(cr => {
        const post = postMap[cr.postId];
        if (!post || post.status !== 2) return null;

        const isBuyer     = cr.buyer.id === currentUserId;
        const role        = isBuyer ? 'BUYER' : 'SELLER';
        const counterpart = isBuyer ? cr.seller : cr.buyer;
        const rvKey       = `${post.id}-${counterpart.id}`;

        return {
          post,
          role,
          counterpart,
          review: sentReviewMap[rvKey] || null,
        };
      })
      .filter(Boolean);

    setHistory(items);
  } catch (e) {
    showToast('거래 내역을 불러오지 못했습니다.');
  } finally {
    setLoading(false);
  }
}, [currentUserId]);

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  const refresh = () => fetchHistory()

  // 모달 열기
  const openModal = (item) => {
    if (item.review) {
      // 리뷰 수정
      setSelectedItem({
        title       : item.post.title,
        postId      : item.post.id,
        revieweeId  : item.counterpart.id,
        id          : item.review.id,
        rating      : item.review.rating,
        comment     : item.review.comment,
      })
    } else {
      // 리뷰 신규 작성
      setSelectedItem({
        title       : item.post.title,
        postId      : item.post.id,
        revieweeId  : item.counterpart.id,
      })
    }
    setModalVisible(true)
  }

  // 리뷰 삭제
  const confirmDelete = (reviewId) => {
    Alert.alert(
      '삭제 확인',
      '정말 이 리뷰를 삭제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text     : '삭제',
          style    : 'destructive',
          onPress : async () => {
            try {
              await axiosInstance.delete(`/api/reviews/${reviewId}`)
              showToast('리뷰가 삭제되었습니다.')
              refresh()
            } catch {
              showToast('삭제 실패')
            }
          },
        },
      ],
      { cancelable: true }
    )
  }

  const renderItem = ({ item }) => {
    const { post, review, counterpart, role } = item
    const imageUri =
      post.images && post.images.length
        ? `${config.BASE_URL}/images/${post.images[0].imageUrl}`
        : 'https://via.placeholder.com/80'

    return (
      <View style={styles.reviewItem}>
        {/* 상품 정보 터치 영역 */}
        <TouchableOpacity
          style={styles.productInfo}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('ProductDetail', { postId: post.id })}
        >
          <Image source={{ uri: imageUri }} style={styles.productImage} />
          <View style={styles.productDetails}>
            <Text style={styles.productTitle}>{post.title}</Text>
            <Text style={styles.productPrice}>
              {Number(post.price).toLocaleString()}원
            </Text>
            <Text style={styles.roleText}>
              {role === 'BUYER' ? '구매자' : '판매자'}로 거래 · 상대: {counterpart.nickname}
            </Text>
          </View>
        </TouchableOpacity>

        <View style={styles.reviewContent}>
          {review ? (
            <>
              <View style={styles.starRow}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <MaterialCommunityIcons
                    key={s}
                    name={s <= review.rating ? 'star' : 'star-outline'}
                    size={20}
                    color={s <= review.rating ? '#FFD700' : '#ccc'}
                  />
                ))}
              </View>
              <Text style={styles.reviewText}>{review.comment}</Text>
              <View style={styles.reviewButtons}>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => openModal(item)}
                >
                  <Text style={styles.buttonText}>수정</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => confirmDelete(review.id)}
                >
                  <Text style={styles.buttonText}>삭제</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <TouchableOpacity
              style={styles.writeButton}
              onPress={() => openModal(item)}
            >
              <Text style={styles.buttonText}>리뷰 작성</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>리뷰 작성 페이지</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#87CEEB" />
        </View>
      ) : history.length === 0 ? (
        <View style={styles.center}>
          <Text>거래 내역이 없습니다.</Text>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(_, idx) => idx.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          onRefresh={fetchHistory}
          refreshing={loading}
        />
      )}

      {modalVisible && selectedItem && (
        <RateModal
          visible={modalVisible}
          onClose={() => {
            setModalVisible(false)
            refresh()
          }}
          item={selectedItem}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    height: 60,
    backgroundColor: '#87CEEB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderColor: '#ddd',
  },
  backButton: { position: 'absolute', left: 15, padding: 5 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#000' },

  listContainer: { padding: 15 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  reviewItem: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    marginBottom: 15,
    overflow: 'hidden',
    elevation: 2,
  },
  productInfo: {
    flexDirection: 'row',
    padding: 10,
    borderBottomWidth: 1,
    borderColor: '#ddd',
  },
  productImage: { width: 80, height: 80, borderRadius: 8, backgroundColor: '#eee' },
  productDetails: { flex: 1, marginLeft: 10, justifyContent: 'center' },
  productTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  productPrice: { fontSize: 14, color: '#666', marginTop: 4 },
  roleText: { fontSize: 12, color: '#888', marginTop: 2 },

  reviewContent: { padding: 10 },
  starRow: { flexDirection: 'row', marginBottom: 5 },
  reviewText: { fontSize: 15, color: '#444' },

  reviewButtons: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 },
  editButton: {
    backgroundColor: '#87CEEB',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginRight: 8,
  },
  deleteButton: {
    backgroundColor: '#FFB3B3',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  writeButton: {
    backgroundColor: '#87CEEB',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  buttonText: { color: '#000', fontWeight: 'bold' },
})
