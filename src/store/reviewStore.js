import {defineStore} from 'pinia'
import {ref} from 'vue'
import {
  getReviewsApi,
  addReviewApi,
  updateReviewApi,
  deleteReviewApi,
  getMyReviewCountApi,
} from '@/api/index.js'

export const useReviewStore = defineStore('review', () => {
  const reviews = ref([])
  const myReviewCount = ref(0)

  const fetchReviews = async spotId => {
    try {
      reviews.value = await getReviewsApi(spotId)
    } catch (e) {
      console.error(e)
    }
  }

  const fetchMyReviewCount = async () => {
    try {
      myReviewCount.value = await getMyReviewCountApi()
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

  return {reviews, myReviewCount, fetchReviews, fetchMyReviewCount, addReview, updateReview, deleteReview}
})
