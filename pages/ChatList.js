// pages/ChatList.js
// 탭네비게이터에서 채팅 탭 화면, 나의 채팅방 목록을 보여주는 컴포넌트

import React, { useEffect, useState, useCallback } from 'react';
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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import axiosInstance from '../api/axios';
import { useSelector } from 'react-redux';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { showToast } from '../state/toastUtil';
import config from '../api/config';

const LAST_SEEN_KEY = 'CHAT_LAST_SEEN_MAP';
const HIDDEN_KEY = 'HIDDEN_CHATROOMS';
const SHOW_HIDDEN_KEY = 'SHOW_HIDDEN_CHATROOMS';

function isLikelyImageUri(str = '') {
  return (
    str.startsWith('file://') ||
    str.startsWith('content://') ||
    str.startsWith('data:image') ||
    /\.(jpeg|jpg|gif|png|bmp)$/i.test(str)
  );
}

export default function ChatList() {
  const navigation    = useNavigation();
  const isFocused     = useIsFocused();
  const currentUserId = useSelector((s) => s.auth.user.id);
  const isLoggedIn    = useSelector((s) => s.auth.isLoggedIn);

  const [chatRooms,   setChatRooms]    = useState([]);
  const [loading,     setLoading]      = useState(false);
  const [refreshing,  setRefreshing]   = useState(false);
  const [lastSeenMap, setLastSeenMap]  = useState({});
  const [showHidden,  setShowHidden]   = useState(false);

  const loadLastSeen = useCallback(async () => {
    try {
      const json = await AsyncStorage.getItem(LAST_SEEN_KEY);
      if (json) setLastSeenMap(JSON.parse(json));
    } catch (e) {
      console.warn('load lastSeen failed', e);
    }
  }, []);

  const saveLastSeen = useCallback(async (map) => {
    try {
      await AsyncStorage.setItem(LAST_SEEN_KEY, JSON.stringify(map));
    } catch (e) {
      console.warn('save lastSeen failed', e);
    }
  }, []);

  const loadShowHidden = useCallback(async () => {
    try {
      const flag = await AsyncStorage.getItem(SHOW_HIDDEN_KEY);
      setShowHidden(flag === 'true');
    } catch {}
  }, []);

  useEffect(() => {
    loadLastSeen();
    loadShowHidden();
  }, [loadLastSeen, loadShowHidden]);

  useEffect(() => {
    if (isLoggedIn) fetchChatRooms();
    else setChatRooms([]);
  }, [isLoggedIn]);

  useEffect(() => {
    if (isFocused && isLoggedIn) fetchChatRooms();
  }, [isFocused, isLoggedIn]);

  const fetchChatRooms = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(`/api/users/${currentUserId}/chatrooms`);
      const rooms = res.data || [];

      const enriched = await Promise.all(
        rooms.map(async (room) => {
          let lastMsg = null;
          try {
            const msgRes = await axiosInstance.get(
              `/api/chatroom/${room.id}/recent?size=1`
            );
            lastMsg = msgRes.data?.[0] || null;
          } catch {}

          let productTitle = '',
            productPrice = '',
            productImage = '';
          try {
            const cursor = room.postId + 1;
            const postRes = await axiosInstance.get(`/api/posts/before/${cursor}`, {
              params: { size: 1 },
            });
            const post = postRes.data?.[0];
            if (post) {
              productTitle = post.title || '';
              productPrice = String(post.price || '');
              if (post.images?.length) {
                productImage = `${config.BASE_URL}/images/${post.images[0].imageUrl}`;
              }
            }
          } catch {}

          return { ...room, lastMsg, productTitle, productPrice, productImage };
        })
      );

      enriched.sort((a, b) => {
        const atA = a.lastMsg?.sentAt ? new Date(a.lastMsg.sentAt).getTime() : 0;
        const atB = b.lastMsg?.sentAt ? new Date(b.lastMsg.sentAt).getTime() : 0;
        return atB - atA;
      });

      let hidden = [];
      try {
        const j = await AsyncStorage.getItem(HIDDEN_KEY);
        hidden = j ? JSON.parse(j) : [];
      } catch {}

      const visibleRooms = showHidden
        ? enriched
        : enriched.filter((room) => !hidden.includes(room.id));

      setChatRooms(visibleRooms);
    } catch (err) {
      console.error(err);
      showToast('채팅 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchChatRooms();
    setRefreshing(false);
  };

  const toggleShowHidden = async () => {
    const next = !showHidden;
    setShowHidden(next);
    await AsyncStorage.setItem(SHOW_HIDDEN_KEY, next ? 'true' : 'false');
    showToast(next ? '숨긴 채팅방 숨기기' : '숨긴 채팅방 보이기');
    fetchChatRooms();
  };

  const handleRoomPress = async (room) => {
    const lastId = room.lastMsg?.id;
    if (lastId) {
      const updated = { ...lastSeenMap, [room.id]: lastId };
      setLastSeenMap(updated);
      await saveLastSeen(updated);
    }

    const isSeller = room.seller?.id === currentUserId;
    const partner = isSeller ? room.buyer : room.seller;
    const roomName = partner?.nickname || '상대방';

    navigation.navigate('Chat', {
      roomId: room.id,
      roomName,
      postId: room.postId,
      productTitle: room.productTitle,
      productPrice: room.productPrice,
      productImage: room.productImage,
      saleStatus: room.status,
      sellerId: room.seller?.id,
      buyerId: room.buyer?.id,
    });
  };

  const renderItem = ({ item }) => {
    const isSeller = item.seller?.id === currentUserId;
    const partner = isSeller ? item.buyer : item.seller;
    const partnerName = partner?.nickname || '상대방';
    const profileUrl = partner?.profileImageUrl
      ? `${config.BASE_URL}/images/profile/${partner.profileImageUrl.replace(
          '/profile/',
          ''
        )}`
      : `https://via.placeholder.com/80/87CEEB/000000?text=${encodeURIComponent(
          partnerName.slice(0, 2)
        )}`;

    let recentMsg = '새로운 채팅방입니다.';
    if (item.lastMsg) {
      const content = item.lastMsg.content || '';
      recentMsg = isLikelyImageUri(content) ? '사진 파일' : content;
    }

    let timeLine = '';
    if (item.lastMsg?.sentAt) {
      const d = new Date(item.lastMsg.sentAt);
      timeLine = `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(
        2,
        '0'
      )}:${String(d.getMinutes()).padStart(2, '0')}`;
    }

    const lastSeenId = lastSeenMap[item.id] || 0;
    const unread = item.lastMsg?.id > lastSeenId;

    return (
      <TouchableOpacity style={styles.card} onPress={() => handleRoomPress(item)}>
        <View style={styles.left}>
          <Image source={{ uri: profileUrl }} style={styles.avatar} />
          {unread && <View style={styles.unreadBadge} />}
        </View>

        <View style={styles.middle}>
          <Text style={styles.name}>{partnerName}</Text>
          <Text style={styles.message} numberOfLines={1}>
            {recentMsg}
          </Text>
          {item.productTitle ? (
            <View style={styles.productRow}>
              {item.productImage ? (
                <Image source={{ uri: item.productImage }} style={styles.productThumb} />
              ) : null}
              <View style={styles.productInfo}>
                <Text style={styles.productTitle} numberOfLines={1}>
                  {item.productTitle}
                </Text>
                <Text style={styles.productPrice}>
                  {Number(item.productPrice).toLocaleString()}원
                </Text>
              </View>
            </View>
          ) : null}
        </View>

        <View style={styles.right}>
          <Text style={styles.time}>{timeLine}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (!isLoggedIn) {
    return (
      <SafeAreaView
        style={[styles.safeArea, Platform.OS === 'android' && { paddingTop: StatusBar.currentHeight }]}
      >
        <View style={[styles.header, { height: 60, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
          <Text style={styles.headerTitle}>채팅</Text>
          <View style={{ width: 32 }} />
        </View>
        <View style={styles.center}>
          <MaterialCommunityIcons name="account-circle-outline" size={80} color="#ccc" />
          <Text style={styles.loginText}>
            <Text style={styles.loginLink} onPress={() => navigation.navigate('Login')}>
              로그인
            </Text>
            이 필요합니다.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.safeArea, Platform.OS === 'android' && { paddingTop: StatusBar.currentHeight }]}
    >
      <View style={[styles.header, { height: 60, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
        <Text style={styles.headerTitle}>채팅</Text>
        {/* <TouchableOpacity onPress={toggleShowHidden} style={{ padding: 8 }}>
          <MaterialCommunityIcons
            name={showHidden ? 'eye-off-outline' : 'eye-outline'}
            size={24}
            color="#000"
          />
        </TouchableOpacity> */}
      </View>

      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#87CEEB" />
        </View>
      ) : chatRooms.length === 0 ? (
        <View style={styles.center}>
          <MaterialCommunityIcons name="chat-outline" size={60} color="#ccc" />
          <Text style={styles.emptyText}>채팅 목록이 비어있습니다.</Text>
        </View>
      ) : (
        <FlatList
          data={chatRooms}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#87CEEB" />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },

  header: {
    backgroundColor: '#87CEEB',
    borderBottomWidth: 1,
    borderColor: '#ccc',
    paddingHorizontal: 16,
  },
  headerTitle: { fontSize: 20, fontWeight: '600', color: '#000' },

  list: { padding: 16 },

  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fafafa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    elevation: 1,
  },
  left: { position: 'relative' },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  unreadBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ff3b30',
  },

  middle: { flex: 1, marginHorizontal: 12 },
  name: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  message: { fontSize: 14, color: '#666', marginTop: 4 },

  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: '#fff',
    borderRadius: 6,
    padding: 6,
  },
  productThumb: { width: 40, height: 40, borderRadius: 4, marginRight: 8 },
  productInfo: { flex: 1 },
  productTitle: { fontSize: 13, color: '#333' },
  productPrice: { fontSize: 12, color: '#888', marginTop: 2 },

  right: { alignItems: 'flex-end' },
  time: { fontSize: 12, color: '#999' },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loginText: { fontSize: 18, color: '#666', marginTop: 12, textAlign: 'center' },
  loginLink: { color: '#007bff', textDecorationLine: 'underline' },
  emptyText: { fontSize: 18, color: '#666', marginTop: 12, textAlign: 'center' },
});
