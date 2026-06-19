import React, { useState, useEffect } from 'react'
import { View, Text, Textarea } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import classnames from 'classnames'
import styles from './index.module.scss'
import { usePatientStore } from '@/store/usePatientStore'
import type { SupplyItem, HandoverRecord } from '@/types'

const HandoverDetailPage: React.FC = () => {
  const router = useRouter()
  const patientId = router.params.patientId as string
  const {
    getPatientById,
    getHandoverByPatientId,
    createHandover,
    updateHandover,
    completeHandover
  } = usePatientStore()

  const patient = getPatientById(patientId)
  const existingRecord = getHandoverByPatientId(patientId)

  const [record, setRecord] = useState<HandoverRecord | null>(existingRecord || null)
  const [supplies, setSupplies] = useState<SupplyItem[]>([])
  const [postOpInstructions, setPostOpInstructions] = useState(false)
  const [followUpAppointment, setFollowUpAppointment] = useState(false)
  const [notes, setNotes] = useState('')

  const isCompleted = record?.completedAt ? true : false

  useEffect(() => {
    if (existingRecord) {
      setSupplies(existingRecord.supplies)
      setPostOpInstructions(existingRecord.postOpInstructions)
      setFollowUpAppointment(existingRecord.followUpAppointment)
      setNotes(existingRecord.notes)
    } else {
      const newRecord = createHandover(patientId)
      setRecord(newRecord)
      setSupplies(newRecord.supplies)
    }
  }, [patientId, existingRecord, createHandover])

  const toggleSupply = (supplyId: string) => {
    if (isCompleted) return
    setSupplies(prev =>
      prev.map(s =>
        s.id === supplyId ? { ...s, checked: !s.checked } : s
      )
    )
  }

  const handleSubmit = () => {
    if (!record) return

    const checkedCount = supplies.filter(s => s.checked).length
    const mustConfirm = postOpInstructions

    if (!mustConfirm) {
      Taro.showToast({
        title: '请确认术后注意事项已告知',
        icon: 'none',
        duration: 2000
      })
      return
    }

    Taro.showModal({
      title: '确认完成交接',
      content: `耗材 ${checkedCount} 项\n术后注意事项：${postOpInstructions ? '已告知' : '未告知'}\n复诊预约：${followUpAppointment ? '已预约' : '未预约'}`,
      confirmText: '确认完成',
      confirmColor: '#00B4A0',
      success: (res) => {
        if (res.confirm) {
          const updatedRecord: HandoverRecord = {
            ...record,
            supplies,
            postOpInstructions,
            followUpAppointment,
            notes
          }
          updateHandover(updatedRecord)
          completeHandover(patientId)
          setRecord({ ...updatedRecord, completedAt: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) })

          Taro.showToast({
            title: '交接完成',
            icon: 'success',
            duration: 1500
          })
          console.log('[HandoverDetail] complete handover', { patientId, checkedCount })

          setTimeout(() => {
            Taro.navigateBack()
          }, 1500)
        }
      }
    })
  }

  const checkedSupplyCount = supplies.filter(s => s.checked).length
  const completedCount = (postOpInstructions ? 1 : 0) + (followUpAppointment ? 1 : 0)

  if (!patient) {
    return (
      <View className={styles.page}>
        <Text>患者不存在</Text>
      </View>
    )
  }

  return (
    <View className={styles.page}>
      <View className={styles.patientBar}>
        <View className={styles.avatar}>
          <Text>{patient.name.charAt(0)}</Text>
        </View>
        <View className={styles.info}>
          <Text className={styles.name}>{patient.name}</Text>
          <Text className={styles.meta}>
            {patient.room} · {patient.dentist} · {patient.appointmentTime}
          </Text>
        </View>
        {isCompleted && (
          <View className={styles.completedBadge}>
            <Text>✓ 已完成</Text>
          </View>
        )}
      </View>

      {isCompleted && (
        <View className={styles.readOnlyNotice}>
          <Text className={styles.noticeIcon}>ℹ️</Text>
          <View className={styles.noticeText}>
            <Text>该患者交接已完成，完成时间：{record?.completedAt}</Text>
          </View>
        </View>
      )}

      <View className={styles.section}>
        <View className={styles.sectionTitle}>
          <View className={styles.sectionIcon}>
            <Text>📦</Text>
          </View>
          <Text>使用耗材</Text>
        </View>
        <View className={styles.supplyList}>
          {supplies.map(supply => (
            <View
              key={supply.id}
              className={classnames(styles.supplyItem, supply.checked && styles.checked)}
              onClick={() => toggleSupply(supply.id)}
            >
              <View className={styles.checkbox}></View>
              <Text className={styles.supplyName}>{supply.name}</Text>
            </View>
          ))}
        </View>
      </View>

      <View className={styles.section}>
        <View className={styles.sectionTitle}>
          <View className={styles.sectionIcon}>
            <Text>✅</Text>
          </View>
          <Text>交接确认项</Text>
        </View>
        <View className={styles.confirmItems}>
          <View
            className={classnames(styles.confirmItem, postOpInstructions && styles.checked)}
            onClick={() => !isCompleted && setPostOpInstructions(!postOpInstructions)}
          >
            <View className={styles.checkIcon}>
              <Text>{postOpInstructions ? '✓' : ''}</Text>
            </View>
            <View className={styles.confirmContent}>
              <Text className={styles.confirmTitle}>术后注意事项已告知</Text>
              <Text className={styles.confirmDesc}>已向患者详细说明术后注意事项</Text>
            </View>
          </View>

          <View
            className={classnames(styles.confirmItem, followUpAppointment && styles.checked)}
            onClick={() => !isCompleted && setFollowUpAppointment(!followUpAppointment)}
          >
            <View className={styles.checkIcon}>
              <Text>{followUpAppointment ? '✓' : ''}</Text>
            </View>
            <View className={styles.confirmContent}>
              <Text className={styles.confirmTitle}>复诊时间已预约</Text>
              <Text className={styles.confirmDesc}>已协助患者预约下次复诊时间</Text>
            </View>
          </View>
        </View>
      </View>

      <View className={styles.section}>
        <View className={styles.sectionTitle}>
          <View className={styles.sectionIcon}>
            <Text>📝</Text>
          </View>
          <Text>备注</Text>
        </View>
        <Textarea
          className={styles.notesInput}
          placeholder="请输入备注信息（选填）"
          placeholder-class="textarea-placeholder"
          value={notes}
          onInput={(e) => !isCompleted && setNotes(e.detail.value)}
          disabled={isCompleted}
          maxlength={200}
        />
      </View>

      <View className={styles.bottomBar}>
        <View className={styles.summary}>
          <Text>耗材 {checkedSupplyCount} 项 · 确认 {completedCount}/2</Text>
          <Text className={styles.summaryValue}>护士：当前护士</Text>
        </View>
        {isCompleted ? (
          <View className={classnames(styles.submitBtn, styles.done)}>
            <Text>✓ 交接已完成</Text>
          </View>
        ) : (
          <View className={styles.submitBtn} onClick={handleSubmit}>
            <Text>确认完成交接</Text>
          </View>
        )}
      </View>
    </View>
  )
}

export default HandoverDetailPage
