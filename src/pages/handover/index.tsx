import React, { useState, useMemo, useCallback } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useDidShow } from '@tarojs/taro'
import classnames from 'classnames'
import styles from './index.module.scss'
import { usePatientStore } from '@/store/usePatientStore'
import { StatusMap, HandoverRecord, PhotoAngle, PhotoStage } from '@/types'
import { PhotoAngleMap, PhotoStageMap } from '@/types'

type TabType = 'pending' | 'done' | 'qc'

const requiredAngles: PhotoAngle[] = ['front', 'side', 'occlusal', 'local']

const getSupplySummary = (record: HandoverRecord, max = 3) => {
  const checked = record.supplies.filter(s => s.checked)
  if (checked.length === 0) return ''
  const names = checked.slice(0, max).map(s => s.name)
  if (checked.length > max) names.push(`+${checked.length - max}`)
  return names.join('、')
}

const getPhotoCompletion = (patientId: string, photoRecords: any[]) => {
  const photoRecord = photoRecords.find((r: any) => r.patientId === patientId)
  if (!photoRecord) return { completed: 0, total: 12 }
  let completed = 0
  ;(['pre', 'during', 'post'] as PhotoStage[]).forEach(stage => {
    const key = `${stage}Photos` as 'prePhotos' | 'duringPhotos' | 'postPhotos'
    requiredAngles.forEach(angle => {
      if (photoRecord[key].some((p: any) => p.angle === angle)) completed++
    })
  })
  return { completed, total: 12 }
}

const getMissingItems = (patientId: string, photoRecords: any[], handoverRecords: HandoverRecord[]) => {
  const items: { type: 'photo' | 'handover' | 'followup'; label: string; stage?: PhotoStage }[] = []
  const photoRecord = photoRecords.find((r: any) => r.patientId === patientId)
  ;(['pre', 'during', 'post'] as PhotoStage[]).forEach(stage => {
    const key = `${stage}Photos` as 'prePhotos' | 'duringPhotos' | 'postPhotos'
    const missingAngles = requiredAngles.filter(angle =>
      !photoRecord || !photoRecord[key].some((p: any) => p.angle === angle)
    )
    if (missingAngles.length > 0 || !photoRecord) {
      const angleLabels = photoRecord
        ? missingAngles.map(a => PhotoAngleMap[a]).join('、')
        : '全部4个角度'
      items.push({ type: 'photo', label: `${PhotoStageMap[stage]}照片缺${angleLabels}`, stage })
    }
  })
  const handover = handoverRecords.find(r => r.patientId === patientId)
  if (!handover || !handover.completedAt) {
    items.push({ type: 'handover', label: '交接确认未完成' })
  } else if (!handover.followUpDate) {
    items.push({ type: 'followup', label: '复诊安排待补齐' })
  }
  return items
}

const getTimeLimit = (patient: any) => {
  if (!patient.submittedToDoctorAt) return null
  const now = new Date()
  const [h, m] = patient.submittedToDoctorAt.split(':').map(Number)
  const submitted = new Date()
  submitted.setHours(h, m, 0, 0)
  const diffMin = Math.floor((now.getTime() - submitted.getTime()) / 60000)
  if (diffMin >= 120) return 'overdue'
  if (diffMin >= 90) return 'warning'
  return null
}

const HandoverPage: React.FC = () => {
  const [tab, setTab] = useState<TabType>('pending')
  const store = usePatientStore()
  const { patients, photoRecords, handoverRecords } = store

  const [refreshKey, setRefreshKey] = useState(0)

  useDidShow(() => {
    setRefreshKey(k => k + 1)
  })

  const pendingPatients = useMemo(() => {
    void refreshKey
    return store.getPendingHandoverPatients()
  }, [refreshKey, store])

  const doneRecords = useMemo(() => {
    void refreshKey
    return store.getTodayDoneRecords()
      .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
  }, [refreshKey, store])

  const stats = useMemo(() => ({
    pending: pendingPatients.length,
    done: doneRecords.length,
    unarchived: patients.filter(p => p.status === 'treating' || p.status === 'done')
      .filter(p => !doneRecords.some(r => r.patientId === p.id)).length
  }), [pendingPatients.length, doneRecords.length, patients])

  const qcByRoom = useMemo(() => {
    void refreshKey
    const rooms: Record<string, { patient: any; missing: ReturnType<typeof getMissingItems>; timeLimit: string | null }[]> = {}
    patients.forEach(p => {
      if (p.status !== 'treating' && p.status !== 'done') return
      const handover = handoverRecords.find(r => r.patientId === p.id)
      if (handover?.completedAt && handover.followUpDate) return
      const missing = getMissingItems(p.id, photoRecords, handoverRecords)
      if (missing.length === 0) return
      if (!rooms[p.room]) rooms[p.room] = []
      rooms[p.room].push({ patient: p, missing, timeLimit: getTimeLimit(p) })
    })
    return rooms
  }, [refreshKey, patients, photoRecords, handoverRecords])

  const handleGoDetail = useCallback((patientId: string) => {
    Taro.navigateTo({ url: `/pages/handover-detail/index?patientId=${patientId}` })
  }, [])

  const handleGoCapture = useCallback((patientId: string) => {
    Taro.navigateTo({ url: `/pages/photo-capture/index?patientId=${patientId}` })
  }, [])

  const handleGoPatientDetail = useCallback((patientId: string) => {
    Taro.navigateTo({ url: `/pages/patient-detail/index?id=${patientId}` })
  }, [])

  const formatCompletedTime = (iso: string) => {
    if (!iso) return ''
    const t = iso.split('T')
    if (t.length === 2) return `${t[0].slice(5)} ${t[1].slice(0, 5)}`
    if (iso.includes(' ')) {
      const [d, time] = iso.split(' ')
      return `${d.slice(5)} ${time.slice(0, 5)}`
    }
    if (iso.match(/^\d{2}:\d{2}$/)) {
      const today = new Date().toISOString().slice(5, 10)
      return `${today} ${iso}`
    }
    return iso.slice(0, 16)
  }

  const formatFollowUp = (date?: string) => {
    if (!date) return ''
    const parts = date.split(' ')
    if (parts.length === 2) return `${parts[0].slice(5)} ${parts[1].slice(0, 5)}`
    return date
  }

  const getMissingAction = (item: ReturnType<typeof getMissingItems>[0], patientId: string) => {
    if (item.type === 'photo') return () => handleGoCapture(patientId)
    if (item.type === 'handover') return () => handleGoDetail(patientId)
    if (item.type === 'followup') return () => handleGoDetail(patientId)
    return () => {}
  }

  return (
    <View className={styles.page}>
      <View className={styles.header}>
        <Text className={styles.title}>护理交接确认</Text>
        <View className={styles.stats}>
          <View className={styles.statItem}>
            <Text className={styles.num}>{stats.pending}</Text>
            <Text className={styles.label}>待交接</Text>
          </View>
          <View className={styles.statItem}>
            <Text className={styles.num}>{stats.done}</Text>
            <Text className={styles.label}>已完成</Text>
          </View>
          <View className={styles.statItem}>
            <Text className={styles.num}>{stats.unarchived}</Text>
            <Text className={styles.label}>未归档</Text>
          </View>
        </View>
      </View>

      <View className={styles.tabBar}>
        <View
          className={classnames(styles.tabItem, tab === 'pending' && styles.active)}
          onClick={() => setTab('pending')}
        >
          <Text>待交接 ({stats.pending})</Text>
        </View>
        <View
          className={classnames(styles.tabItem, tab === 'done' && styles.active)}
          onClick={() => setTab('done')}
        >
          <Text>已完成 ({stats.done})</Text>
        </View>
        <View
          className={classnames(styles.tabItem, tab === 'qc' && styles.active)}
          onClick={() => setTab('qc')}
        >
          <Text>质控看板{stats.unarchived > 0 ? ` (${stats.unarchived})` : ''}</Text>
        </View>
      </View>

      <ScrollView scrollY style={{ height: 'calc(100vh - 340rpx)' }}>
        {tab === 'pending' ? (
          pendingPatients.length === 0 ? (
            <View className={styles.emptyState}>
              <Text className={styles.emptyIcon}>✅</Text>
              <Text className={styles.emptyText}>暂无待交接患者</Text>
            </View>
          ) : (
            pendingPatients.map(patient => (
              <View
                key={patient.id}
                className={styles.pendingCard}
                onClick={() => handleGoDetail(patient.id)}
              >
                <View className={styles.cardHeader}>
                  <View className={styles.avatar}>
                    <Text>{patient.name.charAt(0)}</Text>
                  </View>
                  <View className={styles.info}>
                    <Text className={styles.name}>{patient.name}</Text>
                    <Text className={styles.meta}>
                      {patient.room} · {patient.dentist} · {patient.appointmentTime}
                    </Text>
                  </View>
                  <View className={styles.statusTag}>
                    <Text>{StatusMap[patient.status]}</Text>
                  </View>
                </View>
                <View className={styles.actionBtn}>
                  <Text>去完成交接</Text>
                </View>
              </View>
            ))
          )
        ) : tab === 'done' ? (
          doneRecords.length === 0 ? (
            <View className={styles.emptyState}>
              <Text className={styles.emptyIcon}>📋</Text>
              <Text className={styles.emptyText}>暂无已完成记录</Text>
            </View>
          ) : (
            doneRecords.map(record => {
              const supplyCount = record.supplies.filter(s => s.checked).length
              const supplySummary = getSupplySummary(record)
              const photoCompletion = getPhotoCompletion(record.patientId, photoRecords)

              return (
                <View
                  key={record.id}
                  className={styles.doneCard}
                  onClick={() => handleGoDetail(record.patientId)}
                >
                  <View className={styles.cardHeader}>
                    <View className={styles.avatar}>
                      <Text>{record.patientName.charAt(0)}</Text>
                    </View>
                    <View className={styles.info}>
                      <Text className={styles.name}>{record.patientName}</Text>
                      <Text className={styles.meta}>
                        {record.room} · {record.dentist} · 护士 {record.nurse}
                      </Text>
                    </View>
                    <Text className={styles.time}>{formatCompletedTime(record.completedAt)}</Text>
                  </View>

                  <View className={styles.summaryCard}>
                    <View className={styles.summaryRow}>
                      <Text className={styles.summaryIcon}>📦</Text>
                      <View className={styles.summaryContent}>
                        <Text className={styles.summaryLabel}>耗材</Text>
                        <Text className={styles.summaryValue}>
                          {supplyCount > 0 ? `${supplyCount}项 · ${supplySummary}` : '无'}
                        </Text>
                      </View>
                    </View>

                    <View className={styles.summaryRow}>
                      <Text className={styles.summaryIcon}>💡</Text>
                      <View className={styles.summaryContent}>
                        <Text className={styles.summaryLabel}>注意事项</Text>
                        <Text className={styles.summaryValue}>
                          {record.postOpInstructions ? '已告知 ✓' : '未确认'}
                        </Text>
                      </View>
                    </View>

                    {record.followUpDate && (
                      <View className={styles.summaryRow}>
                        <Text className={styles.summaryIcon}>📅</Text>
                        <View className={styles.summaryContent}>
                          <Text className={styles.summaryLabel}>复诊时间</Text>
                          <Text className={classnames(styles.summaryValue, styles.highlight)}>
                            {formatFollowUp(record.followUpDate)}
                          </Text>
                        </View>
                      </View>
                    )}

                    {!record.followUpDate && (
                      <View className={styles.summaryRow}>
                        <Text className={styles.summaryIcon}>�</Text>
                        <View className={styles.summaryContent}>
                          <Text className={styles.summaryLabel}>复诊时间</Text>
                          <Text className={classnames(styles.summaryValue, styles.missingHighlight)}>
                            待补齐
                          </Text>
                        </View>
                      </View>
                    )}

                    <View className={styles.summaryRow}>
                      <Text className={styles.summaryIcon}>�📷</Text>
                      <View className={styles.summaryContent}>
                        <Text className={styles.summaryLabel}>照片完成度</Text>
                        <View className={styles.photoCompletion}>
                          <View className={styles.completionTrack}>
                            <View
                              className={classnames(
                                styles.completionFill,
                                photoCompletion.completed === photoCompletion.total && styles.allDone
                              )}
                              style={{ width: `${(photoCompletion.completed / photoCompletion.total) * 100}%` }}
                            />
                          </View>
                          <Text className={classnames(
                            styles.completionText,
                            photoCompletion.completed === photoCompletion.total && styles.allDoneText
                          )}>
                            {photoCompletion.completed}/{photoCompletion.total}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {record.notes && (
                      <View className={styles.summaryRow}>
                        <Text className={styles.summaryIcon}>📝</Text>
                        <View className={styles.summaryContent}>
                          <Text className={styles.summaryLabel}>备注</Text>
                          <Text className={classnames(styles.summaryValue, styles.notes)}>
                            {record.notes}
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>

                  <View className={styles.viewRecordHint}>
                    <Text>查看完整护理配合记录</Text>
                    <Text className={styles.arrow}>›</Text>
                  </View>
                </View>
              )
            })
          )
        ) : (
          Object.keys(qcByRoom).length === 0 ? (
            <View className={styles.emptyState}>
              <Text className={styles.emptyIcon}>✅</Text>
              <Text className={styles.emptyText}>所有患者归档完整</Text>
            </View>
          ) : (
            Object.entries(qcByRoom).map(([room, items]) => (
              <View key={room} className={styles.qcRoomSection}>
                <View className={styles.qcRoomHeader}>
                  <View className={styles.qcRoomLeft}>
                    <Text className={styles.qcRoomName}>{room}</Text>
                    <Text className={styles.qcRoomCount}>{items.length}位待补齐</Text>
                  </View>
                  {items.some(i => i.timeLimit === 'overdue') && (
                    <View className={styles.qcOverdueTag}>
                      <Text>🔴 已超时</Text>
                    </View>
                  )}
                  {!items.some(i => i.timeLimit === 'overdue') && items.some(i => i.timeLimit === 'warning') && (
                    <View className={styles.qcWarningTag}>
                      <Text>🟡 即将超时</Text>
                    </View>
                  )}
                </View>

                {items.map(({ patient, missing, timeLimit }) => (
                  <View key={patient.id} className={classnames(
                    styles.qcPatientCard,
                    timeLimit === 'overdue' && styles.qcOverdue,
                    timeLimit === 'warning' && styles.qcWarning
                  )}>
                    <View className={styles.qcPatientHeader}>
                      <View className={styles.qcPatientLeft} onClick={() => handleGoPatientDetail(patient.id)}>
                        <View className={styles.qcAvatar}>
                          <Text>{patient.name.charAt(0)}</Text>
                        </View>
                        <View>
                          <Text className={styles.qcPatientName}>{patient.name}</Text>
                          <Text className={styles.qcPatientMeta}>
                            {patient.dentist} · {StatusMap[patient.status]}
                            {patient.submittedToDoctorAt ? ` · 提交 ${patient.submittedToDoctorAt}` : ''}
                          </Text>
                        </View>
                      </View>
                      {timeLimit === 'overdue' && (
                        <View className={styles.qcTimeTag}>
                          <Text>⏰ 超时</Text>
                        </View>
                      )}
                      {timeLimit === 'warning' && (
                        <View className={styles.qcTimeTagWarn}>
                          <Text>⏳ 即将超时</Text>
                        </View>
                      )}
                    </View>

                    <View className={styles.qcMissingList}>
                      {missing.map((item, idx) => (
                        <View key={idx} className={classnames(
                          styles.qcMissingItem,
                          item.type === 'photo' && styles.qcMissingPhoto,
                          item.type === 'handover' && styles.qcMissingHandover,
                          item.type === 'followup' && styles.qcMissingFollowup
                        )}>
                          <View className={styles.qcMissingLeft}>
                            <Text className={styles.qcMissingIcon}>
                              {item.type === 'photo' ? '📷' : item.type === 'handover' ? '📋' : '📅'}
                            </Text>
                            <Text className={styles.qcMissingLabel}>{item.label}</Text>
                          </View>
                          <View
                            className={styles.qcFixBtn}
                            onClick={getMissingAction(item, patient.id)}
                          >
                            <Text>去补齐 ›</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            ))
          )
        )}
      </ScrollView>
    </View>
  )
}

export default HandoverPage
