// components/TabNavigator.js
// 앱 아래에 탭 네비게이션을 구현하는 컴포넌트
// 홈, 위시리스트, 채팅, 마이페이지 탭으로 구성

import React from 'react'
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs'
import Home from '../pages/Home'
import Wishlist from '../pages/Wishlist'
import ChatList from '../pages/ChatList'
import MyPage from '../pages/MyPage'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { Text, View } from 'react-native'

const Tab = createMaterialTopTabNavigator()

// 컴포넌트와 라벨을 함께 표시하는 함수
function TabBarIconLabel({ focused, iconComponent, label }) {
  return (
    <View style={{ alignItems: 'center' }}>
      {iconComponent}
      <Text style={{ fontSize: 10, color: 'gray', marginTop: 2 }}>
        {label}
      </Text>
    </View>
  )
}

export default function TabNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      swipeEnabled={true}
      tabBarPosition="bottom"
      screenOptions={({ route }) => ({
        tabBarShowLabel: false,
        tabBarIndicatorStyle: { backgroundColor: 'transparent' },
        tabBarStyle: {
          backgroundColor: '#f0f0f0',
          elevation: 5,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.2,
          shadowRadius: 3,
        },
        tabBarIcon: ({ focused }) => {
          if (route.name === 'Home') {
            return (
              <TabBarIconLabel
                focused={focused}
                iconComponent={
                  <Ionicons name="home" size={24} color={focused ? '#87CEEB' : 'gray'} />
                }
                label="홈"
              />
            )
          } else if (route.name === 'Wishlist') {
            return (
              <TabBarIconLabel
                focused={focused}
                iconComponent={
                  <MaterialCommunityIcons name="heart-outline" size={24} color={focused ? '#87CEEB' : 'gray'} />
                }
                label="위시리스트"
              />
            )
          } else if (route.name === 'ChatList') {
            return (
              <TabBarIconLabel
                focused={focused}
                iconComponent={
                  <MaterialCommunityIcons name="message-outline" size={24} color={focused ? '#87CEEB' : 'gray'} />
                }
                label="채팅"
              />
            )
          } else if (route.name === 'MyPage') {
            return (
              <TabBarIconLabel
                focused={focused}
                iconComponent={
                  <Ionicons name="person-outline" size={24} color={focused ? '#87CEEB' : 'gray'} />
                }
                label="마이페이지"
              />
            )
          }
        },
      })}
    >
      <Tab.Screen name="Home" component={Home} options={{ unmountOnBlur: true }} />
      <Tab.Screen name="Wishlist" component={Wishlist} options={{ unmountOnBlur: true }} />
      <Tab.Screen name="ChatList" component={ChatList} options={{ unmountOnBlur: true }} />
      <Tab.Screen name="MyPage" component={MyPage} options={{ unmountOnBlur: true }} />
    </Tab.Navigator>
  )
}
