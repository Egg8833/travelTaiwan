import {createApp} from './app.js'
import {auth, firestore} from './firebaseAdmin.js'
import {createVerifyFirebaseToken} from './middleware/verifyFirebaseToken.js'
import {createFavoritesRepo} from './repositories/favoritesRepo.js'
import {createReviewsRepo} from './repositories/reviewsRepo.js'

const app = createApp({
  verifyToken: createVerifyFirebaseToken(auth),
  favoritesRepo: createFavoritesRepo(firestore),
  reviewsRepo: createReviewsRepo(firestore),
})

const port = process.env.PORT || 3000
app.listen(port, () => {
  console.log(`travelTaiwan API server on http://localhost:${port}`)
})
