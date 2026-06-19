import React, { useState, useMemo } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import classnames from 'classnames'
import styles from './index.module.scss'
import { usePatientStore } from '@/store/usePatientStore'
import { StatusMap } from '@/types'

type TabType = 'pending' | 'done'

const HandoverPage: React.FC = () => {
  const [tab, setTab] = useState<TabType>('pending')
  const { patients, handoverRecords, getPendingHandoverPatients } = usePatientStore()

  const pendingPatients = useMemo(() => getPendingHandoverPatients(), [getPendingHandoverPatients])

  const doneRecords = useMemo(() => {
    return handoverRecords.filter(r => r.completedAt).sort((a, b) => b.completedAt.localeCompare(a.completedAt))
  }, [handoverRecords])

  const stats = useMemo(() => ({
    pending: pendingPatients.length,
    done: doneRecords.length
  }), [pendingPatients.length, doneRecords.length])

  const handleGoDetail = (patientId: string) => {
    Taro.navigateTo({
      url: `/pages/handover-detail/index?patientId=${patientId}`
    })
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
            doneRecords.map(record => (
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
                      {record.room} · {record.dentist} · {record.nurse}
                    </Text>
                  </View>
                  <Text className={styles.time}>{record.completedAt}</Text>
                </View>
                <View className={styles.detailRow}>
                  {record.supplies.filter(s => s.checked).length > 0 && (
                    <Text className={styles.detailTag}>
                      耗材 {record.supplies.filter(s => s.checked).length} 项
                    </Text>
                  )}
                  {record.postOpInstructions && (
                    <Text className={styles.detailTag}>
                      术后注意事项 ✓
                    </Text>
                  )}
                  {record.followUpAppointment && (
                    <Text className={styles.detailTag}>
                      复诊已预约 ✓
                    </Text>
                  )}
                </View>
              </View>
            ))
          )
        )}
      </ScrollView>
    </View>
  )
}

export default HandoverPage
