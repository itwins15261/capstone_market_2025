// App.js
import { Dimensions, BackHandler, ToastAndroid } from 'react-native'
import React, { useRef, useEffect } from 'react'
import { Provider as PaperProvider, DefaultTheme } from 'react-native-paper'
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { Provider as ReduxProvider } from 'react-redux'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
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
import Settings from './pages/Settings'
import MyPage from './pages/MyPage'
import Home from './pages/Home'
import Wishlist from './pages/Wishlist'
import ChatList from './pages/ChatList'
import RatePage from './pages/RatePage'

import store from './state/store'
import { setReduxStore } from './api/axios'
import { createNativeStackNavigator } from '@react-navigation/native-stack'

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#007bff',
    accent: '#f1c40f',
  },
}

const Stack = createNativeStackNavigator()

setReduxStore(store) // axios에 Redux 스토어 주입

export default function App() {
  const navigationRef = useNavigationContainerRef() // 내비게이션 참조 생성
  const lastBackPressed = useRef(0)

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

    const subscription = BackHandler.addEventListener("hardwareBackPress", onBackPress)
    return () => subscription.remove()
  }, [navigationRef])

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ReduxProvider store={store}>
          <PaperProvider theme={theme}>
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
                <Stack.Screen name="Settings" component={Settings} />
                <Stack.Screen name="MyPage" component={MyPage} />
                <Stack.Screen name="Home" component={Home} />
                <Stack.Screen name="Wishlist" component={Wishlist} />
                <Stack.Screen name="ChatList" component={ChatList} />
                <Stack.Screen name="RatePage" component={RatePage} />
              </Stack.Navigator>
            </NavigationContainer>
          </PaperProvider>
        </ReduxProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
