import React, { useMemo } from 'react'
import { View, Text, ScrollView, Image } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import classnames from 'classnames'
import styles from './index.module.scss'
import { usePatientStore } from '@/store/usePatientStore'
import type { PhotoStage, PhotoAngle, PhotoItem } from '@/types'
import { PhotoAngleMap, PhotoStageMap } from '@/types'

const requiredAngles: PhotoAngle[] = ['front', 'side', 'occlusal', 'local']

const ArchivePreviewPage: React.FC = () => {
  const router = useRouter()
  const patientId = router.params.patientId as string
  const { getPatientById, getPhotoRecordByPatientId, getHandoverByPatientId } = usePatientStore()

  const patient = getPatientById(patientId)
  const photoRecord = getPhotoRecordByPatientId(patientId)
  const handoverRecord = getHandoverByPatientId(patientId)

  const photoCompletion = useMemo(() => {
    if (!photoRecord) return { completed: 0, total: 12 }
    let completed = 0
    ;(['pre', 'during', 'post'] as PhotoStage[]).forEach(stage => {
      const key = `${stage}Photos` as 'prePhotos' | 'duringPhotos' | 'postPhotos'
      requiredAngles.forEach(angle => {
        if (photoRecord[key].some(p => p.angle === angle)) completed++
      })
    })
    return { completed, total: 12 }
  }, [photoRecord])

  const getStagePhotos = (stage: PhotoStage) => {
    if (!photoRecord) return []
    const key = `${stage}Photos` as 'prePhotos' | 'duringPhotos' | 'postPhotos'
    return requiredAngles.map(angle => {
      const photo = photoRecord[key].find(p => p.angle === angle)
      return { angle, photo: photo || null }
    })
  }

  const handlePreview = (photo: PhotoItem) => {
    const allUrls: string[] = []
    ;(['pre', 'during', 'post'] as PhotoStage[]).forEach(stage => {
      if (!photoRecord) return
      const key = `${stage}Photos` as 'prePhotos' | 'duringPhotos' | 'postPhotos'
      photoRecord[key].forEach(p => allUrls.push(p.url))
    })
    Taro.previewImage({ urls: allUrls, current: photo.url })
  }

  if (!patient) {
    return (
      <View className={styles.page}>
        <Text>患者不存在</Text>
      </View>
    )
  }

  const isComplete = photoCompletion.completed === photoCompletion.total
    && handoverRecord?.completedAt
    && handoverRecord?.followUpDate

  return (
    <View className={styles.page}>
      <View className={styles.patientBar}>
        <View className={styles.avatar}>
          <Text>{patient.name.charAt(0)}</Text>
        </View>
        <View className={styles.info}>
          <Text className={styles.name}>{patient.name}</Text>
          <Text className={styles.meta}>{patient.room} · {patient.dentist} · {patient.appointmentTime}</Text>
        </View>
        <View className={classnames(
          styles.statusBadge,
          isComplete ? styles.complete : styles.incomplete
        )}>
          <Text>{isComplete ? '✓ 可提交' : '⚠️ 未完整'}</Text>
        </View>
      </View>

      <ScrollView scrollY style={{ height: 'calc(100vh - 160rpx)' }}>
        <View className={styles.completionBar}>
          <View className={styles.completionHeader}>
            <Text className={styles.completionLabel}>归档完成度</Text>
            <Text className={classnames(
              styles.completionValue,
              isComplete && styles.allDone
            )}>
              {photoCompletion.completed}/{photoCompletion.total} 照片
              {handoverRecord?.completedAt ? ' · 已交接' : ' · 待交接'}
              {handoverRecord?.followUpDate ? ' · 已预约' : ' · 待预约'}
            </Text>
          </View>
          <View className={styles.completionTrack}>
            <View
              className={classnames(styles.completionFill, isComplete && styles.allDoneFill)}
              style={{ width: `${(photoCompletion.completed / photoCompletion.total) * 100}%` }}
            />
          </View>
        </View>

        {(['pre', 'during', 'post'] as PhotoStage[]).map(stage => {
          const stagePhotos = getStagePhotos(stage)
          const stageDone = stagePhotos.filter(sp => sp.photo).length
          return (
            <View key={stage} className={styles.stageSection}>
              <View className={styles.stageHeader}>
                <Text className={classnames(styles.stageName, styles[stage])}>
                  {PhotoStageMap[stage]}照片
                </Text>
                <Text className={styles.stageCount}>{stageDone}/4 角度</Text>
              </View>
              <View className={styles.photoGrid}>
                {stagePhotos.map(({ angle, photo }) => (
                  <View
                    key={angle}
                    className={classnames(
                      styles.photoCell,
                      photo ? styles.hasPhoto : styles.noPhoto
                    )}
                    onClick={() => photo && handlePreview(photo)}
                  >
                    {photo ? (
                      <Image src={photo.url} mode="aspectFill" />
                    ) : (
                      <View className={styles.emptyCell}>
                        <Text className={styles.emptyIcon}>📷</Text>
                        <Text className={styles.emptyLabel}>{PhotoAngleMap[angle]}</Text>
                        <Text className={styles.emptyHint}>未拍摄</Text>
                      </View>
                    )}
                    <View className={styles.photoLabel}>
                      <Text>{PhotoAngleMap[angle]}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )
        })}

        <View className={styles.infoSection}>
          <View className={styles.infoTitle}>
            <Text>📋 归档摘要</Text>
          </View>
          <View className={styles.infoList}>
            <View className={styles.infoRow}>
              <Text className={styles.infoLabel}>患者核对</Text>
              <Text className={classnames(
                styles.infoValue,
                patient.submittedToDoctorAt ? styles.doneValue : styles.pendingValue
              )}>
                {patient.submittedToDoctorAt
                  ? `✓ 已提交 · ${patient.submittedToDoctorAt}`
                  : '未提交'}
              </Text>
            </View>
            <View className={styles.infoRow}>
              <Text className={styles.infoLabel}>交接确认</Text>
              <Text className={classnames(
                styles.infoValue,
                handoverRecord?.completedAt ? styles.doneValue : styles.pendingValue
              )}>
                {handoverRecord?.completedAt
                  ? `✓ 已完成 · ${handoverRecord.nurse}`
                  : '未完成'}
              </Text>
            </View>
            <View className={styles.infoRow}>
              <Text className={styles.infoLabel}>复诊安排</Text>
              <Text className={classnames(
                styles.infoValue,
                handoverRecord?.followUpDate ? styles.doneValue : styles.pendingValue
              )}>
                {handoverRecord?.followUpDate
                  ? `✓ ${handoverRecord.followUpDate}`
                  : '待补齐'}
              </Text>
            </View>
            {handoverRecord?.completedAt && (
              <>
                <View className={styles.infoRow}>
                  <Text className={styles.infoLabel}>使用耗材</Text>
                  <Text className={styles.infoValue}>
                    {handoverRecord.supplies.filter(s => s.checked).length > 0
                      ? `${handoverRecord.supplies.filter(s => s.checked).length}项 · ${handoverRecord.supplies.filter(s => s.checked).map(s => s.name).join('、')}`
                      : '无'}
                  </Text>
                </View>
                <View className={styles.infoRow}>
                  <Text className={styles.infoLabel}>注意事项</Text>
                  <Text className={classnames(
                    styles.infoValue,
                    handoverRecord.postOpInstructions ? styles.doneValue : styles.pendingValue
                  )}>
                    {handoverRecord.postOpInstructions ? '✓ 已告知' : '未确认'}
                  </Text>
                </View>
                {handoverRecord.notes && (
                  <View className={styles.infoRow}>
                    <Text className={styles.infoLabel}>备注</Text>
                    <Text className={styles.infoValue}>{handoverRecord.notes}</Text>
                  </View>
                )}
              </>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

export default ArchivePreviewPage
