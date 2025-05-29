// pages/Home.js
// 앱의 가장 첫 화면, 탭 네비게이터의 홈 탭

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
  Animated,
  Platform,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
  TouchableWithoutFeedback,
  TextInput,
  Alert,
  BackHandler,
} from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { FAB, IconButton } from 'react-native-paper';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../state/authSlice';
import { showToast } from '../state/toastUtil';
import axiosInstance from '../api/axios';
import config from '../api/config';

const formatPrice = (price) => {
  // price가 null 또는 undefined일 때만 빈 문자열
  if (price === null || price === undefined) return '';
  return parseInt(price, 10).toLocaleString() + '원';
};

const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString();
};

export default function Home() {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const isLoggedIn = useSelector((state) => state.auth.isLoggedIn);

  // 검색 관련 상태 추가
  const [searchActive, setSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [sortOpen, setSortOpen] = useState(false);
  const [sortValue, setSortValue] = useState('latest');
  const [sortItems, setSortItems] = useState([
    { label: '최신순', value: 'latest' },
    { label: '조회순', value: 'viewCount' },
  ]);

  const [refreshing, setRefreshing] = useState(false);
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [showMenu, setShowMenu] = useState(false);

  const scrollY = useRef(new Animated.Value(0)).current;
  const clampedScroll = useRef(
    Animated.diffClamp(
      scrollY,
      0,
      120 + (Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0)
    )
  ).current;
  const headerTranslateY = clampedScroll.interpolate({
    inputRange: [0, 120 + (Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0)],
    outputRange: [0, -(60 + (Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0))],
    extrapolate: 'clamp',
  });

  const flatListRef = useRef(null);

  useEffect(() => {
    fetchPosts(0);
  }, []);

  const fetchPosts = async (pageToFetch) => {
    try {
      if (pageToFetch === 0) setLoading(true);
      const response = await axiosInstance.get('/api/posts', {
        params: { page: pageToFetch, size: 10 },
      });
      const data = response.data || {};
      const content = Array.isArray(data.content) ? data.content.filter((i) => i) : [];
      if (pageToFetch === 0) setPosts(content);
      else setPosts((prev) => [...prev, ...content]);
      setTotalPages(data.totalPages || 1);
      setPage(pageToFetch);
    } catch (error) {
      console.error('Error fetching posts:', error);
      showToast('게시글을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchPosts(0);
    showToast('새로고침 완료!');
  };

  const loadMoreData = () => {
    if (page + 1 < totalPages && !loadingMore) {
      setLoadingMore(true);
      fetchPosts(page + 1);
    }
  };

  const validPosts = posts.filter((i) => i);
  const sortedData = [...validPosts].sort((a, b) =>
    sortValue === 'latest'
      ? new Date(b.createdAt) - new Date(a.createdAt)
      : b.viewCount - a.viewCount
  );

  // 검색어에 따라 게시글 필터링
  const displayedData = searchQuery
    ? sortedData.filter(
        (item) =>
          item.title.includes(searchQuery) ||
          (item.content && item.content.includes(searchQuery))
      )
    : sortedData;

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    {
      listener: () => {
        if (sortOpen) setSortOpen(false);
      },
      useNativeDriver: false,
    }
  );

  const renderItem = ({ item }) => {
    if (!item) return null;
    const firstImage =
      item.images && item.images.length > 0
        ? `${config.BASE_URL}/images/${item.images[0].imageUrl}`
        : 'https://via.placeholder.com/150';

    // 가격이 0원이면 나눔중, 나눔완료라고 표시 (아니면 판매중, 판매완료)
    const statusLabel = (() => {
      if (item.price === 0) {
        switch (item.status) {
          case 0: return '나눔중';
          case 1: return '예약중';
          case 2: return '나눔완료';
          default: return '';
        }
      } else {
        switch (item.status) {
          case 0: return '판매중';
          case 1: return '예약중';
          case 2: return '판매완료';
          default: return '';
        }
      }
    })();


    return (
      <TouchableOpacity
        style={styles.itemContainer}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('ProductDetail', { postId: item.id })}
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
              <Text style={styles.itemDate}>{`조회수: ${item.viewCount || 0}`}</Text>
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
                {statusLabel}
              </Text>
            </View>
          </View>
          <View style={styles.countContainer}>
            {/* <View style={styles.countItem}>
              <MaterialCommunityIcons name="message-outline" size={16} color="#666" />
              <Text style={styles.countText}>{item.chatCount || 0}</Text>
            </View> */}
            <View style={styles.countItem}>
              <MaterialCommunityIcons name="heart-outline" size={16} color="#666" />
              <Text style={styles.countText}>{item.wishlistCount || 0}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const handleWritePress = () => {
    if (!isLoggedIn) {
      showToast('로그인 후 이용 가능합니다.');
      return;
    }
    navigation.navigate('Post');
  };

  const scrollToTop = () => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  const [showScrollTop, setShowScrollTop] = useState(false);
  useEffect(() => {
    const listenerId = scrollY.addListener(({ value }) => {
      if (value > 500 && !showScrollTop) setShowScrollTop(true);
      else if (value <= 500 && showScrollTop) setShowScrollTop(false);
    });
    return () => scrollY.removeListener(listenerId);
  }, [scrollY, showScrollTop]);

  const handleAuthPress = () => {
    if (isLoggedIn) {
      dispatch(logout());
      showToast('로그아웃되었습니다.');
    } else {
      navigation.navigate('Login');
    }
    setShowMenu(false);
  };
  const handleExitPress = () => {
    setShowMenu(false);
    Alert.alert(
      '앱 종료',
      '앱을 종료하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        { text: '확인', onPress: () => BackHandler.exitApp() },
      ],
      { cancelable: false }
    );
  };
  const handleNoticePress = () => {
    if (isLoggedIn) navigation.navigate('Notice');
    else showToast('로그인 이후 이용 가능합니다.');
    setShowMenu(false);
  };
  const handleThemePress = () => {
    showToast('아직 미구현입니다.');
    setShowMenu(false);
  };

  return (
    <TouchableWithoutFeedback
      onPress={() => {
        if (sortOpen) setSortOpen(false);
        if (showMenu) setShowMenu(false);
        // 검색 중일 때 입력란 바깥 터치 시 검색 끄기
        if (searchActive) {
          setSearchActive(false);
          setSearchQuery('');
        }
      }}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* 앱바 */}
        <Animated.View
          style={[
            styles.header,
            {
              height: 60 + (Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0),
              transform: [{ translateY: headerTranslateY }],
            },
          ]}
        >
          <View
            style={[
              styles.headerContent,
              { marginTop: Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0 },
            ]}
          >
            {searchActive ? (
              <>
                <IconButton
                  icon="arrow-left"
                  size={24}
                  onPress={() => { setSearchActive(false); setSearchQuery(''); }}
                  color="black"
                />
                <TextInput
                  style={styles.searchInput}
                  placeholder="검색어를 입력하세요"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoFocus
                />
                <IconButton
                  icon="close"
                  size={24}
                  onPress={() => { setSearchQuery(''); }}
                  color="black"
                />
              </>
            ) : (
              <>
                <Text style={styles.headerTitle}>한루미마켓</Text>
                <View style={styles.headerRight}>
                  <DropDownPicker
                    open={sortOpen}
                    value={sortValue}
                    items={sortItems}
                    setOpen={setSortOpen}
                    setValue={setSortValue}
                    setItems={setSortItems}
                    style={styles.dropdown}
                    containerStyle={{ width: 120, marginRight: 10 }}
                    dropDownContainerStyle={styles.dropdownContainer}
                    labelStyle={styles.dropdownLabel}
                    arrowIconStyle={styles.dropdownArrow}
                    tickIconStyle={styles.dropdownTick}
                    itemSeparator
                    itemSeparatorStyle={styles.dropdownSeparator}
                    placeholder="정렬"
                    zIndex={3000}
                    zIndexInverse={2000}
                    onClose={() => setSortOpen(false)}
                  />
                  <IconButton
                    icon="magnify"
                    size={24}
                    onPress={() => setSearchActive(true)}
                    style={styles.iconButton}
                    color="black"
                  />
                  <IconButton
                    icon="dots-vertical"
                    size={24}
                    onPress={() => setShowMenu(!showMenu)}
                    style={styles.iconButton}
                    color="black"
                  />
                </View>
              </>
            )}
          </View>
        </Animated.View>

        {/* 메뉴 */}
        {showMenu && (
          <View style={styles.menuContainer}>
            <TouchableOpacity style={styles.menuItem} onPress={handleAuthPress}>
              <MaterialCommunityIcons
                name={isLoggedIn ? 'logout' : 'login'}
                size={20}
                color="#333"
                style={styles.menuIcon}
              />
              <Text style={styles.menuText}>{isLoggedIn ? '로그아웃' : '로그인'}</Text>
            </TouchableOpacity>
            {/* <TouchableOpacity style={styles.menuItem} onPress={handleNoticePress}>
              <MaterialCommunityIcons
                name="bell-outline"
                size={20}
                color="#333"
                style={styles.menuIcon}
              />
              <Text style={styles.menuText}>키워드 알림</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={handleThemePress}>
              <MaterialCommunityIcons
                name="theme-light-dark"
                size={20}
                color="#333"
                style={styles.menuIcon}
              />
              <Text style={styles.menuText}>테마 변경</Text>
            </TouchableOpacity> */}
            <TouchableOpacity style={styles.menuItem} onPress={handleExitPress}>
              <MaterialCommunityIcons
                name="power"      // 또는 'exit-to-app' 등 취향에 맞게
                size={20}
                color="#333"
                style={styles.menuIcon}
              />
              <Text style={styles.menuText}>앱 종료</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 콘텐츠 */}
        {loading && page === 0 ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#87CEEB" />
          </View>
        ) : !isLoggedIn ? (
          <View style={styles.center}>
            <MaterialCommunityIcons
              name="account-circle-outline"
              size={80}
              color="#ccc"
            />
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
        ) : displayedData.length === 0 ? (
          <View style={styles.center}>
            <Text>검색된 결과가 없습니다.</Text>
          </View>
        ) : (
          <Animated.FlatList
            ref={flatListRef}
            data={displayedData}
            keyExtractor={(item, idx) => (item?.id ? item.id.toString() : idx.toString())}
            renderItem={renderItem}
            contentContainerStyle={[
              styles.listContainer,
              {
                marginTop:
                  60 + (Platform.OS === 'android'
                    ? StatusBar.currentHeight || 0
                    : 0) + 10,
                paddingBottom: 120,
              },
            ]}
            scrollEventThrottle={16}
            onScroll={handleScroll}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                progressViewOffset={70}
                tintColor="#87CEEB"
              />
            }
            onEndReached={loadMoreData}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              loadingMore ? (
                <ActivityIndicator
                  size="large"
                  color="#87CEEB"
                  style={{ marginVertical: 20 }}
                />
              ) : page + 1 >= totalPages ? (
                <View style={{ alignItems: 'center', marginVertical: 5 }}>
                  <Text style={styles.dotText}>.</Text>
                  <Text style={styles.dotText}>.</Text>
                  <Text style={styles.dotText}>.</Text>
                  <Text style={styles.footerText}>더 이상 판매글이 없습니다.</Text>
                </View>
              ) : null
            }
          />
        )}

        {/* 글쓰기 FAB */}
        <FAB
          style={[styles.fab, { opacity: 0.6 }]}
          icon="plus"
          color="#000"
          onPress={handleWritePress}
        />
        {/* 맨위로 이동 FAB */}
        {showScrollTop && (
          <FAB
            style={styles.scrollTopFab}
            icon="arrow-up"
            small
            onPress={scrollToTop}
            color="#000"
          />
        )}
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: '#87CEEB',
    borderBottomWidth: 1,
    borderColor: '#ddd',
    paddingHorizontal: 15,
    justifyContent: 'center',
  },
  headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#000' },
  headerRight: { flexDirection: 'row', alignItems: 'center' },

  // 검색 input 스타일
  searchInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 4,
    paddingHorizontal: 10,
    height: 40,
  },

  dropdown: { backgroundColor: '#fff', borderColor: '#ccc', borderWidth: 1 },
  dropdownContainer: { borderColor: '#ccc' },
  dropdownLabel: { color: '#333', fontSize: 16 },
  dropdownArrow: { tintColor: 'black' },
  dropdownTick: { tintColor: 'black' },
  dropdownSeparator: { backgroundColor: '#ccc', height: 1 },

  iconButton: { marginLeft: 5 },

  listContainer: { paddingHorizontal: 15, paddingBottom: 120 },

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
  itemImage: { width: 90, height: 90, borderRadius: 8, backgroundColor: '#eee', marginRight: 12 },

  infoContainer: { flex: 1 },
  itemTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  itemPrice: { fontSize: 15, fontWeight: '600', color: '#333', marginVertical: 4 },

  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateContainer: { flexDirection: 'column', justifyContent: 'center' },
  itemDate: { fontSize: 13, color: '#999' },

  statusBadge: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 },
  statusBadgeText: { fontSize: 12, fontWeight: '600' },

  countContainer: { flexDirection: 'row', marginTop: 8, justifyContent: 'flex-end' },
  countItem: { flexDirection: 'row', alignItems: 'center', marginLeft: 15 },
  countText: { fontSize: 14, color: '#666', marginLeft: 3 },

  fab: { position: 'absolute', right: 20, bottom: 30, backgroundColor: '#87CEEB', elevation: 5 },
  scrollTopFab: {
    position: 'absolute',
    left: 20,
    bottom: 30,
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#87CEEB',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loginMessage: { fontSize: 18, color: '#666', marginTop: 12, textAlign: 'center' },
  loginLink: { color: '#007bff', textDecorationLine: 'underline' },

  footerText: { textAlign: 'center', paddingVertical: 10, marginTop: 10, color: '#999', fontSize: 14 },
  dotText: { fontSize: 20, color: '#999', lineHeight: 24 },

  menuContainer: {
    position: 'absolute',
    top: 60 + (Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0),
    right: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    elevation: 5,
    zIndex: 1100,
    paddingVertical: 5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  menuIcon: { marginRight: 10 },
  menuText: { fontSize: 16, color: '#333' },
});
