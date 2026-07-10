// One-off seed data for sample reviews on hot spots (see server/scripts/seedReviews.js for the runner).
// spotId/spotName values come from server/data/homeViewPoint.json (id/title) cross-checked against
// server/data/allViewPoint.json (ScenicSpotID/ScenicSpotName) to guarantee the API can resolve them.
// All review content below is original writing, not copied from any real review platform.

const nicknames = ['旅人A', '阿先', '小鹿', '晴天旅人', '愛趴趴走的貓', '山海之間', '慢步調', '背包客小陳']

const pick = i => nicknames[i % nicknames.length]

export const seedReviews = [
  {
    spotId: 'VCA_379000000A_000275',
    spotName: '淡水老街',
    reviews: [
      {authorName: pick(0), rating: 5, content: '傍晚沿著河邊散步再吃阿給，整個行程很療癒，推薦帶長輩一起來。'},
      {authorName: pick(1), rating: 3, content: '假日真的太多人了，走路都要側身，想悠閒逛的話建議平日來。'},
      {authorName: pick(2), rating: 4, content: '小吃選擇很多，鐵蛋跟魚酥都不錯，只是價格比想像中高一點。'},
      {authorName: pick(3), rating: 5, content: '搭捷運到淡水站出來就到了，交通超方便，日落景色也很值得等。'},
    ],
  },
  {
    spotId: 'VCA_379000000A_000117',
    spotName: '平溪天燈',
    reviews: [
      {authorName: pick(4), rating: 5, content: '第一次放天燈，寫完願望升空的瞬間真的滿感動的，記得會有點煙味。'},
      {authorName: pick(5), rating: 4, content: '假日鐵路周邊會封路要多走一段，建議提早查好接駁資訊。'},
      {authorName: pick(6), rating: 5, content: '晚上人少一點放天燈氣氛更好，攤販也會幫忙拍照，蠻貼心的。'},
      {authorName: pick(7), rating: 3, content: '體驗不錯，但現場等候放天燈要排隊，人多的時候要有心理準備。'},
    ],
  },
  {
    spotId: 'VCA_379000000A_000009',
    spotName: '陽明山國家公園_冷水坑',
    reviews: [
      {authorName: pick(0), rating: 5, content: '步道平緩好走，空氣很清新，很適合帶小朋友來認識硫磺地形。'},
      {authorName: pick(1), rating: 4, content: '牛奶湖那段還蠻特別的，只是山區天氣多變，記得帶件薄外套。'},
      {authorName: pick(2), rating: 4, content: '停車場假日常常滿，建議搭公車上山比較省事，也不用煩惱車位。'},
    ],
  },
  {
    spotId: 'VCA_379000000A_000033',
    spotName: '北投溫泉博物館',
    reviews: [
      {authorName: pick(3), rating: 5, content: '建築本身就很有味道，館內介紹北投溫泉的歷史，逛起來很有收穫。'},
      {authorName: pick(4), rating: 4, content: '免費參觀但要脫鞋入內，記得穿好穿脫的鞋子會比較方便。'},
      {authorName: pick(5), rating: 5, content: '離新北投捷運站很近，逛完還能順道去周邊泡湯，一日行程很順。'},
      {authorName: pick(6), rating: 4, content: '空間不算大，但解說牌做得很用心，值得放慢腳步細讀。'},
    ],
  },
  {
    spotId: 'VCA_379000000A_000130',
    spotName: '碧砂漁港',
    reviews: [
      {authorName: pick(7), rating: 4, content: '海鮮很新鮮，價格也算合理，記得先問清楚秤重方式再點。'},
      {authorName: pick(0), rating: 5, content: '傍晚來吹海風配現撈海鮮，氣氛很棒，缺點是找車位要花點時間。'},
      {authorName: pick(1), rating: 3, content: '攤商蠻多的容易眼花撩亂，建議先做點功課或問在地朋友再去。'},
    ],
  },
  {
    spotId: 'VCA_376470000A_000227',
    spotName: '坑內坑森林步道',
    reviews: [
      {authorName: pick(2), rating: 5, content: '芒草季節去超美，步道整理得很好，走起來不會太累。'},
      {authorName: pick(3), rating: 4, content: '知名度不高但風景意外驚艷，人潮不多可以安靜欣賞山景。'},
      {authorName: pick(4), rating: 4, content: '路況有些路段偏窄，建議穿防滑的鞋子比較安全。'},
    ],
  },
  {
    spotId: 'VCA_376500000A_000005',
    spotName: '布袋鹽場',
    reviews: [
      {authorName: pick(5), rating: 4, content: '鹽田景色很特別，夕陽時分拍照特別好看，記得做好防曬。'},
      {authorName: pick(6), rating: 5, content: '第一次看到鹽山跟鹽田覺得很新奇，小朋友也玩得很開心。'},
      {authorName: pick(7), rating: 3, content: '現場遮蔭較少，夏天中午去會有點曬，建議傍晚時段前往。'},
      {authorName: pick(0), rating: 5, content: '附近還有賣鹽相關的紀念品，可以順便買一些回去當伴手禮。'},
    ],
  },
  {
    spotId: 'VCA_376500000A_000009',
    spotName: '阿里山神木',
    reviews: [
      {authorName: pick(1), rating: 5, content: '巨木群真的很震撼，站在樹下感覺自己好渺小，很值得專程來看。'},
      {authorName: pick(2), rating: 4, content: '早上山區容易起霧，建議安排半天以上時間，順便等雲海。'},
      {authorName: pick(3), rating: 5, content: '森林鐵路體驗也很推薦，沿途風景加上神木步道，整趟很充實。'},
      {authorName: pick(4), rating: 4, content: '海拔高早晚溫差大，外套跟保暖用品一定要帶齊。'},
      {authorName: pick(5), rating: 5, content: '步道規劃得很好走，木棧道很平穩，帶長輩來也沒問題。'},
    ],
  },
  {
    spotId: 'VCA_376490000A_000109',
    spotName: '北港故事館',
    reviews: [
      {authorName: pick(6), rating: 4, content: '館舍不大但介紹北港在地文化蠻detailed的，適合安排順遊。'},
      {authorName: pick(7), rating: 4, content: '離北港朝天宮很近，逛完可以走過去拜拜順便吃小吃。'},
      {authorName: pick(0), rating: 3, content: '展示內容偏靜態，比較適合對地方文史有興趣的人慢慢看。'},
    ],
  },
  {
    spotId: 'VCA_397000000A_000010',
    spotName: '中都愛河濕地公園',
    reviews: [
      {authorName: pick(1), rating: 5, content: '紅樹林步道很漂亮，傍晚有夕陽跟白鷺鷥，很適合拍照散步。'},
      {authorName: pick(2), rating: 4, content: '腳踏車道規劃得不錯，租車騎一圈很舒服，運動兼賞景。'},
      {authorName: pick(3), rating: 4, content: '停車不算太難找，但假日傍晚人潮會變多，建議提早出發。'},
    ],
  },
  {
    spotId: 'VCA_397000000A_000026',
    spotName: '佛光山',
    reviews: [
      {authorName: pick(4), rating: 5, content: '園區腹地很大，佛陀紀念館的建築很壯觀，走完會覺得很充實。'},
      {authorName: pick(5), rating: 4, content: '假日參觀人潮不少，建議預留一整天，慢慢走才不會太趕。'},
      {authorName: pick(6), rating: 5, content: '氛圍莊嚴又不會有壓迫感，適合想放鬆心情走走的人來。'},
      {authorName: pick(7), rating: 4, content: '園區很大要走不少路，建議穿舒適好走的鞋子前往。'},
    ],
  },
  {
    spotId: 'VCA_A15011100H_000059',
    spotName: '七股鹽山園區',
    reviews: [
      {authorName: pick(0), rating: 4, content: '爬上鹽山可以看到整片鹽田景觀，體驗很特別，就是階梯有點滑要小心。'},
      {authorName: pick(1), rating: 5, content: '小朋友玩得超開心，還有鹽雕展覽可以看，寓教於樂。'},
      {authorName: pick(2), rating: 3, content: '夏天現場真的很曬，記得帶帽子跟水，中午時段建議避開。'},
    ],
  },
  {
    spotId: 'VCA_A15011100H_000057',
    spotName: '北門潟湖',
    reviews: [
      {authorName: pick(3), rating: 5, content: '搭船遊潟湖看蚵田很有意思，船家解說也很豐富，推薦安排半天。'},
      {authorName: pick(4), rating: 4, content: '夕陽時段景色特別漂亮，適合帶相機來慢慢拍。'},
      {authorName: pick(5), rating: 4, content: '交通稍微不便需要自駕，但風景很值得，人潮也不算多很悠閒。'},
    ],
  },
  {
    spotId: 'VCA_A15011100H_000070',
    spotName: '台灣鹽博物館',
    reviews: [
      {authorName: pick(6), rating: 4, content: '外觀像金字塔很好拍，館內對台灣製鹽產業的介紹也蠻完整的。'},
      {authorName: pick(7), rating: 5, content: '結合旁邊的鹽山一起玩，一票玩兩個景點，CP值不錯。'},
      {authorName: pick(0), rating: 3, content: '館內部分展示稍舊，不過整體還是能了解不少鹽業歷史知識。'},
      {authorName: pick(1), rating: 4, content: '有賣鹽相關的伴手禮跟冰品，逛完可以順便消暑一下。'},
    ],
  },
  {
    spotId: 'VCA_376420000A_000002',
    spotName: '豆腐岬風景區',
    reviews: [
      {authorName: pick(2), rating: 5, content: '海水清澈，很適合浮潛跟游泳，暑假來玩水很消暑。'},
      {authorName: pick(3), rating: 4, content: '岩岸地形很特別，適合拍照，但礁石濕滑要注意腳步安全。'},
      {authorName: pick(4), rating: 4, content: '附近就有小吃跟民宿，安排東部小旅行順路來很方便。'},
    ],
  },
]
