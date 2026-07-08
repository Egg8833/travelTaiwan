import app from './app.js'

const port = process.env.PORT || 3000
app.listen(port, () => {
  console.log(`travelTaiwan API server on http://localhost:${port}`)
})
