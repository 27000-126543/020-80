import React, { useMemo, useState } from 'react'
import { View, Text, ScrollView, Image } from '@tarojs/components'
import Taro, { useRouter, useDidShow } from '@tarojs/taro'
import classnames from 'classnames'
import styles from './index.module.scss'
import { usePatientStore } from '@/store/usePatientStore'
import type { PhotoStage, PhotoAngle, PhotoItem } from '@/types'
import { PhotoAngleMap, PhotoStageMap } from '@/types'

const requiredAngles: PhotoAngle[] = ['front', 'side', 'occlusal', 'local']

type MissingType = 'photo' | 'handover' | 'followup'

const ArchivePreviewPage: React.FC = () => {
  const router = useRouter()
  const patientId = router.params.patientId as string
  const {
    getPatientById,
    getPhotoRecordByPatientId,
    getHandoverByPatientId,
    submitArchive
  } = usePatientStore()

  const [refreshKey, setRefreshKey] = useState(0)

  useDidShow(() => {
    setRefreshKey(k => k + 1)
  })

  const patient = getPatientById(patientId)
  const photoRecord = getPhotoRecordByPatientId(patientId)
  const handoverRecord = getHandoverByPatientId(patientId)

  const photoCompletion = useMemo(() => {
    void refreshKey
    if (!photoRecord) return { completed: 0, total: 12 }
    let completed = 0
    ;(['pre', 'during', 'post'] as PhotoStage[]).forEach(stage => {
      const key = `${stage}Photos` as 'prePhotos' | 'duringPhotos' | 'postPhotos'
      requiredAngles.forEach(angle => {
        if (photoRecord[key].some(p => p.angle === angle)) completed++
      })
    })
    return { completed, total: 12 }
  }, [photoRecord, refreshKey])

  const missingItems = useMemo((): { type: MissingType; label: string; action: () => void }[] => {
    void refreshKey
    const items: { type: MissingType; label: string; action: () => void }[] = []

    if (photoCompletion.completed < photoCompletion.total) {
      const missing = photoCompletion.total - photoCompletion.completed
      items.push({
        type: 'photo',
        label: `照片缺 ${missing} 个角度`,
        action: () => Taro.navigateTo({ url: `/pages/photo-capture/index?patientId=${patientId}` })
      })
    }

    if (!handoverRecord?.completedAt) {
      items.push({
        type: 'handover',
        label: '交接确认未完成',
        action: () => Taro.navigateTo({ url: `/pages/handover-detail/index?patientId=${patientId}` })
      })
    } else if (!handoverRecord.followUpDate) {
      items.push({
        type: 'followup',
        label: '复诊安排待补齐',
        action: () => Taro.navigateTo({ url: `/pages/handover-detail/index?patientId=${patientId}` })
      })
    }

    return items
  }, [photoCompletion, handoverRecord, patientId, refreshKey])

  const isComplete = missingItems.length === 0
  const isSubmitted = !!handoverRecord?.submittedAt

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

  const handleSubmit = () => {
    if (!isComplete) return
    Taro.showModal({
      title: '确认提交归档',
      content: '归档提交后将进入病历系统，确认提交吗？',
      confirmText: '确认提交',
      confirmColor: '#00B4A0',
      success: (res) => {
        if (res.confirm) {
          submitArchive(patientId)
          Taro.showToast({
            title: '已提交归档',
            icon: 'success',
            duration: 1500
          })
          setTimeout(() => {
            Taro.navigateBack()
          }, 1500)
        }
      }
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
          <Text className={styles.meta}>{patient.room} · {patient.dentist} · {patient.appointmentTime}</Text>
        </View>
        <View className={classnames(
          styles.statusBadge,
          isSubmitted ? styles.submitted : isComplete ? styles.complete : styles.incomplete
        )}>
          <Text>
            {isSubmitted ? '✓ 已提交' : isComplete ? '✓ 可提交' : '⚠️ 未完整'}
          </Text>
        </View>
      </View>

      <ScrollView scrollY style={{ height: 'calc(100vh - 360rpx)' }}>
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
              style={{ width: `${Math.min(100, (photoCompletion.completed / photoCompletion.total) * 100)}%` }}
            />
          </View>
        </View>

        {isSubmitted && (
          <View className={styles.submittedBar}>
            <Text className={styles.submittedIcon}>✅</Text>
            <View className={styles.submittedInfo}>
              <Text className={styles.submittedTitle}>归档已提交</Text>
              <Text className={styles.submittedMeta}>
                提交人：{handoverRecord.submittedBy} · {handoverRecord.submittedAt}
              </Text>
            </View>
          </View>
        )}

        {!isComplete && missingItems.length > 0 && (
          <View className={styles.missingSection}>
            <View className={styles.missingHeader}>
              <Text className={styles.missingTitle}>⚠️ 待补齐项</Text>
              <Text className={styles.missingCount}>{missingItems.length}项</Text>
            </View>
            <View className={styles.missingList}>
              {missingItems.map((item, idx) => (
                <View
                  key={idx}
                  className={classnames(
                    styles.missingItem,
                    item.type === 'photo' && styles.missPhoto,
                    item.type === 'handover' && styles.missHandover,
                    item.type === 'followup' && styles.missFollowup
                  )}
                  onClick={item.action}
                >
                  <View className={styles.missingLeft}>
                    <Text className={styles.missingIcon}>
                      {item.type === 'photo' ? '📷' : item.type === 'handover' ? '📋' : '📅'}
                    </Text>
                    <Text className={styles.missingLabel}>{item.label}</Text>
                  </View>
                  <Text className={styles.missingAction}>去补齐 ›</Text>
                </View>
              ))}
            </View>
          </View>
        )}

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

      <View className={styles.bottomBar}>
        {isSubmitted ? (
          <View className={classnames(styles.submitBtn, styles.submittedBtn)}>
            <Text>✓ 归档已提交</Text>
          </View>
        ) : isComplete ? (
          <View className={classnames(styles.submitBtn, styles.readyBtn)} onClick={handleSubmit}>
            <Text>确认提交归档</Text>
          </View>
        ) : (
          <View className={classnames(styles.submitBtn, styles.disabledBtn)}>
            <Text>请先补齐 {missingItems.length} 项缺失材料</Text>
          </View>
        )}
      </View>
    </View>
  )
}

export default ArchivePreviewPage
