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

const __dirname = dirname(fileURLToPath(import.meta.url))
const load = name => JSON.parse(readFileSync(join(__dirname, '..', 'data', name), 'utf-8'))

const REVIEWS_PER_SPOT = 3
const BATCH_SIZE = 450

const nicknames = [
  '旅人A', '阿先', '小鹿', '晴天旅人', '愛趴趴走的貓', '山海之間', '慢步調', '背包客小陳',
  '路過的雲', '假日玩家', '風之谷', '小島居民', '南方以南', '週末踏青', '一期一會', '遠方來的信',
  '山中傳奇', '海邊放空', '走走停停', '花間小徑', '城市浪人', '樹影斑駁', '晨光旅記', '暮色行者',
  '在地嚮導', '第一次來', '老饕上路', '拍照狂人', '慢活主義', '不趕時間', '順路經過', '假期限定',
  '出走日記', '風景收藏家', '在路上', '自由行玩家', '週間避開人潮', '偶爾迷路', '推薦給朋友', '值得再訪',
]

const categoryPools = {
  nature: [
    '{name}的景色很療癒，空氣清新，很適合放慢腳步散步。',
    '第一次來{name}就被眼前的風景震撼到，很值得專程走一趟。',
    '{name}拍照怎麼拍都好看，光線好的時候特別漂亮。',
    '帶家人來{name}走走，步道不算難走，長輩小孩都能一起。',
    '{name}人不算多，很適合想安靜賞景的人來。',
    '天氣好的時候在{name}待一整個下午都不會膩。',
    '{name}的自然生態保存得不錯，很適合順便認識在地環境。',
    '假日{name}人潮會比較多，建議平日或早點來比較悠閒。',
    '{name}周邊設施算完善，走累了也有地方可以休息。',
    '來{name}記得帶水跟做好防曬，玩起來會更盡興。',
  ],
  culture: [
    '{name}很有歷史氛圍，能感受到當地文化的故事。',
    '逛{name}讓我對這個地方的歷史有更多認識，蠻有收穫的。',
    '{name}建築很有特色，喜歡拍照的人可以來取景。',
    '假日{name}參觀的人不少，建議留多一點時間慢慢逛。',
    '{name}的解說內容算豐富，適合帶著孩子來寓教於樂。',
    '{name}保存得算完整，能感受到歷史的痕跡，很值得一訪。',
    '第一次來{name}覺得比想像中還要有意思，會想再來一次。',
    '{name}氛圍莊嚴又不會有壓迫感，很適合靜下心來走走。',
    '來{name}之前先做點功課，體驗會更豐富。',
    '{name}離市區不算遠，順路安排半天行程剛剛好。',
  ],
  leisure: [
    '{name}很適合全家出遊，設施蠻多元，可以玩上一整天。',
    '{name}的體驗活動很不錯，小朋友玩得很開心。',
    '假日{name}人潮較多，建議提早出發卡位比較從容。',
    '{name}CP值不錯，門票不算貴，玩下來很值得。',
    '{name}腹地蠻大的，要走不少路，建議穿好走的鞋子。',
    '第一次來{name}覺得很新奇，跟朋友一起來玩特別開心。',
    '{name}停車空間還算方便，交通也不會太難抵達。',
    '{name}的體驗蠻特別的，適合安排半天到一天的行程。',
    '來{name}記得先查好開放時間，避免撲空。',
    '{name}很適合情侶約會或家庭出遊，氣氛很輕鬆。',
  ],
  general: [
    '{name}整體來說還不錯，值得順路安排來看看。',
    '第一次來{name}覺得蠻特別的，跟想像中不太一樣。',
    '{name}人潮不算多，可以悠閒地慢慢逛。',
    '來{name}之前建議先查一下交通方式，會比較順利。',
    '{name}適合安排在附近行程的順路景點，不會太耗時間。',
    '{name}整體維護得還算不錯，走起來很舒服。',
    '假日{name}人會稍微多一點，平日來會更悠閒自在。',
    '{name}是這次旅程中蠻驚喜的一站，推薦給喜歡到處走走的人。',
    '{name}周邊機能還算方便，可以順便安排用餐。',
    '來{name}記得帶好隨身物品，現場拍照留念很不錯。',
  ],
}

const classToPool = {
  '自然風景類': 'nature',
  '生態類': 'nature',
  '國家風景區類': 'nature',
  '都會公園類': 'nature',
  '林場類': 'nature',
  '國家公園類': 'nature',
  '森林遊樂區類': 'nature',
  '文化類': 'culture',
  '古蹟類': 'culture',
  '藝術類': 'culture',
  '廟宇類': 'culture',
  '遊憩類': 'leisure',
  '體育健身類': 'leisure',
  '休閒農業類': 'leisure',
  '觀光工廠類': 'leisure',
  '溫泉類': 'leisure',
  '小吃/特產類': 'leisure',
  '其他': 'general',
}

function poolFor(class1) {
  return categoryPools[classToPool[class1]] || categoryPools.general
}

function sampleWithoutReplacement(arr, n) {
  const copy = [...arr]
  const picked = []
  for (let i = 0; i < n && copy.length > 0; i++) {
    const idx = Math.floor(Math.random() * copy.length)
    picked.push(copy.splice(idx, 1)[0])
  }
  return picked
}

const ratingPool = [5, 5, 5, 4, 4, 4, 4, 3, 3, 2]
const randomRating = () => ratingPool[Math.floor(Math.random() * ratingPool.length)]

function randomPastDate() {
  const daysAgo = Math.floor(Math.random() * 540) // up to ~18 months back
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString()
}

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
