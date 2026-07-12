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
  {
    spotId: 'VCA_376540000A_000229',
    spotName: '嘉明湖',
    reviews: [
      {authorName: pick(5), rating: 5, content: '傳說中的天使的眼淚，親眼看到真的會起雞皮疙瘩，值得辛苦的路程。'},
      {authorName: pick(6), rating: 4, content: '要申請入山證、排隊抽籤，行程規劃要提早，體力也要練好。'},
      {authorName: pick(7), rating: 5, content: '三天兩夜的行程有點硬，但看到湖面倒映天空的瞬間全部值得了。'},
      {authorName: pick(0), rating: 3, content: '天氣是關鍵，我們遇到起霧看不太到全貌，建議多留備用日。'},
    ],
  },
  {
    spotId: 'VCA_376540000A_000252',
    spotName: '大坡池',
    reviews: [
      {authorName: pick(1), rating: 5, content: '騎腳踏車環湖超舒服，稻田配山景，是我心中最美的花東風景之一。'},
      {authorName: pick(2), rating: 4, content: '夏天有竹筏季活動可以體驗，滑竹筏遊湖很新奇，小孩很喜歡。'},
      {authorName: pick(3), rating: 4, content: '傍晚來散步很愜意，蚊蟲有點多記得噴防蚊液。'},
    ],
  },
  {
    spotId: 'VCA_376420000A_000004',
    spotName: '南澳農場',
    reviews: [
      {authorName: pick(4), rating: 5, content: '晚上完全無光害，星空多到數不完，第一次看到這麼清楚的銀河。'},
      {authorName: pick(5), rating: 4, content: '場地免費又寬敞，衛浴設施比想像中乾淨，露營過夜很推薦。'},
      {authorName: pick(6), rating: 4, content: '白天可以烤肉、玩水，晚上看星星，一天行程很豐富。'},
    ],
  },
  {
    spotId: 'VCA_376550000A_000001',
    spotName: '遠雄海洋公園',
    reviews: [
      {authorName: pick(7), rating: 5, content: '海洋劇場的海豚表演很精彩，小孩看得目不轉睛，玩一整天不會膩。'},
      {authorName: pick(0), rating: 4, content: '園區依山而建要走不少坡道，天氣熱建議安排纜車代步。'},
      {authorName: pick(1), rating: 4, content: '設施蠻多元的，適合安排一整天，門票稍貴但體驗算值得。'},
      {authorName: pick(2), rating: 3, content: '假日人潮不少，熱門表演建議提早卡位，不然只能站著看。'},
    ],
  },
  {
    spotId: 'VCA_376550000A_000030',
    spotName: '米棧古道',
    reviews: [
      {authorName: pick(3), rating: 4, content: '古道不長很好走，沿途竹林跟古樸的護欄很有味道，適合親子健行。'},
      {authorName: pick(4), rating: 4, content: '知道的人不多所以很清幽，可以感受早期挑夫文化的歷史氛圍。'},
      {authorName: pick(5), rating: 3, content: '指標不算很明顯，建議先查好路線或跟著在地嚮導走比較安心。'},
    ],
  },
  {
    spotId: 'VCA_376560000A_000001',
    spotName: '貝殼教堂',
    reviews: [
      {authorName: pick(6), rating: 5, content: '夕陽配上心型鏤空屋頂的光影很浪漫，情侶約會拍照首選。'},
      {authorName: pick(7), rating: 4, content: '教堂造型很特別，附近沙灘也很乾淨，可以順便散步戲水。'},
      {authorName: pick(0), rating: 4, content: '傍晚光線最漂亮，建議算好日落時間再過去，人不多很好拍。'},
    ],
  },
  {
    spotId: 'VCA_376560000A_000004',
    spotName: '吉貝嶼',
    reviews: [
      {authorName: pick(1), rating: 5, content: '沙尾長達好幾公里，海水藍到不可思議，玩水上活動的天堂。'},
      {authorName: pick(2), rating: 5, content: '香蕉船、拖曳傘都有，一整套水上活動玩下來超盡興，很適合朋友揪團。'},
      {authorName: pick(3), rating: 4, content: '搭船要看船班時間，夏天旺季人潮較多，建議提早訂船票。'},
      {authorName: pick(4), rating: 4, content: '沙尾退潮時可以走很遠，記得穿好防滑鞋，礁石區要小心。'},
    ],
  },
  {
    spotId: 'VCA_376560000A_000011',
    spotName: '龍門商港',
    reviews: [
      {authorName: pick(5), rating: 4, content: '紅色貨櫃屋候船室很好拍，搭船往返嘉義布袋比想像中方便快速。'},
      {authorName: pick(6), rating: 3, content: '單純轉乘用的港口，周邊比較沒有其他景點，適合順路停留拍照。'},
      {authorName: pick(7), rating: 4, content: '工業風的建築設計蠻特別的，喜歡拍網美照的可以來這邊取景。'},
    ],
  },
  {
    spotId: 'VCA_376560000A_000017',
    spotName: '山水漁港',
    reviews: [
      {authorName: pick(0), rating: 4, content: '旁邊的山水沙灘很美，黃昏來吹海風看漁船進港很療癒。'},
      {authorName: pick(1), rating: 4, content: '觀星公園晚上人少，天氣好的話星星很清楚，適合安靜散步。'},
      {authorName: pick(2), rating: 3, content: '漁港本身較偏日常機能，主要還是為了旁邊的沙灘跟星空順道來看。'},
    ],
  },
  {
    spotId: 'VCA_371020000A_000429',
    spotName: '金門城',
    reviews: [
      {authorName: pick(3), rating: 4, content: '古城牆保存得算完整，能感受到明代防禦海盜的歷史痕跡，很有意義。'},
      {authorName: pick(4), rating: 4, content: '腹地不算大但很適合搭配周邊古崗湖、水頭聚落一起排一日遊。'},
      {authorName: pick(5), rating: 3, content: '現場解說牌不算多，建議先查好歷史背景再去，體驗會更豐富。'},
    ],
  },
  {
    spotId: 'VCA_379000000A_000283',
    spotName: '烏來瀑布',
    reviews: [
      {authorName: pick(6), rating: 5, content: '搭台車再轉纜車上山看瀑布全貌，體驗很特別，小朋友超愛台車。'},
      {authorName: pick(7), rating: 5, content: '雨季水量豐沛時氣勢很磅礡，站在觀瀑平台都能感受到水氣。'},
      {authorName: pick(0), rating: 4, content: '老街小吃也很不錯，炸溪魚跟竹筒飯記得順路吃一輪。'},
      {authorName: pick(1), rating: 4, content: '假日人潮較多，台車跟纜車都要排隊，建議早點出發比較從容。'},
    ],
  },
  {
    spotId: 'VCA_379000000A_000423',
    spotName: '無極天元宮',
    reviews: [
      {authorName: pick(2), rating: 5, content: '櫻花季來真的美翻了，天壇配吉野櫻的畫面很值得專程上山。'},
      {authorName: pick(3), rating: 4, content: '建築本身就很雄偉壯觀，非花季來也能感受莊嚴的氛圍。'},
      {authorName: pick(4), rating: 3, content: '花季假日車潮很誇張，建議提早或搭接駁車上山，不然會塞很久。'},
      {authorName: pick(5), rating: 5, content: '晚上點燈後的天壇搭夜櫻別有一番風味，推薦傍晚上山待到天黑。'},
    ],
  },
  {
    spotId: 'VCA_397000000A_000235',
    spotName: '內門308高地',
    reviews: [
      {authorName: pick(6), rating: 5, content: '惡地地形真的很像月球表面，站上觀景台視野遼闊，很震撼。'},
      {authorName: pick(7), rating: 4, content: '景觀餐廳可以邊吃飯邊看夕陽，遠眺嘉南平原的視野很棒。'},
      {authorName: pick(0), rating: 4, content: '知名度不算高但風景意外好，人潮不多可以悠閒欣賞月世界地形。'},
    ],
  },
]
