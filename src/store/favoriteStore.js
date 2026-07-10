import {defineStore} from 'pinia'
import {ref} from 'vue'
import {getFavoritesApi, addFavoriteApi, removeFavoriteApi} from '@/api/index.js'

export const useFavoriteStore = defineStore('favorite', () => {
  const favoriteIds = ref(new Set())
  const favoriteList = ref([])

  const fetchFavorites = async () => {
    try {
      const data = await getFavoritesApi()
      favoriteList.value = data
      favoriteIds.value = new Set(data.map(f => f.spotId))
    } catch (e) {
      console.error(e)
    }
  }

  const toggleFavorite = async spot => {
    const isFavorited = favoriteIds.value.has(spot.id)

    if (isFavorited) {
      favoriteIds.value.delete(spot.id)
      favoriteIds.value = new Set(favoriteIds.value)
      try {
        await removeFavoriteApi(spot.id)
        favoriteList.value = favoriteList.value.filter(f => f.spotId !== spot.id)
      } catch (e) {
        console.error(e)
        favoriteIds.value.add(spot.id)
        favoriteIds.value = new Set(favoriteIds.value)
        alert('取消收藏失敗，請稍後再試')
      }
      return
    }

    favoriteIds.value.add(spot.id)
    favoriteIds.value = new Set(favoriteIds.value)
    try {
      const photoSrc = Array.isArray(spot.photoSrc) ? spot.photoSrc[0] : spot.photoSrc
      const saved = await addFavoriteApi(spot.id, {spotName: spot.title, pictureUrl: photoSrc})
      favoriteList.value = [saved, ...favoriteList.value]
    } catch (e) {
      console.error(e)
      favoriteIds.value.delete(spot.id)
      favoriteIds.value = new Set(favoriteIds.value)
      alert('收藏失敗，請稍後再試')
    }
  }

  return {favoriteIds, favoriteList, fetchFavorites, toggleFavorite}
})
