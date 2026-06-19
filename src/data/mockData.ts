import type { Patient, PhotoRecord, HandoverRecord, SupplyItem } from '@/types'

export const mockPatients: Patient[] = [
  {
    id: 'p001',
    name: '张伟',
    gender: '男',
    age: 45,
    room: '1号诊室',
    appointmentTime: '09:00',
    status: 'pending',
    allergy: ['青霉素', '头孢类'],
    chronicDiseases: ['高血压'],
    anticoagulant: false,
    chiefComplaint: '左上后牙疼痛3天',
    dentist: '王医生',
    phone: '138****1234'
  },
  {
    id: 'p002',
    name: '李娜',
    gender: '女',
    age: 32,
    room: '1号诊室',
    appointmentTime: '10:30',
    status: 'treating',
    allergy: [],
    chronicDiseases: [],
    anticoagulant: false,
    chiefComplaint: '洗牙检查',
    dentist: '王医生',
    phone: '139****5678'
  },
  {
    id: 'p003',
    name: '王芳',
    gender: '女',
    age: 58,
    room: '1号诊室',
    appointmentTime: '14:00',
    status: 'pending',
    allergy: ['磺胺'],
    chronicDiseases: ['糖尿病', '心脏病'],
    anticoagulant: true,
    chiefComplaint: '右下后牙拔除',
    dentist: '王医生',
    phone: '137****9012'
  },
  {
    id: 'p004',
    name: '刘强',
    gender: '男',
    age: 28,
    room: '2号诊室',
    appointmentTime: '09:30',
    status: 'done',
    allergy: [],
    chronicDiseases: [],
    anticoagulant: false,
    chiefComplaint: '龋齿充填',
    dentist: '李医生',
    phone: '136****3456'
  },
  {
    id: 'p005',
    name: '陈静',
    gender: '女',
    age: 40,
    room: '2号诊室',
    appointmentTime: '11:00',
    status: 'treating',
    allergy: ['利多卡因'],
    chronicDiseases: ['甲状腺疾病'],
    anticoagulant: false,
    chiefComplaint: '根管治疗复诊',
    dentist: '李医生',
    phone: '135****7890'
  },
  {
    id: 'p006',
    name: '赵明',
    gender: '男',
    age: 52,
    room: '2号诊室',
    appointmentTime: '15:00',
    status: 'pending',
    allergy: [],
    chronicDiseases: ['高血压', '高血脂'],
    anticoagulant: true,
    chiefComplaint: '活动义齿修复',
    dentist: '李医生',
    phone: '134****2345'
  },
  {
    id: 'p007',
    name: '孙丽',
    gender: '女',
    age: 35,
    room: '3号诊室',
    appointmentTime: '10:00',
    status: 'pending',
    allergy: [],
    chronicDiseases: [],
    anticoagulant: false,
    chiefComplaint: '牙齿美白',
    dentist: '张医生',
    phone: '133****6789'
  },
  {
    id: 'p008',
    name: '周杰',
    gender: '男',
    age: 25,
    room: '3号诊室',
    appointmentTime: '14:30',
    status: 'pending',
    allergy: [],
    chronicDiseases: [],
    anticoagulant: false,
    chiefComplaint: '正畸复查',
    dentist: '张医生',
    phone: '132****0123'
  }
]

export const mockSupplies: SupplyItem[] = [
  { id: 's001', name: '一次性口腔器械盒', checked: false },
  { id: 's002', name: '高速手机', checked: false },
  { id: 's003', name: '低速手机', checked: false },
  { id: 's004', name: '树脂充填材料', checked: false },
  { id: 's005', name: '玻璃离子', checked: false },
  { id: 's006', name: '根管锉套装', checked: false },
  { id: 's007', name: '拔牙器械套装', checked: false },
  { id: 's008', name: '洁牙机工作尖', checked: false },
  { id: 's009', name: '光固化灯', checked: false },
  { id: 's010', name: '麻药', checked: false }
]

const photoBase = 'https://picsum.photos/id/'

export const mockPhotoRecords: PhotoRecord[] = [
  {
    id: 'ph001',
    patientId: 'p004',
    patientName: '刘强',
    room: '2号诊室',
    date: '2024-06-20',
    prePhotos: [
      { id: 'ph001-1', angle: 'front', url: `${photoBase}201/400/300`, uploadTime: '09:35' },
      { id: 'ph001-2', angle: 'side', url: `${photoBase}202/400/300`, uploadTime: '09:36' },
      { id: 'ph001-3', angle: 'occlusal', url: `${photoBase}203/400/300`, uploadTime: '09:37' }
    ],
    duringPhotos: [
      { id: 'ph001-4', angle: 'local', url: `${photoBase}204/400/300`, uploadTime: '09:50' }
    ],
    postPhotos: [
      { id: 'ph001-5', angle: 'front', url: `${photoBase}205/400/300`, uploadTime: '10:15' },
      { id: 'ph001-6', angle: 'occlusal', url: `${photoBase}206/400/300`, uploadTime: '10:16' }
    ]
  },
  {
    id: 'ph002',
    patientId: 'p005',
    patientName: '陈静',
    room: '2号诊室',
    date: '2024-06-20',
    prePhotos: [
      { id: 'ph002-1', angle: 'front', url: `${photoBase}101/400/300`, uploadTime: '11:05' }
    ],
    duringPhotos: [
      { id: 'ph002-2', angle: 'local', url: `${photoBase}102/400/300`, uploadTime: '11:30' },
      { id: 'ph002-3', angle: 'local', url: `${photoBase}103/400/300`, uploadTime: '11:35' }
    ],
    postPhotos: []
  }
]

export const mockHandoverRecords: HandoverRecord[] = [
  {
    id: 'h001',
    patientId: 'p004',
    patientName: '刘强',
    room: '2号诊室',
    dentist: '李医生',
    supplies: [
      { id: 's001', name: '一次性口腔器械盒', checked: true },
      { id: 's002', name: '高速手机', checked: true },
      { id: 's004', name: '树脂充填材料', checked: true },
      { id: 's009', name: '光固化灯', checked: true }
    ],
    postOpInstructions: true,
    followUpAppointment: true,
    followUpDate: `${new Date().toISOString().split('T')[0].slice(0, 8)}${(parseInt(new Date().toISOString().split('T')[0].slice(8, 10)) + 7).toString().padStart(2, '0')} 09:30`,
    notes: '24小时内勿用患侧咀嚼',
    completedAt: `${new Date().toISOString().split('T')[0]}T10:30`,
    nurse: '张护士'
  }
]
