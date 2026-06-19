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
type QcFilterType = 'all' | 'photo' | 'handover' | 'followup'

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
  if (!patient.submittedToDoctorAt) return { level: 'normal', minutes: 0 }
  const now = new Date()
  const [h, m] = patient.submittedToDoctorAt.split(':').map(Number)
  const submitted = new Date()
  submitted.setHours(h, m, 0, 0)
  const diffMin = Math.floor((now.getTime() - submitted.getTime()) / 60000)
  if (diffMin >= 120) return { level: 'overdue', minutes: diffMin }
  if (diffMin >= 90) return { level: 'warning', minutes: diffMin }
  return { level: 'normal', minutes: diffMin }
}

const HandoverPage: React.FC = () => {
  const [tab, setTab] = useState<TabType>('pending')
  const [qcFilter, setQcFilter] = useState<QcFilterType>('all')
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

  const allTodayPatients = useMemo(() =>
    patients.filter(p => p.status === 'treating' || p.status === 'done')
  , [patients])

  const stats = useMemo(() => {
    const unarchivedCount = allTodayPatients
      .filter(p => getMissingItems(p.id, photoRecords, handoverRecords).length > 0).length
    return {
      pending: pendingPatients.length,
      done: doneRecords.length,
      unarchived: unarchivedCount,
      total: allTodayPatients.length
    }
  }, [pendingPatients.length, doneRecords.length, allTodayPatients, photoRecords, handoverRecords])

  const qcByRoom = useMemo(() => {
    void refreshKey
    const rooms: Record<string, {
      total: number
      missingCount: number
      items: { patient: any; missing: ReturnType<typeof getMissingItems>; timeLimit: ReturnType<typeof getTimeLimit> }[]
      mostUrgent?: { patient: any; minutes: number }
    }> = {}

    allTodayPatients.forEach(p => {
      if (!rooms[p.room]) {
        rooms[p.room] = { total: 0, missingCount: 0, items: [] }
      }
      rooms[p.room].total++
      const missing = getMissingItems(p.id, photoRecords, handoverRecords)

      if (missing.length === 0) return

      const filteredMissing = qcFilter === 'all'
        ? missing
        : missing.filter(m => m.type === qcFilter)

      if (filteredMissing.length === 0) return

      rooms[p.room].missingCount++
      const timeLimit = getTimeLimit(p)
      rooms[p.room].items.push({ patient: p, missing: filteredMissing, timeLimit })
    })

    Object.keys(rooms).forEach(room => {
      rooms[room].items.sort((a, b) => {
        const priority = { overdue: 0, warning: 1, normal: 2 }
        const pa = priority[a.timeLimit.level as keyof typeof priority]
        const pb = priority[b.timeLimit.level as keyof typeof priority]
        if (pa !== pb) return pa - pb
        return b.timeLimit.minutes - a.timeLimit.minutes
      })
      if (rooms[room].items.length > 0) {
        rooms[room].mostUrgent = {
          patient: rooms[room].items[0].patient,
          minutes: rooms[room].items[0].timeLimit.minutes
        }
      }
    })

    const sorted: [string, typeof rooms[string]][] = Object.entries(rooms)
      .filter(([, data]) => data.items.length > 0)
      .sort(([, a], [, b]) => b.missingCount - a.missingCount)

    return sorted
  }, [refreshKey, allTodayPatients, photoRecords, handoverRecords, qcFilter])

  const totalMissingCount = useMemo(() =>
    qcByRoom.reduce((sum, [, data]) => sum + data.missingCount, 0)
  , [qcByRoom])

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

  const qcFilters: { key: QcFilterType; label: string; icon: string }[] = [
    { key: 'all', label: '全部', icon: '📋' },
    { key: 'photo', label: '缺照片', icon: '📷' },
    { key: 'handover', label: '缺交接', icon: '📝' },
    { key: 'followup', label: '缺复诊', icon: '📅' }
  ]

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
          <Text>待交接</Text>
        </View>
        <View
          className={classnames(styles.tabItem, tab === 'done' && styles.active)}
          onClick={() => setTab('done')}
        >
          <Text>已完成</Text>
        </View>
        <View
          className={classnames(styles.tabItem, tab === 'qc' && styles.active)}
          onClick={() => setTab('qc')}
        >
          <Text>质控看板</Text>
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

                    {record.followUpDate ? (
                      <View className={styles.summaryRow}>
                        <Text className={styles.summaryIcon}>📅</Text>
                        <View className={styles.summaryContent}>
                          <Text className={styles.summaryLabel}>复诊时间</Text>
                          <Text className={classnames(styles.summaryValue, styles.highlight)}>
                            {formatFollowUp(record.followUpDate)}
                          </Text>
                        </View>
                      </View>
                    ) : (
                      <View className={styles.summaryRow}>
                        <Text className={styles.summaryIcon}>📅</Text>
                        <View className={styles.summaryContent}>
                          <Text className={styles.summaryLabel}>复诊时间</Text>
                          <Text className={classnames(styles.summaryValue, styles.missingHighlight)}>
                            待补齐
                          </Text>
                        </View>
                      </View>
                    )}

                    <View className={styles.summaryRow}>
                      <Text className={styles.summaryIcon}>📷</Text>
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
          <View>
            <View className={styles.qcSummaryBar}>
              <View className={styles.qcSummaryLeft}>
                <Text className={styles.qcSummaryNum}>{totalMissingCount}</Text>
                <Text className={styles.qcSummaryLabel}>位待补齐</Text>
              </View>
              <View className={styles.qcSummaryRight}>
                <Text className={styles.qcSummarySub}>
                  共 {stats.total} 位患者 · {qcByRoom.length} 个诊室
                </Text>
              </View>
            </View>

            <View className={styles.qcFilterBar}>
              {qcFilters.map(f => (
                <View
                  key={f.key}
                  className={classnames(styles.qcFilterItem, qcFilter === f.key && styles.qcFilterActive)}
                  onClick={() => setQcFilter(f.key)}
                >
                  <Text className={styles.qcFilterIcon}>{f.icon}</Text>
                  <Text className={styles.qcFilterLabel}>{f.label}</Text>
                </View>
              ))}
            </View>

            {qcByRoom.length === 0 ? (
              <View className={styles.emptyState}>
                <Text className={styles.emptyIcon}>✅</Text>
                <Text className={styles.emptyText}>所有{qcFilter === 'all' ? '患者' : qcFilter === 'photo' ? '照片' : qcFilter === 'handover' ? '交接' : '复诊'}均已完成</Text>
              </View>
            ) : (
              qcByRoom.map(([room, data]) => (
                <View key={room} className={styles.qcRoomSection}>
                  <View className={styles.qcRoomHeader}>
                    <View className={styles.qcRoomLeft}>
                      <Text className={styles.qcRoomName}>{room}</Text>
                      <Text className={styles.qcRoomCount}>
                        {data.missingCount}位待补齐 · {data.total - data.missingCount}位已完成
                      </Text>
                    </View>
                    {data.items.some(i => i.timeLimit.level === 'overdue') && (
                      <View className={styles.qcOverdueTag}>
                        <Text>🔴 超时</Text>
                      </View>
                    )}
                    {!data.items.some(i => i.timeLimit.level === 'overdue') && data.items.some(i => i.timeLimit.level === 'warning') && (
                      <View className={styles.qcWarningTag}>
                        <Text>🟡 预警</Text>
                      </View>
                    )}
                  </View>

                  <View className={styles.qcRoomProgress}>
                    <View className={styles.qcProgressBar}>
                      <View
                        className={styles.qcProgressFill}
                        style={{ width: `${((data.total - data.missingCount) / data.total) * 100}%` }}
                      />
                    </View>
                    <Text className={styles.qcProgressText}>
                      {Math.round(((data.total - data.missingCount) / data.total) * 100)}%
                    </Text>
                  </View>

                  {data.mostUrgent && data.mostUrgent.minutes >= 90 && (
                    <View className={styles.qcUrgentRow}>
                      <Text className={styles.qcUrgentLabel}>⚠️ 最紧急</Text>
                      <Text className={styles.qcUrgentName}>{data.mostUrgent.patient.name}</Text>
                      <Text className={styles.qcUrgentTime}>
                        {data.mostUrgent.minutes >= 120
                          ? `已超${Math.floor((data.mostUrgent.minutes - 120) / 60)}h${(data.mostUrgent.minutes - 120) % 60}分`
                          : `${Math.floor((120 - data.mostUrgent.minutes) / 60)}h${(120 - data.mostUrgent.minutes) % 60}分后超时`
                        }
                      </Text>
                    </View>
                  )}

                  {data.items.map(({ patient, missing, timeLimit }) => (
                    <View key={patient.id} className={classnames(
                      styles.qcPatientCard,
                      timeLimit.level === 'overdue' && styles.qcOverdue,
                      timeLimit.level === 'warning' && styles.qcWarning
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
                              {patient.submittedToDoctorAt ? ` · ${patient.submittedToDoctorAt}提交` : ''}
                            </Text>
                          </View>
                        </View>
                        {timeLimit.level === 'overdue' && (
                          <View className={styles.qcTimeTag}>
                            <Text>⏰ 已超时</Text>
                          </View>
                        )}
                        {timeLimit.level === 'warning' && (
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
            )}
          </View>
        )}
      </ScrollView>
    </View>
  )
}

export default HandoverPage
