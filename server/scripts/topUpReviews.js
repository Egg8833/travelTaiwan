// Tops up every scenic spot's review count to a natural-looking random
// target (weighted, mostly 5-7, occasionally 4 or 8), on top of whatever
// reviews already exist (hand-written or bulk-generated). Never removes
// existing reviews; only adds more when a spot is below its target.
//
// Reads each spot's existing review content/authors first so the new
// reviews added don't repeat text or authors already present on that spot.
//
// Usage:
//   node --env-file=.env scripts/topUpReviews.js --dry-run   # preview only, no Firestore writes
//   node --env-file=.env scripts/topUpReviews.js             # actually writes to Firestore

import {readFileSync} from 'fs'
import {fileURLToPath} from 'url'
import {dirname, join} from 'path'
import {firestore} from '../firebaseAdmin.js'
import {poolFor, sampleWithoutReplacement, randomRating, randomPastDate, nicknames} from './reviewTemplates.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const load = name => JSON.parse(readFileSync(join(__dirname, '..', 'data', name), 'utf-8'))

const BATCH_SIZE = 450
const READ_CONCURRENCY = 25

// Weighted 4-8, peak in the middle (mostly 5-7, occasionally 4 or 8).
const targetWeights = [
  {value: 4, weight: 2},
  {value: 5, weight: 4},
  {value: 6, weight: 5},
  {value: 7, weight: 4},
  {value: 8, weight: 2},
]
const totalWeight = targetWeights.reduce((sum, w) => sum + w.weight, 0)
function randomTarget() {
  let r = Math.random() * totalWeight
  for (const {value, weight} of targetWeights) {
    if (r < weight) return value
    r -= weight
  }
  return targetWeights[targetWeights.length - 1].value
}

async function mapWithConcurrency(items, limit, fn) {
  const results = new Array(items.length)
  let next = 0
  async function worker() {
    while (next < items.length) {
      const i = next++
      results[i] = await fn(items[i], i)
    }
  }
  await Promise.all(Array.from({length: Math.min(limit, items.length)}, worker))
  return results
}

async function planTopUp(spot) {
  const snap = await firestore.collection('reviews').doc(spot.ScenicSpotID).collection('entries').get()
  const existingContents = new Set(snap.docs.map(d => d.data().content))
  const existingAuthors = new Set(snap.docs.map(d => d.data().authorName))
  const currentCount = snap.size
  const target = randomTarget()
  const additionalNeeded = Math.max(0, target - currentCount)
  return {spot, currentCount, target, additionalNeeded, existingContents, existingAuthors}
}

function buildTopUpReviews({spot, additionalNeeded, existingContents, existingAuthors}) {
  const pool = poolFor(spot.Class1)
  const renderedPool = pool
    .map(t => t.replaceAll('{name}', spot.ScenicSpotName))
    .filter(text => !existingContents.has(text))
  const contents = sampleWithoutReplacement(renderedPool, additionalNeeded)

  const candidateAuthors = nicknames.filter(n => !existingAuthors.has(n))
  const authorPool = candidateAuthors.length >= contents.length ? candidateAuthors : nicknames
  const authors = sampleWithoutReplacement(authorPool, contents.length)

  return contents.map((content, i) => ({
    uid: null,
    authorName: authors[i],
    rating: randomRating(),
    content,
    isSeed: true,
    createdAt: randomPastDate(),
    updatedAt: null,
  }))
}

async function run({dryRun}) {
  const allViewPoint = load('allViewPoint.json')
  console.log(`Total spots: ${allViewPoint.length}`)
  console.log('Reading existing review counts (this takes a while, one read per spot)...')

  const plans = await mapWithConcurrency(allViewPoint, READ_CONCURRENCY, planTopUp)
  const needsTopUp = plans.filter(p => p.additionalNeeded > 0)
  const totalAdditional = needsTopUp.reduce((sum, p) => sum + p.additionalNeeded, 0)

  console.log(`Spots already at/above their random target: ${plans.length - needsTopUp.length}`)
  console.log(`Spots needing top-up: ${needsTopUp.length}`)
  console.log(`Total additional reviews to write: ${totalAdditional}`)

  if (dryRun) {
    console.log('\n--- DRY RUN: sample output (no Firestore writes) ---')
    for (const plan of needsTopUp.slice(0, 3)) {
      console.log(`\n${plan.spot.ScenicSpotID} ${plan.spot.ScenicSpotName} (current: ${plan.currentCount}, target: ${plan.target}, +${plan.additionalNeeded})`)
      buildTopUpReviews(plan).forEach(r => {
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

  for (const plan of needsTopUp) {
    const collectionRef = firestore.collection('reviews').doc(plan.spot.ScenicSpotID).collection('entries')
    for (const review of buildTopUpReviews(plan)) {
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
      console.log(`...${spotsProcessed}/${needsTopUp.length} spots topped up, ${totalWritten} reviews written so far`)
    }
  }
  if (opsInBatch > 0) {
    await batch.commit()
  }

  console.log(`\nDone. ${spotsProcessed} spots topped up, ${totalWritten} reviews written.`)
}

const dryRun = process.argv.includes('--dry-run')
run({dryRun}).catch(e => {
  console.error(e)
  process.exit(1)
})
