// pages/Post.js
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
import { TextInput, Button, Card, Snackbar } from 'react-native-paper'
import * as ImagePicker from 'expo-image-picker'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useNavigation, useRoute } from '@react-navigation/native'
import axiosInstance from '../api/axios'
import { showToast } from '../state/toastUtil'
import { useSelector } from 'react-redux'
import config from '../api/config'

const formatNumericPrice = (text) => {
  const numericText = text.replace(/[^0-9]/g, '')
  if (!numericText) return ''
  return numericText.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '원'
}

export default function Post() {
  const navigation = useNavigation() // 내비게이션 사용
  const route = useRoute() // 라우트 정보 사용

  const editMode = route.params?.editMode || false // 수정 모드 여부
  const existingPost = route.params?.existingPost || null // 수정 시 기존 글 정보

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [price, setPrice] = useState('')
  const [keywordInput, setKeywordInput] = useState('')
  const [keywords, setKeywords] = useState([])

  const [images, setImages] = useState([])
  const [deleteMode, setDeleteMode] = useState(false)
  const [selectedForDelete, setSelectedForDelete] = useState([])
  const [reorderMode, setReorderMode] = useState(false)
  const [snackbarVisible, setSnackbarVisible] = useState(false)
  const [snackbarMessage, setSnackbarMessage] = useState('')

  // 판매 상태 (0: 판매중, 1: 예약중, 2: 판매완료)
  const [saleStatus, setSaleStatus] = useState(0)

  const [cellSize, setCellSize] = useState({ width: 0, height: 0 })
  const numColumns = 3

  // 수정 모드인 경우 기존 글 정보를 초기화
  useEffect(() => {
    if (editMode && existingPost) {
      setTitle(existingPost.title || '')
      setContent(existingPost.content || '')
      setPrice(existingPost.price ? formatNumericPrice(String(existingPost.price)) : '')
      if (existingPost.status !== undefined) {
        setSaleStatus(existingPost.status)
      }
      const serverImages = (existingPost.images || []).map((imgObj, idx) => ({
        id: `server-${idx}`,
        uri: `${config.BASE_URL}/images/${imgObj.imageUrl}`,
        isRep: idx === 0,
        isServerImage: true,
      }))
      setImages(serverImages)
    }
  }, [editMode, existingPost])

  // 키워드 추가 함수
  const addKeyword = () => {
    if (keywordInput.trim() === '') return
    setKeywords([...keywords, `#${keywordInput.trim()}`])
    setKeywordInput('')
  }
  // 키워드 삭제 함수
  const removeKeyword = (indexToRemove) => {
    setKeywords(keywords.filter((_, idx) => idx !== indexToRemove))
  }

  // 카메라 촬영 함수
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
        quality: 1,
      })

      if (!result.canceled && result.assets && result.assets.length > 0) {
        if (images.length >= 5) {
          showToast('사진은 최대 5장까지 첨부 가능합니다.')
          return
        }

        const takenUri = result.assets[0].uri
        const newItem = {
          id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          uri: takenUri,
          isRep: false,
          isServerImage: false,
        }
        const updatedImages = [...images, newItem]
        if (updatedImages.every((img) => !img.isRep) && updatedImages.length > 0) {
          updatedImages[0].isRep = true
        }
        setImages(updatedImages)
      }
    } catch (error) {
      console.error('카메라 촬영 중 오류 발생:', error)
      showSnackbar('카메라 촬영 중 오류가 발생했습니다.')
    }
  }

  // 앨범에서 이미지 선택 함수
  const pickImages = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('권한 필요', '갤러리 접근 권한이 필요합니다.')
        return
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 1,
        allowsMultipleSelection: true,
        selectionLimit: 5 - images.length,
      })
      if (!result.canceled) {
        let selectedUris = []
        if (result.assets && result.assets.length > 0) {
          selectedUris = result.assets.map((asset) => asset.uri)
        } else if (result.uri) {
          selectedUris = [result.uri]
        }
        if (images.length + selectedUris.length > 5) {
          showToast('사진은 최대 5장까지 첨부 가능합니다.')
          const remain = 5 - images.length
          selectedUris = selectedUris.slice(0, remain)
        }
        const newItems = selectedUris.map((uri) => ({
          id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          uri,
          isRep: false,
          isServerImage: false,
        }))
        const updatedImages = [...images, ...newItems]
        if (updatedImages.every((img) => !img.isRep) && updatedImages.length > 0) {
          updatedImages[0].isRep = true
        }
        setImages(updatedImages)
      }
    } catch (error) {
      console.error('이미지 선택 중 오류 발생:', error)
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
    setPrice(formatNumericPrice(price))
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

    if (!trimTitle || !trimContent || !numericPrice) {
      Alert.alert('입력 오류', '제목, 내용, 가격을 모두 입력해주세요.')
      return
    }

    try {
      const formData = new FormData()
      formData.append('title', trimTitle)
      formData.append('content', trimContent)
      formData.append('price', numericPrice)
      if (editMode) {
        formData.append('status', saleStatus.toString())
      }

      let fileIndex = 0
      images.forEach((imgObj) => {
        if (!imgObj.isServerImage) {
          const uriParts = imgObj.uri.split('.')
          const fileExtension = uriParts[uriParts.length - 1] || 'jpg'
          formData.append('images', {
            uri: imgObj.uri,
            name: `photo_${fileIndex}.${fileExtension}`,
            type: `image/${fileExtension}`,
          })
          fileIndex++
        }
      })

      if (editMode && existingPost) {
        await axiosInstance.put(`/api/post/${existingPost.id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
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
              label="제목"
              value={title}
              onChangeText={setTitle}
              mode="outlined"
              style={styles.input}
            />
            <TextInput
              label="내용"
              value={content}
              onChangeText={setContent}
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
            // 카메라 아이콘 추가
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

        {/* 가격 및 키워드 설정 영역 */}
        <Card style={styles.card}>
          <Card.Title title="가격 및 키워드 설정" titleStyle={styles.cardTitle} />
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
            />
            <View style={styles.keywordContainer}>
              <TextInput
                label="키워드"
                value={keywordInput}
                onChangeText={setKeywordInput}
                mode="outlined"
                style={[styles.input, { flex: 1 }]}
              />
              <Button
                mode="contained"
                onPress={addKeyword}
                style={[styles.addButton, { backgroundColor: '#87CEEB' }]}
                labelStyle={{ color: 'black' }}
              >
                추가
              </Button>
            </View>
            {keywords.length > 0 && (
              <View style={styles.keywordsDisplay}>
                {keywords.map((kw, idx) => (
                  <View key={idx} style={styles.keywordBox}>
                    <Text style={styles.keywordText}>{kw}</Text>
                    <TouchableOpacity onPress={() => removeKeyword(idx)}>
                      <MaterialCommunityIcons name="close" size={20} color="black" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
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
          labelStyle={{ color: 'black' }}
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
