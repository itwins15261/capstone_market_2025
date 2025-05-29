// pages/Chat.js
// 채팅방 화면 컴포넌트, WebSocket을 통해 실시간 채팅 기능을 구현

import React, { useState, useEffect, useRef } from 'react';
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
  Modal,
  Dimensions,
} from 'react-native';
import { IconButton } from 'react-native-paper';
import { useRoute, useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import UserReportModal from '../components/UserReportModal';
import SaleStatusModal from '../components/SaleStatusModal';
import RateModal from '../components/RateModal';
import axiosInstance from '../api/axios';
import { useSelector } from 'react-redux';
import { showToast } from '../state/toastUtil';
import config from '../api/config';

// 채팅방 나가기 -> 로컬에서만 채팅방 숨기기
const HIDDEN_KEY = 'HIDDEN_CHATROOMS';
const { width: SCREEN_WIDTH } = Dimensions.get('window');

function saleStatusText(value) {
  switch (value) {
    case 0:
      return '판매중';
    case 1:
      return '예약중';
    case 2:
      return '판매완료';
    default:
      return '알 수 없음';
  }
}
const isImageUrl = (url) =>
  url?.startsWith('data:image') ||
  /\.(jpeg|jpg|gif|png|bmp|webp)$/i.test(url || '');

const formatTime = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
};

export default function Chat() {
  const route = useRoute();
  const navigation = useNavigation();

  const {
    roomId,
    roomName,
    productTitle,
    productPrice,
    productImage,
    postId,
    sellerId,
    buyerId,
    saleStatus: initialSaleStatus,
  } = route.params || {};

  const token = useSelector((s) => s.auth.token);
  const currentUserId = useSelector((s) => s.auth.user.id);
  const isLoggedIn = useSelector((s) => s.auth.isLoggedIn);

  const [productInfo] = useState({
    title: productTitle,
    price: productPrice,
    image: productImage,
  });
  // 초기값만 route.params 로 세팅, 이후 백엔드 GET 으로 업데이트하지 않음
  const [saleStatus, setSaleStatus] = useState(initialSaleStatus ?? 0);

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [chatMenuVisible, setChatMenuVisible] = useState(false);
  const [isProductInfoExpanded, setProductInfoExpanded] = useState(false);
  const [rateModalVisible, setRateModalVisible] = useState(false);
  const [rateItem, setRateItem] = useState(null);
  const [saleStatusModalVisible, setSaleStatusModalVisible] = useState(false);

  // 전체화면 이미지
  const [fullScreenVisible, setFullScreenVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  const wsRef = useRef(null);
  const flatListRef = useRef(null);

  useEffect(() => {
    if (!roomId || !isLoggedIn) return;
    fetchRecentMessages();
    connectWebSocket();
    return () => wsRef.current?.close();
  }, [roomId, isLoggedIn]);

  const fetchRecentMessages = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get(`/api/chatroom/${roomId}/recent?size=100`);
      setMessages((res.data || []).reverse());
    } catch (e) {
      console.error(e);
      showToast('채팅 내역을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const connectWebSocket = () => {
    try {
      const ws = new WebSocket(`${config.WS_URL}/ws/chat/${roomId}`, [], {
        headers: { Authorization: `Bearer ${token}` },
      });
      wsRef.current = ws;
      ws.onopen = () => console.log('WebSocket connected');
      ws.onclose = () => console.log('WebSocket closed');
      ws.onerror = (err) => console.log('WebSocket error:', err);
      ws.onmessage = (evt) => {
        let data;
        try {
          data = JSON.parse(evt.data);
        } catch {
          data = { content: evt.data };
        }
        setMessages((prev) => [...prev, data]);
      };
    } catch (err) {
      console.error(err);
    }
  };

  const handleSend = () => {
    if (!newMessage.trim() || !wsRef.current) return;
    wsRef.current.send(newMessage.trim());
    setNewMessage('');
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      return alert('갤러리 접근 권한이 필요합니다.');
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      base64: true,
      quality: 0.6,
    });
    if (result.canceled || !result.assets?.length) return;

    const asset = result.assets[0];
    const extMatch = asset.uri.match(/\.(\w+)$/);
    const ext = (extMatch ? extMatch[1] : 'jpeg').toLowerCase();
    const dataUri = `data:image/${ext};base64,${asset.base64}`;
    wsRef.current?.send(dataUri);
  };

  // 채팅방 숨기기, 로컬에서만 제거됨
  const handleLeaveChat = async () => {
  try {
    const json = await AsyncStorage.getItem(HIDDEN_KEY);
    const hidden = json ? JSON.parse(json) : [];
    if (!hidden.includes(roomId)) {
      hidden.push(roomId);
      await AsyncStorage.setItem(HIDDEN_KEY, JSON.stringify(hidden));
    }
  } catch (e) {
    console.error('숨김 채팅방 저장 실패', e);
  }
  showToast('채팅방을 나갔습니다.');
  navigation.goBack();
};


  // 리뷰 작성하기, 클릭 시에만 GET /api/post/{postId} 호출
  const handleReview = async () => {
    try {
      const res = await axiosInstance.get(`/api/post/${postId}`);
      const status = res.data.status;
      if (status !== 2) {
        showToast('판매완료된 상품에 대해서만 리뷰를 작성할 수 있습니다.');
        return;
      }
      const revieweeId = currentUserId === sellerId ? buyerId : sellerId;
      setRateItem({ title: productInfo.title, postId, revieweeId });
      setRateModalVisible(true);
    } catch (err) {
      console.error(err);
      showToast('판매 상태를 확인하지 못했습니다.');
    }
  };

  const handlePressSaleStatus = async () => {
    setChatMenuVisible(false);
    try {
      // 실제 포스트의 최신 상태를 가져와서
      const res = await axiosInstance.get(`/api/post/${postId}`);
      // saleStatus 상태에 반영 (모달창 열때 현재의 판매 상태를 보여주기 위함)
      setSaleStatus(res.data.status);
    } catch (err) {
      console.error(err);
      showToast('판매 상태를 불러오지 못했습니다.');
    }
    // 그 다음 모달 열기
    setSaleStatusModalVisible(true);
  };
  const handleChangeSaleStatus = async (value) => {
    try {
      await axiosInstance.patch(`/api/post/${postId}`, null, {
        params: { status: value },
      });
      setSaleStatus(value);
      showToast(`판매 상태가 "${saleStatusText(value)}" 으로 변경되었습니다.`);
    } catch (err) {
      console.error(err);
      showToast('판매 상태 변경에 실패했습니다.');
    } finally {
      setSaleStatusModalVisible(false);
    }
  };

  const renderItem = ({ item }) => {
    let parsed = item;
    if (typeof item === 'string') {
      try {
        parsed = JSON.parse(item);
      } catch {
        parsed = { content: item };
      }
    }
    if (!parsed.content) parsed = { content: String(parsed) };

    const isMe = parsed.sender?.id === currentUserId;
    const isImage = isImageUrl(parsed.content);
    const timeString = formatTime(parsed.sentAt);

    return (
      <View
        style={[
          styles.messageWrapper,
          isMe ? { alignSelf: 'flex-end' } : { alignSelf: 'flex-start' },
        ]}
      >
        {isMe ? (
          <>
            <Text style={styles.timestamp}>{timeString}</Text>
            <View style={[styles.bubble, styles.myBubble]}>
              {isImage ? (
                <TouchableOpacity
                  onPress={() => {
                    setSelectedImage(parsed.content);
                    setFullScreenVisible(true);
                  }}
                >
                  <Image source={{ uri: parsed.content }} style={styles.chatImage} />
                </TouchableOpacity>
              ) : (
                <Text style={styles.messageText}>{parsed.content}</Text>
              )}
            </View>
          </>
        ) : (
          <>
            <View style={[styles.bubble, styles.otherBubble]}>
              {isImage ? (
                <TouchableOpacity
                  onPress={() => {
                    setSelectedImage(parsed.content);
                    setFullScreenVisible(true);
                  }}
                >
                  <Image source={{ uri: parsed.content }} style={styles.chatImage} />
                </TouchableOpacity>
              ) : (
                <Text style={styles.messageText}>{parsed.content}</Text>
              )}
            </View>
            <Text style={styles.timestamp}>{timeString}</Text>
          </>
        )}
      </View>
    );
  };

  const handleBgPress = () => chatMenuVisible && setChatMenuVisible(false);

  // 채팅방 메뉴, 판매자일 때와 구매자일 때 메뉴가 다름
  const menuItems =
    currentUserId === sellerId
      ? [
          { id: '0', label: '판매 상태 변경', icon: 'store-edit', onPress: handlePressSaleStatus },
          { id: '1', label: '리뷰 작성하기', icon: 'star-outline', onPress: handleReview },
          { id: '2', label: '채팅방 나가기', icon: 'exit-to-app', onPress: handleLeaveChat },
        ]
      : [
          { id: '0', label: '리뷰 작성하기', icon: 'star-outline', onPress: handleReview },
          { id: '1', label: '채팅방 나가기', icon: 'exit-to-app', onPress: handleLeaveChat },
        ];

  const displayTitle = productInfo.title || '상품 정보 없음';
  const displayPrice =
    productInfo.price == null
      ? '가격 정보 없음'
      : `${Number(productInfo.price).toLocaleString()}원`;
  const displayImage = productInfo.image || 'https://via.placeholder.com/80';

  return (
    <TouchableWithoutFeedback onPress={handleBgPress}>
      <SafeAreaView style={styles.safeArea}>
        {/* 헤더 */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.leftHeader}>
              <TouchableOpacity onPress={() => navigation.goBack()}>
                <MaterialCommunityIcons name="arrow-left" size={24} color="black" />
              </TouchableOpacity>
              <Text style={styles.userNickname}>
                {roomName ? `${roomName} 님과의 채팅방` : '채팅방'}
              </Text>
              {/*}
              <TouchableOpacity
                onPress={() => setReportModalVisible(true)}
                style={styles.reportButton}
              >
                <MaterialCommunityIcons name="account-alert" size={24} color="red" />
              </TouchableOpacity>
              */}
            </View>
            <View style={styles.rightHeader}>
              <TouchableOpacity
                onPress={() => setChatMenuVisible(!chatMenuVisible)}
                style={styles.menuButton}
              >
                <MaterialCommunityIcons name="dots-vertical" size={24} color="black" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* 메뉴 */}
        {chatMenuVisible && (
          <View
            style={[
              styles.menuContainer,
              {
                top:
                  60 + (Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0),
              },
            ]}
          >
            {menuItems.map((item, idx) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.menuItem,
                  idx === menuItems.length - 1 && { borderBottomWidth: 0 },
                ]}
                onPress={() => {
                  setChatMenuVisible(false);
                  item.onPress();
                }}
              >
                <View style={styles.menuItemRow}>
                  <MaterialCommunityIcons
                    name={item.icon}
                    size={20}
                    style={styles.menuIcon}
                    color="#666"
                  />
                  <Text style={styles.menuText}>{item.label}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* 상품 정보 토글 */}
        {isProductInfoExpanded && (
          <View style={styles.productInfoPanelModern}>
            <View style={styles.productInfoRowModern}>
              <Image source={{ uri: displayImage }} style={styles.productThumbnailModern} />
              <View style={styles.productDetailsModern}>
                <Text style={styles.productTitleModern}>{displayTitle}</Text>
                <Text style={styles.productPriceModern}>{displayPrice}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.goToPostButtonModern}
              onPress={() => navigation.navigate('ProductDetail', { postId })}
            >
              <Text style={styles.goToPostButtonTextModern}>판매글로 이동</Text>
            </TouchableOpacity>
          </View>
        )}
        <TouchableOpacity
          onPress={() => setProductInfoExpanded(!isProductInfoExpanded)}
          style={styles.productInfoToggle}
        >
          <Text style={styles.productInfoToggleText}>
            {isProductInfoExpanded ? '접기 ▲' : '상품 정보 펼치기 ▼'}
          </Text>
        </TouchableOpacity>

        {/* 채팅 목록 & 입력 */}
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={80}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#87CEEB" />
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item, index) =>
                item.id ? item.id.toString() : `msg-${index}`
              }
              renderItem={renderItem}
              style={styles.flatList}
              contentContainerStyle={styles.chatContainer}
              onContentSizeChange={() =>
                flatListRef.current?.scrollToEnd({ animated: true })
              }
            />
          )}
          <View style={styles.inputContainer}>
            {/* <IconButton
              icon="image-multiple"
              size={24}
              onPress={handlePickImage}
              style={styles.iconButton}
            /> */}
            <TextInput
              style={styles.textInput}
              value={newMessage}
              onChangeText={setNewMessage}
              placeholder="메시지 입력"
            />
            <IconButton icon="send" size={24} onPress={handleSend} style={styles.iconButton} />
          </View>
        </KeyboardAvoidingView>

        {/* 모달들, UserReportModal.js는 미사용 */}
        <UserReportModal
          visible={reportModalVisible}
          onClose={() => setReportModalVisible(false)}
        />
        <SaleStatusModal
          visible={saleStatusModalVisible}
          onClose={() => setSaleStatusModalVisible(false)}
          saleStatus={saleStatus}
          setSaleStatus={setSaleStatus}
          onChangeStatus={handleChangeSaleStatus}
        />
        {rateModalVisible && (
          <RateModal visible={rateModalVisible} onClose={() => setRateModalVisible(false)} item={rateItem} />
        )}

        {/* 전체화면 이미지 모달 */}
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
              <Image
                source={{ uri: selectedImage }}
                style={styles.fullScreenImage}
                resizeMode="contain"
              />
            )}
          </SafeAreaView>
        </Modal>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    backgroundColor: '#87CEEB',
    borderBottomWidth: 1,
    borderColor: '#ddd',
    paddingHorizontal: 15,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 1000,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'space-between',
  },
  leftHeader: { flexDirection: 'row', alignItems: 'center' },
  rightHeader: {},
  userNickname: { marginLeft: 8, fontSize: 16, fontWeight: '500', color: '#000' },
  reportButton: { padding: 5, marginLeft: 8 },
  menuButton: { padding: 5 },
  menuContainer: {
    position: 'absolute',
    right: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    elevation: 5,
    shadowColor: Platform.OS === 'ios' ? '#000' : undefined,
    shadowOpacity: Platform.OS === 'ios' ? 0.2 : undefined,
    shadowOffset: Platform.OS === 'ios' ? { width: 0, height: 2 } : undefined,
    shadowRadius: Platform.OS === 'ios' ? 4 : undefined,
    zIndex: 1100,
  },
  menuItem: { paddingVertical: 10, paddingHorizontal: 15, borderBottomWidth: 1, borderColor: '#eee' },
  menuItemRow: { flexDirection: 'row', alignItems: 'center' },
  menuIcon: { marginRight: 10 },
  menuText: { fontSize: 16, color: '#333' },

  productInfoPanelModern: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginHorizontal: 15,
    marginVertical: 10,
    elevation: 3,
    shadowColor: Platform.OS === 'ios' ? '#000' : undefined,
    shadowOffset: Platform.OS === 'ios' ? { width: 0, height: 2 } : undefined,
    shadowOpacity: Platform.OS === 'ios' ? 0.1 : undefined,
    shadowRadius: Platform.OS === 'ios' ? 4 : undefined,
  },
  productInfoRowModern: { flexDirection: 'row', alignItems: 'center' },
  productThumbnailModern: { width: 80, height: 80, borderRadius: 8, backgroundColor: '#eee' },
  productDetailsModern: { flex: 1, marginLeft: 15 },
  productTitleModern: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  productPriceModern: { fontSize: 16, color: '#888' },
  goToPostButtonModern: {
    marginTop: 15,
    backgroundColor: '#87CEEB',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  goToPostButtonTextModern: { fontSize: 16, color: '#000', fontWeight: 'bold' },
  productInfoToggle: { padding: 5, alignItems: 'flex-end' },
  productInfoToggleText: { fontSize: 14, color: '#007bff' },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  flatList: { flex: 1 },
  chatContainer: { padding: 10 },

  messageWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginVertical: 5,
  },
  bubble: {
    maxWidth: '70%',
    padding: 10,
    borderRadius: 10,
  },
  myBubble: {
    backgroundColor: '#f0f0f0',
  },
  otherBubble: {
    backgroundColor: '#87CEEB',
  },
  messageText: { fontSize: 16, color: '#000' },
  chatImage: { width: 150, height: 150, resizeMode: 'cover', borderRadius: 8 },
  timestamp: {
    fontSize: 12,
    color: '#999',
    marginHorizontal: 5,
  },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    paddingHorizontal: 5,
    paddingVertical: 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 5,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  iconButton: { marginHorizontal: 5 },

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
});
