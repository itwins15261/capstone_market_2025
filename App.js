// App.js
// React Native 앱의 메인 컴포넌트

import React, { useRef, useEffect } from 'react'
import { Dimensions, BackHandler, ToastAndroid, StatusBar } from 'react-native'
import { Provider as PaperProvider, DefaultTheme } from 'react-native-paper'
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { Provider as ReduxProvider, useDispatch } from 'react-redux'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import 'react-native-gesture-handler';


import TabNavigator from './components/TabNavigator'
import Login from './pages/Login'
import ProductDetail from './pages/ProductDetail'
import SignUp from './pages/SignUp'
import FindId from './pages/FindId'
import FindPwd from './pages/FindPwd'
import Post from './pages/Post'
import Search from './pages/Search'
import Notice from './pages/Notice'
import Chat from './pages/Chat'
import MyPage from './pages/MyPage'
import Home from './pages/Home'
import Wishlist from './pages/Wishlist'
import ChatList from './pages/ChatList'
import RatePage from './pages/RatePage'
import PurchaseHistory from './pages/PurchaseHistory'
import MyPost from './pages/MyPost'

import store from './state/store'
import { setReduxStore } from './api/axios'
import { loadPersistedAuth } from './state/authSlice'

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#007bff',
    accent: '#f1c40f',
  },
}

const Stack = createNativeStackNavigator()

// axios에 Redux 스토어 주입
setReduxStore(store)

// 앱 시작 시 저장된 토큰, 유저 복원용 래퍼 컴포넌트
function InitAuth({ children }) {
  const dispatch = useDispatch()
  useEffect(() => {
    dispatch(loadPersistedAuth())
  }, [dispatch])
  return children
}

export default function App() {
  const navigationRef = useNavigationContainerRef()
  const lastBackPressed = useRef(0)

  // 뒤로가기 핸들링
  useEffect(() => {
    const onBackPress = () => {
      if (navigationRef.canGoBack()) {
        navigationRef.goBack()
        return true
      }
      const now = Date.now()
      if (now - lastBackPressed.current < 3000) {
        BackHandler.exitApp()
        return true
      } else {
        ToastAndroid.show("뒤로 가기를 한 번 더 누르면 종료됩니다.", ToastAndroid.SHORT)
        lastBackPressed.current = now
        return true
      }
    }
    const sub = BackHandler.addEventListener("hardwareBackPress", onBackPress)
    return () => sub.remove()
  }, [navigationRef])

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ReduxProvider store={store}>
          <InitAuth>
            <PaperProvider theme={theme}>
              <StatusBar
                translucent
                backgroundColor="transparent"
                barStyle="dark-content"
              />
              <NavigationContainer ref={navigationRef}>
                <Stack.Navigator screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="MainTab" component={TabNavigator} />
                  <Stack.Screen name="Login" component={Login} />
                  <Stack.Screen name="ProductDetail" component={ProductDetail} />
                  <Stack.Screen name="SignUp" component={SignUp} />
                  <Stack.Screen name="FindId" component={FindId} />
                  <Stack.Screen name="FindPwd" component={FindPwd} />
                  <Stack.Screen name="Post" component={Post} />
                  <Stack.Screen name="Search" component={Search} />
                  <Stack.Screen name="Notice" component={Notice} />
                  <Stack.Screen name="Chat" component={Chat} />
                  <Stack.Screen name="MyPage" component={MyPage} />
                  <Stack.Screen name="Home" component={Home} />
                  <Stack.Screen name="Wishlist" component={Wishlist} />
                  <Stack.Screen name="ChatList" component={ChatList} />
                  <Stack.Screen name="RatePage" component={RatePage} />
                  <Stack.Screen name="PurchaseHistory" component={PurchaseHistory} />
                  <Stack.Screen name="MyPost" component={MyPost} />
                </Stack.Navigator>
              </NavigationContainer>
            </PaperProvider>
          </InitAuth>
        </ReduxProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
