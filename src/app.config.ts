export default defineAppConfig({
  pages: [
    'pages/patients/index',
    'pages/photos/index',
    'pages/handover/index',
    'pages/patient-detail/index',
    'pages/photo-capture/index',
    'pages/handover-detail/index',
    'pages/archive-preview/index'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#00B4A0',
    navigationBarTitleText: '口腔护理助手',
    navigationBarTextStyle: 'white'
  },
  tabBar: {
    color: '#86909C',
    selectedColor: '#00B4A0',
    backgroundColor: '#FFFFFF',
    borderStyle: 'white',
    list: [
      {
        pagePath: 'pages/patients/index',
        text: '今日患者'
      },
      {
        pagePath: 'pages/photos/index',
        text: '拍照归档'
      },
      {
        pagePath: 'pages/handover/index',
        text: '交接确认'
      }
    ]
  }
})
