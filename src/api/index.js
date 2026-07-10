import axios from 'axios'
import {useAuthStore} from '@/store/authStore.js'
import router from '@/router/index.js'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '/api',
})

api.interceptors.request.use(async config => {
  const authStore = useAuthStore()
  if (authStore.user) {
    const token = await authStore.user.getIdToken()
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      router.push('/login')
    }
    return Promise.reject(error)
  },
)

export const getViewApi = (city, top = 30) =>
  api.get('/scenic-spots', {params: {city, top}}).then(res => res.data)

export const searchViewApi = keyword =>
  api.get('/scenic-spots/search', {params: {keyword}}).then(res => res.data)

export const getRandomViewApi = (count = 3) =>
  api.get('/scenic-spots/random', {params: {count}}).then(res => res.data)

export const getViewByIdApi = id =>
  api.get(`/scenic-spots/${id}`).then(res => res.data)

export const getHomeViewsApi = () =>
  api.get('/home-views').then(res => res.data)

export const getFavoritesApi = () =>
  api.get('/favorites').then(res => res.data)

export const addFavoriteApi = (spotId, {spotName, pictureUrl}) =>
  api.post(`/favorites/${spotId}`, {spotName, pictureUrl}).then(res => res.data)

export const removeFavoriteApi = spotId =>
  api.delete(`/favorites/${spotId}`).then(res => res.data)

export const getReviewsApi = spotId =>
  api.get(`/reviews/${spotId}`).then(res => res.data)

export const addReviewApi = (spotId, {rating, content}) =>
  api.post(`/reviews/${spotId}`, {rating, content}).then(res => res.data)

export const updateReviewApi = (spotId, reviewId, {rating, content}) =>
  api.patch(`/reviews/${spotId}/${reviewId}`, {rating, content}).then(res => res.data)

export const deleteReviewApi = (spotId, reviewId) =>
  api.delete(`/reviews/${spotId}/${reviewId}`).then(res => res.data)
