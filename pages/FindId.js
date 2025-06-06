// pages/FindId.js, 미구현
import React from 'react';
import { View, Text, SafeAreaView, StyleSheet, Platform, StatusBar } from 'react-native';

export default function FindId() {
  return (
    <SafeAreaView style={[styles.safeArea, Platform.OS === 'android' && { paddingTop: StatusBar.currentHeight }]}>
      <View style={styles.container}>
        <Text style={styles.text}>아이디 찾기</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  text: { fontSize: 24 },
});
