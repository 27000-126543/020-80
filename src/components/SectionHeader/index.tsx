import React from 'react'
import { View, Text } from '@tarojs/components'
import styles from './index.module.scss'

interface SectionHeaderProps {
  title: string
  extra?: string
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ title, extra }) => {
  return (
    <View className={styles.sectionHeader}>
      <View className={styles.icon}></View>
      <Text className={styles.title}>{title}</Text>
      {extra && <Text className={styles.extra}>{extra}</Text>}
    </View>
  )
}

export default SectionHeader
