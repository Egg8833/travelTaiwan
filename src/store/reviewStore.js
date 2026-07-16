import {defineStore} from 'pinia'
import {ref, computed} from 'vue'
import {
  getReviewsApi,
  addReviewApi,
  updateReviewApi,
  deleteReviewApi,
  getMyReviewedSpotsApi,
} from '@/api/index.js'

export const useReviewStore = defineStore('review', () => {
  const reviews = ref([])
  const reviewedSpots = ref([])
  const myReviewCount = computed(() => reviewedSpots.value.length)

  const fetchReviews = async spotId => {
    try {
      reviews.value = await getReviewsApi(spotId)
    } catch (e) {
      console.error(e)
    }
  }

  const fetchReviewedSpots = async () => {
    try {
      reviewedSpots.value = await getMyReviewedSpotsApi()
    } catch (e) {
      console.error(e)
    }
  }

  const addReview = async (spotId, {rating, content, authorName}) => {
    try {
      const created = await addReviewApi(spotId, {rating, content, authorName})
      reviews.value = [created, ...reviews.value]
      return true
    } catch (e) {
      console.error(e)
      if (e.response?.status === 409) {
        alert('你已經評論過這個景點了')
      } else {
        alert('送出評論失敗，請稍後再試')
      }
      return false
    }
  }

  const updateReview = async (spotId, reviewId, {rating, content}) => {
    try {
      const updated = await updateReviewApi(spotId, reviewId, {rating, content})
      reviews.value = reviews.value.map(r => (r.id === reviewId ? updated : r))
      return true
    } catch (e) {
      console.error(e)
      alert('更新評論失敗，請稍後再試')
      return false
    }
  }

  const deleteReview = async (spotId, reviewId) => {
    try {
      await deleteReviewApi(spotId, reviewId)
      reviews.value = reviews.value.filter(r => r.id !== reviewId)
      return true
    } catch (e) {
      console.error(e)
      alert('刪除評論失敗，請稍後再試')
      return false
    }
  }

  return {
    reviews,
    reviewedSpots,
    myReviewCount,
    fetchReviews,
    fetchReviewedSpots,
    addReview,
    updateReview,
    deleteReview,
  }
})
