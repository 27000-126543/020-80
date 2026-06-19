import { create } from 'zustand'
import Taro from '@tarojs/taro'
import type { Patient, PhotoRecord, HandoverRecord, PhotoItem, PhotoStage, SupplyItem } from '@/types'
import { mockPatients, mockPhotoRecords, mockHandoverRecords, mockSupplies } from '@/data/mockData'

const STORAGE_KEY = 'dental_nurse_store_v1'
const STORAGE_DATE_KEY = 'dental_nurse_store_date'
const PHOTO_STORAGE_KEY = 'dental_nurse_photos_v1'

const getTodayStr = () => new Date().toISOString().split('T')[0]

const loadFromStorage = () => {
  try {
    const storedDate = Taro.getStorageSync(STORAGE_DATE_KEY)
    const today = getTodayStr()

    if (storedDate !== today) {
      console.log('[PatientStore] date changed, reset to mock data', { storedDate, today })
      return null
    }

    const stored = Taro.getStorageSync(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      console.log('[PatientStore] loaded from storage', {
        patients: parsed.patients?.length,
        handovers: parsed.handoverRecords?.length
      })
      return parsed
    }
  } catch (e) {
    console.error('[PatientStore] loadFromStorage error', e)
  }
  return null
}

const saveToStorage = (state: Partial<PatientState>) => {
  try {
    const toSave = {
      patients: state.patients,
      handoverRecords: state.handoverRecords
    }
    Taro.setStorageSync(STORAGE_KEY, JSON.stringify(toSave))
    Taro.setStorageSync(STORAGE_DATE_KEY, getTodayStr())
  } catch (e) {
    console.error('[PatientStore] saveToStorage error', e)
  }
}

const loadPhotoStorage = (): PhotoRecord[] => {
  try {
    const storedDate = Taro.getStorageSync(STORAGE_DATE_KEY)
    const today = getTodayStr()
    if (storedDate !== today) return []
    const stored = Taro.getStorageSync(PHOTO_STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      console.log('[PatientStore] loaded photos from storage', parsed.length)
      return parsed
    }
  } catch (e) {
    console.error('[PatientStore] loadPhotoStorage error', e)
  }
  return []
}

const savePhotoStorage = (photoRecords: PhotoRecord[]) => {
  try {
    Taro.setStorageSync(PHOTO_STORAGE_KEY, JSON.stringify(photoRecords))
  } catch (e) {
    console.error('[PatientStore] savePhotoStorage error', e)
  }
}

const initData = () => {
  const stored = loadFromStorage()
  if (stored) {
    const photoRecords = loadPhotoStorage()
    return { ...stored, photoRecords }
  }
  return {
    patients: mockPatients.map(p => ({
      ...p,
      checklist: p.checklist || {
        nameChecked: false,
        allergyChecked: false,
        diseasesChecked: false,
        anticoagulantChecked: false
      }
    })),
    photoRecords: mockPhotoRecords.filter(r => r.date === getTodayStr()),
    handoverRecords: mockHandoverRecords
  }
}

const initial = initData()

interface PatientState {
  patients: Patient[]
  photoRecords: PhotoRecord[]
  handoverRecords: HandoverRecord[]
  supplyTemplates: SupplyItem[]

  getPatientsByRoom: () => Record<string, Patient[]>
  getPatientById: (id: string) => Patient | undefined
  updatePatientStatus: (id: string, status: Patient['status']) => void
  updatePatientChecklist: (id: string, checklist: Patient['checklist']) => void
  submitToDoctor: (id: string) => void

  getPhotoRecordByPatientId: (patientId: string) => PhotoRecord | undefined
  addPhoto: (patientId: string, stage: PhotoStage, photo: PhotoItem) => void
  getTodayPhotoRecords: () => PhotoRecord[]
  getTodayTreatingPatientsWithoutPhotos: () => Patient[]

  getHandoverByPatientId: (patientId: string) => HandoverRecord | undefined
  createHandover: (patientId: string) => HandoverRecord
  updateHandover: (record: HandoverRecord) => void
  completeHandover: (patientId: string, record: HandoverRecord) => void

  getPendingHandoverPatients: () => Patient[]
  getTodayDoneRecords: () => HandoverRecord[]
}

export const usePatientStore = create<PatientState>((set, get) => ({
  patients: initial.patients,
  photoRecords: initial.photoRecords,
  handoverRecords: initial.handoverRecords,
  supplyTemplates: mockSupplies,

  getPatientsByRoom: () => {
    const { patients } = get()
    const grouped: Record<string, Patient[]> = {}
    patients.forEach(p => {
      if (!grouped[p.room]) grouped[p.room] = []
      grouped[p.room].push(p)
    })
    Object.keys(grouped).forEach(room => {
      grouped[room].sort((a, b) => a.appointmentTime.localeCompare(b.appointmentTime))
    })
    return grouped
  },

  getPatientById: (id) => {
    return get().patients.find(p => p.id === id)
  },

  updatePatientStatus: (id, status) => {
    set(state => {
      const patients = state.patients.map(p =>
        p.id === id ? { ...p, status } : p
      )
      saveToStorage({ ...state, patients })
      return { patients }
    })
    console.log('[PatientStore] updatePatientStatus', { id, status })
  },

  updatePatientChecklist: (id, checklist) => {
    set(state => {
      const patients = state.patients.map(p =>
        p.id === id ? { ...p, checklist } : p
      )
      saveToStorage({ ...state, patients })
      return { patients }
    })
    console.log('[PatientStore] updatePatientChecklist', { id, checklist })
  },

  submitToDoctor: (id) => {
    const now = new Date()
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
    set(state => {
      const patients = state.patients.map(p =>
        p.id === id ? {
          ...p,
          status: 'treating' as const,
          submittedToDoctorAt: timeStr
        } : p
      )
      saveToStorage({ ...state, patients })
      return { patients }
    })
    console.log('[PatientStore] submitToDoctor', { id, timeStr })
  },

  getPhotoRecordByPatientId: (patientId) => {
    return get().photoRecords.find(r => r.patientId === patientId)
  },

  addPhoto: (patientId, stage, photo) => {
    set(state => {
      const records = [...state.photoRecords]
      let record = records.find(r => r.patientId === patientId)
      if (!record) {
        const patient = state.patients.find(p => p.id === patientId)
        record = {
          id: `ph${Date.now()}`,
          patientId,
          patientName: patient?.name || '',
          room: patient?.room || '',
          date: getTodayStr(),
          prePhotos: [],
          duringPhotos: [],
          postPhotos: []
        }
        records.push(record)
      }
      const key = `${stage}Photos` as 'prePhotos' | 'duringPhotos' | 'postPhotos'
      record[key] = [...record[key], photo]
      const photoRecords = records
      savePhotoStorage(photoRecords)
      return { photoRecords }
    })
    console.log('[PatientStore] addPhoto', { patientId, stage, photoId: photo.id })
  },

  getTodayPhotoRecords: () => {
    const today = getTodayStr()
    return get().photoRecords.filter(r => r.date === today)
  },

  getTodayTreatingPatientsWithoutPhotos: () => {
    const today = getTodayStr()
    const { patients, photoRecords } = get()
    const photoPatientIds = photoRecords
      .filter(r => r.date === today)
      .map(r => r.patientId)
    return patients.filter(p =>
      p.status === 'treating' &&
      !photoPatientIds.includes(p.id)
    )
  },

  getHandoverByPatientId: (patientId) => {
    return get().handoverRecords.find(r => r.patientId === patientId)
  },

  createHandover: (patientId) => {
    const patient = get().patients.find(p => p.id === patientId)
    const supplies = get().supplyTemplates.map(s => ({ ...s, checked: false }))
    const newRecord: HandoverRecord = {
      id: `h${Date.now()}`,
      patientId,
      patientName: patient?.name || '',
      room: patient?.room || '',
      dentist: patient?.dentist || '',
      supplies,
      postOpInstructions: false,
      followUpAppointment: false,
      followUpDate: '',
      notes: '',
      completedAt: '',
      nurse: '当前护士'
    }
    set(state => {
      const handoverRecords = [...state.handoverRecords, newRecord]
      saveToStorage({ ...state, handoverRecords })
      return { handoverRecords }
    })
    console.log('[PatientStore] createHandover', { patientId })
    return newRecord
  },

  updateHandover: (record) => {
    set(state => {
      const handoverRecords = state.handoverRecords.map(r =>
        r.id === record.id ? record : r
      )
      saveToStorage({ ...state, handoverRecords })
      return { handoverRecords }
    })
  },

  completeHandover: (patientId, record) => {
    const now = new Date()
    const iso = now.toISOString()
    const timeStr = `${iso.slice(0, 10)}T${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
    set(state => {
      const handoverRecords = state.handoverRecords.map(r =>
        r.patientId === patientId ? { ...record, completedAt: timeStr } : r
      )
      const patients = state.patients.map(p =>
        p.id === patientId ? { ...p, status: 'done' } : p
      )
      saveToStorage({ ...state, handoverRecords, patients })
      return { handoverRecords, patients }
    })
    console.log('[PatientStore] completeHandover', { patientId, timeStr })
  },

  getPendingHandoverPatients: () => {
    const { patients, handoverRecords } = get()
    const doneIds = handoverRecords.filter(r => r.completedAt).map(r => r.patientId)
    return patients.filter(p =>
      p.status === 'treating' ||
      (p.status === 'done' && !doneIds.includes(p.id))
    )
  },

  getTodayDoneRecords: () => {
    const today = getTodayStr()
    return get().handoverRecords.filter(r => {
      if (!r.completedAt) return false
      const datePart = r.completedAt.split('T')[0] || r.completedAt.slice(0, 10)
      return datePart === today
    })
  }
}))
