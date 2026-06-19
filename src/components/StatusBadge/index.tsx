import React from 'react'
import { View, Text } from '@tarojs/components'
import classnames from 'classnames'
import styles from './index.module.scss'
import type { PatientStatus } from '@/types'
import { StatusMap } from '@/types'

interface StatusBadgeProps {
  status: PatientStatus
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  return (
    <View className={classnames(styles.statusBadge, styles[status])}>
      <Text>{StatusMap[status]}</Text>
    </View>
  )
}

export default StatusBadge
