export type PatientStatus = 'pending' | 'treating' | 'done'

export type PhotoStage = 'pre' | 'during' | 'post'

export type PhotoAngle = 'front' | 'side' | 'occlusal' | 'local'

export interface Patient {
  id: string
  name: string
  gender: '男' | '女'
  age: number
  room: string
  appointmentTime: string
  status: PatientStatus
  allergy: string[]
  chronicDiseases: string[]
  anticoagulant: boolean
  chiefComplaint: string
  dentist: string
  phone: string
}

export interface PhotoItem {
  id: string
  angle: PhotoAngle
  url: string
  uploadTime: string
}

export interface PhotoRecord {
  id: string
  patientId: string
  patientName: string
  room: string
  date: string
  prePhotos: PhotoItem[]
  duringPhotos: PhotoItem[]
  postPhotos: PhotoItem[]
}

export interface SupplyItem {
  id: string
  name: string
  checked: boolean
}

export interface HandoverRecord {
  id: string
  patientId: string
  patientName: string
  room: string
  dentist: string
  supplies: SupplyItem[]
  postOpInstructions: boolean
  followUpAppointment: boolean
  notes: string
  completedAt: string
  nurse: string
}

export const PhotoAngleMap: Record<PhotoAngle, string> = {
  front: '正面',
  side: '侧方',
  occlusal: '咬合面',
  local: '局部牙位'
}

export const PhotoStageMap: Record<PhotoStage, string> = {
  pre: '术前',
  during: '术中',
  post: '术后'
}

export const StatusMap: Record<PatientStatus, string> = {
  pending: '待接诊',
  treating: '治疗中',
  done: '已完成'
}
