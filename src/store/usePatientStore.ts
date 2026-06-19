import { create } from 'zustand'
import type { Patient, PhotoRecord, HandoverRecord, PhotoItem, PhotoStage, SupplyItem } from '@/types'
import { mockPatients, mockPhotoRecords, mockHandoverRecords, mockSupplies } from '@/data/mockData'

interface PatientState {
  patients: Patient[]
  photoRecords: PhotoRecord[]
  handoverRecords: HandoverRecord[]
  supplyTemplates: SupplyItem[]

  getPatientsByRoom: () => Record<string, Patient[]>
  getPatientById: (id: string) => Patient | undefined
  updatePatientStatus: (id: string, status: Patient['status']) => void

  getPhotoRecordByPatientId: (patientId: string) => PhotoRecord | undefined
  addPhoto: (patientId: string, stage: PhotoStage, photo: PhotoItem) => void

  getHandoverByPatientId: (patientId: string) => HandoverRecord | undefined
  createHandover: (patientId: string) => HandoverRecord
  updateHandover: (record: HandoverRecord) => void
  completeHandover: (patientId: string) => void

  getPendingHandoverPatients: () => Patient[]
}

export const usePatientStore = create<PatientState>((set, get) => ({
  patients: mockPatients,
  photoRecords: mockPhotoRecords,
  handoverRecords: mockHandoverRecords,
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
    set(state => ({
      patients: state.patients.map(p =>
        p.id === id ? { ...p, status } : p
      )
    }))
    console.log('[PatientStore] updatePatientStatus', { id, status })
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
          date: new Date().toISOString().split('T')[0],
          prePhotos: [],
          duringPhotos: [],
          postPhotos: []
        }
        records.push(record)
      }
      const key = `${stage}Photos` as 'prePhotos' | 'duringPhotos' | 'postPhotos'
      record[key] = [...record[key], photo]
      return { photoRecords: records }
    })
    console.log('[PatientStore] addPhoto', { patientId, stage, photoId: photo.id })
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
      notes: '',
      completedAt: '',
      nurse: '当前护士'
    }
    set(state => ({
      handoverRecords: [...state.handoverRecords, newRecord]
    }))
    console.log('[PatientStore] createHandover', { patientId })
    return newRecord
  },

  updateHandover: (record) => {
    set(state => ({
      handoverRecords: state.handoverRecords.map(r =>
        r.id === record.id ? record : r
      )
    }))
  },

  completeHandover: (patientId) => {
    const now = new Date()
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
    set(state => ({
      handoverRecords: state.handoverRecords.map(r =>
        r.patientId === patientId ? { ...r, completedAt: timeStr } : r
      ),
      patients: state.patients.map(p =>
        p.id === patientId ? { ...p, status: 'done' } : p
      )
    }))
    console.log('[PatientStore] completeHandover', { patientId, timeStr })
  },

  getPendingHandoverPatients: () => {
    const { patients, handoverRecords } = get()
    const doneIds = handoverRecords.filter(r => r.completedAt).map(r => r.patientId)
    return patients.filter(p => p.status === 'treating' || (p.status === 'done' && !doneIds.includes(p.id)))
  }
}))
