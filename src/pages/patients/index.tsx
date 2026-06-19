import React, { useState, useMemo } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import dayjs from 'dayjs'
import classnames from 'classnames'
import styles from './index.module.scss'
import SectionHeader from '@/components/SectionHeader'
import PatientCard from '@/components/PatientCard'
import { usePatientStore } from '@/store/usePatientStore'
import type { PatientStatus } from '@/types'

type FilterType = 'all' | PatientStatus

const filterLabels: Record<FilterType, string> = {
  all: '全部',
  pending: '待接诊',
  treating: '治疗中',
  done: '已完成'
}

const PatientsPage: React.FC = () => {
  const [filter, setFilter] = useState<FilterType>('all')
  const { getPatientsByRoom, patients } = usePatientStore()

  const patientsByRoom = useMemo(() => getPatientsByRoom(), [getPatientsByRoom])

  const filteredRooms = useMemo(() => {
    if (filter === 'all') return patientsByRoom
    const result: Record<string, typeof patients> = {}
    Object.keys(patientsByRoom).forEach(room => {
      const filtered = patientsByRoom[room].filter(p => p.status === filter)
      if (filtered.length > 0) {
        result[room] = filtered
      }
    })
    return result
  }, [patientsByRoom, filter])

  const stats = useMemo(() => ({
    total: patients.length,
    pending: patients.filter(p => p.status === 'pending').length,
    treating: patients.filter(p => p.status === 'treating').length,
    done: patients.filter(p => p.status === 'done').length
  }), [patients])

  const handlePullDownRefresh = () => {
    console.log('[PatientsPage] pull down refresh')
    setTimeout(() => {
      Taro.stopPullDownRefresh()
    }, 1000)
  }

  const today = dayjs()
  const weekdayMap = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

  return (
    <View className={styles.page}>
      <View className={styles.header}>
        <View className={styles.dateRow}>
          <Text className={styles.date}>{today.format('MM月DD日')}</Text>
          <Text className={styles.weekday}>{weekdayMap[today.day()]}</Text>
        </View>
        <View className={styles.stats}>
          <View className={styles.statItem}>
            <Text className={styles.num}>{stats.total}</Text>
            <Text className={styles.label}>今日预约</Text>
          </View>
          <View className={styles.statItem}>
            <Text className={styles.num}>{stats.pending}</Text>
            <Text className={styles.label}>待接诊</Text>
          </View>
          <View className={styles.statItem}>
            <Text className={styles.num}>{stats.treating}</Text>
            <Text className={styles.label}>治疗中</Text>
          </View>
          <View className={styles.statItem}>
            <Text className={styles.num}>{stats.done}</Text>
            <Text className={styles.label}>已完成</Text>
          </View>
        </View>
      </View>

      <View className={styles.filterBar}>
        {(['all', 'pending', 'treating', 'done'] as FilterType[]).map(type => (
          <View
            key={type}
            className={classnames(styles.filterItem, filter === type && styles.active)}
            onClick={() => setFilter(type)}
          >
            <Text>{filterLabels[type]}</Text>
          </View>
        ))}
      </View>

      <ScrollView
        scrollY
        style={{ height: 'calc(100vh - 320rpx)' }}
        onPullDownRefresh={handlePullDownRefresh}
      >
        {Object.keys(filteredRooms).length === 0 ? (
          <View className={styles.emptyState}>
            <Text className={styles.emptyText}>暂无患者</Text>
          </View>
        ) : (
          Object.keys(filteredRooms).map(room => (
            <View key={room} className={styles.roomSection}>
              <SectionHeader
                title={room}
                extra={`${filteredRooms[room].length}位患者`}
              />
              {filteredRooms[room].map(patient => (
                <PatientCard key={patient.id} patient={patient} />
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  )
}

export default PatientsPage
