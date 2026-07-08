import {ref} from 'vue'
import {defineStore} from 'pinia'
import {getViewApi} from '@/api/index.js'
import processViewData from '@/common/processList.js'

export const useViewListStore = defineStore('viewList', () => {
  const viewData = ref([])
  const cityName = ref('Taipei')
  const cityNameApi = ref('')

  function setCityName(name) {
    cityName.value = name
  }

  async function getViewsStoreData() {
    if (viewData.value.length > 0 && cityName.value === cityNameApi.value) {
      return
    }
    const list = await getViewApi(cityName.value)
    viewData.value = processViewData(list)
    cityNameApi.value = cityName.value
  }

  return {getViewsStoreData, viewData, setCityName}
})
