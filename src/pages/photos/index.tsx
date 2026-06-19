import React, { useMemo } from 'react'
import { View, Text, ScrollView, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import classnames from 'classnames'
import styles from './index.module.scss'
import { usePatientStore } from '@/store/usePatientStore'
import type { PhotoRecord, Patient } from '@/types'

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
                {todayRecords.map(record => (
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
                    </View>

                    <View className={styles.stageSummary}>
                      <View className={classnames(styles.stageItem, styles.pre)}>
                        <Text className={styles.num}>{record.prePhotos.length}</Text>
                        <Text className={styles.label}>术前</Text>
                      </View>
                      <View className={classnames(styles.stageItem, styles.during)}>
                        <Text className={styles.num}>{record.duringPhotos.length}</Text>
                        <Text className={styles.label}>术中</Text>
                      </View>
                      <View className={classnames(styles.stageItem, styles.post)}>
                        <Text className={styles.num}>{record.postPhotos.length}</Text>
                        <Text className={styles.label}>术后</Text>
                      </View>
                    </View>

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
                      <Text>查看 / 继续拍摄</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  )
}

export default PhotosPage
