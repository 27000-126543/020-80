import React from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import styles from './index.module.scss'
import StatusBadge from '@/components/StatusBadge'
import type { Patient } from '@/types'

interface PatientCardProps {
  patient: Patient
  onClick?: () => void
}

const PatientCard: React.FC<PatientCardProps> = ({ patient, onClick }) => {
  const handleClick = () => {
    if (onClick) {
      onClick()
    } else {
      Taro.navigateTo({
        url: `/pages/patient-detail/index?id=${patient.id}`
      })
    }
  }

  return (
    <View className={styles.patientCard} onClick={handleClick}>
      <View className={styles.header}>
        <View className={styles.avatar}>
          <Text>{patient.name.charAt(0)}</Text>
        </View>
        <View className={styles.info}>
          <View className={styles.nameRow}>
            <Text className={styles.name}>{patient.name}</Text>
            <StatusBadge status={patient.status} />
          </View>
          <Text className={styles.meta}>
            {patient.gender} · {patient.age}岁 · {patient.dentist}
          </Text>
          {(patient.allergy.length > 0 || patient.anticoagulant) && (
            <View className={styles.tags}>
              {patient.allergy.length > 0 && (
                <Text className={styles.tag}>过敏史: {patient.allergy.join('、')}</Text>
              )}
              {patient.anticoagulant && (
                <Text className={`${styles.tag} ${styles.anticoagulantTag}`}>服用抗凝药</Text>
              )}
            </View>
          )}
        </View>
      </View>
      <View className={styles.timeRow}>
        <View className={styles.time}>
          <Text className={styles.timeText}>{patient.appointmentTime}</Text>
          <Text>预约时间</Text>
        </View>
        <Text className={styles.room}>{patient.room}</Text>
      </View>
    </View>
  )
}

export default PatientCard
