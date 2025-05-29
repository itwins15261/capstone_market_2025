// components/UserReviewModal.js
// 상품 상세 페이지(ProductDetail.js)에서 판매자에게 작성된 리뷰를 모달로 보여주는 컴포넌트

import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { showToast } from '../state/toastUtil';
import axiosInstance from '../api/axios';
import config from '../api/config';

export default function UserReviewModal({ visible, onClose, user }) {
  const [loading, setLoading] = useState(false);
  const [sellerReviews, setSellerReviews] = useState([]);
  const [buyerReviews, setBuyerReviews] = useState([]);

  useEffect(() => {
    if (visible && user) {
      fetchReviews();
    } else {
      setSellerReviews([]);
      setBuyerReviews([]);
    }
  }, [visible, user]);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      // 다른 사용자(user.id)의 리뷰 목록을 가져오기 위해 '/api/users/{userId}/reviews' 사용
      const response = await axiosInstance.get(`/api/users/${user.id}/reviews`);
      const reviews = response.data || [];
      const seller = [];
      const buyer = [];

      reviews.forEach((review) => {
        // if (review.post && review.post.user && review.post.user.id === user.id) {
        //   seller.push(review);
        // } else {
        //   buyer.push(review);
        // }

        // 리뷰 작성자가 판매자인 경우, 판매자들의 후기에 표시됨됨
        if (
          review.reviewer &&
          review.post &&
          review.reviewer.id === review.post.user.id
        ) {
          seller.push(review);
        } else {
          // 그 외는 구매자가 작성한 후기에 표시됨
          buyer.push(review);
        }
      });
      setSellerReviews(seller);
      setBuyerReviews(buyer);
    } catch (error) {
      showToast('리뷰를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 별점 렌더링 함수
  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const halfStar = rating - fullStars >= 0.5;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
    for (let i = 0; i < fullStars; i++) {
      stars.push(<MaterialCommunityIcons key={`full-${i}`} name="star" size={18} color="#FFD700" />);
    }
    if (halfStar) {
      stars.push(
        <MaterialCommunityIcons key="half" name="star-half-full" size={18} color="#FFD700" />
      );
    }
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <MaterialCommunityIcons key={`empty-${i}`} name="star-outline" size={18} color="#FFD700" />
      );
    }
    return <View style={styles.starsContainer}>{stars}</View>;
  };

  // 프로필 이미지 URL 함수
  const getProfileImageUrl = (profileImageValue) => {
    if (!profileImageValue) return null;
    let filename = profileImageValue;
    if (filename.startsWith('/profile/')) {
      filename = filename.substring(9);
    }
    return `${config.BASE_URL}/images/profile/${filename}`;
  };

  const userProfileUrl = getProfileImageUrl(user.profileImageUrl || user.profileImage);
  // 서버에서 user.rating을 받지 못하면 0으로 처리
  const rating = user.rating || 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* 상단 헤더 */}
          <View style={styles.header}>
            {userProfileUrl ? (
              <Image source={{ uri: userProfileUrl }} style={styles.profileImage} />
            ) : (
              <View style={styles.profileImagePlaceholder}>
                <MaterialCommunityIcons name="account-circle-outline" size={70} color="#ccc" />
              </View>
            )}
            <View style={styles.userInfo}>
              <Text style={styles.nickname}>{user.nickname}</Text>
              <View style={styles.ratingRow}>{renderStars(rating)}</View>
              <Text style={styles.averageRating}>
                평균 별점: {rating.toFixed(1)}점
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialCommunityIcons name="close" size={28} color="#007bff" />
            </TouchableOpacity>
          </View>

          {/* 후기 목록 */}
          <View style={styles.reviewsContainer}>
            <View style={styles.reviewSection}>
              <Text style={styles.sectionTitle}>판매자들의 후기</Text>
              {loading ? (
                <ActivityIndicator size="small" color="#87CEEB" />
              ) : sellerReviews.length > 0 ? (
                <ScrollView style={styles.reviewList}>
                  {sellerReviews.map((review, index) => (
                    <View key={index} style={styles.reviewItem}>
                      <View style={styles.reviewHeader}>
                        {renderStars(review.rating)}
                        <Text style={styles.reviewRatingText}>{review.rating}점</Text>
                      </View>
                      <Text style={styles.reviewComment}>{review.comment}</Text>
                    </View>
                  ))}
                </ScrollView>
              ) : (
                <Text style={styles.noReviewText}>판매자의 후기가 없습니다.</Text>
              )}
            </View>

            <View style={styles.divider} />

            <View style={styles.reviewSection}>
              <Text style={styles.sectionTitle}>구매자들들의 후기</Text>
              {loading ? (
                <ActivityIndicator size="small" color="#87CEEB" />
              ) : buyerReviews.length > 0 ? (
                <ScrollView style={styles.reviewList}>
                  {buyerReviews.map((review, index) => (
                    <View key={index} style={styles.reviewItem}>
                      <View style={styles.reviewHeader}>
                        {renderStars(review.rating)}
                        <Text style={styles.reviewRatingText}>{review.rating}점</Text>
                      </View>
                      <Text style={styles.reviewComment}>{review.comment}</Text>
                    </View>
                  ))}
                </ScrollView>
              ) : (
                <Text style={styles.noReviewText}>구매자의 후기가 없습니다.</Text>
              )}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    height: '80%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  profileImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
  },
  profileImagePlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
    marginLeft: 15,
    justifyContent: 'center',
  },
  nickname: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  starsContainer: {
    flexDirection: 'row',
  },
  averageRating: {
    fontSize: 16,
    color: '#666',
    marginTop: 3,
  },
  closeButton: {
    padding: 5,
  },
  reviewsContainer: {
    flex: 1,
    flexDirection: 'column',
  },
  reviewSection: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 5,
  },
  reviewList: {
    flex: 1,
  },
  reviewItem: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  reviewRatingText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 5,
  },
  reviewComment: {
    fontSize: 16,
    color: '#444',
  },
  noReviewText: {
    fontSize: 16,
    color: '#999',
    marginBottom: 10,
    textAlign: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: '#ccc',
    marginVertical: 5,
  },
});
