import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '/api',
})

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
