import {defineStore} from 'pinia'
import {ref} from 'vue'
import processViewData from '@/common/processList.js'
import {useRouter} from 'vue-router'
import {searchViewApi, getRandomViewApi} from '@/api/index.js'

export const useHomeViewStore = defineStore('homeView', () => {
  const travelName = ref('')
  const haveSearchTravel = ref(false)
  const filteredData = ref([])
  const randomThreeItems = ref([])

  const router = useRouter()

  const searchTravel = async name => {
    if (travelName.value === '') {
      alert('請輸入景點名稱')
      return
    }
    let data
    try {
      data = await searchViewApi(name)
    } catch (e) {
      console.error(e)
      alert('查詢失敗，請稍後再試')
      return
    }
    if (data.length === 0) {
      alert('查無相關景點資訊')
      travelName.value = ''
      return
    }
    filteredData.value = processViewData(data)
    haveSearchTravel.value = true
    router.push('/viewList')
  }

  const refreshRandomItems = async (count = 3) => {
    try {
      const data = await getRandomViewApi(count)
      randomThreeItems.value = processViewData(data)
    } catch (e) {
      console.error(e)
    }
  }
  refreshRandomItems()

  return {
    travelName,
    searchTravel,
    haveSearchTravel,
    filteredData,
    randomThreeItems,
    refreshRandomItems,
  }
})
