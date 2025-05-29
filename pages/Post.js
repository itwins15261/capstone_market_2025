// pages/Post.js
// 홈화면에서 + 플로팅 글쓰기 버튼을 눌러 이동하는 판매글 작성 페이지

import React, { useState, useRef, useEffect } from 'react'
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  Platform,
  TouchableOpacity,
  Text,
  Image,
  StatusBar,
  SafeAreaView,
  Animated,
  PanResponder,
} from 'react-native'
import { TextInput, Button, Card, Snackbar, Switch } from 'react-native-paper'
import * as ImagePicker from 'expo-image-picker'
import * as ImageManipulator from 'expo-image-manipulator'
import * as FileSystem from 'expo-file-system'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useNavigation, useRoute } from '@react-navigation/native'
import axiosInstance from '../api/axios'
import { showToast } from '../state/toastUtil'
import { useSelector } from 'react-redux'
import config from '../api/config'

// 서버에 있는 이미지 URL 로컬 임시 파일로 내려받아 FormData용 파일 객체로 반환
const remoteToFile = async (remoteUri, idx) => {
  const extension = remoteUri.split('.').pop().split('?')[0] || 'jpg'
  const localPath = `${FileSystem.cacheDirectory}keep_${idx}.${extension}`
  await FileSystem.downloadAsync(remoteUri, localPath)
  return {
    uri:  localPath,
    name: `photo_${idx}.${extension}`,
    type: `image/${extension}`,
  }
}

// 공통 숫자 → ###,###원 변환
     
const formatNumericPrice = (text) => {
  const numericText = text.replace(/[^0-9]/g, '')
  if (!numericText) return ''
  return numericText.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '원'
}
     
// 이미지 압축 & 리사이즈 (가로 1200px, quality 0.85, JPEG)
const compressAndResize = async (uri) => {
  try {
    // 1) 사이즈 로그
    const beforeInfo = await FileSystem.getInfoAsync(uri)
    console.log(`압축 전 크기: ${Math.round(beforeInfo.size/1024)} KB, uri=${uri}`)

    // 2) 원본 픽셀 가져오기
    const { width: origW, height: origH } = await new Promise((res, rej) =>
      Image.getSize(uri, (w, h) => res({ width: w, height: h }), rej)
    )

    // 3) 리사이즈할지 결정
    const actions = []
    if (origW > 1200) {
      const scale = 1200 / origW
      actions.push({
        resize: {
          width: 1200,
          height: Math.round(origH * scale),
        },
      })
    }
    // (origW <= 1200 이면 actions=[] → 리사이즈 없이 compress만)

    // 4) manipulateAsync 호출
    const result = await ImageManipulator.manipulateAsync(
      uri,
      actions,
      { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
    )

    // 5) 후처리 크기 로그
    const afterInfo = await FileSystem.getInfoAsync(result.uri)
    console.log(`압축 후 크기: ${Math.round(afterInfo.size/1024)} KB, uri=${result.uri}`)

    return result.uri
  } catch (e) {
    console.warn('이미지 압축 실패:', e)
    return uri
  }
}

     
// 컴포넌트
     
export default function Post() {
  const navigation = useNavigation()
  const route       = useRoute()

  const editMode     = route.params?.editMode      || false
  const existingPost = route.params?.existingPost  || null

  const [title, setTitle]                   = useState('')
  const [content, setContent]               = useState('')
  const [price, setPrice]                   = useState('')
  const [isDonation, setIsDonation]         = useState(false)

  const [images, setImages]                 = useState([])
  const [deleteMode, setDeleteMode]         = useState(false)
  const [selectedForDelete, setSelectedForDelete] = useState([])
  const [reorderMode, setReorderMode]       = useState(false)
  const [snackbarVisible, setSnackbarVisible] = useState(false)
  const [snackbarMessage, setSnackbarMessage]   = useState('')
  const [saleStatus, setSaleStatus]         = useState(0)

  const [cellSize, setCellSize] = useState({ width: 0, height: 0 })
  const numColumns = 3

   
  // 수정 모드 초기화
  useEffect(() => {
    if (editMode && existingPost) {
      setTitle(existingPost.title || '')
      setContent(existingPost.content || '')
      setPrice(
        existingPost.price !== undefined
          ? formatNumericPrice(String(existingPost.price))
          : ''
      )
      if (existingPost.status !== undefined) setSaleStatus(existingPost.status)

      const serverImages = (existingPost.images || []).map((imgObj, idx) => ({
        id: `server-${idx}`,
        uri: `${config.BASE_URL}/images/${imgObj.imageUrl}`,
        isRep: idx === 0,
        isServerImage: true,
      }))
      setImages(serverImages)
    }
  }, [editMode, existingPost])

   
  // 나눔 토글 (가격 0원 설정)
  const handleDonationToggle = (value) => {
    setIsDonation(value)
    if (value) setPrice(formatNumericPrice('0'))
    else setPrice('')
  }

   
  // 카메라 촬영
  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('권한 필요', '카메라 접근 권한이 필요합니다.')
        return
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1,            // 원본 획득 후 압축
      })

      if (!result.canceled && result.assets?.length) {
        if (images.length >= 5) {
          showToast('사진은 최대 5장까지 첨부 가능합니다.')
          return
        }

        // 압축‧리사이즈
        const rawUri   = result.assets[0].uri
        const takenUri = await compressAndResize(rawUri)

        const newItem = {
          id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          uri: takenUri,
          isRep: false,
          isServerImage: false,
        }
        const updated = [...images, newItem]
        if (updated.every((i) => !i.isRep) && updated.length) updated[0].isRep = true
        setImages(updated)
      }
    } catch (error) {
      console.error('카메라 촬영 중 오류:', error)
      showSnackbar('카메라 촬영 중 오류가 발생했습니다.')
    }
  }

   
  // 갤러리에서 이미지 선택
  const pickImages = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('권한 필요', '갤러리 접근 권한이 필요합니다.')
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 1,                          // 원본
        allowsMultipleSelection: true,
        selectionLimit: 5 - images.length,
      })

      if (!result.canceled) {
        let uris = result.assets.map((a) => a.uri)
        if (images.length + uris.length > 5) {
          showToast('사진은 최대 5장까지 첨부 가능합니다.')
          uris = uris.slice(0, 5 - images.length)
        }

        // 여러 이미지를 병렬 압축
        const compressedUris = await Promise.all(
          uris.map((u) => compressAndResize(u))
        )

        const newItems = compressedUris.map((uri) => ({
          id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          uri,
          isRep: false,
          isServerImage: false,
        }))

        const updated = [...images, ...newItems]
        if (updated.every((i) => !i.isRep) && updated.length) updated[0].isRep = true
        setImages(updated)
      }
    } catch (error) {
      console.error('이미지 선택 중 오류:', error)
      showSnackbar('이미지 선택 중 오류가 발생했습니다.')
    }
  }

  // 대표 이미지 설정 함수
  const setAsRepresentative = (id) => {
    setImages((prev) => {
      const newArr = prev.map((img) => ({ ...img, isRep: img.id === id }))
      const repIndex = newArr.findIndex((img) => img.isRep)
      if (repIndex > 0) {
        const [repItem] = newArr.splice(repIndex, 1)
        newArr.unshift(repItem)
      }
      return newArr
    })
  }

  // 가격 입력 후 포맷팅 함수
  const handlePriceBlur = () => {
    if (!isDonation) {
      setPrice(formatNumericPrice(price))
    }
  }

  // 판매 상태에 따른 색상 반환 함수
  const getStatusColors = (value) => {
    switch (value) {
      case 0:
        return { selected: '#E9F9EE', unselected: '#E9F9EE', textSelected: '#4CAF50', textUnselected: 'black' }
      case 1:
        return { selected: '#D0E8FF', unselected: '#D0E8FF', textSelected: '#007bff', textUnselected: 'black' }
      case 2:
        return { selected: '#F0F0F0', unselected: '#F0F0F0', textSelected: 'black', textUnselected: 'black' }
      default:
        return { selected: '#E9F9EE', unselected: '#E9F9EE', textSelected: '#4CAF50', textUnselected: 'black' }
    }
  }

  // 글 작성 또는 수정 제출 함수
  const handleSubmit = async () => {
    const trimTitle = title.trim()
    const trimContent = content.trim()
    const numericPriceStr = price.replace(/[^0-9]/g, '')
    const numericPrice = parseInt(numericPriceStr || '0', 10)

    if (!trimTitle || !trimContent || numericPriceStr === '') {
      Alert.alert('입력 오류', '제목, 내용, 가격을 모두 입력해주세요.')
      return
    }

    // 1) 기존 서버 이미지 개수
    const originalServerCount = existingPost?.images?.length || 0

    // 2) 순서 그대로인지 확인 (id 순서가 기존 순서와 일치하면 true)
    const isSameOrder = images.every((img, idx) => {
      return !img.isServerImage
        || img.uri.endsWith(existingPost.images[idx]?.imageUrl)
    })
    // 3) 삭제 또는 재정렬 발생했는지 여부
    const needFullReplace =
      editMode &&
      (images.length !== originalServerCount || !isSameOrder)

    try {
      const formData = new FormData()
      formData.append('title', trimTitle)
      formData.append('content', trimContent)
      formData.append('price', numericPrice)
      if (editMode) {
        formData.append('status', saleStatus.toString())
      }

      let fileIndex = 0
      for (const imgObj of images) {
        let fileEntry

        if (imgObj.isServerImage) {
          // 서버에 있던 이미지는 remoteToFile 로 다시 다운로드
          fileEntry = await remoteToFile(imgObj.uri, fileIndex)
        } else {
          // 새로 찍거나 고른 로컬 이미지
          const ext = imgObj.uri.split('.').pop() || 'jpg'
          fileEntry = {
            uri:  imgObj.uri,
            name: `photo_${fileIndex}.${ext}`,
            type: `image/${ext}`,
          }
        }

        formData.append('images', fileEntry)
        fileIndex++
      }

      // if (editMode && existingPost) {
      //   await axiosInstance.put(`/api/post/${existingPost.id}`, formData, {
      //     headers: { 'Content-Type': 'multipart/form-data' },
      //   })
      //   Alert.alert('수정 완료', '글이 수정되었습니다.', [
      //     { text: '확인', onPress: () => navigation.goBack() },
      //   ])
        if (editMode && existingPost) {
          const url = `/api/post/${existingPost.id}`
          if (needFullReplace) {
            // 삭제·순서 변경이 있으면 PUT, 모든 이미지를 대체
            await axiosInstance.put(url, formData, {
              headers: { 'Content-Type': 'multipart/form-data' },
            })
          } else {
            // 그렇지 않으면 PATCH 방식 유지
            await axiosInstance.patch(url, formData, {
              headers: { 'Content-Type': 'multipart/form-data' },
            })
          }
          Alert.alert('수정 완료', '글이 수정되었습니다.', [
            { text: '확인', onPress: () => navigation.goBack() },
          ])
        } else {
        await axiosInstance.post('/api/post', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        Alert.alert('작성 완료', '글이 작성되었습니다.', [
          { text: '확인', onPress: () => navigation.navigate('MainTab') },
        ])
      }
    } catch (error) {
      console.error(error)
      Alert.alert('오류', `글 ${editMode ? '수정' : '작성'} 중 오류: ` + (error.response?.data || error.message))
    }
  }

  const showSnackbar = (message) => {
    setSnackbarMessage(message)
    setSnackbarVisible(true)
  }

  const onDismissSnackbar = () => setSnackbarVisible(false)

  // 사진 첨부 모드 토글 함수
  const handleToggleReorderMode = () => {
    setDeleteMode(false)
    setReorderMode(!reorderMode)
  }

  const handleToggleDeleteMode = () => {
    setReorderMode(false)
    setDeleteMode(!deleteMode)
  }

  // 삭제할 이미지 선택 토글 함수
  const toggleSelectImage = (id) => {
    if (!deleteMode) return
    if (selectedForDelete.includes(id)) {
      setSelectedForDelete(selectedForDelete.filter((itemId) => itemId !== id))
    } else {
      setSelectedForDelete([...selectedForDelete, id])
    }
  }

  // 선택된 이미지 삭제 함수
  const handleDeleteSelected = () => {
    if (selectedForDelete.length === 0) {
      showSnackbar('삭제할 사진을 선택하세요.')
      return
    }
    let updatedImages = images.filter((img) => !selectedForDelete.includes(img.id))
    const wasRepDeleted = images.some((img) => img.isRep && selectedForDelete.includes(img.id))
    if (wasRepDeleted && updatedImages.length > 0) {
      updatedImages = updatedImages.map((img, idx) => ({ ...img, isRep: idx === 0 }))
    }
    setImages(updatedImages)
    setDeleteMode(false)
    setSelectedForDelete([])
  }

  // 드래그 앤 드롭 종료 후 이미지 순서 변경 함수
  const handleDragEnd = (draggedIndex, gesture, pan, cellSize) => {
    if (!cellSize.width || !cellSize.height) {
      Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start()
      return
    }
    const horizontalMove = Math.round(gesture.dx / cellSize.width)
    const verticalMove = Math.round(gesture.dy / cellSize.height)
    const offset = horizontalMove + verticalMove * numColumns
    const newIndex = Math.min(Math.max(draggedIndex + offset, 0), images.length - 1)
    Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start()
    if (newIndex !== draggedIndex) {
      let newImages = [...images]
      const [movedItem] = newImages.splice(draggedIndex, 1)
      newImages.splice(newIndex, 0, movedItem)
      newImages = newImages.map((img, idx) => ({ ...img, isRep: idx === 0 }))
      setImages(newImages)
    }
  }

  // 이미지 셀 크기 측정 함수
  const handleMeasureCell = (width, height) => {
    if (cellSize.width === 0) {
      setCellSize({ width, height })
    }
  }

  // 드래그 가능한 이미지 컴포넌트
  const DraggableImage = ({
    item,
    index,
    cellSize,
    numColumns,
    numImages,
    onDragEnd,
    onMeasureCell,
  }) => {
    const pan = useRef(new Animated.ValueXY()).current
    const [isDragging, setIsDragging] = useState(false)

    const panResponder = useRef(
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderGrant: () => setIsDragging(true),
        onPanResponderMove: (e, gesture) => {
          let newDx = gesture.dx
          let newDy = gesture.dy
          if (cellSize.width && cellSize.height) {
            const col = index % numColumns
            const row = Math.floor(index / numColumns)
            const numRows = Math.ceil(numImages / numColumns)
            const minDx = -col * cellSize.width
            const maxDx = (numColumns - col - 1) * cellSize.width
            const minDy = -row * cellSize.height
            const maxDy = (numRows - row - 1) * cellSize.height
            newDx = Math.max(minDx, Math.min(newDx, maxDx))
            newDy = Math.max(minDy, Math.min(newDy, maxDy))
          }
          pan.setValue({ x: newDx, y: newDy })
        },
        onPanResponderRelease: (e, gesture) => {
          setIsDragging(false)
          onDragEnd(index, gesture, pan, cellSize)
        },
        onPanResponderTerminate: (e, gesture) => {
          setIsDragging(false)
          Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start()
        },
      })
    ).current

    return (
      <Animated.View
        style={[
          styles.imageBox,
          isDragging && { zIndex: 2 },
          { transform: pan.getTranslateTransform() },
        ]}
        {...(reorderMode ? panResponder.panHandlers : {})}
        onLayout={(e) => {
          if (onMeasureCell && cellSize.width === 0) {
            const { width, height } = e.nativeEvent.layout
            onMeasureCell(width, height)
          }
        }}
      >
        <Image source={{ uri: item.uri }} style={styles.imagePreview} resizeMode="cover" />
        <TouchableOpacity
          style={styles.starIcon}
          onPress={() => {
            if (!deleteMode) setAsRepresentative(item.id)
          }}
        >
          <MaterialCommunityIcons
            name={item.isRep ? 'star' : 'star-outline'}
            size={22}
            style={item.isRep && styles.starIconSelected}
            color={item.isRep ? 'yellow' : 'black'}
          />
        </TouchableOpacity>
      </Animated.View>
    )
  }

  return (
    <SafeAreaView style={[styles.safeArea, Platform.OS === 'android' && { paddingTop: StatusBar.currentHeight }]}>
      <View style={[styles.header, { height: 60 }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{editMode ? '글 수정하기' : '글 작성하기'}</Text>
          <View style={{ width: 24 }} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {/* 판매글 작성 섹션 */}
        <Card style={styles.card}>
          <Card.Title title={editMode ? '판매글 수정' : '판매글 작성'} titleStyle={styles.cardTitle} />
          <Card.Content>
            <TextInput
              label="제목 (100자 이내)"
              value={title}
              // maxLength 로 추가 입력 자체를 막고
              maxLength={100}
              // 초과 시 토스트 띄우고 상태 변경 안 함
              onChangeText={(text) => {
                if (text.length > 100) {
                  showToast('제목은 100자 이내로 입력해주세요.');
                  return;
                }
                setTitle(text);
              }}
              mode="outlined"
              style={styles.input}
            />
            <TextInput
              label="내용 (500자 이내)"
              value={content}
              maxLength={500}
              onChangeText={(text) => {
                if (text.length > 500) {
                  showToast('내용은 500자 이내로 입력해주세요.');
                  return;
                }
                setContent(text);
              }}
              mode="flat"
              multiline
              numberOfLines={12}
              style={[styles.input, styles.modernMultiline, { backgroundColor: '#fff' }]}
            />
          </Card.Content>
        </Card>

        {/* 사진 첨부 영역 */}
        <Card style={[styles.card, { backgroundColor: '#fff' }]}>
          <Card.Title
            title={`사진 첨부 (최대 5장)`}
            titleStyle={styles.cardTitle}
            right={() => (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity style={{ marginRight: 10 }} onPress={takePhoto}>
                  <MaterialCommunityIcons name="camera-outline" size={26} color="black" />
                </TouchableOpacity>
                <TouchableOpacity style={{ marginRight: 10 }} onPress={handleToggleReorderMode}>
                  <MaterialCommunityIcons
                    name="pencil-outline"
                    size={26}
                    color={reorderMode ? 'blue' : 'black'}
                  />
                </TouchableOpacity>
                <TouchableOpacity style={{ marginRight: 10 }} onPress={handleToggleDeleteMode}>
                  <MaterialCommunityIcons
                    name="trash-can-outline"
                    size={26}
                    color={deleteMode ? 'red' : 'black'}
                  />
                </TouchableOpacity>
              </View>
            )}
          />
          <Card.Content>
            <View style={[styles.photoContainer, { backgroundColor: '#fff' }]}>
              <View style={styles.imageGrid}>
                {images.map((item, idx) => {
                  if (reorderMode) {
                    return (
                      <DraggableImage
                        key={item.id}
                        item={item}
                        index={idx}
                        cellSize={cellSize}
                        numColumns={numColumns}
                        numImages={images.length}
                        onDragEnd={handleDragEnd}
                        onMeasureCell={cellSize.width === 0 ? handleMeasureCell : undefined}
                      />
                    )
                  } else {
                    const isSelected = selectedForDelete.includes(item.id)
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[styles.imageBox, deleteMode && isSelected && styles.imageSelected]}
                        activeOpacity={deleteMode ? 0.8 : 1}
                        onPress={() => {
                          if (deleteMode) toggleSelectImage(item.id)
                        }}
                      >
                        <Image source={{ uri: item.uri }} style={styles.imagePreview} resizeMode="cover" />
                        <TouchableOpacity
                          style={styles.starIcon}
                          onPress={() => {
                            if (!deleteMode) setAsRepresentative(item.id)
                          }}
                        >
                          <MaterialCommunityIcons
                            name={item.isRep ? 'star' : 'star-outline'}
                            size={22}
                            style={item.isRep && styles.starIconSelected}
                            color={item.isRep ? 'yellow' : 'black'}
                          />
                        </TouchableOpacity>
                      </TouchableOpacity>
                    )
                  }
                })}
                {images.length < 5 && (
                  <TouchableOpacity style={styles.addImageBox} onPress={pickImages}>
                    <MaterialCommunityIcons name="plus" size={40} color="#aaa" />
                  </TouchableOpacity>
                )}
              </View>
              {deleteMode && (
                <Button
                  mode="contained"
                  onPress={handleDeleteSelected}
                  style={[styles.deleteConfirmButton, styles.sharedButton]}
                  labelStyle={{ color: 'black' }}
                >
                  삭제하기
                </Button>
              )}
            </View>
          </Card.Content>
        </Card>

        {/* 가격 및 나눔 여부 설정 영역 */}
        <Card style={styles.card}>
          <Card.Title title="가격 설정" titleStyle={styles.cardTitle} />
          <Card.Content>
            <TextInput
              label="가격"
              value={price}
              onChangeText={setPrice}
              onBlur={handlePriceBlur}
              mode="outlined"
              keyboardType="numeric"
              style={styles.input}
              left={() => (
                <View style={{ justifyContent: 'center', alignItems: 'center', marginHorizontal: 8 }}>
                  <MaterialCommunityIcons name="currency-krw" size={24} color="gray" />
                </View>
              )}
              placeholder="0"
              disabled={isDonation}
            />
            <View style={styles.donationContainer}>
              <Text style={styles.donationLabel}>나눔 여부</Text>
              <Switch value={isDonation} onValueChange={handleDonationToggle} />
            </View>
          </Card.Content>
        </Card>

        {/* 수정 모드일 때 판매 상태 설정 영역 */}
        {editMode && (
          <Card style={styles.card}>
            <Card.Title title="판매 상태 설정" titleStyle={styles.cardTitle} />
            <Card.Content>
              <View style={styles.statusContainer}>
                {[
                  { label: '판매중', value: 0 },
                  { label: '예약중', value: 1 },
                  { label: '판매완료', value: 2 },
                ].map((item) => {
                  const colors = getStatusColors(item.value)
                  const isSelected = saleStatus === item.value
                  return (
                    <TouchableOpacity
                      key={item.value}
                      style={[
                        styles.statusButton,
                        {
                          backgroundColor: isSelected ? colors.selected : '#fff',
                          borderColor: colors.unselected,
                        },
                      ]}
                      onPress={() => setSaleStatus(item.value)}
                    >
                      <Text style={{ color: isSelected ? colors.textSelected : 'black', fontSize: 14 }}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            </Card.Content>
          </Card>
        )}

        <Button
          mode="contained"
          onPress={handleSubmit}
          style={[styles.submitButton, { backgroundColor: '#87CEEB' }]}
          labelStyle={{ color: 'black', fontWeight: 'bold' }}
        >
          {editMode ? '수정 완료' : '작성 완료'}
        </Button>
      </ScrollView>

      {/* 스낵바 컴포넌트 */}
      <Snackbar
        visible={snackbarVisible}
        onDismiss={onDismissSnackbar}
        duration={3000}
        action={{ label: '닫기', onPress: () => setSnackbarVisible(false) }}
      >
        {snackbarMessage}
      </Snackbar>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    backgroundColor: '#87CEEB',
    borderBottomWidth: 1,
    borderColor: '#ddd',
    paddingHorizontal: 15,
    justifyContent: 'center',
  },
  headerContent: { flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'space-between' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', marginLeft: 10, color: 'black' },
  container: {
    padding: 15,
    paddingBottom: 30,
  },
  card: {
    marginBottom: 15,
    borderRadius: 8,
    backgroundColor: '#FAFAFA',
    elevation: 3,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  input: {
    marginBottom: 15,
    backgroundColor: '#fff',
  },
  modernMultiline: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    height: 250,
    textAlignVertical: 'top',
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  photoContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  imageBox: {
    width: '30%',
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fafafa',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    margin: 5,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  starIcon: {
    position: 'absolute',
    top: 5,
    right: 5,
  },
  starIconSelected: {
    textShadowColor: 'black',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 1,
  },
  imageSelected: {
    borderColor: 'red',
    borderWidth: 2,
  },
  addImageBox: {
    width: '30%',
    aspectRatio: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fafafa',
    justifyContent: 'center',
    alignItems: 'center',
    margin: 5,
  },
  deleteConfirmButton: {
    marginTop: 10,
    alignSelf: 'flex-end',
    borderRadius: 4,
  },
  sharedButton: {
    backgroundColor: '#87CEEB',
    borderRadius: 4,
    shadowOffset: { width: 0, height: 0 },
  },
  keywordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  addButton: {
    marginLeft: 10,
    borderRadius: 4,
    marginBottom: 10,
  },
  keywordsDisplay: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
  },
  keywordBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eee',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
    marginRight: 8,
    marginBottom: 8,
  },
  keywordText: {
    fontSize: 14,
    marginRight: 5,
  },
  donationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  donationLabel: {
    fontSize: 16,
    marginRight: 10,
  },
  submitButton: {
    marginTop: 10,
    borderRadius: 4,
    elevation: 3,
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  statusButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 4,
  },
  statusButtonText: {
    fontSize: 14,
  },
})
