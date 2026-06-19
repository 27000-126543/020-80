import React, { useState, useMemo } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import classnames from 'classnames'
import styles from './index.module.scss'
import { usePatientStore } from '@/store/usePatientStore'
import { StatusMap, HandoverRecord, PhotoAngle, PhotoStage } from '@/types'
import { PhotoAngleMap, PhotoStageMap } from '@/types'

type TabType = 'pending' | 'done' | 'summary'

const requiredAngles: PhotoAngle[] = ['front', 'side', 'occlusal', 'local']

const getSupplySummary = (record: HandoverRecord, max = 3) => {
  const checked = record.supplies.filter(s => s.checked)
  if (checked.length === 0) return ''
  const names = checked.slice(0, max).map(s => s.name)
  if (checked.length > max) names.push(`+${checked.length - max}`)
  return names.join('、')
}

const getPhotoCompletion = (record: HandoverRecord, photoRecords: any[]) => {
  const photoRecord = photoRecords.find((r: any) => r.patientId === record.patientId)
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

const HandoverPage: React.FC = () => {
  const [tab, setTab] = useState<TabType>('pending')
  const { patients, getPendingHandoverPatients, getTodayDoneRecords, photoRecords } = usePatientStore()

  const pendingPatients = useMemo(() => getPendingHandoverPatients(), [getPendingHandoverPatients])

  const doneRecords = useMemo(() => {
    return getTodayDoneRecords()
      .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
  }, [getTodayDoneRecords])

  const stats = useMemo(() => ({
    pending: pendingPatients.length,
    done: doneRecords.length
  }), [pendingPatients.length, doneRecords.length])

  const summaryByRoom = useMemo(() => {
    const rooms: Record<string, { archived: any[]; unarchived: any[] }> = {}
    patients.forEach(p => {
      if (!rooms[p.room]) rooms[p.room] = { archived: [], unarchived: [] }
      const handover = doneRecords.find(r => r.patientId === p.id)
      if (handover) {
        rooms[p.room].archived.push({ patient: p, record: handover })
      } else if (p.status === 'treating' || p.status === 'done') {
        rooms[p.room].unarchived.push(p)
      }
    })
    return rooms
  }, [patients, doneRecords])

  const handleGoDetail = (patientId: string) => {
    Taro.navigateTo({
      url: `/pages/handover-detail/index?patientId=${patientId}`
    })
  }

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
    if (parts.length === 2) {
      return `${parts[0].slice(5)} ${parts[1].slice(0, 5)}`
    }
    return date
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
            <Text className={styles.num}>{patients.length}</Text>
            <Text className={styles.label}>今日总计</Text>
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
          className={classnames(styles.tabItem, tab === 'summary' && styles.active)}
          onClick={() => setTab('summary')}
        >
          <Text>归档总览</Text>
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
              const photoCompletion = getPhotoCompletion(record, photoRecords)

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
          Object.keys(summaryByRoom).length === 0 ? (
            <View className={styles.emptyState}>
              <Text className={styles.emptyIcon}>📊</Text>
              <Text className={styles.emptyText}>暂无归档数据</Text>
            </View>
          ) : (
            Object.entries(summaryByRoom).map(([room, data]) => (
              <View key={room} className={styles.roomSection}>
                <View className={styles.roomHeader}>
                  <Text className={styles.roomName}>{room}</Text>
                  <Text className={styles.roomStats}>
                    {data.archived.length}已归档 · {data.unarchived.length}未归档
                  </Text>
                </View>

                {data.archived.length > 0 && (
                  <View className={styles.archivedSection}>
                    <Text className={styles.subSectionTitle}>✅ 已归档</Text>
                    {data.archived.map(({ patient, record }: any) => {
                      const photoC = getPhotoCompletion(record, photoRecords)
                      const supplyN = record.supplies.filter((s: any) => s.checked).length
                      return (
                        <View
                          key={patient.id}
                          className={styles.roomCard}
                          onClick={() => handleGoDetail(patient.id)}
                        >
                          <View className={styles.roomCardHeader}>
                            <Text className={styles.roomCardName}>{patient.name}</Text>
                            <Text className={styles.roomCardMeta}>
                              {patient.dentist} · {formatCompletedTime(record.completedAt)}
                            </Text>
                          </View>
                          <View className={styles.roomCardTags}>
                            <Text className={classnames(styles.miniTag, styles.tagSupply)}>
                              � {supplyN}项
                            </Text>
                            <Text className={classnames(styles.miniTag, styles.tagPhoto, photoC.completed === photoC.total && styles.tagDone)}>
                              📷 {photoC.completed}/{photoC.total}
                            </Text>
                            {record.followUpDate && (
                              <Text className={classnames(styles.miniTag, styles.tagFollowup)}>
                                📅 {formatFollowUp(record.followUpDate)}
                              </Text>
                            )}
                          </View>
                        </View>
                      )
                    })}
                  </View>
                )}

                {data.unarchived.length > 0 && (
                  <View className={styles.unarchivedSection}>
                    <Text className={styles.subSectionTitle}>⚠️ 未归档</Text>
                    {data.unarchived.map((patient: any) => (
                      <View
                        key={patient.id}
                        className={classnames(styles.roomCard, styles.unarchivedCard)}
                        onClick={() => handleGoDetail(patient.id)}
                      >
                        <View className={styles.roomCardHeader}>
                          <Text className={styles.roomCardName}>{patient.name}</Text>
                          <Text className={styles.roomCardMeta}>
                            {patient.dentist} · {StatusMap[patient.status]}
                          </Text>
                        </View>
                        <View className={styles.goAction}>
                          <Text>去完成归档 ›</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))
          )
        )}
      </ScrollView>
    </View>
  )
}

export default HandoverPage
