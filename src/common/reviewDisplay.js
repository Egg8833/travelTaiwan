// Cosmetic display helpers for the review list. These only affect how a
// review's author is *shown* — they never touch stored data. Real users'
// actual submitted names pass through untouched; only the placeholder
// seed nicknames (see server/scripts/reviewTemplates.js) get mapped to
// more name-like text for readability.
import { seedNicknames } from "./seedNicknames.js";

const friendlyNames = [
  "陳小明", "林雅婷", "王大仁", "李佳蓉", "張家豪", "陳怡君", "黃志偉", "劉美玲",
  "吳建宏", "蔡佩珊", "周俊傑", "林淑芬", "郭家豪", "陶美惠", "蕭雅文", "田家寧",
  "許志明", "曾雅婷", "賴俊宏", "洪淑貞", "楊承恩", "沈佳穎", "邱冠宇", "江欣怡",
  "高文彬", "潘思妤", "阮明哲", "范詩涵", "簡大同", "蘇怡萱", "顏俊傑", "龔佳玲",
  "魏子軒", "尤美玲", "卓宗翰", "韓雨萱", "童建誠", "胡雅琳", "錢柏宇", "白思穎",
  "朱冠霖", "石雅晴", "唐俊彥", "馮怡如", "康家瑜", "秦立文", "梁若蘭", "傅明道",
];

const nicknameToFriendlyName = Object.fromEntries(
  seedNicknames.map((nickname, i) => [nickname, friendlyNames[i % friendlyNames.length]])
);

export const displayAuthorName = (authorName) =>
  nicknameToFriendlyName[authorName] || authorName || "匿名旅人";

const avatarPalette = [
  "#F97362", "#F2A65A", "#4FB286", "#4C9BE8",
  "#8B7FE8", "#E87FB0", "#5FBFBF", "#C98A4B",
];

const hashString = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return hash;
};

export const avatarColor = (name) => avatarPalette[hashString(name) % avatarPalette.length];

export const avatarInitial = (name) => (name || "?").charAt(0);
