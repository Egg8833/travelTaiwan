// Bulk-generates 3 template-based seed reviews for every scenic spot in
// server/data/allViewPoint.json that ISN'T already hand-seeded in
// seedReviewsData.js. Reviews are assembled from category-specific
// sentence templates + a nickname pool, so content varies but is not
// hand-written per spot (5000+ spots makes hand-writing infeasible).
//
// Usage:
//   node --env-file=.env scripts/generateBulkReviews.js --dry-run   # preview only, no Firestore writes
//   node --env-file=.env scripts/generateBulkReviews.js             # actually writes to Firestore

import {readFileSync} from 'fs'
import {fileURLToPath} from 'url'
import {dirname, join} from 'path'
import {firestore} from '../firebaseAdmin.js'
import {seedReviews} from './seedReviewsData.js'
import {poolFor, sampleWithoutReplacement, randomRating, randomPastDate, nicknames} from './reviewTemplates.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const load = name => JSON.parse(readFileSync(join(__dirname, '..', 'data', name), 'utf-8'))

const REVIEWS_PER_SPOT = 3
const BATCH_SIZE = 450

function buildReviewsForSpot(spot) {
  const pool = poolFor(spot.Class1)
  const templates = sampleWithoutReplacement(pool, REVIEWS_PER_SPOT)
  const authors = sampleWithoutReplacement(nicknames, REVIEWS_PER_SPOT)
  return templates.map((template, i) => ({
    uid: null,
    authorName: authors[i],
    rating: randomRating(),
    content: template.replaceAll('{name}', spot.ScenicSpotName),
    isSeed: true,
    createdAt: randomPastDate(),
    updatedAt: null,
  }))
}

async function run({dryRun}) {
  const allViewPoint = load('allViewPoint.json')
  const alreadySeeded = new Set(seedReviews.map(s => s.spotId))
  const targets = allViewPoint.filter(s => !alreadySeeded.has(s.ScenicSpotID))

  console.log(`Total spots: ${allViewPoint.length}`)
  console.log(`Already hand-seeded (skipped): ${alreadySeeded.size}`)
  console.log(`Spots to generate reviews for: ${targets.length}`)
  console.log(`Reviews per spot: ${REVIEWS_PER_SPOT} (total ~${targets.length * REVIEWS_PER_SPOT} writes)`)

  if (dryRun) {
    console.log('\n--- DRY RUN: sample output (no Firestore writes) ---')
    const sample = targets.slice(0, 3)
    for (const spot of sample) {
      console.log(`\n${spot.ScenicSpotID} ${spot.ScenicSpotName} (Class1: ${spot.Class1 || '未分類'})`)
      buildReviewsForSpot(spot).forEach(r => {
        console.log(`  [${r.rating}★ ${r.authorName}] ${r.content}`)
      })
    }
    console.log('\nDry run complete. Re-run without --dry-run to write to Firestore.')
    return
  }

  let batch = firestore.batch()
  let opsInBatch = 0
  let totalWritten = 0
  let spotsProcessed = 0

  for (const spot of targets) {
    const collectionRef = firestore.collection('reviews').doc(spot.ScenicSpotID).collection('entries')
    for (const review of buildReviewsForSpot(spot)) {
      const docRef = collectionRef.doc()
      batch.set(docRef, review)
      opsInBatch++
      totalWritten++
      if (opsInBatch >= BATCH_SIZE) {
        await batch.commit()
        batch = firestore.batch()
        opsInBatch = 0
      }
    }
    spotsProcessed++
    if (spotsProcessed % 500 === 0) {
      console.log(`...${spotsProcessed}/${targets.length} spots processed, ${totalWritten} reviews written so far`)
    }
  }
  if (opsInBatch > 0) {
    await batch.commit()
  }

  console.log(`\nDone. ${spotsProcessed} spots processed, ${totalWritten} reviews written.`)
}

const dryRun = process.argv.includes('--dry-run')
run({dryRun}).catch(e => {
  console.error(e)
  process.exit(1)
})
