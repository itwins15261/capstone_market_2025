// components/MyReviewModal.js
// 마이페이지에서, 나에게 작성된 리뷰를 모달로 보여주는 컴포넌트

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
import { useSelector } from 'react-redux';

export default function MyReviewModal({ visible, onClose, user }) {
  const currentUserId = useSelector((state) => state.auth.user.id);
  const [loading, setLoading] = useState(false);
  const [sellerReviews, setSellerReviews] = useState([]);
  const [buyerReviews, setBuyerReviews] = useState([]);
  const [overallRating, setOverallRating] = useState(0);

  useEffect(() => {
    if (visible && user && currentUserId === user.id) {
      fetchReviews();
    } else {
      setSellerReviews([]);
      setBuyerReviews([]);
      setOverallRating(0);
    }
  }, [visible, user, currentUserId]);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      // api/users/{userId}/reviews 엔드포인트 사용
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

        // 리뷰 작성자가 판매자인 경우, 판매자들의 후기
        if (
          review.reviewer &&
          review.post &&
          review.reviewer.id === review.post.user.id
        ) {
          seller.push(review)
        } else {
          // 그 외는 구매자가 작성한 후기
          buyer.push(review)
        }
      });

      setSellerReviews(seller.slice(0, 3));
      setBuyerReviews(buyer.slice(0, 3));

      // 전체 평균 별점 계산, 리뷰 불러와서 평균냄
      const all = reviews;
      const avg = all.length
        ? all.reduce((sum, r) => sum + r.rating, 0) / all.length
        : 0;
      setOverallRating(avg);
    } catch (error) {
      showToast('리뷰를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const halfStar = rating - fullStars >= 0.5;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
    for (let i = 0; i < fullStars; i++) stars.push(
      <MaterialCommunityIcons key={`full-${i}`} name="star" size={18} color="#FFD700" />
    );
    if (halfStar) stars.push(
      <MaterialCommunityIcons key="half" name="star-half-full" size={18} color="#FFD700" />
    );
    for (let i = 0; i < emptyStars; i++) stars.push(
      <MaterialCommunityIcons key={`empty-${i}`} name="star-outline" size={18} color="#FFD700" />
    );
    return <View style={styles.starsContainer}>{stars}</View>;
  };

  const getProfileImageUrl = (img) => {
    if (!img) return null;
    let filename = img;
    if (filename.startsWith('/profile/')) filename = filename.substring(9);
    return `${config.BASE_URL}/images/profile/${filename}`;
  };

  const profileUrl = getProfileImageUrl(user.profileImageUrl || user.profileImage);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            {profileUrl ? (
              <Image source={{ uri: profileUrl }} style={styles.profileImage} />
            ) : (
              <View style={styles.profileImagePlaceholder}>
                <MaterialCommunityIcons name="account-circle-outline" size={70} color="#ccc" />
              </View>
            )}
            <View style={styles.userInfo}>
              <Text style={styles.nickname}>{user.nickname || '닉네임 없음'}</Text>
              {renderStars(overallRating)}
              <Text style={styles.averageRating}>평균 별점: {overallRating.toFixed(1)}점</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialCommunityIcons name="close" size={28} color="#007bff" />
            </TouchableOpacity>
          </View>

          <View style={styles.reviewsWrapper}>
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>판매자들의 후기</Text>
              {loading ? (
                <ActivityIndicator size="small" color="#87CEEB" />
              ) : sellerReviews.length ? (
                <ScrollView style={styles.reviewList}>
                  {sellerReviews.map((r, i) => (
                    <View key={i} style={styles.reviewItem}>
                      <View style={styles.reviewHeader}>
                        {renderStars(r.rating)}
                        <Text style={styles.reviewRatingText}>{r.rating}점</Text>
                      </View>
                      <Text style={styles.reviewComment}>{r.comment}</Text>
                    </View>
                  ))}
                </ScrollView>
              ) : (
                <Text style={styles.noReviewText}>판매자의 후기가 없습니다.</Text>
              )}
            </View>

            <View style={styles.dividerHorizontal} />

            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>구매자들의 후기</Text>
              {loading ? (
                <ActivityIndicator size="small" color="#87CEEB" />
              ) : buyerReviews.length ? (
                <ScrollView style={styles.reviewList}>
                  {buyerReviews.map((r, i) => (
                    <View key={i} style={styles.reviewItem}>
                      <View style={styles.reviewHeader}>
                        {renderStars(r.rating)}
                        <Text style={styles.reviewRatingText}>{r.rating}점</Text>
                      </View>
                      <Text style={styles.reviewComment}>{r.comment}</Text>
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
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContainer: { width: '90%', height: '80%', backgroundColor: '#fff', borderRadius: 12, padding: 20 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  profileImage: { width: 70, height: 70, borderRadius: 35 },
  profileImagePlaceholder: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#ccc', justifyContent: 'center', alignItems: 'center' },
  userInfo: { flex: 1, marginLeft: 15, justifyContent: 'center' },
  nickname: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  starsContainer: { flexDirection: 'row', marginTop: 5 },
  averageRating: { fontSize: 16, color: '#666', marginTop: 3 },
  closeButton: { padding: 5 },
  reviewsWrapper: { flex: 1 },
  sectionContainer: { flex: 1, paddingTop: 10 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#333', marginBottom: 8 },
  reviewList: { flex: 1 },
  reviewItem: { backgroundColor: '#f8f8f8', borderRadius: 8, padding: 12, marginBottom: 10 },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  reviewRatingText: { fontSize: 14, color: '#666', marginLeft: 5 },
  reviewComment: { fontSize: 16, color: '#444' },
  noReviewText: { fontSize: 16, color: '#999', marginTop: 20, textAlign: 'center' },
  dividerHorizontal: { height: 1, backgroundColor: '#ccc', marginVertical: 5 },
});
