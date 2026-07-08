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

const app = express()
app.use(cors())

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

app.get('/api/openapi.json', (req, res) => res.json(openapiSpec))

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapiSpec))

export default app
