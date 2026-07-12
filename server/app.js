import express from 'express'
import cors from 'cors'
import swaggerUi from 'swagger-ui-express'
import {readFileSync} from 'fs'
import {fileURLToPath} from 'url'
import {dirname, join} from 'path'
import openapiSpec from './openapi.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const load = name =>
  JSON.parse(readFileSync(join(__dirname, 'data', name), 'utf-8'))

const allViewPoint = load('allViewPoint.json')
const homeViewPoint = load('homeViewPoint.json')
const cityList = load('cityList.json')

const cityEnToZh = Object.fromEntries(cityList.map(c => [c.City, c.CityName]))

export function createApp({verifyToken, favoritesRepo, reviewsRepo, accountRepo}) {
  const app = express()
  app.use(cors())
  app.use(express.json())

  app.get('/api/scenic-spots', (req, res) => {
    const {city, top = 30} = req.query
    if (!city) return res.status(400).json({message: 'city is required'})
    const zhName = cityEnToZh[city]
    if (!zhName) return res.status(400).json({message: `unknown city: ${city}`})
    res.json(allViewPoint.filter(s => s.City === zhName).slice(0, Number(top)))
  })

  app.get('/api/scenic-spots/search', (req, res) => {
    const {keyword} = req.query
    if (!keyword) return res.status(400).json({message: 'keyword is required'})
    res.json(allViewPoint.filter(s => s.ScenicSpotName.includes(keyword)))
  })

  app.get('/api/scenic-spots/random', (req, res) => {
    const count = Number(req.query.count) || 3
    const pool = allViewPoint.filter(s => Object.keys(s.Picture).length > 0)
    const picked = []
    for (let i = 0; i < count && pool.length > 0; i++) {
      const idx = Math.floor(Math.random() * pool.length)
      picked.push(pool.splice(idx, 1)[0])
    }
    res.json(picked)
  })

  app.get('/api/scenic-spots/:id', (req, res) => {
    const spot = allViewPoint.find(s => s.ScenicSpotID === req.params.id)
    if (!spot) return res.status(404).json({message: 'scenic spot not found'})
    res.json(spot)
  })

  app.get('/api/home-views', (req, res) => res.json(homeViewPoint))

  app.get('/api/cities', (req, res) => res.json(cityList))

  app.get('/api/auth/me', verifyToken, (req, res) => {
    res.json({
      uid: req.uid,
      email: req.firebaseUser.email,
      displayName: req.firebaseUser.name || null,
    })
  })

  app.get('/api/favorites', verifyToken, async (req, res) => {
    res.json(await favoritesRepo.list(req.uid))
  })

  app.post('/api/favorites/:spotId', verifyToken, async (req, res) => {
    const {spotName, pictureUrl} = req.body
    if (!spotName) return res.status(400).json({message: 'spotName is required'})
    const data = await favoritesRepo.add(req.uid, req.params.spotId, {spotName, pictureUrl})
    res.status(201).json(data)
  })

  app.delete('/api/favorites/:spotId', verifyToken, async (req, res) => {
    await favoritesRepo.remove(req.uid, req.params.spotId)
    res.status(204).end()
  })

  app.get('/api/reviews/:spotId', async (req, res) => {
    res.json(await reviewsRepo.list(req.params.spotId))
  })

  app.post('/api/reviews/:spotId', verifyToken, async (req, res) => {
    const {rating, content, authorName} = req.body
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({message: 'rating must be between 1 and 5'})
    }
    if (!content) return res.status(400).json({message: 'content is required'})
    const review = await reviewsRepo.add(req.params.spotId, {
      uid: req.uid,
      authorName: authorName || req.firebaseUser.name || '匿名旅人',
      rating,
      content,
    })
    res.status(201).json(review)
  })

  app.patch('/api/reviews/:spotId/:reviewId', verifyToken, async (req, res) => {
    const {rating, content} = req.body
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({message: 'rating must be between 1 and 5'})
    }
    if (!content) return res.status(400).json({message: 'content is required'})
    const result = await reviewsRepo.update(req.params.spotId, req.params.reviewId, req.uid, {rating, content})
    if (result.error === 'not_found') return res.status(404).json({message: 'review not found'})
    if (result.error === 'forbidden') return res.status(403).json({message: 'not your review'})
    res.json(result)
  })

  app.delete('/api/reviews/:spotId/:reviewId', verifyToken, async (req, res) => {
    const result = await reviewsRepo.remove(req.params.spotId, req.params.reviewId, req.uid)
    if (result.error === 'not_found') return res.status(404).json({message: 'review not found'})
    if (result.error === 'forbidden') return res.status(403).json({message: 'not your review'})
    res.status(204).end()
  })

  app.delete('/api/account', verifyToken, async (req, res) => {
    await accountRepo.deleteAccount(req.uid)
    res.status(204).end()
  })

  app.get('/api/openapi.json', (req, res) => res.json(openapiSpec))

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapiSpec))

  return app
}
