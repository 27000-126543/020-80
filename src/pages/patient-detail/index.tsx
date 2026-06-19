import React, { useState, useEffect } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import classnames from 'classnames'
import styles from './index.module.scss'
import StatusBadge from '@/components/StatusBadge'
import { usePatientStore } from '@/store/usePatientStore'

const PatientDetailPage: React.FC = () => {
  const router = useRouter()
  const patientId = router.params.id as string
  const { getPatientById, updatePatientStatus } = usePatientStore()
  const [patient, setPatient] = useState(getPatientById(patientId))

  useEffect(() => {
    const p = getPatientById(patientId)
    setPatient(p)
  }, [patientId, getPatientById])

  if (!patient) {
    return (
      <View className={styles.page}>
        <Text>患者不存在</Text>
      </View>
    )
  }

  const handleSubmitToDoctor = () => {
    Taro.showModal({
      title: '确认提交',
      content: '患者信息已核对无误，确认提交给医生开始治疗？',
      confirmText: '确认提交',
      confirmColor: '#00B4A0',
      success: (res) => {
        if (res.confirm) {
          updatePatientStatus(patientId, 'treating')
          setPatient({ ...patient, status: 'treating' })
          Taro.showToast({
            title: '已提交给医生',
            icon: 'success',
            duration: 1500
          })
          console.log('[PatientDetail] submit to doctor', { patientId })
          setTimeout(() => {
            Taro.navigateBack()
          }, 1500)
        }
      }
    })
  }

  const handleStartPhoto = () => {
    Taro.navigateTo({
      url: `/pages/photo-capture/index?patientId=${patientId}`
    })
  }

  const isDone = patient.status === 'done'

  return (
    <View className={styles.page}>
      <View className={styles.patientHeader}>
        <View className={styles.nameRow}>
          <View className={styles.avatar}>
            <Text>{patient.name.charAt(0)}</Text>
          </View>
          <View>
            <Text className={styles.name}>{patient.name}</Text>
            <View style={{ marginTop: '8rpx' }}>
              <StatusBadge status={patient.status} />
            </View>
          </View>
        </View>
        <View className={styles.infoGrid}>
          <View className={styles.infoItem}>
            <Text className={styles.label}>性别年龄</Text>
            <Text className={styles.value}>{patient.gender} · {patient.age}岁</Text>
          </View>
          <View className={styles.infoItem}>
            <Text className={styles.label}>诊室</Text>
            <Text className={styles.value}>{patient.room}</Text>
          </View>
          <View className={styles.infoItem}>
            <Text className={styles.label}>预约时间</Text>
            <Text className={styles.value}>{patient.appointmentTime}</Text>
          </View>
          <View className={styles.infoItem}>
            <Text className={styles.label}>主治医生</Text>
            <Text className={styles.value}>{patient.dentist}</Text>
          </View>
        </View>
      </View>

      <View className={styles.section}>
        <View className={styles.sectionTitle}>
          <View className={classnames(styles.sectionIcon, patient.allergy.length > 0 ? styles.warningIcon : styles.normalIcon)}>
            <Text>⚠️</Text>
          </View>
          <Text>过敏史</Text>
        </View>
        {patient.allergy.length > 0 ? (
          <View className={styles.tagList}>
            {patient.allergy.map((item, idx) => (
              <Text key={idx} className={classnames(styles.tag, styles.dangerTag)}>
                {item}
              </Text>
            ))}
          </View>
        ) : (
          <Text className={styles.emptyText}>无过敏史</Text>
        )}
      </View>

      <View className={styles.section}>
        <View className={styles.sectionTitle}>
          <View className={classnames(styles.sectionIcon, styles.normalIcon)}>
            <Text>📋</Text>
          </View>
          <Text>既往疾病</Text>
        </View>
        {patient.chronicDiseases.length > 0 ? (
          <View className={styles.tagList}>
            {patient.chronicDiseases.map((item, idx) => (
              <Text key={idx} className={classnames(styles.tag, styles.infoTag)}>
                {item}
              </Text>
            ))}
          </View>
        ) : (
          <Text className={styles.emptyText}>无既往疾病</Text>
        )}
      </View>

      <View className={styles.section}>
        <View className={styles.sectionTitle}>
          <View className={classnames(styles.sectionIcon, patient.anticoagulant ? styles.alertIcon : styles.normalIcon)}>
            <Text>💊</Text>
          </View>
          <Text>抗凝药服用</Text>
        </View>
        <View className={styles.tagList}>
          <Text className={classnames(styles.tag, patient.anticoagulant ? styles.warningTag : styles.infoTag)}>
            {patient.anticoagulant ? '正在服用抗凝药' : '未服用抗凝药'}
          </Text>
        </View>
        {patient.anticoagulant && (
          <View style={{ marginTop: '20rpx', padding: '20rpx', background: 'rgba(255,125,0,0.06)', borderRadius: '12rpx' }}>
            <Text style={{ fontSize: '26rpx', color: '#FF7D00' }}>
              ⚠️ 注意：患者服用抗凝药，治疗前请确认出血风险
            </Text>
          </View>
        )}
      </View>

      <View className={styles.section}>
        <View className={styles.sectionTitle}>
          <View className={classnames(styles.sectionIcon, styles.normalIcon)}>
            <Text>🩺</Text>
          </View>
          <Text>主诉</Text>
        </View>
        <View className={styles.chiefComplaint}>
          <Text>{patient.chiefComplaint}</Text>
        </View>
      </View>

      <View className={styles.bottomBar}>
        {patient.status === 'pending' ? (
          <View className={styles.submitBtn} onClick={handleSubmitToDoctor}>
            <Text>✓ 核对无误，提交给医生</Text>
          </View>
        ) : patient.status === 'treating' ? (
          <View className={styles.submitBtn} onClick={handleStartPhoto}>
            <Text>📷 进入拍照模式</Text>
          </View>
        ) : (
          <View className={classnames(styles.submitBtn, styles.doneBtn)}>
            <Text>✓ 治疗已完成</Text>
          </View>
        )}
      </View>
    </View>
  )
}

export default PatientDetailPage
