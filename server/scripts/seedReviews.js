import {firestore} from '../firebaseAdmin.js'
import {seedReviews} from './seedReviewsData.js'

const run = async () => {
  for (const {spotId, spotName, reviews} of seedReviews) {
    const collectionRef = firestore.collection('reviews').doc(spotId).collection('entries')
    for (const review of reviews) {
      await collectionRef.add({
        uid: null,
        authorName: review.authorName,
        rating: review.rating,
        content: review.content,
        isSeed: true,
        createdAt: new Date().toISOString(),
        updatedAt: null,
      })
    }
    console.log(`Seeded ${reviews.length} reviews for ${spotName} (${spotId})`)
  }
  console.log('Done.')
}

run().catch(e => {
  console.error(e)
  process.exit(1)
})
