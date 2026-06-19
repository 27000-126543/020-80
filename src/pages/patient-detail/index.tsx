import React, { useState, useEffect, useMemo } from 'react'
import { View, Text, Image } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import classnames from 'classnames'
import styles from './index.module.scss'
import StatusBadge from '@/components/StatusBadge'
import { usePatientStore } from '@/store/usePatientStore'
import type { PhotoAngle, PhotoStage } from '@/types'
import { PhotoAngleMap, PhotoStageMap } from '@/types'

const requiredAngles: PhotoAngle[] = ['front', 'side', 'occlusal', 'local']

interface TimelineStep {
  key: string
  icon: string
  title: string
  subtitle: string
  done: boolean
  missing?: string[]
  action?: string
  actionUrl?: string
}

const PatientDetailPage: React.FC = () => {
  const router = useRouter()
  const patientId = router.params.id as string
  const {
    getPatientById,
    updatePatientChecklist,
    submitToDoctor,
    getPhotoRecordByPatientId,
    getHandoverByPatientId
  } = usePatientStore()
  const [patient, setPatient] = useState(getPatientById(patientId))

  useEffect(() => {
    const p = getPatientById(patientId)
    setPatient(p)
  }, [patientId, getPatientById])

  const photoRecord = getPhotoRecordByPatientId(patientId)
  const handoverRecord = getHandoverByPatientId(patientId)

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
      Taro.showToast({ title: '请先完成全部核对项', icon: 'none', duration: 1500 })
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
          Taro.showToast({ title: '已提交给医生', icon: 'success', duration: 1500 })
          setTimeout(() => { Taro.navigateBack() }, 1500)
        }
      }
    })
  }

  const handleStartPhoto = () => {
    Taro.navigateTo({ url: `/pages/photo-capture/index?patientId=${patientId}` })
  }

  const handleGoHandover = () => {
    Taro.navigateTo({ url: `/pages/handover-detail/index?patientId=${patientId}` })
  }

  const isDone = patient.status === 'done'
  const isTreating = patient.status === 'treating'
  const isPending = patient.status === 'pending'

  const timeline = useMemo((): TimelineStep[] => {
    const steps: TimelineStep[] = []

    steps.push({
      key: 'verify',
      icon: '✅',
      title: '患者核对',
      subtitle: allChecked
        ? `已核对 ${checkedCount}/4 项${patient.submittedToDoctorAt ? `，提交于 ${patient.submittedToDoctorAt}` : ''}`
        : `核对中 ${checkedCount}/4 项`,
      done: allChecked,
      missing: allChecked ? undefined : ['姓名', '过敏史', '既往疾病', '抗凝药'].filter((_, i) =>
        !Object.values(checklist)[i]
      )
    })

    const preMissing: string[] = []
    const duringMissing: string[] = []
    const postMissing: string[] = []
    ;(['pre', 'during', 'post'] as PhotoStage[]).forEach(stage => {
      const key = `${stage}Photos` as 'prePhotos' | 'duringPhotos' | 'postPhotos'
      const photos = photoRecord ? photoRecord[key] : []
      requiredAngles.forEach(angle => {
        if (!photos.some(p => p.angle === angle)) {
          const label = PhotoAngleMap[angle]
          if (stage === 'pre') preMissing.push(label)
          else if (stage === 'during') duringMissing.push(label)
          else postMissing.push(label)
        }
      })
    })

    const preDone = preMissing.length === 0 && (photoRecord ? photoRecord.prePhotos.length > 0 : false)
    steps.push({
      key: 'pre',
      icon: '📷',
      title: '术前照片',
      subtitle: preDone
        ? `4/4 角度已拍摄`
        : `${4 - preMissing.length}/4 角度${photoRecord && photoRecord.prePhotos.length > 0 ? '' : '，未开始'}`,
      done: preDone,
      missing: preMissing.length > 0 ? preMissing : undefined,
      action: !preDone ? '去拍摄' : undefined,
      actionUrl: `/pages/photo-capture/index?patientId=${patientId}`
    })

    const duringDone = duringMissing.length === 0 && (photoRecord ? photoRecord.duringPhotos.length > 0 : false)
    steps.push({
      key: 'during',
      icon: '📷',
      title: '术中照片',
      subtitle: duringDone
        ? `4/4 角度已拍摄`
        : `${4 - duringMissing.length}/4 角度${photoRecord && photoRecord.duringPhotos.length > 0 ? '' : '，未开始'}`,
      done: duringDone,
      missing: duringMissing.length > 0 ? duringMissing : undefined,
      action: !duringDone ? '去拍摄' : undefined,
      actionUrl: `/pages/photo-capture/index?patientId=${patientId}`
    })

    const postDone = postMissing.length === 0 && (photoRecord ? photoRecord.postPhotos.length > 0 : false)
    steps.push({
      key: 'post',
      icon: '📷',
      title: '术后照片',
      subtitle: postDone
        ? `4/4 角度已拍摄`
        : `${4 - postMissing.length}/4 角度${photoRecord && photoRecord.postPhotos.length > 0 ? '' : '，未开始'}`,
      done: postDone,
      missing: postMissing.length > 0 ? postMissing : undefined,
      action: !postDone ? '去拍摄' : undefined,
      actionUrl: `/pages/photo-capture/index?patientId=${patientId}`
    })

    const handoverDone = !!handoverRecord?.completedAt
    steps.push({
      key: 'handover',
      icon: '📋',
      title: '交接归档',
      subtitle: handoverDone
        ? `已完成，护士 ${handoverRecord.nurse}`
        : handoverRecord ? '交接中，未完成' : '未开始',
      done: handoverDone,
      action: !handoverDone && isTreating ? '去交接' : undefined,
      actionUrl: `/pages/handover-detail/index?patientId=${patientId}`
    })

    if (handoverDone && handoverRecord.followUpDate) {
      steps.push({
        key: 'followup',
        icon: '📅',
        title: '复诊安排',
        subtitle: `已预约 ${handoverRecord.followUpDate}`,
        done: true
      })
    }

    return steps
  }, [patient, photoRecord, handoverRecord, allChecked, checkedCount, checklist])

  const completedSteps = timeline.filter(s => s.done).length
  const incompleteItems = timeline.filter(s => !s.done && s.missing && s.missing.length > 0)

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

      {isPending && (
        <>
          <View
            className={classnames(styles.section, checklist.nameChecked && styles.sectionChecked)}
            onClick={() => toggleCheck('nameChecked')}
          >
            <View className={styles.checkRow}>
              <View className={styles.sectionTitle}>
                <View className={classnames(styles.sectionIcon, styles.normalIcon)}><Text>👤</Text></View>
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
                <Text className={styles.nameBoxMeta}>{patient.gender} · {patient.age}岁 · {patient.phone}</Text>
              </View>
            </View>
          </View>

          <View
            className={classnames(styles.section, checklist.allergyChecked && styles.sectionChecked)}
            onClick={() => toggleCheck('allergyChecked')}
          >
            <View className={styles.checkRow}>
              <View className={styles.sectionTitle}>
                <View className={classnames(styles.sectionIcon, patient.allergy.length > 0 ? styles.warningIcon : styles.normalIcon)}><Text>⚠️</Text></View>
                <View>
                  <Text>过敏史</Text>
                  <Text className={styles.sectionSubtitle}>{patient.allergy.length > 0 ? `需关注 ${patient.allergy.length} 项` : '无过敏史'}</Text>
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
                    <Text key={idx} className={classnames(styles.tag, styles.dangerTag)}>{item}</Text>
                  ))}
                </View>
              ) : (
                <Text className={styles.emptyText}>✓ 无过敏史</Text>
              )}
            </View>
          </View>

          <View
            className={classnames(styles.section, checklist.diseasesChecked && styles.sectionChecked)}
            onClick={() => toggleCheck('diseasesChecked')}
          >
            <View className={styles.checkRow}>
              <View className={styles.sectionTitle}>
                <View className={classnames(styles.sectionIcon, styles.normalIcon)}><Text>📋</Text></View>
                <View>
                  <Text>既往疾病</Text>
                  <Text className={styles.sectionSubtitle}>{patient.chronicDiseases.length > 0 ? `${patient.chronicDiseases.length} 项慢性病史` : '健康状况良好'}</Text>
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
                    <Text key={idx} className={classnames(styles.tag, styles.infoTag)}>{item}</Text>
                  ))}
                </View>
              ) : (
                <Text className={styles.emptyText}>✓ 无既往疾病</Text>
              )}
            </View>
          </View>

          <View
            className={classnames(styles.section, checklist.anticoagulantChecked && styles.sectionChecked)}
            onClick={() => toggleCheck('anticoagulantChecked')}
          >
            <View className={styles.checkRow}>
              <View className={styles.sectionTitle}>
                <View className={classnames(styles.sectionIcon, patient.anticoagulant ? styles.alertIcon : styles.normalIcon)}><Text>💊</Text></View>
                <View>
                  <Text>抗凝药服用</Text>
                  <Text className={styles.sectionSubtitle}>{patient.anticoagulant ? '正在服用，注意出血风险' : '未服用抗凝药'}</Text>
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
              <View className={classnames(styles.sectionIcon, styles.normalIcon)}><Text>🩺</Text></View>
              <View>
                <Text>主诉</Text>
                <Text className={styles.sectionSubtitle}>患者就诊原因</Text>
              </View>
            </View>
            <View className={styles.chiefComplaint}>
              <Text>{patient.chiefComplaint}</Text>
            </View>
          </View>
        </>
      )}

      {(isTreating || isDone) && (
        <View className={styles.timelineSection}>
          <View className={styles.timelineHeader}>
            <Text className={styles.timelineTitle}>病历归档时间线</Text>
            <Text className={styles.timelineProgress}>{completedSteps}/{timeline.length} 已完成</Text>
          </View>

          {incompleteItems.length > 0 && (
            <View className={styles.incompleteAlert}>
              <Text className={styles.alertIcon}>⚠️</Text>
              <Text className={styles.alertContent}>
                待补齐：{incompleteItems.map(s => s.title).join('、')}
              </Text>
            </View>
          )}

          <View className={styles.timeline}>
            {timeline.map((step, idx) => (
              <View key={step.key} className={styles.timelineItem}>
                <View className={styles.timelineLeft}>
                  <View className={classnames(
                    styles.timelineDot,
                    step.done && styles.dotDone,
                    !step.done && styles.dotPending
                  )}>
                    <Text className={styles.dotIcon}>{step.done ? '✓' : step.icon}</Text>
                  </View>
                  {idx < timeline.length - 1 && (
                    <View className={classnames(
                      styles.timelineLine,
                      step.done && styles.lineDone
                    )} />
                  )}
                </View>
                <View className={styles.timelineRight}>
                  <View className={styles.timelineCard}>
                    <View className={styles.timelineCardHeader}>
                      <Text className={classnames(
                        styles.timelineStepTitle,
                        step.done && styles.stepDone
                      )}>{step.title}</Text>
                      {step.action && (
                        <View
                          className={styles.timelineAction}
                          onClick={(e) => {
                            e.stopPropagation()
                            Taro.navigateTo({ url: step.actionUrl! })
                          }}
                        >
                          <Text>{step.action} ›</Text>
                        </View>
                      )}
                    </View>
                    <Text className={styles.timelineSubtitle}>{step.subtitle}</Text>
                    {step.missing && step.missing.length > 0 && (
                      <View className={styles.missingTags}>
                        {step.missing.map((m, i) => (
                          <Text key={i} className={styles.missingTag}>{m}</Text>
                        ))}
                      </View>
                    )}
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      <View className={styles.bottomBar}>
        {isPending ? (
          <View
            className={classnames(styles.submitBtn, allChecked && styles.ready)}
            onClick={handleSubmitToDoctor}
          >
            <Text>{allChecked ? `✓ 核对完成，提交给医生` : `核对中 (${checkedCount}/4)`}</Text>
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
