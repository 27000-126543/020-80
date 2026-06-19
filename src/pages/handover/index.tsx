import React, { useState, useMemo } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import classnames from 'classnames'
import styles from './index.module.scss'
import { usePatientStore } from '@/store/usePatientStore'
import { StatusMap, HandoverRecord } from '@/types'

type TabType = 'pending' | 'done'

const getSupplySummary = (record: HandoverRecord, max = 3) => {
  const checked = record.supplies.filter(s => s.checked)
  if (checked.length === 0) return ''
  const names = checked.slice(0, max).map(s => s.name)
  if (checked.length > max) {
    names.push(`+${checked.length - max}`)
  }
  return names.join('、')
}

const HandoverPage: React.FC = () => {
  const [tab, setTab] = useState<TabType>('pending')
  const { patients, getPendingHandoverPatients, getTodayDoneRecords } = usePatientStore()

  const pendingPatients = useMemo(() => getPendingHandoverPatients(), [getPendingHandoverPatients])

  const doneRecords = useMemo(() => {
    return getTodayDoneRecords()
      .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
  }, [getTodayDoneRecords])

  const stats = useMemo(() => ({
    pending: pendingPatients.length,
    done: doneRecords.length
  }), [pendingPatients.length, doneRecords.length])

  const handleGoDetail = (patientId: string) => {
    Taro.navigateTo({
      url: `/pages/handover-detail/index?patientId=${patientId}`
    })
  }

  const formatCompletedTime = (iso: string) => {
    if (!iso) return ''
    const t = iso.split('T')
    if (t.length === 2) {
      return `${t[0].slice(5)} ${t[1].slice(0, 5)}`
    }
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
        ) : (
          doneRecords.length === 0 ? (
            <View className={styles.emptyState}>
              <Text className={styles.emptyIcon}>📋</Text>
              <Text className={styles.emptyText}>暂无已完成记录</Text>
            </View>
          ) : (
            doneRecords.map(record => {
              const supplyCount = record.supplies.filter(s => s.checked).length
              const supplySummary = getSupplySummary(record)

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

                  <View className={styles.doneInfoGrid}>
                    <View className={styles.infoItem}>
                      <Text className={styles.infoLabel}>📦 耗材</Text>
                      <Text className={styles.infoValue}>
                        {supplyCount > 0 ? `${supplyCount}项 · ${supplySummary}` : '无'}
                      </Text>
                    </View>

                    {record.followUpDate && (
                      <View className={styles.infoItem}>
                        <Text className={styles.infoLabel}>📅 复诊时间</Text>
                        <Text className={classnames(styles.infoValue, styles.highlight)}>
                          {record.followUpDate}
                        </Text>
                      </View>
                    )}

                    {record.postOpInstructions && (
                      <View className={styles.infoItem}>
                        <Text className={styles.infoLabel}>💡 术后注意事项</Text>
                        <Text className={styles.infoValue}>已告知 ✓</Text>
                      </View>
                    )}

                    {record.notes && (
                      <View className={styles.infoItem}>
                        <Text className={styles.infoLabel}>📝 备注</Text>
                        <Text className={classnames(styles.infoValue, styles.notes)}>
                          {record.notes}
                        </Text>
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
        )}
      </ScrollView>
    </View>
  )
}

export default HandoverPage
