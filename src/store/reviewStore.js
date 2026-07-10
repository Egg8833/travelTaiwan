import {defineStore} from 'pinia'
import {ref} from 'vue'
import {
  getReviewsApi,
  addReviewApi,
  updateReviewApi,
  deleteReviewApi,
} from '@/api/index.js'

export const useReviewStore = defineStore('review', () => {
  const reviews = ref([])

  const fetchReviews = async spotId => {
    try {
      reviews.value = await getReviewsApi(spotId)
    } catch (e) {
      console.error(e)
    }
  }

  const addReview = async (spotId, {rating, content}) => {
    try {
      const created = await addReviewApi(spotId, {rating, content})
      reviews.value = [created, ...reviews.value]
      return true
    } catch (e) {
      console.error(e)
      alert('送出評論失敗，請稍後再試')
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

  return {reviews, fetchReviews, addReview, updateReview, deleteReview}
})
