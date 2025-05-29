// pages/Settings.js, 미사용
import React from 'react'
import {
  View,
  Text,
  SafeAreaView,
  StyleSheet,
  Platform,
  StatusBar,
  Switch,
} from 'react-native'
import { List } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { TouchableOpacity } from 'react-native-gesture-handler'
import { useNavigation } from '@react-navigation/native'
import { useSelector, useDispatch } from 'react-redux'
import { toggleDarkMode } from '../state/themeSlice'
import { showToast } from '../state/toastUtil'

export default function Settings() {
  const navigation = useNavigation()
  const dispatch = useDispatch()
  const isDarkMode = useSelector((state) => state.theme.isDarkMode)
  const [notificationEnabled, setNotificationEnabled] = React.useState(false)
  
  // 다크 모드 토글 
  const toggleDarkModeHandler = () => {
    dispatch(toggleDarkMode())
    showToast(isDarkMode ? '라이트 모드로 변경되었습니다.' : '다크 모드로 변경되었습니다.')
  }
  
  // 공지사항 버튼
  const handleNoticePress = () => {
    showToast('공지사항 화면은 아직 미구현입니다.')
  }
  
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
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="black" />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: isDarkMode ? '#fff' : 'black' }]}>설정</Text>
        </View>
      </View>
  
      <View style={styles.container}>
        <List.Section>
          <List.Item
            title="알림 설정"
            left={() => <List.Icon icon="bell-outline" color={isDarkMode ? '#fff' : '#000'} />}
            right={() => (
              <Switch
                trackColor={{ false: '#767577', true: '#81b0ff' }}
                thumbColor={notificationEnabled ? '#0066cc' : '#f4f3f4'}
                onValueChange={() => setNotificationEnabled(!notificationEnabled)}
                value={notificationEnabled}
              />
            )}
            titleStyle={{ color: isDarkMode ? '#fff' : '#000' }}
            style={{ backgroundColor: 'transparent' }}
          />
  
          <List.Item
            title="다크 모드"
            left={() => <List.Icon icon="theme-light-dark" color={isDarkMode ? '#fff' : '#000'} />}
            right={() => (
              <Switch
                trackColor={{ false: '#767577', true: '#81b0ff' }}
                thumbColor={isDarkMode ? '#0066cc' : '#f4f3f4'}
                onValueChange={toggleDarkModeHandler}
                value={isDarkMode}
              />
            )}
            titleStyle={{ color: isDarkMode ? '#fff' : '#000' }}
            style={{ backgroundColor: 'transparent' }}
          />
  
          <List.Item
            title="공지사항"
            left={() => <List.Icon icon="information-outline" color={isDarkMode ? '#fff' : '#000'} />}
            onPress={handleNoticePress}
            titleStyle={{ color: isDarkMode ? '#fff' : '#000' }}
            style={{ backgroundColor: 'transparent' }}
          />
        </List.Section>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { borderBottomWidth: 1, borderColor: '#ddd', paddingHorizontal: 15, justifyContent: 'center' },
  headerContent: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', marginLeft: 10 },
  container: { flex: 1, paddingHorizontal: 15, paddingTop: 15 },
})
