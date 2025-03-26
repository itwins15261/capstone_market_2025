// pages/MyPage.js
import React, { useState, useCallback, useEffect } from 'react'
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
} from 'react-native'
import { Button, List, Modal, Portal, Card, Divider as PaperDivider, Snackbar } from 'react-native-paper'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import { useSelector, useDispatch } from 'react-redux'
import { logout, fetchCurrentUserAsync } from '../state/authSlice'
import { showToast } from '../state/toastUtil'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import ProfileModal from '../components/ProfileModal'
import axiosInstance from '../api/axios'
import config from '../api/config'

export default function MyPage() {
  const navigation = useNavigation() // 내비게이션 사용
  const dispatch = useDispatch()
  const isLoggedIn = useSelector((state) => state.auth.isLoggedIn)
  const user = useSelector((state) => state.auth.user)
  const isDarkMode = useSelector((state) => state.theme.isDarkMode)

  const [visible, setVisible] = useState(false) // 프로필 수정 모달 표시 여부
  const [modalType, setModalType] = useState('profile') // 모달 타입 상태
  const [snackbarVisible, setSnackbarVisible] = useState(false) // 스낵바 표시 여부
  const [snackbarMessage, setSnackbarMessage] = useState('') // 스낵바 메시지
  const [deleting, setDeleting] = useState(false) // 회원 탈퇴 진행 상태

  // 프로필 이미지 URL 생성 함수, config.BASE_URL 사용
  const getProfileImageUrl = (profileImage) => {
    if (!profileImage) return null
    let filename = profileImage
    if (filename.startsWith('/profile/')) {
      filename = filename.substring(9)
    }
    return `${config.BASE_URL}/images/profile/${filename}`
  }

  // 별점 렌더링 함수, 전체 별점 표시
  const renderStars = (rating) => {
    const stars = []
    const fullStars = Math.floor(rating)
    const halfStar = rating - fullStars >= 0.5
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0)

    for (let i = 0; i < fullStars; i++) {
      stars.push(<MaterialCommunityIcons key={`full-${i}`} name="star" size={20} color="#FFD700" />)
    }
    if (halfStar) {
      stars.push(<MaterialCommunityIcons key="half" name="star-half-full" size={20} color="#FFD700" />)
    }
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<MaterialCommunityIcons key={`empty-${i}`} name="star-outline" size={20} color="#FFD700" />)
    }
    return <View style={styles.starsContainer}>{stars}</View>
  }

  // 포커스 시 현재 사용자 정보를 갱신하는 효과
  useFocusEffect(
    useCallback(() => {
      if (isLoggedIn) {
        dispatch(fetchCurrentUserAsync())
      }
    }, [isLoggedIn, dispatch])
  )

  // 스낵바 표시 함수
  const showSnackbar = (message) => {
    setSnackbarMessage(message)
    setSnackbarVisible(true)
  }

  const onDismissSnackbar = () => {
    setSnackbarVisible(false)
    setSnackbarMessage('')
  }

  // 메뉴 항목 배열, 각각 다른 기능을 수행
  const menuItems = [
    { id: '0', title: '회원정보 수정', icon: 'account-edit' },
    { id: '1', title: '구매내역', icon: 'cart-arrow-down' },
    { id: '2', title: '판매내역', icon: 'cart' },
    { id: '3', title: '거래 만족도 평가', icon: 'star' },
    { id: '4', title: '설정', icon: 'cog' },
    { id: '5', title: '탈퇴하기', icon: 'logout' },
  ]

  // 메뉴 항목 클릭 시 동작 처리 함수
  const handleMenuPress = useCallback(
    (item) => {
      if (!isLoggedIn) {
        showToast('로그인해야 접근 가능합니다.')
        return
      }
      if (item.title === '회원정보 수정') {
        setModalType('profile')
        setVisible(true)
      } else if (item.title === '구매내역') {
        navigation.navigate('RatePage')
      } else if (item.title === '거래 만족도 평가') {
        navigation.navigate('RatePage')
      } else if (item.title === '판매내역') {
        navigation.navigate('MyPost')
      } else if (item.title === '설정') {
        navigation.navigate('Settings')
      } else if (item.title === '탈퇴하기') {
        Alert.alert(
          '탈퇴 확인',
          '정말 탈퇴하시겠습니까? 이 작업은 되돌릴 수 없습니다.',
          [
            { text: '취소', style: 'cancel' },
            { text: '탈퇴', style: 'destructive', onPress: handleDeleteUser },
          ]
        )
      }
    },
    [isLoggedIn, navigation]
  )

  // 로그인/로그아웃 버튼 처리 함수
  const handleLoginLogout = useCallback(() => {
    if (isLoggedIn) {
      dispatch(logout())
      showToast('로그아웃 되었습니다.')
    } else {
      navigation.navigate('Login')
    }
  }, [isLoggedIn, dispatch, navigation])

  // 회원 탈퇴 API 호출 및 처리 함수
  const handleDeleteUser = useCallback(async () => {
    setDeleting(true)
    try {
      const response = await axiosInstance.delete('/api/deleteuser')
      if (response.data === 'deleteduser') {
        dispatch(logout())
        showToast('회원 탈퇴가 완료되었습니다.')
        navigation.navigate('MainTab', { screen: 'MyPage' })
      } else {
        showToast('회원 탈퇴에 실패하였습니다.')
      }
    } catch (error) {
      showToast('회원 탈퇴 실패: ' + (error.message || JSON.stringify(error)))
    } finally {
      setDeleting(false)
    }
  }, [dispatch, navigation])

  // 백버튼 처리, 모달 상태에 따라 다르게 동작
  useEffect(() => {
    const onBackPress = () => {
      if (visible && modalType !== 'profile') {
        setModalType('profile')
        return true
      }
      return false
    }
    BackHandler.addEventListener('hardwareBackPress', onBackPress)
    return () => BackHandler.removeEventListener('hardwareBackPress', onBackPress)
  }, [visible, modalType])

  const userProfileUrl = getProfileImageUrl(user.profileImage)

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        Platform.OS === 'android' && { paddingTop: StatusBar.currentHeight },
        { backgroundColor: isDarkMode ? '#121212' : '#fff' },
      ]}
    >
      <View style={[styles.header, { height: 60, backgroundColor: isDarkMode ? '#333' : '#87CEEB' }]}>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { color: isDarkMode ? '#fff' : '#000' }]}>마이페이지</Text>
        </View>
      </View>

      <Card style={[styles.profileCard, { backgroundColor: isDarkMode ? '#1e1e1e' : '#fff' }]}>
        <TouchableOpacity style={styles.loginButton} onPress={handleLoginLogout}>
          <Text style={[styles.loginButtonText, { color: isDarkMode ? '#fff' : '#000' }]}>
            {isLoggedIn ? '로그아웃' : '로그인'}
          </Text>
        </TouchableOpacity>

        {isLoggedIn ? (
          <View style={styles.userInfo}>
            {userProfileUrl ? (
              <Image source={{ uri: userProfileUrl }} style={styles.profileImage} />
            ) : (
              <MaterialCommunityIcons name="account-circle-outline" size={80} color={isDarkMode ? '#777' : '#ccc'} />
            )}
            <Text style={[styles.nickname, { color: isDarkMode ? '#fff' : '#333' }]}>
              {user.nickname || '닉네임 없음'}
            </Text>
            {/* 평균 별점 표시 */}
            <View style={styles.ratingContainer}>
              {renderStars(user.rating || 0)}
              <Text style={styles.ratingText}>평균 별점: {user.rating ? user.rating.toFixed(1) : 0}점 / 5점</Text>
            </View>
          </View>
        ) : (
          <View style={styles.guestInfo}>
            <MaterialCommunityIcons name="account-circle-outline" size={80} color={isDarkMode ? '#777' : '#ccc'} />
            <Text style={[styles.guestNickname, { color: isDarkMode ? '#fff' : '#333' }]}>Guest</Text>
            <Text style={[styles.loginRequiredText, { color: isDarkMode ? '#aaa' : '#666' }]}>
              로그인이 필요합니다.
            </Text>
          </View>
        )}
      </Card>

      <ScrollView contentContainerStyle={styles.menuContainer}>
        {menuItems.map((item, index) => (
          <View key={item.id}>
            <List.Item
              title={item.title}
              left={() => <List.Icon icon={item.icon} color={isDarkMode ? '#fff' : '#000'} />}
              onPress={() => handleMenuPress(item)}
              titleStyle={{ color: isDarkMode ? '#fff' : '#000' }}
              style={{ backgroundColor: 'transparent' }}
            />
            {index < menuItems.length - 1 && (
              <PaperDivider style={[styles.menuDivider, { backgroundColor: isDarkMode ? '#555' : '#eee' }]} />
            )}
          </View>
        ))}
      </ScrollView>

      <Portal>
        <Modal
          visible={visible}
          dismissable={false}
          onDismiss={() => {
            setVisible(false)
            setModalType('profile')
          }}
          contentContainerStyle={[styles.modalContainer, { backgroundColor: isDarkMode ? '#1e1e1e' : '#fff' }]}
        >
          <View style={styles.modalHeader}>
            {(modalType === 'nickname' || modalType === 'password') && (
              <TouchableOpacity onPress={() => setModalType('profile')} style={styles.backButton}>
                <MaterialCommunityIcons name="arrow-left" size={24} color={isDarkMode ? '#fff' : '#000'} />
              </TouchableOpacity>
            )}
            <Text style={[styles.modalTitle, { color: isDarkMode ? '#fff' : '#333' }]}>
              {modalType === 'profile' && '회원정보 수정'}
              {modalType === 'nickname' && '닉네임 변경'}
              {modalType === 'password' && '비밀번호 변경'}
            </Text>
            {modalType === 'profile' ? (
              <TouchableOpacity
                onPress={() => {
                  setVisible(false)
                  setModalType('profile')
                }}
              >
                <MaterialCommunityIcons name="close" size={24} color={isDarkMode ? '#fff' : '#000'} />
              </TouchableOpacity>
            ) : (
              <View style={{ width: 24 }} />
            )}
          </View>
          <ProfileModal
            modalType={modalType}
            setModalType={setModalType}
            onClose={() => {
              setVisible(false)
              setModalType('profile')
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
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { borderBottomWidth: 1, borderColor: '#ddd', paddingHorizontal: 15, justifyContent: 'center' },
  headerContent: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  profileCard: { margin: 15, padding: 15, borderRadius: 12, elevation: 4 },
  loginButton: { backgroundColor: '#87CEEB', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginBottom: 15 },
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
  modalContainer: { padding: 25, marginHorizontal: 20, borderRadius: 12, elevation: 5 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, justifyContent: 'space-between' },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  backButton: { padding: 5 },
  loadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'center', alignItems: 'center' },
})
