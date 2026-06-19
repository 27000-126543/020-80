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

  const getAngleCount = (angle: PhotoAngle): number => {
    return currentPhotos.filter(p => p.angle === angle).length
  }

  const getAnglePhotos = (angle: PhotoAngle): PhotoItem[] => {
    return currentPhotos.filter(p => p.angle === angle)
  }

  const handleCapture = (angle: PhotoAngle) => {
    console.log('[PhotoCapture] capture', { patientId, stage: currentStage, angle })
    Taro.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['camera', 'album'],
      success: (res) => {
        const tempFilePaths = res.tempFilePaths
        if (tempFilePaths && tempFilePaths.length > 0) {
          const now = new Date()
          const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
          const newPhoto: PhotoItem = {
            id: `photo-${Date.now()}`,
            angle,
            url: tempFilePaths[0],
            uploadTime: timeStr
          }
          addPhoto(patientId, currentStage, newPhoto)
          Taro.showToast({
            title: '拍摄成功',
            icon: 'success',
            duration: 1000
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
    const current = photo.url
    Taro.previewImage({
      urls,
      current
    })
  }

  if (!patient) {
    return (
      <View className={styles.page}>
        <Text>患者不存在</Text>
      </View>
    )
  }

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
      </View>

      <View className={styles.stageTabs}>
        {(['pre', 'during', 'post'] as PhotoStage[]).map(stage => (
          <View
            key={stage}
            className={classnames(styles.stageTab, styles[stage], currentStage === stage && styles.active)}
            onClick={() => setCurrentStage(stage)}
          >
            <Text className={styles.stageName}>{PhotoStageMap[stage]}</Text>
            <Text className={styles.stageCount}>
              {stagePhotos[`${stage}Photos` as 'prePhotos' | 'duringPhotos' | 'postPhotos'].length} 张
            </Text>
          </View>
        ))}
      </View>

      <View className={styles.angleGrid}>
        {angles.map(angle => {
          const count = getAngleCount(angle)
          const hasPhoto = count > 0
          return (
            <View
              key={angle}
              className={classnames(styles.angleCard, styles[currentStage], hasPhoto && styles.done)}
            >
              <View className={styles.angleIcon}>
                <Text>{angleIcons[angle]}</Text>
              </View>
              <Text className={styles.angleName}>{PhotoAngleMap[angle]}</Text>
              <Text className={styles.angleCount}>
                {hasPhoto ? `已拍 ${count} 张` : '未拍摄'}
              </Text>
              <View
                className={styles.captureBtn}
                onClick={() => handleCapture(angle)}
              >
                <Text>📷 {hasPhoto ? '继续拍' : '拍摄'}</Text>
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
          <Text>拍摄时请保持光线充足，镜头对准拍摄部位。照片将自动归档到该患者的就诊记录中。</Text>
        </View>
      </View>
    </View>
  )
}

export default PhotoCapturePage
