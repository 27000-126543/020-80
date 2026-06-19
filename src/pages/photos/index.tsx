import React, { useMemo } from 'react'
import { View, Text, ScrollView, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import classnames from 'classnames'
import styles from './index.module.scss'
import { usePatientStore } from '@/store/usePatientStore'
import type { PhotoRecord, Patient, PhotoAngle, PhotoStage } from '@/types'
import { PhotoAngleMap, PhotoStageMap } from '@/types'

const requiredAngles: PhotoAngle[] = ['front', 'side', 'occlusal', 'local']

const PhotosPage: React.FC = () => {
  const {
    getTodayPhotoRecords,
    getTodayTreatingPatientsWithoutPhotos,
    patients
  } = usePatientStore()

  const todayRecords = useMemo(() => getTodayPhotoRecords(), [getTodayPhotoRecords])
  const noPhotoPatients = useMemo(() => getTodayTreatingPatientsWithoutPhotos(), [getTodayTreatingPatientsWithoutPhotos])

  const totalPhotos = useMemo(() => {
    return todayRecords.reduce((sum, r) =>
      sum + r.prePhotos.length + r.duringPhotos.length + r.postPhotos.length, 0
    )
  }, [todayRecords])

  const treatingCount = useMemo(() =>
    patients.filter(p => p.status === 'treating').length
  , [patients])

  const handleGoCapture = (patientId: string) => {
    Taro.navigateTo({
      url: `/pages/photo-capture/index?patientId=${patientId}`
    })
  }

  const getFirstThumbs = (record: PhotoRecord) => {
    const all = [...record.prePhotos, ...record.duringPhotos, ...record.postPhotos]
    return all.slice(0, 5)
  }

  const getStageAngles = (record: PhotoRecord, stage: PhotoStage) => {
    const key = `${stage}Photos` as 'prePhotos' | 'duringPhotos' | 'postPhotos'
    const photos = record[key]
    return requiredAngles.map(angle => ({
      angle,
      done: photos.some(p => p.angle === angle)
    }))
  }

  const getMissingAngles = (record: PhotoRecord) => {
    const missing: { stage: PhotoStage; angle: PhotoAngle }[] = []
    ;(['pre', 'during', 'post'] as PhotoStage[]).forEach(stage => {
      const key = `${stage}Photos` as 'prePhotos' | 'duringPhotos' | 'postPhotos'
      requiredAngles.forEach(angle => {
        if (!record[key].some(p => p.angle === angle)) {
          missing.push({ stage, angle })
        }
      })
    })
    return missing
  }

  const getAngleCompletion = (record: PhotoRecord) => {
    const missing = getMissingAngles(record)
    return { completed: 12 - missing.length, total: 12 }
  }

  const hasContent = todayRecords.length > 0 || noPhotoPatients.length > 0

  return (
    <View className={styles.page}>
      <View className={styles.header}>
        <Text className={styles.title}>今日拍照归档</Text>
        <View className={styles.stats}>
          <View className={styles.statItem}>
            <Text className={styles.num}>{todayRecords.length}</Text>
            <Text className={styles.label}>已拍照</Text>
          </View>
          <View className={styles.statItem}>
            <Text className={styles.num}>{noPhotoPatients.length}</Text>
            <Text className={styles.label}>待拍照</Text>
          </View>
          <View className={styles.statItem}>
            <Text className={styles.num}>{totalPhotos}</Text>
            <Text className={styles.label}>照片总数</Text>
          </View>
          <View className={styles.statItem}>
            <Text className={styles.num}>{treatingCount}</Text>
            <Text className={styles.label}>治疗中</Text>
          </View>
        </View>
      </View>

      <ScrollView scrollY style={{ height: 'calc(100vh - 260rpx)' }}>
        {!hasContent ? (
          <View className={styles.emptyState}>
            <Text className={styles.emptyIcon}>📷</Text>
            <Text className={styles.emptyText}>暂无拍照记录</Text>
            <View className={styles.emptyBtn} onClick={() => Taro.switchTab({ url: '/pages/patients/index' })}>
              <Text>去选择患者</Text>
            </View>
          </View>
        ) : (
          <View>
            {noPhotoPatients.length > 0 && (
              <View className={styles.section}>
                <View className={styles.sectionTitle}>
                  <View className={styles.titleDotPending}></View>
                  <Text>待拍照患者</Text>
                  <Text className={styles.sectionExtra}>{noPhotoPatients.length}位</Text>
                </View>
                {noPhotoPatients.map((patient: Patient) => (
                  <View
                    key={patient.id}
                    className={styles.pendingCard}
                    onClick={() => handleGoCapture(patient.id)}
                  >
                    <View className={styles.pendingAvatar}>
                      <Text>{patient.name.charAt(0)}</Text>
                    </View>
                    <View className={styles.pendingInfo}>
                      <Text className={styles.pendingName}>{patient.name}</Text>
                      <Text className={styles.pendingMeta}>
                        {patient.room} · {patient.dentist} · {patient.appointmentTime}
                      </Text>
                    </View>
                    <View className={styles.startBtn}>
                      <Text>📷 开始拍照</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {todayRecords.length > 0 && (
              <View className={styles.section}>
                <View className={styles.sectionTitle}>
                  <View className={styles.titleDotDone}></View>
                  <Text>已拍照记录</Text>
                  <Text className={styles.sectionExtra}>{todayRecords.length}位 · {totalPhotos}张</Text>
                </View>
                {todayRecords.map(record => {
                  const missing = getMissingAngles(record)
                  const completion = getAngleCompletion(record)

                  return (
                    <View
                      key={record.id}
                      className={styles.recordCard}
                      onClick={() => handleGoCapture(record.patientId)}
                    >
                      <View className={styles.cardHeader}>
                        <View className={styles.avatar}>
                          <Text>{record.patientName.charAt(0)}</Text>
                        </View>
                        <View className={styles.info}>
                          <Text className={styles.name}>{record.patientName}</Text>
                          <Text className={styles.meta}>{record.room} · {record.date}</Text>
                        </View>
                        <View className={classnames(
                          styles.completionBadge,
                          completion.completed === completion.total && styles.allDone
                        )}>
                          <Text>{completion.completed}/{completion.total}</Text>
                        </View>
                      </View>

                      <View className={styles.stageAngleMap}>
                        {(['pre', 'during', 'post'] as PhotoStage[]).map(stage => {
                          const stageAngles = getStageAngles(record, stage)
                          return (
                            <View key={stage} className={styles.stageAngleRow}>
                              <Text className={classnames(styles.stageLabel, styles[stage])}>
                                {PhotoStageMap[stage]}
                              </Text>
                              <View className={styles.angleDots}>
                                {stageAngles.map(sa => (
                                  <View
                                    key={sa.angle}
                                    className={classnames(
                                      styles.angleDot,
                                      sa.done ? styles.dotDone : styles.dotMissing
                                    )}
                                  >
                                    <Text>{PhotoAngleMap[sa.angle].slice(0, 1)}</Text>
                                  </View>
                                ))}
                              </View>
                            </View>
                          )
                        })}
                      </View>

                      {missing.length > 0 && (
                        <View className={styles.missingBar}>
                          <Text className={styles.missingText}>
                            ⚠️ 缺少 {missing.slice(0, 4).map(m =>
                              `${PhotoStageMap[m.stage]}·${PhotoAngleMap[m.angle]}`
                            ).join('、')}{missing.length > 4 ? `等${missing.length}项` : ''}
                          </Text>
                          <Text className={styles.missingAction}>去补拍 ›</Text>
                        </View>
                      )}

                      {getFirstThumbs(record).length > 0 && (
                        <View className={styles.thumbRow}>
                          <Text className={styles.thumbLabel}>最新照片</Text>
                          <View className={styles.thumbs}>
                            {getFirstThumbs(record).map(photo => (
                              <View key={photo.id} className={styles.thumb}>
                                <Image
                                  src={photo.url}
                                  mode="aspectFill"
                                  onError={(e) => console.error('[PhotosPage] image error', e.detail)}
                                />
                              </View>
                            ))}
                          </View>
                        </View>
                      )}

                      <View className={styles.actionBtn}>
                        <Text>查看 / 补拍</Text>
                      </View>
                    </View>
                  )
                })}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  )
}

export default PhotosPage
