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
  const {
    getPatientById,
    updatePatientChecklist,
    submitToDoctor
  } = usePatientStore()
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

  const checklist = patient.checklist || {
    nameChecked: false,
    allergyChecked: false,
    diseasesChecked: false,
    anticoagulantChecked: false
  }

  const allChecked = checklist.nameChecked &&
    checklist.allergyChecked &&
    checklist.diseasesChecked &&
    checklist.anticoagulantChecked

  const checkedCount = Object.values(checklist).filter(Boolean).length

  const toggleCheck = (key: keyof typeof checklist) => {
    if (patient.status !== 'pending') return
    const newChecklist = { ...checklist, [key]: !checklist[key] }
    updatePatientChecklist(patientId, newChecklist)
    setPatient({ ...patient, checklist: newChecklist })
  }

  const handleSubmitToDoctor = () => {
    if (!allChecked) {
      Taro.showToast({
        title: '请先完成全部核对项',
        icon: 'none',
        duration: 1500
      })
      return
    }

    Taro.showModal({
      title: '确认提交',
      content: `已核对 ${checkedCount}/4 项\n姓名、过敏史、既往疾病、抗凝药均已确认无误，是否提交给医生开始治疗？`,
      confirmText: '确认提交',
      confirmColor: '#00B4A0',
      success: (res) => {
        if (res.confirm) {
          submitToDoctor(patientId)
          const updated = { ...patient, status: 'treating' as const }
          const now = new Date()
          updated.submittedToDoctorAt = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
          setPatient(updated)
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
  const isTreating = patient.status === 'treating'
  const isPending = patient.status === 'pending'

  return (
    <View className={styles.page}>
      <View className={styles.patientHeader}>
        <View className={styles.nameRow}>
          <View className={styles.avatar}>
            <Text>{patient.name.charAt(0)}</Text>
          </View>
          <View>
            <Text className={styles.name}>{patient.name}</Text>
            <View style={{ marginTop: '8rpx', display: 'flex', alignItems: 'center', gap: '16rpx' }}>
              <StatusBadge status={patient.status} />
              {patient.submittedToDoctorAt && (
                <Text style={{ fontSize: '22rpx', color: 'rgba(255,255,255,0.85)' }}>
                  提交 {patient.submittedToDoctorAt}
                </Text>
              )}
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

      {isPending && (
        <View className={styles.progressBar}>
          <View className={styles.progressLabel}>
            <Text>核对进度</Text>
            <Text className={styles.progressCount}>{checkedCount}/4</Text>
          </View>
          <View className={styles.progressTrack}>
            <View
              className={styles.progressFill}
              style={{ width: `${(checkedCount / 4) * 100}%` }}
            />
          </View>
        </View>
      )}

      <View
        className={classnames(
          styles.section,
          checklist.nameChecked && styles.sectionChecked
        )}
        onClick={() => toggleCheck('nameChecked')}
      >
        <View className={styles.checkRow}>
          <View className={styles.sectionTitle}>
            <View className={classnames(styles.sectionIcon, styles.normalIcon)}>
              <Text>👤</Text>
            </View>
            <View>
              <Text>患者姓名</Text>
              <Text className={styles.sectionSubtitle}>请核对就诊人身份</Text>
            </View>
          </View>
          <View className={classnames(styles.checkCircle, checklist.nameChecked && styles.checked)}>
            <Text>{checklist.nameChecked ? '✓' : ''}</Text>
          </View>
        </View>
        <View className={styles.checkContent}>
          <View className={styles.nameBox}>
            <Text className={styles.nameBoxText}>{patient.name}</Text>
            <Text className={styles.nameBoxMeta}>
              {patient.gender} · {patient.age}岁 · {patient.phone}
            </Text>
          </View>
        </View>
      </View>

      <View
        className={classnames(
          styles.section,
          checklist.allergyChecked && styles.sectionChecked
        )}
        onClick={() => toggleCheck('allergyChecked')}
      >
        <View className={styles.checkRow}>
          <View className={styles.sectionTitle}>
            <View className={classnames(styles.sectionIcon, patient.allergy.length > 0 ? styles.warningIcon : styles.normalIcon)}>
              <Text>⚠️</Text>
            </View>
            <View>
              <Text>过敏史</Text>
              <Text className={styles.sectionSubtitle}>
                {patient.allergy.length > 0 ? `需关注 ${patient.allergy.length} 项` : '无过敏史'}
              </Text>
            </View>
          </View>
          <View className={classnames(styles.checkCircle, checklist.allergyChecked && styles.checked)}>
            <Text>{checklist.allergyChecked ? '✓' : ''}</Text>
          </View>
        </View>
        <View className={styles.checkContent}>
          {patient.allergy.length > 0 ? (
            <View className={styles.tagList}>
              {patient.allergy.map((item, idx) => (
                <Text key={idx} className={classnames(styles.tag, styles.dangerTag)}>
                  {item}
                </Text>
              ))}
            </View>
          ) : (
            <Text className={styles.emptyText}>✓ 无过敏史</Text>
          )}
        </View>
      </View>

      <View
        className={classnames(
          styles.section,
          checklist.diseasesChecked && styles.sectionChecked
        )}
        onClick={() => toggleCheck('diseasesChecked')}
      >
        <View className={styles.checkRow}>
          <View className={styles.sectionTitle}>
            <View className={classnames(styles.sectionIcon, styles.normalIcon)}>
              <Text>📋</Text>
            </View>
            <View>
              <Text>既往疾病</Text>
              <Text className={styles.sectionSubtitle}>
                {patient.chronicDiseases.length > 0 ? `${patient.chronicDiseases.length} 项慢性病史` : '健康状况良好'}
              </Text>
            </View>
          </View>
          <View className={classnames(styles.checkCircle, checklist.diseasesChecked && styles.checked)}>
            <Text>{checklist.diseasesChecked ? '✓' : ''}</Text>
          </View>
        </View>
        <View className={styles.checkContent}>
          {patient.chronicDiseases.length > 0 ? (
            <View className={styles.tagList}>
              {patient.chronicDiseases.map((item, idx) => (
                <Text key={idx} className={classnames(styles.tag, styles.infoTag)}>
                  {item}
                </Text>
              ))}
            </View>
          ) : (
            <Text className={styles.emptyText}>✓ 无既往疾病</Text>
          )}
        </View>
      </View>

      <View
        className={classnames(
          styles.section,
          checklist.anticoagulantChecked && styles.sectionChecked
        )}
        onClick={() => toggleCheck('anticoagulantChecked')}
      >
        <View className={styles.checkRow}>
          <View className={styles.sectionTitle}>
            <View className={classnames(styles.sectionIcon, patient.anticoagulant ? styles.alertIcon : styles.normalIcon)}>
              <Text>💊</Text>
            </View>
            <View>
              <Text>抗凝药服用</Text>
              <Text className={styles.sectionSubtitle}>
                {patient.anticoagulant ? '正在服用，注意出血风险' : '未服用抗凝药'}
              </Text>
            </View>
          </View>
          <View className={classnames(styles.checkCircle, checklist.anticoagulantChecked && styles.checked)}>
            <Text>{checklist.anticoagulantChecked ? '✓' : ''}</Text>
          </View>
        </View>
        <View className={styles.checkContent}>
          <View className={styles.tagList}>
            <Text className={classnames(styles.tag, patient.anticoagulant ? styles.warningTag : styles.infoTag)}>
              {patient.anticoagulant ? '正在服用抗凝药' : '未服用抗凝药'}
            </Text>
          </View>
          {patient.anticoagulant && (
            <View className={styles.alertBox}>
              <Text style={{ fontSize: '26rpx', color: '#FF7D00' }}>
                ⚠️ 患者服用抗凝药，治疗前请确认出血风险，备好止血措施
              </Text>
            </View>
          )}
        </View>
      </View>

      <View className={styles.section}>
        <View className={styles.sectionTitleNoClick}>
          <View className={classnames(styles.sectionIcon, styles.normalIcon)}>
            <Text>🩺</Text>
          </View>
          <View>
            <Text>主诉</Text>
            <Text className={styles.sectionSubtitle}>患者就诊原因</Text>
          </View>
        </View>
        <View className={styles.chiefComplaint}>
          <Text>{patient.chiefComplaint}</Text>
        </View>
      </View>

      <View className={styles.bottomBar}>
        {isPending ? (
          <View
            className={classnames(
              styles.submitBtn,
              allChecked && styles.ready
            )}
            onClick={handleSubmitToDoctor}
          >
            <Text>
              {allChecked ? `✓ 核对完成，提交给医生` : `核对中 (${checkedCount}/4)`}
            </Text>
          </View>
        ) : isTreating ? (
          <View className={classnames(styles.submitBtn, styles.photo)} onClick={handleStartPhoto}>
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
