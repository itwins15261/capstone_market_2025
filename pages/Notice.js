// pages/Notice.js (키워드 알림, 미구현 & 미사용)
import React, { useState } from 'react'
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  Alert,
  SafeAreaView,
  Platform,
  StatusBar,
  TouchableOpacity,
} from 'react-native'
import { TextInput, Button, Card, IconButton } from 'react-native-paper'
import { useNavigation } from '@react-navigation/native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useSelector } from 'react-redux'

export default function Notice() {
  const navigation = useNavigation()
  const isLoggedIn = useSelector((state) => state.auth.isLoggedIn) 
  const [keywordInput, setKeywordInput] = useState('')
  const [alertKeywords, setAlertKeywords] = useState(['테스트1', '테스트2', '테스트3']) // 기본 알림 키워드

  // 알림 키워드 추가
  const addAlertKeyword = () => {
    if (keywordInput.trim() === '') return
    setAlertKeywords([keywordInput.trim(), ...alertKeywords])
    setKeywordInput('')
  }

  // 알림 키워드 삭제
  const removeAlertKeyword = (index) => {
    setAlertKeywords(alertKeywords.filter((_, i) => i !== index))
  }

  // 로그인하지 않은 경우
  if (!isLoggedIn) {
    return (
      <SafeAreaView style={[styles.safeArea, Platform.OS === 'android' && { paddingTop: StatusBar.currentHeight }]}>
        <View style={[styles.header, { height: 60 }]}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <MaterialCommunityIcons name="arrow-left" size={24} color="black" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>키워드 알림</Text>
          </View>
        </View>
        <View style={styles.notLoggedInContainer}>
          <Text style={styles.notLoggedInText}>로그인 이후 이용 가능합니다.</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={[styles.safeArea, Platform.OS === 'android' && { paddingTop: StatusBar.currentHeight }]}>
      <View style={[styles.header, { height: 60 }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="black" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>키워드 알림</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.container}>
        <Card mode="outlined" style={styles.card}>
          <Card.Title title="키워드 추가" titleStyle={styles.cardTitle} />
          <Card.Content>
            <View style={styles.inputRow}>
              <TextInput
                placeholder="키워드 입력"
                value={keywordInput}
                onChangeText={setKeywordInput}
                mode="outlined"
                style={[styles.input, { flex: 1 }]}
              />
              <Button
                mode="contained"
                onPress={addAlertKeyword}
                style={[styles.addButton, { backgroundColor: '#87CEEB', borderRadius: 4 }]}
                labelStyle={{ color: 'black' }}
              >
                추가
              </Button>
            </View>
          </Card.Content>
        </Card>
        <Card mode="outlined" style={styles.card}>
          <Card.Title title="알림 설정 내역" titleStyle={styles.cardTitle} />
          <Card.Content>
            {alertKeywords.map((kw, index) => (
              <Card key={index} mode="outlined" style={styles.alertItem}>
                <Card.Title
                  title={kw}
                  right={() => (
                    <IconButton icon="close" size={20} onPress={() => removeAlertKeyword(index)} />
                  )}
                />
              </Card>
            ))}
          </Card.Content>
        </Card>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  header: { backgroundColor: '#87CEEB', borderBottomWidth: 1, borderColor: '#ddd', paddingHorizontal: 15, justifyContent: 'center' },
  headerContent: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', marginLeft: 10, color: 'black' },
  container: { padding: 15, backgroundColor: '#fff' },
  card: { marginBottom: 15 },
  cardTitle: { fontSize: 16, fontWeight: 'bold' },
  inputRow: { flexDirection: 'row', alignItems: 'center' },
  input: { marginBottom: 15 },
  addButton: { marginLeft: 10 },
  alertItem: { marginBottom: 10 },
  notLoggedInContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  notLoggedInText: { fontSize: 16, color: '#333' },
})
