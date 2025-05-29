// pages/ProductDetail.js
// 홈화면에서 상품을 클릭했을 때 보여지는 상세 페이지
// 상품의 이미지, 제목, 가격, 판매자 정보 등 확인 가능

import React, { useState, useEffect, useRef } from 'react';
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
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import axiosInstance from '../api/axios';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ProductReportModal from '../components/ProductReportModal';
import { showToast } from '../state/toastUtil';
import { useSelector } from 'react-redux';
import config from '../api/config';
import UserReviewModal from '../components/UserReviewModal';

import Modal from 'react-native-modal';
import ImageViewer from 'react-native-image-zoom-viewer';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// 날짜 및 가격 포맷 함수
const formatFullDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  let h = date.getHours();
  const mi = date.getMinutes();
  const ampm = h >= 12 ? '오후' : '오전';
  h %= 12;
  if (h === 0) h = 12;
  return `${y}. ${m}. ${d}. ${ampm} ${h}시 ${mi}분`;
};
const formatPrice = (price) =>
  price === null || price === undefined ? '' : `${parseInt(price, 10).toLocaleString()}원`;

// 상품 상세 페이지 컴포넌트
export default function ProductDetail() {
  const route = useRoute();
  const navigation = useNavigation();
  const { postId } = route.params || {};

  const currentUserId = useSelector((state) => state.auth.user.id);
  const isLoggedIn = useSelector((state) => state.auth.isLoggedIn);

  // 내 채팅방 목록 & 카운트 상태
  const [myChatRooms, setMyChatRooms] = useState([]);
  const [chatCount,   setChatCount]   = useState(0);

  // 상품 상세 정보 상태
  const [postData, setPostData] = useState(null);
  const [alreadyWished, setAlreadyWished] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);

  // 슬라이더 & 모달
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [fullScreenVisible, setFullScreenVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);


  // 리뷰 목록 모달
  const [isUserReviewModalVisible, setIsUserReviewModalVisible] = useState(false);

   
  // 데이터 로드
   
  useEffect(() => {
    if (!postId) {
      Alert.alert('오류', '상품 정보가 없습니다.');
      return;
    }
    fetchPostDetail();
  }, [postId]);

  const fetchPostDetail = async () => {
    try {
      setLoading(true);
      const { data } = await axiosInstance.get(`/api/post/${postId}`);
      setAlreadyWished(false);
      setPostData(data || {});
    } catch (err) {
      console.log('상품 상세 정보 불러오기 오류:', err);
      Alert.alert('오류', '상품 정보를 가져오지 못했습니다.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // 새로고침 함수
  const onRefresh = () => {
    setRefreshing(true);
    fetchPostDetail();
    showToast('새로고침 완료!');
  };

   
  // 권한 및 상태
  const isMyPost = postData?.user?.id === currentUserId;
  const canChat = postData?.status === 0 && !isMyPost;
   
  // 리뷰 존재 여부 확인 (삭제 전에 호출)
  const hasReviewOnThisPost = async () => {
    try {
      // 내가 보내고 받은 리뷰를 동시에 조회
      const [sentRes, recvRes] = await Promise.all([
        axiosInstance.get('/api/reviews/sent'),
        axiosInstance.get('/api/reviews/received'),
      ]);
      const allReviews = [...(sentRes.data || []), ...(recvRes.data || [])];
      return allReviews.some((rv) => rv.post?.id === postId);
    } catch (err) {
      console.log('리뷰 조회 실패', err);
      // 조회 실패 시에는 삭제 막음
      return true;
    }
  };

  // 채팅, 위시리스트, 수정/삭제
  const handleChat = async () => {
    if (!isLoggedIn) return showToast('로그인이 필요합니다.');
    if (isMyPost) return showToast('자신의 판매글에는 채팅을 할 수 없습니다.');

    try {
      const { data } = await axiosInstance.post(`/api/post/${postId}/chatroom`);
      navigation.navigate('Chat', {
        roomId: data.id,
        roomName: postData?.user?.nickname || '상대방',
        postId,
        productTitle: postData.title,
        productPrice: postData.price,
        productImage:
          postData.images?.length
            ? `${config.BASE_URL}/images/${postData.images[0].imageUrl}`
            : '',
        saleStatus: postData.status,
        sellerId: postData.user?.id,
        buyerId: currentUserId,
      });
    } catch (err) {
      console.error(err);
      showToast('채팅방 생성 중 오류가 발생했습니다.');
    }
  };

  const handleWishlist = async () => {
    if (!isLoggedIn) return showToast('로그인이 필요합니다.');
    if (isMyPost) return showToast('자신의 판매글을 위시리스트에 추가할 수 없습니다.');
    if (alreadyWished) return showToast('이미 위시리스트에 추가된 상품입니다.');

    try {
      const res = await axiosInstance.post(`/api/wishlist/${postId}`);
      if (res.status === 200) {
        showToast('위시리스트에 추가되었습니다.');
        setPostData((p) => ({ ...p, wishlistCount: (p?.wishlistCount || 0) + 1 }));
        setAlreadyWished(true);
      }
    } catch (err) {
      console.error(err);
      Alert.alert('위시리스트', '추가 중 오류가 발생했습니다.');
    }
  };

  const handleEdit = () => {
    if (postData) navigation.navigate('Post', { editMode: true, existingPost: postData });
  };

  const handleDelete = async () => {
    // 1) 리뷰 존재 여부 검사 (리뷰가 있으면 무조건 막고 리뷰 메시지)
    const reviewed = await hasReviewOnThisPost();
    if (reviewed) {
      showToast('리뷰가 작성된 게시글은 삭제할 수 없습니다.');
      return;
    }
  
    // 2) 판매완료 여부 검사
    //    postData.status === 2 이면 판매완료
    if (postData.status === 2) {
      showToast('판매완료된 게시글은 삭제할 수 없습니다.');
      return;
    }
  
    // 3) 실제 삭제 확인
    Alert.alert(
      '삭제 확인',
      '정말 이 글을 삭제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              await axiosInstance.delete(`/api/post/${postId}`);
              showToast('글이 삭제되었습니다.');
              navigation.goBack();
            } catch (err) {
              console.error(err);
              showToast('삭제 중 오류가 발생했습니다.');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#87CEEB" />
        </View>
      </SafeAreaView>
    );
  }
  if (!postData) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <Text>상품 정보를 찾을 수 없습니다.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const user = postData.user || {};
  const userNickname = user.nickname || '알 수 없음';
  const userProfileUrl = user.profileImageUrl
    ? `${config.BASE_URL}/images/profile/${user.profileImageUrl.replace('/profile/', '')}`
    : null;
  const rating = parseFloat(user.rating) || 0;
  const imagesArr = postData.images || [];
  const badgeStyle = (() => {
    switch (postData.status) {
      case 0:
        return { backgroundColor: '#E9F9EE', textColor: '#4CAF50' };
      case 1:
        return { backgroundColor: '#D0E8FF', textColor: '#007bff' };
      case 2:
        return { backgroundColor: '#F0F0F0', textColor: 'black' };
      default:
        return { backgroundColor: '#E9F9EE', textColor: '#4CAF50' };
    }
  })();

  const statusLabel = (() => {
    if (postData.price === 0) {
      switch (postData.status) {
        case 0: return '나눔중';
        case 1: return '예약중';
        case 2: return '나눔완료';
      }
    } else {
      switch (postData.status) {
        case 0: return '판매중';
        case 1: return '예약중';
        case 2: return '판매완료';
      }
    }
    return '';
  })();
  

  const renderStars = (rate) => {
    const stars = [];
    const full = Math.floor(rate);
    const half = rate - full >= 0.5;
    const empty = 5 - full - (half ? 1 : 0);
    [...Array(full)].forEach((_, i) =>
      stars.push(<MaterialCommunityIcons key={`f${i}`} name="star" size={20} color="#FFD700" />)
    );
    if (half)
      stars.push(<MaterialCommunityIcons key="h" name="star-half-full" size={20} color="#FFD700" />);
    [...Array(empty)].forEach((_, i) =>
      stars.push(<MaterialCommunityIcons key={`e${i}`} name="star-outline" size={20} color="#FFD700" />)
    );
    return <View style={styles.starsContainer}>{stars}</View>;
  };

  const renderImageItem = ({ item, index }) => {
    const imageUrl = item?.imageUrl
      ? `${config.BASE_URL}/images/${item.imageUrl}`
      : 'https://via.placeholder.com/500'

    return (
      <TouchableOpacity
        style={{ width: SCREEN_WIDTH, alignItems: 'center' }}
        onPress={() => {
          setActiveIndex(index)
          setFullScreenVisible(true)
        }}
      >
        <Image source={{ uri: imageUrl }} style={{ width: '100%', height: 300 }} />
      </TouchableOpacity>
    )
  }

  const onScroll = (e) => {
    setActiveIndex(Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH));
  };

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        Platform.OS === 'android' && { paddingTop: StatusBar.currentHeight },
      ]}
    >
      {/* 전체화면 이미지 모달 */}
      <Modal
        isVisible={fullScreenVisible}
        onBackButtonPress={() => setFullScreenVisible(false)}
        style={{ margin: 0, backgroundColor: '#000' }}
      >
      {/* X 버튼 */}
      <TouchableOpacity
        style={styles.closeButton}
        onPress={() => setFullScreenVisible(false)}
      >
        <MaterialCommunityIcons name="close" size={30} color="#fff" />
      </TouchableOpacity>
        <ImageViewer
          imageUrls={imagesArr.map(img => ({
            url: img.imageUrl
              ? `${config.BASE_URL}/images/${img.imageUrl}`
              : '',
          }))}
          index={activeIndex}
          style={{ flex: 1 }}          
          imageStyle={{                        
            width: SCREEN_WIDTH,
            height: SCREEN_HEIGHT,
            resizeMode: 'contain'
          }}
          enableSwipeDown
          onSwipeDown={() => setFullScreenVisible(false)}
          saveToLocalByLongPress={false}
          enablePreload
          renderIndicator={() => null}
          enableImageZoom
          enableDoubleClickZoom
          doubleClickInterval={300}
          maxScale={4}
          minScale={1}
        />
      </Modal>



      {/* 앱바 */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#000" />
          </TouchableOpacity>
        </View>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>상품 상세</Text>
        </View>
        <View style={styles.headerRight}>
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
          // 신고 버튼 삭제
          // <TouchableOpacity
          //   onPress={() => setReportModalVisible(true)}
          //   style={styles.reportButton}
          // >
          //   <MaterialCommunityIcons name="alert-circle-outline" size={24} color="red" />
          // </TouchableOpacity>
          null
        )}
        </View>
      </View>

      {/* 본문 스크롤 */}
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
          {imagesArr.length ? (
            <>
              <FlatList
                data={imagesArr}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                renderItem={({ item, index }) => renderImageItem({ item }, index)}
                keyExtractor={(_, i) => `img-${i}`}
                onScroll={onScroll}
              />
              {imagesArr.length > 1 && (
                <View style={styles.paginationWrapper}>
                  {imagesArr.map((_, i) => (
                    <View
                      key={i}
                      style={[
                        styles.dot,
                        activeIndex === i ? styles.dotActive : styles.dotInactive,
                      ]}
                    />
                  ))}
                </View>
              )}
            </>
          ) : (
            <View style={styles.noImageContainer}>
              <MaterialCommunityIcons name="image-off-outline" size={60} color="#aaa" />
              <Text style={styles.noImageText}>이미지가 없습니다.</Text>
            </View>
          )}
        </View>

        {/* 작성자 */}
        <TouchableOpacity onPress={() => setIsUserReviewModalVisible(true)}>
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
                <Text style={styles.ratingText}>별점: {rating.toFixed(1)}점 / 5점</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>

        {/* 상품 상세 */}
        <View style={styles.detailInfoContainer}>
          <View style={styles.titlePriceContainer}>
            <Text style={styles.detailTitle}>{postData.title}</Text>
            <Text style={styles.detailPrice}>{formatPrice(postData.price)}</Text>
          </View>
          <View style={styles.rowBetween}>
            <View>
              <Text style={styles.detailDate}>등록일: {formatFullDate(postData.createdAt)}</Text>
              {postData.updatedAt !== postData.createdAt && (
                <Text style={styles.detailDate}>수정일: {formatFullDate(postData.updatedAt)}</Text>
              )}
            </View>
            <View style={[styles.statusBadge, { backgroundColor: badgeStyle.backgroundColor }]}>
            <Text style={[styles.statusBadgeText, { color: badgeStyle.textColor }]}>
              {statusLabel}
            </Text>
            </View>
          </View>
          <View style={styles.separator} />
          <Text style={styles.detailDescription}>
            {postData.content || '상품에 대한 설명이 없습니다.'}
          </Text>
        </View>

        {/* 채팅·위시리스트 수 삭제
        <View style={styles.countSection}>
          <View style={styles.countItem}>
            <MaterialCommunityIcons name="message-outline" size={20} color="#666" />
            <Text style={styles.countText}>채팅 0</Text>
          </View>
          <View style={styles.countItem}>
            <MaterialCommunityIcons name="heart-outline" size={20} color="#666" />
            <Text style={styles.countText}>
              위시리스트 {postData.wishlistCount || 0}
            </Text>
          </View>
        </View> */}
      </ScrollView>

      {/* 하단 버튼 */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.footerButton, !canChat && { backgroundColor: '#f0f0f0' }]}
          onPress={
            canChat
              ? handleChat
              : () => showToast('예약중이거나 판매완료된 상품은 채팅할 수 없습니다.')
          }
          disabled={!canChat}
        >
          <Text style={[styles.footerButtonText, !canChat && { color: '#bbb' }]}>
            채팅하기
          </Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.footerButton} onPress={handleWishlist}>
          <Text style={styles.footerButtonText}>위시리스트 추가</Text>
        </TouchableOpacity>
      </View>

      {/* 모달들 */}
      <ProductReportModal
        visible={reportModalVisible}
        onClose={() => setReportModalVisible(false)}
      />
      <UserReviewModal
        visible={isUserReviewModalVisible}
        onClose={() => setIsUserReviewModalVisible(false)}
        user={postData.user || {}}
      />
    </SafeAreaView>
  );
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
  headerLeft: {
    flex: 1,
    alignItems: 'flex-start',
  },
  headerCenter: {
    flex: 2,
    alignItems: 'center',
  },
  headerRight: {
    flex: 1,
    alignItems: 'flex-end',
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
    width: 60, height: 60, borderRadius: 30, backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center',
  },
  userInfo: { marginLeft: 15, flex: 1 },
  userNickname: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 6 },
  ratingContainer: { flexDirection: 'row', alignItems: 'center' },
  starsContainer: { flexDirection: 'row', marginRight: 8 },
  ratingText: { fontSize: 14, color: '#666' },
  detailInfoContainer: {
    backgroundColor: '#fff', marginTop: 10, marginHorizontal: 15, padding: 15, borderRadius: 10, elevation: 1,
  },
  titlePriceContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailTitle: { fontSize: 20, fontWeight: '700', color: '#333', flex: 1, marginRight: 10 },
  detailPrice: { fontSize: 20, fontWeight: '700', color: '#FF3B30' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  detailDate: { fontSize: 14, color: '#999' },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 },
  statusBadgeText: { fontSize: 12, fontWeight: '600' },
  separator: { height: 1, backgroundColor: '#eee', marginVertical: 15 },
  detailDescription: { fontSize: 16, color: '#444', lineHeight: 22 },
  countSection: {
    flexDirection: 'row', justifyContent: 'space-around', margin: 15, paddingVertical: 10,
    backgroundColor: '#fff', borderRadius: 10, elevation: 1,
  },
  countItem: { flexDirection: 'row', alignItems: 'center' },
  countText: { fontSize: 14, color: '#666', marginLeft: 5 },
  footer: {
    position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row',
    borderTopWidth: 1, borderColor: '#ddd', backgroundColor: '#fff', elevation: 10, shadowOpacity: 0.1,
  },
  footerButton: { flex: 1, paddingVertical: 15, alignItems: 'center' },
  footerButtonText: { fontSize: 16, color: '#87CEEB', fontWeight: '600' },
  divider: { width: 1, backgroundColor: '#ddd', marginVertical: 10 },
  fullScreenContainer: { flex: 1, backgroundColor: '#000',  },
  fullScreenImage: { flex: 1, width: undefined, height: undefined, },
  closeButton: {
    position: 'absolute',
    top: Platform.OS === 'android'
      ? StatusBar.currentHeight + 10
      : 10,
    left: 10,
    zIndex: 10,
  },
  noImageContainer: {
    width: SCREEN_WIDTH, height: 300, backgroundColor: '#f0f0f0',
    borderRadius: 10, justifyContent: 'center', alignItems: 'center',
  },
  noImageText: { marginTop: 10, fontSize: 16, color: '#666' },
});
