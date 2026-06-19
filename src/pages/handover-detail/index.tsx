import React, { useState, useEffect } from 'react'
import { View, Text, Textarea, Picker } from '@tarojs/components'
import Taro, { useRouter, useDidShow } from '@tarojs/taro'
import classnames from 'classnames'
import styles from './index.module.scss'
import { usePatientStore } from '@/store/usePatientStore'
import type { SupplyItem, HandoverRecord } from '@/types'
import dayjs from 'dayjs'

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

  const [refreshKey, setRefreshKey] = useState(0)

  useDidShow(() => {
    setRefreshKey(k => k + 1)
  })

  const patient = getPatientById(patientId)
  const existingRecord = getHandoverByPatientId(patientId)

  const [record, setRecord] = useState<HandoverRecord | null>(existingRecord || null)
  const [supplies, setSupplies] = useState<SupplyItem[]>([])
  const [postOpInstructions, setPostOpInstructions] = useState(false)
  const [followUpAppointment, setFollowUpAppointment] = useState(false)
  const [followUpDate, setFollowUpDate] = useState('')
  const [followUpTime, setFollowUpTime] = useState('09:00')
  const [notes, setNotes] = useState('')

  const isHandoverCompleted = record?.completedAt ? true : false
  const isFollowUpDone = record?.followUpDate ? true : false
  const isReadOnly = isHandoverCompleted && isFollowUpDone
  const isFollowUpEditMode = isHandoverCompleted && !isFollowUpDone

  useEffect(() => {
    if (existingRecord) {
      setSupplies(existingRecord.supplies)
      setPostOpInstructions(existingRecord.postOpInstructions)
      setFollowUpAppointment(existingRecord.followUpAppointment)
      setFollowUpDate(existingRecord.followUpDate || '')
      if (existingRecord.followUpDate) {
        const parts = existingRecord.followUpDate.split(' ')
        if (parts.length === 2) {
          setFollowUpDate(parts[0])
          setFollowUpTime(parts[1])
        }
      }
      setNotes(existingRecord.notes)
    } else {
      const newRecord = createHandover(patientId)
      setRecord(newRecord)
      setSupplies(newRecord.supplies)
    }
  }, [patientId, existingRecord, createHandover, refreshKey])

  const toggleSupply = (supplyId: string) => {
    if (isReadOnly) return
    setSupplies(prev =>
      prev.map(s =>
        s.id === supplyId ? { ...s, checked: !s.checked } : s
      )
    )
  }

  const toggleFollowUp = () => {
    if (isReadOnly) return
    if (isFollowUpEditMode) {
      const newValue = !followUpAppointment
      setFollowUpAppointment(newValue)
      if (newValue && !followUpDate) {
        setFollowUpDate(dayjs().add(7, 'day').format('YYYY-MM-DD'))
      }
      return
    }
    const newValue = !followUpAppointment
    setFollowUpAppointment(newValue)
    if (newValue && !followUpDate) {
      setFollowUpDate(dayjs().add(7, 'day').format('YYYY-MM-DD'))
    }
  }

  const handleDateChange = (e: any) => {
    if (isReadOnly) return
    setFollowUpDate(e.detail.value)
  }

  const handleTimeChange = (e: any) => {
    if (isReadOnly) return
    setFollowUpTime(e.detail.value)
  }

  const getMinDate = () => dayjs().add(1, 'day').format('YYYY-MM-DD')
  const getMaxDate = () => dayjs().add(90, 'day').format('YYYY-MM-DD')

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

    if (followUpAppointment && !followUpDate) {
      Taro.showToast({
        title: '请选择复诊时间',
        icon: 'none',
        duration: 2000
      })
      return
    }

    const fullFollowUpDate = followUpAppointment ? `${followUpDate} ${followUpTime}` : ''
    const supplySummary = supplies.filter(s => s.checked).map(s => s.name).join('、')

    const contentLines = [
      `耗材：${checkedCount} 项${supplySummary ? `（${supplySummary.substring(0, 30)}${supplySummary.length > 30 ? '...' : ''}）` : '（无）'}`,
      `术后注意事项：${postOpInstructions ? '已告知' : '未告知'}`,
      `复诊预约：${followUpAppointment ? `已预约 ${fullFollowUpDate}` : '未预约'}`
    ]
    if (notes) contentLines.push(`备注：${notes.substring(0, 30)}`)

    Taro.showModal({
      title: '确认完成交接',
      content: contentLines.join('\n'),
      confirmText: '确认完成',
      confirmColor: '#00B4A0',
      success: (res) => {
        if (res.confirm) {
          const updatedRecord: HandoverRecord = {
            ...record,
            supplies,
            postOpInstructions,
            followUpAppointment,
            followUpDate: fullFollowUpDate,
            notes
          }
          updateHandover(updatedRecord)
          completeHandover(patientId, updatedRecord)
          const now = new Date()
          const iso = now.toISOString()
          const fullCompletedAt = `${iso.slice(0, 10)}T${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
          setRecord({
            ...updatedRecord,
            completedAt: fullCompletedAt
          })

          Taro.showToast({
            title: '交接完成',
            icon: 'success',
            duration: 1500
          })

          setTimeout(() => {
            Taro.navigateBack()
          }, 1500)
        }
      }
    })
  }

  const handleSaveFollowUp = () => {
    if (!record) return
    if (!followUpAppointment) {
      Taro.showToast({
        title: '请勾选复诊预约',
        icon: 'none',
        duration: 1500
      })
      return
    }
    if (!followUpDate) {
      Taro.showToast({
        title: '请选择复诊时间',
        icon: 'none',
        duration: 1500
      })
      return
    }
    const fullFollowUpDate = `${followUpDate} ${followUpTime}`
    const updatedRecord: HandoverRecord = {
      ...record,
      followUpAppointment: true,
      followUpDate: fullFollowUpDate
    }
    updateHandover(updatedRecord)
    setRecord(updatedRecord)

    Taro.showToast({
      title: '复诊已更新',
      icon: 'success',
      duration: 1500
    })

    setTimeout(() => {
      Taro.navigateBack()
    }, 1500)
  }

  const checkedSupplyCount = supplies.filter(s => s.checked).length
  const completedCount =
    (postOpInstructions ? 1 : 0) + (followUpAppointment ? 1 : 0)

  if (!patient) {
    return (
      <View className={styles.page}>
        <Text>患者不存在</Text>
      </View>
    )
  }

  const supplySummaryText = supplies.filter(s => s.checked).map(s => s.name).join('、')

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
        {isReadOnly && (
          <View className={styles.completedBadge}>
            <Text>✓ 已完成</Text>
          </View>
        )}
        {isFollowUpEditMode && (
          <View className={styles.followUpBadge}>
            <Text>📅 补复诊</Text>
          </View>
        )}
      </View>

      {isFollowUpEditMode && (
        <View className={styles.followUpEditNotice}>
          <Text className={styles.noticeIcon}>ℹ️</Text>
          <View className={styles.noticeText}>
            <Text>护理配合记录已归档，可补录复诊时间</Text>
          </View>
        </View>
      )}

      {isReadOnly && (
        <View className={styles.readOnlyNotice}>
          <Text className={styles.noticeIcon}>ℹ️</Text>
          <View className={styles.noticeText}>
            <Text>护理配合记录已归档，完成时间：{record?.completedAt}，护士：{record?.nurse}</Text>
          </View>
        </View>
      )}

      <View className={styles.section}>
        <View className={styles.sectionTitle}>
          <View className={styles.sectionIcon}>
            <Text>📦</Text>
          </View>
          <View>
            <Text>使用耗材</Text>
            <Text className={styles.sectionSubtitle}>
              已选 {checkedSupplyCount} 项
              {supplySummaryText && `：${supplySummaryText.substring(0, 20)}${supplySummaryText.length > 20 ? '...' : ''}`}
            </Text>
          </View>
        </View>
        <View className={styles.supplyList}>
          {supplies.map(supply => (
            <View
              key={supply.id}
              className={classnames(
                styles.supplyItem,
                supply.checked && styles.checked,
                isReadOnly && styles.disabled
              )}
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
          <View>
            <Text>交接确认项</Text>
            <Text className={styles.sectionSubtitle}>
              {isFollowUpEditMode ? '已确认 2/2' : `已确认 ${completedCount}/2`}
            </Text>
          </View>
        </View>
        <View className={styles.confirmItems}>
          <View
            className={classnames(
              styles.confirmItem,
              (postOpInstructions || isFollowUpEditMode) && styles.checked,
              isReadOnly && styles.disabled
            )}
            onClick={() => !isReadOnly && !isFollowUpEditMode && setPostOpInstructions(!postOpInstructions)}
          >
            <View className={styles.checkIcon}>
              <Text>{postOpInstructions || isFollowUpEditMode ? '✓' : ''}</Text>
            </View>
            <View className={styles.confirmContent}>
              <Text className={styles.confirmTitle}>术后注意事项已告知</Text>
              <Text className={styles.confirmDesc}>
                饮食、口腔清洁、用药、异常情况处理等已详细说明
              </Text>
            </View>
          </View>

          <View
            className={classnames(
              styles.confirmItem,
              followUpAppointment && styles.checked,
              isReadOnly && styles.disabled
            )}
            onClick={toggleFollowUp}
          >
            <View className={styles.checkIcon}>
              <Text>{followUpAppointment ? '✓' : ''}</Text>
            </View>
            <View className={styles.confirmContent}>
              <Text className={styles.confirmTitle}>复诊时间已预约</Text>
              <Text className={styles.confirmDesc}>
                {followUpAppointment
                  ? `复诊：${followUpDate} ${followUpTime}`
                  : '勾选后可选择复诊日期和时间'}
              </Text>
            </View>
          </View>

          {followUpAppointment && (
            <View className={styles.datePickerRow}>
              <View className={styles.datePickerItem}>
                <Text className={styles.datePickerLabel}>复诊日期</Text>
                <Picker
                  mode="date"
                  value={followUpDate}
                  start={getMinDate()}
                  end={getMaxDate()}
                  fields="day"
                  onChange={handleDateChange}
                  disabled={isReadOnly}
                >
                  <View className={styles.datePickerValue}>
                    <Text>{followUpDate || '请选择日期'}</Text>
                    {!isReadOnly && <Text className={styles.arrowIcon}>›</Text>}
                  </View>
                </Picker>
              </View>
              <View className={styles.datePickerItem}>
                <Text className={styles.datePickerLabel}>复诊时间</Text>
                <Picker
                  mode="time"
                  value={followUpTime}
                  onChange={handleTimeChange}
                  disabled={isReadOnly}
                >
                  <View className={styles.datePickerValue}>
                    <Text>{followUpTime}</Text>
                    {!isReadOnly && <Text className={styles.arrowIcon}>›</Text>}
                  </View>
                </Picker>
              </View>
            </View>
          )}
        </View>
      </View>

      <View className={styles.section}>
        <View className={styles.sectionTitle}>
          <View className={styles.sectionIcon}>
            <Text>📝</Text>
          </View>
          <View>
            <Text>备注</Text>
            <Text className={styles.sectionSubtitle}>特殊情况记录（选填）</Text>
          </View>
        </View>
        <Textarea
          className={styles.notesInput}
          placeholder="请输入备注信息，如：患者对麻药反应较大、术后出血较多需特殊观察等"
          placeholder-class="textarea-placeholder"
          value={notes}
          onInput={(e) => !isReadOnly && !isFollowUpEditMode && setNotes(e.detail.value)}
          disabled={isReadOnly || isFollowUpEditMode}
          maxlength={300}
          autoHeight
        />
      </View>

      {(isReadOnly || isFollowUpEditMode) && (
        <View className={styles.section}>
          <View className={styles.sectionTitle}>
            <View className={styles.sectionIcon}>
              <Text>📋</Text>
            </View>
            <View>
              <Text>护理配合记录摘要</Text>
              <Text className={styles.sectionSubtitle}>完整归档记录</Text>
            </View>
          </View>
          <View className={styles.summaryList}>
            <View className={styles.summaryItem}>
              <Text className={styles.summaryLabel}>完成护士</Text>
              <Text className={styles.summaryValue}>{record?.nurse || '当前护士'}</Text>
            </View>
            <View className={styles.summaryItem}>
              <Text className={styles.summaryLabel}>完成时间</Text>
              <Text className={styles.summaryValue}>{record?.completedAt}</Text>
            </View>
            <View className={styles.summaryItem}>
              <Text className={styles.summaryLabel}>使用耗材</Text>
              <Text className={styles.summaryValue}>
                {checkedSupplyCount > 0
                  ? `${checkedSupplyCount}项：${supplySummaryText || '无'}`
                  : '无'}
              </Text>
            </View>
            <View className={styles.summaryItem}>
              <Text className={styles.summaryLabel}>术后注意事项</Text>
              <Text className={styles.summaryValue}>
                {postOpInstructions || isFollowUpEditMode ? '✓ 已详细告知' : '未确认'}
              </Text>
            </View>
            <View className={styles.summaryItem}>
              <Text className={styles.summaryLabel}>复诊预约</Text>
              <Text className={styles.summaryValue}>
                {followUpAppointment && record?.followUpDate
                  ? `✓ 已预约 · ${record.followUpDate}`
                  : '未预约'}
              </Text>
            </View>
            {record?.notes && (
              <View className={styles.summaryItem}>
                <Text className={styles.summaryLabel}>备注</Text>
                <Text className={styles.summaryValue}>{record.notes}</Text>
              </View>
            )}
          </View>
        </View>
      )}

      <View className={styles.bottomBar}>
        <View className={styles.summary}>
          <Text>耗材 {checkedSupplyCount} 项 · 确认 {completedCount}/2</Text>
          <Text className={styles.summaryValue}>护士：当前护士</Text>
        </View>
        {isReadOnly ? (
          <View className={classnames(styles.submitBtn, styles.done)}>
            <Text>✓ 护理记录已归档</Text>
          </View>
        ) : isFollowUpEditMode ? (
          <View
            className={classnames(styles.submitBtn, styles.followUpSave)}
            onClick={handleSaveFollowUp}
          >
            <Text>保存复诊时间</Text>
          </View>
        ) : (
          <View className={styles.submitBtn} onClick={handleSubmit}>
            <Text>确认完成交接并归档</Text>
          </View>
        )}
      </View>
    </View>
  )
}

export default HandoverDetailPage
