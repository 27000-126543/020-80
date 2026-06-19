import React, { useState, useMemo } from 'react'
import { View, Text, Image } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import classnames from 'classnames'
import styles from './index.module.scss'
import { usePatientStore } from '@/store/usePatientStore'
import type { PhotoStage, PhotoAngle, PhotoItem } from '@/types'
import { PhotoAngleMap, PhotoStageMap } from '@/types'

const angles: PhotoAngle[] = ['front', 'side', 'occlusal', 'local']

const angleIcons: Record<PhotoAngle, string> = {
  front: '😁',
  side: '🦷',
  occlusal: '🔽',
  local: '🔍'
}

const stageKeys = ['prePhotos', 'duringPhotos', 'postPhotos'] as const

const PhotoCapturePage: React.FC = () => {
  const router = useRouter()
  const patientId = router.params.patientId as string
  const { getPatientById, getPhotoRecordByPatientId, addPhoto } = usePatientStore()

  const [currentStage, setCurrentStage] = useState<PhotoStage>('pre')

  const patient = getPatientById(patientId)
  const photoRecord = getPhotoRecordByPatientId(patientId)

  const stagePhotos = useMemo(() => {
    if (!photoRecord) return { prePhotos: [], duringPhotos: [], postPhotos: [] }
    return {
      prePhotos: photoRecord.prePhotos,
      duringPhotos: photoRecord.duringPhotos,
      postPhotos: photoRecord.postPhotos
    }
  }, [photoRecord])

  const currentPhotos = useMemo(() => {
    const key = `${currentStage}Photos` as 'prePhotos' | 'duringPhotos' | 'postPhotos'
    return stagePhotos[key]
  }, [stagePhotos, currentStage])

  const getAngleCount = (angle: PhotoAngle, stage?: PhotoStage): number => {
    const s = stage || currentStage
    const key = `${s}Photos` as 'prePhotos' | 'duringPhotos' | 'postPhotos'
    return stagePhotos[key].filter(p => p.angle === angle).length
  }

  const getStageCompletion = (stage: PhotoStage) => {
    const key = `${stage}Photos` as 'prePhotos' | 'duringPhotos' | 'postPhotos'
    const photos = stagePhotos[key]
    const completed = angles.filter(a => photos.some(p => p.angle === a)).length
    return { completed, total: angles.length }
  }

  const getOverallCompletion = () => {
    let completed = 0
    let total = 0
    ;(['pre', 'during', 'post'] as PhotoStage[]).forEach(s => {
      const sc = getStageCompletion(s)
      completed += sc.completed
      total += sc.total
    })
    return { completed, total }
  }

  const handleCapture = (angle: PhotoAngle) => {
    Taro.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['camera', 'album'],
      success: (res) => {
        const tempFilePaths = res.tempFilePaths
        if (tempFilePaths && tempFilePaths.length > 0) {
          const tempPath = tempFilePaths[0]
          const now = new Date()
          const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
          const fs = Taro.getFileSystemManager()
          fs.readFile({
            filePath: tempPath,
            encoding: 'base64',
            success: (readRes) => {
              const base64Url = `data:image/jpeg;base64,${readRes.data}`
              const newPhoto: PhotoItem = {
                id: `photo-${Date.now()}`,
                angle,
                url: base64Url,
                uploadTime: timeStr
              }
              addPhoto(patientId, currentStage, newPhoto)
              Taro.showToast({ title: '拍摄成功', icon: 'success', duration: 1000 })
            },
            fail: () => {
              const newPhoto: PhotoItem = {
                id: `photo-${Date.now()}`,
                angle,
                url: tempPath,
                uploadTime: timeStr
              }
              addPhoto(patientId, currentStage, newPhoto)
              Taro.showToast({ title: '拍摄成功', icon: 'success', duration: 1000 })
            }
          })
        }
      },
      fail: (err) => {
        console.error('[PhotoCapture] chooseImage error', err)
      }
    })
  }

  const handlePreview = (photo: PhotoItem) => {
    const urls = currentPhotos.map(p => p.url)
    Taro.previewImage({ urls, current: photo.url })
  }

  if (!patient) {
    return (
      <View className={styles.page}>
        <Text>患者不存在</Text>
      </View>
    )
  }

  const overall = getOverallCompletion()

  return (
    <View className={styles.page}>
      <View className={styles.patientBar}>
        <View className={styles.avatar}>
          <Text>{patient.name.charAt(0)}</Text>
        </View>
        <View className={styles.info}>
          <Text className={styles.name}>{patient.name}</Text>
          <Text className={styles.meta}>{patient.room} · {patient.dentist}</Text>
        </View>
        <View className={styles.overallBadge}>
          <Text>{overall.completed}/{overall.total}</Text>
        </View>
      </View>

      <View className={styles.stageProgress}>
        {(['pre', 'during', 'post'] as PhotoStage[]).map(stage => {
          const sc = getStageCompletion(stage)
          const isCurrent = currentStage === stage
          return (
            <View
              key={stage}
              className={classnames(
                styles.stageTab,
                styles[stage],
                isCurrent && styles.active
              )}
              onClick={() => setCurrentStage(stage)}
            >
              <Text className={styles.stageName}>{PhotoStageMap[stage]}</Text>
              <View className={styles.stageBar}>
                <View
                  className={classnames(styles.stageBarFill, styles[stage])}
                  style={{ width: `${(sc.completed / sc.total) * 100}%` }}
                />
              </View>
              <Text className={styles.stageCount}>
                {sc.completed}/{sc.total} 角度
              </Text>
            </View>
          )
        })}
      </View>

      <View className={styles.angleGrid}>
        {angles.map(angle => {
          const count = getAngleCount(angle)
          const hasPhoto = count > 0
          return (
            <View
              key={angle}
              className={classnames(
                styles.angleCard,
                styles[currentStage],
                hasPhoto && styles.done,
                !hasPhoto && styles.missing
              )}
            >
              <View className={styles.angleIcon}>
                <Text>{angleIcons[angle]}</Text>
              </View>
              <Text className={styles.angleName}>{PhotoAngleMap[angle]}</Text>
              <Text className={classnames(styles.angleCount, !hasPhoto && styles.missingText)}>
                {hasPhoto ? `已拍 ${count} 张` : '⚠️ 未拍摄'}
              </Text>
              <View
                className={classnames(styles.captureBtn, !hasPhoto && styles.captureMissing)}
                onClick={() => handleCapture(angle)}
              >
                <Text>📷 {hasPhoto ? '补拍' : '拍摄'}</Text>
              </View>
            </View>
          )
        })}
      </View>

      {currentPhotos.length > 0 && (
        <View className={styles.photoSection}>
          <Text className={styles.sectionTitle}>
            {PhotoStageMap[currentStage]}照片 ({currentPhotos.length}张)
          </Text>
          <View className={styles.photoGrid}>
            {currentPhotos.map(photo => (
              <View
                key={photo.id}
                className={styles.photoItem}
                onClick={() => handlePreview(photo)}
              >
                <Image
                  src={photo.url}
                  mode="aspectFill"
                  onError={(e) => console.error('[PhotoCapture] image error', e.detail)}
                />
                <Text className={styles.angleLabel}>{PhotoAngleMap[photo.angle]}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View className={styles.bottomTip}>
        <Text className={styles.tipIcon}>💡</Text>
        <View className={styles.tipText}>
          <Text>每个阶段需拍摄正面、侧方、咬合面、局部牙位4个角度。缺少的角度标红提醒，补拍后统计自动更新。</Text>
        </View>
      </View>
    </View>
  )
}

export default PhotoCapturePage
