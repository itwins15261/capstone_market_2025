// pages/MyPost.js
// 판매내역 페이지 컴포넌트, 내가 작성한 판매글만 모아보는 화면면

import React, { useState, useEffect, useLayoutEffect } from 'react';
import {
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Platform,
  StatusBar,
  Image,
} from 'react-native';
import { useSelector } from 'react-redux';
import axiosInstance from '../api/axios';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { showToast } from '../state/toastUtil';
import config from '../api/config';

const formatPrice = (price) =>
  price ? parseInt(price, 10).toLocaleString() + '원' : '';
const formatDate = (dateString) => {
  const d = new Date(dateString);
  return d.toLocaleDateString();
};

export default function MyPost({ navigation }) {
  useLayoutEffect(() => {
    const parent = navigation.getParent();
    parent?.setOptions({ tabBarStyle: { display: 'none' } });
    return () => {
      parent?.setOptions({ tabBarStyle: undefined });
    };
  }, [navigation]);

  const currentUserId = useSelector((s) => s.auth.user.id);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await axiosInstance.get('/api/posts', {
          params: { page: 0, size: 100 },
        });
        const allPosts = Array.isArray(res.data.content)
          ? res.data.content
          : [];
        const myPosts = allPosts.filter(
          (p) => p.user && p.user.id === currentUserId
        );
        setPosts(myPosts);
      } catch (e) {
        console.error(e);
        showToast('판매내역 불러오기 실패');
      } finally {
        setLoading(false);
      }
    })();
  }, [currentUserId]);

  const renderItem = ({ item }) => {
    const firstImage =
      item.images && item.images.length > 0
        ? `${config.BASE_URL}/images/${item.images[0].imageUrl}`
        : 'https://via.placeholder.com/150';

    return (
      <TouchableOpacity
        style={styles.itemContainer}
        activeOpacity={0.8}
        onPress={() =>
          navigation.navigate('ProductDetail', { postId: item.id })
        }
      >
        <Image source={{ uri: firstImage }} style={styles.itemImage} />
        <View style={styles.infoContainer}>
          <Text style={styles.itemTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.itemPrice}>{formatPrice(item.price)}</Text>
          <View style={styles.rowBetween}>
            <View style={styles.dateContainer}>
              <Text style={styles.itemDate}>{formatDate(item.createdAt)}</Text>
              <Text style={styles.itemDate}>
                {`조회수: ${item.viewCount || 0}`}
              </Text>
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
                {item.status === 0
                  ? '판매중'
                  : item.status === 1
                  ? '예약중'
                  : '판매완료'}
              </Text>
            </View>
          </View>
          <View style={styles.countContainer}>
            <View style={styles.countItem}>
              <MaterialCommunityIcons
                name="message-outline"
                size={16}
                color="#666"
              />
              <Text style={styles.countText}>{item.chatCount || 0}</Text>
            </View>
            <View style={styles.countItem}>
              <MaterialCommunityIcons
                name="heart-outline"
                size={16}
                color="#666"
              />
              <Text style={styles.countText}>
                {item.wishlistCount || 0}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
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

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* 앱바 */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{ width: 24 }}
          >
            <MaterialCommunityIcons
              name="arrow-left"
              size={24}
              color="#000"
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>판매내역</Text>
          <View style={{ width: 24 }} />
        </View>
      </View>

      {posts.length === 0 ? (
        <View style={[styles.center, { marginTop: 100 }]}>
          <MaterialCommunityIcons
            name="cart-off"
            size={64}
            color="#ccc"
          />
          <Text style={{ marginTop: 10, color: '#999' }}>
            판매 내역이 없습니다.
          </Text>
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // safeArea: { flex: 1, backgroundColor: '#fff' },
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    height: 60,
    backgroundColor: '#87CEEB',
    borderBottomWidth: 1,
    borderColor: '#ddd',
    justifyContent: 'center',
    paddingHorizontal: 15,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#000' },

  listContainer: { paddingHorizontal: 15, paddingBottom: 30 },

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
  itemImage: {
    width: 90,
    height: 90,
    borderRadius: 8,
    backgroundColor: '#eee',
    marginRight: 12,
  },
  infoContainer: { flex: 1 },
  itemTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  itemPrice: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginVertical: 4,
  },

  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateContainer: { flexDirection: 'column' },
  itemDate: { fontSize: 13, color: '#999' },

  statusBadge: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 },
  statusBadgeText: { fontSize: 12, fontWeight: '600' },

  countContainer: {
    flexDirection: 'row',
    marginTop: 8,
    justifyContent: 'flex-end',
  },
  countItem: { flexDirection: 'row', alignItems: 'center', marginLeft: 15 },
  countText: { fontSize: 14, color: '#666', marginLeft: 3 },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
