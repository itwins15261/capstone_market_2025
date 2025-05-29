// pages/MyPage.js
// 탭 네비게이터의 마이페이지 탭
// 회원정보 수정, 리뷰 작성, 판매내역, 탈퇴하기 등의 기능을 제공

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  StatusBar,
  Alert,
  BackHandler,
  ActivityIndicator,
  Image,
} from 'react-native';
import {
  Button,
  List,
  Modal,
  Portal,
  Card,
  Divider as PaperDivider,
  Snackbar,
} from 'react-native-paper';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { logout, fetchCurrentUserAsync } from '../state/authSlice';
import { showToast } from '../state/toastUtil';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ProfileModal from '../components/ProfileModal';
import axiosInstance from '../api/axios';
import config from '../api/config';
import MyReviewModal from '../components/MyReviewModal';
import { useSelector, useDispatch } from 'react-redux';

export default function MyPage() {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const isLoggedIn = useSelector((state) => state.auth.isLoggedIn);
  const user = useSelector((state) => state.auth.user);
  const isDarkMode = useSelector((state) => state.theme.isDarkMode);

  const [visible, setVisible] = useState(false);
  const [modalType, setModalType] = useState('profile');
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [myRating, setMyRating] = useState(0);
  const [isReviewModalVisible, setIsReviewModalVisible] = useState(false);

  const getProfileImageUrl = (profileImageValue) => {
    if (!profileImageValue) return null;
    let filename = profileImageValue;
    if (filename.startsWith('/profile/')) filename = filename.substring(9);
    return `${config.BASE_URL}/images/profile/${filename}`;
  };

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const halfStar = rating - fullStars >= 0.5;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <MaterialCommunityIcons
          key={`full-${i}`}
          name="star"
          size={20}
          color="#FFD700"
        />
      );
    }
    if (halfStar) {
      stars.push(
        <MaterialCommunityIcons
          key="half"
          name="star-half-full"
          size={20}
          color="#FFD700"
        />
      );
    }
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <MaterialCommunityIcons
          key={`empty-${i}`}
          name="star-outline"
          size={20}
          color="#FFD700"
        />
      );
    }
    return <View style={styles.starsContainer}>{stars}</View>;
  };

  useFocusEffect(
    useCallback(() => {
      if (isLoggedIn) {
        dispatch(fetchCurrentUserAsync());
        fetchMyRating();
      }
    }, [isLoggedIn, dispatch])
  );

  const fetchMyRating = async () => {
    try {
      const response = await axiosInstance.get('/api/reviews/received');
      const reviews = response.data || [];
      const avg =
        reviews.length > 0
          ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length
          : 0;
      setMyRating(avg);
    } catch (e) {
      console.error(e);
    }
  };

  const showSnackbar = (msg) => {
    setSnackbarMessage(msg);
    setSnackbarVisible(true);
  };
  const onDismissSnackbar = () => {
    setSnackbarVisible(false);
    setSnackbarMessage('');
  };

  const menuItems = [
    { id: '0', title: '회원정보 수정', icon: 'account-edit' },
    { id: '1', title: '리뷰 작성', icon: 'star-outline' },
    { id: '2', title: '판매내역', icon: 'cart' },
    // 설정 기능 삭제
    // { id: '4', title: '설정', icon: 'cog' },
    { id: '5', title: '탈퇴하기', icon: 'logout' },
  ];

  const handleMenuPress = useCallback(
    (item) => {
      if (!isLoggedIn) {
        showToast('로그인해야 접근 가능합니다.');
        return;
      }
      switch (item.title) {
        case '회원정보 수정':
          setModalType('profile');
          setVisible(true);
          break;
        case '리뷰 작성':
          navigation.navigate('PurchaseHistory');
          break;
        case '판매내역':
          navigation.navigate('MyPost');
          break;
        // case '설정':
        //   navigation.navigate('Settings');
        //   break;
        case '탈퇴하기':
          Alert.alert(
            '탈퇴 확인',
            '정말 탈퇴하시겠습니까?\n이 작업은 되돌릴 수 없습니다.',
            [
              { text: '취소', style: 'cancel' },
              { text: '탈퇴', style: 'destructive', onPress: handleDeleteUser },
            ]
          );
          break;
      }
    },
    [isLoggedIn, navigation]
  );

  const handleLoginLogout = useCallback(() => {
    if (isLoggedIn) {
      dispatch(logout());
      showToast('로그아웃 되었습니다.');
    } else {
      navigation.navigate('Login');
    }
  }, [isLoggedIn, dispatch, navigation]);

  const handleDeleteUser = useCallback(async () => {
    setDeleting(true);
    try {
      const res = await axiosInstance.delete('/api/deleteuser');
      if (res.data === 'deleteduser') {
        dispatch(logout());
        showToast('회원 탈퇴가 완료되었습니다.');
        navigation.navigate('MainTab', { screen: 'MyPage' });
      } else {
        showToast('회원 탈퇴에 실패하였습니다.');
      }
    } catch (e) {
      showToast('회원 탈퇴 실패: ' + (e.message || JSON.stringify(e)));
    } finally {
      setDeleting(false);
    }
  }, [dispatch, navigation]);

  useEffect(() => {
    const onBackPress = () => {
      if (visible && modalType !== 'profile') {
        setModalType('profile');
        return true;
      }
      return false;
    };
    BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () =>
      BackHandler.removeEventListener('hardwareBackPress', onBackPress);
  }, [visible, modalType]);

  const userProfileUrl = getProfileImageUrl(
    user.profileImageUrl || user.profileImage
  );

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        Platform.OS === 'android' && { paddingTop: StatusBar.currentHeight },
        { backgroundColor: isDarkMode ? '#121212' : '#fff' },
      ]}
    >
      <View
        style={[
          styles.header,
          {
            height: 60,
            backgroundColor: isDarkMode ? '#333' : '#87CEEB',
          },
        ]}
      >
        <View style={styles.headerContent}>
          <Text
            style={[
              styles.headerTitle,
              { color: isDarkMode ? '#fff' : '#000' },
            ]}
          >
            마이페이지
          </Text>
        </View>
      </View>

      <Card
        style={[
          styles.profileCard,
          { backgroundColor: isDarkMode ? '#1e1e1e' : '#fff' },
        ]}
      >
        <TouchableOpacity
          style={styles.loginButton}
          onPress={handleLoginLogout}
        >
          <Text
            style={[
              styles.loginButtonText,
              { color: isDarkMode ? '#fff' : '#000' },
            ]}
          >
            {isLoggedIn ? '로그아웃' : '로그인'}
          </Text>
        </TouchableOpacity>

        {isLoggedIn ? (
          <TouchableOpacity
            onPress={() => setIsReviewModalVisible(true)}
          >
            <View style={styles.userInfo}>
              {userProfileUrl ? (
                <Image
                  source={{ uri: userProfileUrl }}
                  style={styles.profileImage}
                />
              ) : (
                <MaterialCommunityIcons
                  name="account-circle-outline"
                  size={80}
                  color={isDarkMode ? '#777' : '#ccc'}
                />
              )}
              <Text
                style={[
                  styles.nickname,
                  { color: isDarkMode ? '#fff' : '#333' },
                ]}
              >
                {user.nickname || '닉네임 없음'}
              </Text>
              <View style={styles.ratingContainer}>
                {renderStars(myRating)}
                <Text style={styles.ratingText}>
                  평균 별점: {myRating.toFixed(1)}점 / 5점
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ) : (
          <View style={styles.guestInfo}>
            <MaterialCommunityIcons
              name="account-circle-outline"
              size={80}
              color={isDarkMode ? '#777' : '#ccc'}
            />
            <Text
              style={[
                styles.guestNickname,
                { color: isDarkMode ? '#fff' : '#333' },
              ]}
            >
              Guest
            </Text>
            <Text
              style={[
                styles.loginRequiredText,
                { color: isDarkMode ? '#aaa' : '#666' },
              ]}
            >
              로그인이 필요합니다.
            </Text>
          </View>
        )}
      </Card>

      <ScrollView contentContainerStyle={styles.menuContainer}>
        {menuItems.map((item, idx) => (
          <View key={item.id}>
            <List.Item
              title={item.title}
              left={() => (
                <List.Icon
                  icon={item.icon}
                  color={isDarkMode ? '#fff' : '#000'}
                />
              )}
              onPress={() => handleMenuPress(item)}
              titleStyle={{ color: isDarkMode ? '#fff' : '#000' }}
              style={{ backgroundColor: 'transparent' }}
            />
            {idx < menuItems.length - 1 && (
              <PaperDivider
                style={[
                  styles.menuDivider,
                  { backgroundColor: isDarkMode ? '#555' : '#eee' },
                ]}
              />
            )}
          </View>
        ))}
      </ScrollView>

      <Portal>
        <Modal
          visible={visible}
          dismissable={false}
          onDismiss={() => {
            setVisible(false);
            setModalType('profile');
          }}
          contentContainerStyle={[
            styles.modalContainer,
            { backgroundColor: isDarkMode ? '#1e1e1e' : '#fff' },
          ]}
        >
          <View style={styles.modalHeader}>
            {(modalType === 'nickname' || modalType === 'password') && (
              <TouchableOpacity
                onPress={() => setModalType('profile')}
                style={styles.backButton}
              >
                <MaterialCommunityIcons
                  name="arrow-left"
                  size={24}
                  color={isDarkMode ? '#fff' : '#000'}
                />
              </TouchableOpacity>
            )}
            <Text
              style={[
                styles.modalTitle,
                { color: isDarkMode ? '#fff' : '#333' },
              ]}
            >
              {modalType === 'profile' && '회원정보 수정'}
              {modalType === 'nickname' && '닉네임 변경'}
              {modalType === 'password' && '비밀번호 변경'}
            </Text>
            {modalType === 'profile' ? (
              <TouchableOpacity
                onPress={() => {
                  setVisible(false);
                  setModalType('profile');
                }}
              >
                <MaterialCommunityIcons
                  name="close"
                  size={24}
                  color={isDarkMode ? '#fff' : '#000'}
                />
              </TouchableOpacity>
            ) : (
              <View style={{ width: 24 }} />
            )}
          </View>
          <ProfileModal
            modalType={modalType}
            setModalType={setModalType}
            onClose={() => {
              setVisible(false);
              setModalType('profile');
            }}
            showSnackbar={showSnackbar}
          />
        </Modal>
      </Portal>

      <Portal>
        <Snackbar
          visible={snackbarVisible}
          onDismiss={onDismissSnackbar}
          duration={5000}
          action={{ label: '닫기', onPress: onDismissSnackbar }}
        >
          {snackbarMessage}
        </Snackbar>
      </Portal>

      {deleting && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#87CEEB" />
        </View>
      )}

      <MyReviewModal
        visible={isReviewModalVisible}
        onClose={() => setIsReviewModalVisible(false)}
        user={user}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    borderBottomWidth: 1,
    borderColor: '#ddd',
    paddingHorizontal: 15,
    justifyContent: 'center',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'space-between',
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  profileCard: {
    margin: 15,
    padding: 15,
    borderRadius: 12,
    elevation: 4,
  },
  loginButton: {
    backgroundColor: '#87CEEB',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
  },
  loginButtonText: { color: '#000', fontSize: 18, fontWeight: '600' },
  userInfo: { alignItems: 'center' },
  profileImage: { width: 80, height: 80, borderRadius: 40 },
  nickname: { fontSize: 20, fontWeight: 'bold', marginTop: 10 },
  ratingContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
  starsContainer: { flexDirection: 'row', marginRight: 8 },
  ratingText: { fontSize: 14, color: '#666' },
  guestInfo: { alignItems: 'center' },
  guestNickname: { fontSize: 20, fontWeight: 'bold', marginTop: 10 },
  loginRequiredText: { fontSize: 14, marginTop: 5 },
  menuContainer: { paddingHorizontal: 15, paddingBottom: 15 },
  menuDivider: { height: 1 },
  modalContainer: {
    padding: 25,
    marginHorizontal: 20,
    borderRadius: 12,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    justifyContent: 'space-between',
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  backButton: { padding: 5 },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
