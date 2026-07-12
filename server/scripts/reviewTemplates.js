// Shared template pools for auto-generated seed reviews. Used by both
// generateBulkReviews.js (initial seeding) and topUpReviews.js (adding
// more reviews to reach a natural-looking per-spot count).

export const nicknames = [
  '旅人A', '阿先', '小鹿', '晴天旅人', '愛趴趴走的貓', '山海之間', '慢步調', '背包客小陳',
  '路過的雲', '假日玩家', '風之谷', '小島居民', '南方以南', '週末踏青', '一期一會', '遠方來的信',
  '山中傳奇', '海邊放空', '走走停停', '花間小徑', '城市浪人', '樹影斑駁', '晨光旅記', '暮色行者',
  '在地嚮導', '第一次來', '老饕上路', '拍照狂人', '慢活主義', '不趕時間', '順路經過', '假期限定',
  '出走日記', '風景收藏家', '在路上', '自由行玩家', '週間避開人潮', '偶爾迷路', '推薦給朋友', '值得再訪',
  '慢遊者', '手作旅記', '沿路拍照', '巷弄探險家', '週末補給站', '一人旅行中', '從外地來的', '在地二訪',
]

export const categoryPools = {
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
    '{name}早上比較涼爽，建議避開中午時段前往。',
    '{name}的視野很遼闊，很適合單純放空發呆。',
    '很喜歡{name}的氛圍，跟朋友來散步聊天很舒服。',
    '{name}路線標示算清楚，不太容易迷路。',
    '傍晚的{name}特別漂亮，光線柔和很好拍照。',
    '{name}是這趟旅程的驚喜景點，比預期中更好玩。',
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
    '{name}的細節很值得慢慢看，走馬看花會很可惜。',
    '喜歡{name}保留下來的老味道，很有在地故事感。',
    '{name}適合安排在雨天的備案行程，室內逛起來很舒服。',
    '帶長輩來{name}，他們對這段歷史特別有共鳴。',
    '{name}周邊也有不少老店，可以順道走走吃點東西。',
    '{name}整體維護用心，看得出在地社區的努力。',
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
    '{name}服務人員態度不錯，有問題都能耐心解答。',
    '帶小朋友來{name}玩得很盡興，回程都捨不得走。',
    '{name}的餐飲選擇還算多，不用擔心肚子餓的問題。',
    '{name}適合安排一日遊，玩下來時間剛剛好。',
    '{name}平日人潮少很多，體驗品質明顯比假日好。',
    '朋友推薦來{name}，玩過之後覺得真的不會失望。',
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
    '{name}比想像中好逛，值得多留一點時間。',
    '{name}適合跟家人朋友一起來，輕鬆不趕行程。',
    '路過{name}順道停留，意外覺得蠻值得的。',
    '{name}的整體氛圍很輕鬆，適合當作行程中的休息站。',
    '{name}離主要景點不遠，可以安排在同一天順遊。',
    '{name}第一次來會有點不知道重點在哪，建議先查一下再去。',
  ],
}

export const classToPool = {
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

export function poolFor(class1) {
  return categoryPools[classToPool[class1]] || categoryPools.general
}

export function sampleWithoutReplacement(arr, n) {
  const copy = [...arr]
  const picked = []
  for (let i = 0; i < n && copy.length > 0; i++) {
    const idx = Math.floor(Math.random() * copy.length)
    picked.push(copy.splice(idx, 1)[0])
  }
  return picked
}

const ratingPool = [5, 5, 5, 4, 4, 4, 4, 3, 3, 2]
export const randomRating = () => ratingPool[Math.floor(Math.random() * ratingPool.length)]

export function randomPastDate() {
  const daysAgo = Math.floor(Math.random() * 540) // up to ~18 months back
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString()
}
