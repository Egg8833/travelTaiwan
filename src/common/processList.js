import noImage from '@/assets/images/empty-img.png'
function generateRandomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}
export default function processViewData(dataList) {
  return dataList.map(e => {
    const tagText = [e.Class1, e.Class2, e.Class3].filter(Boolean)
    const photoSrc = [
      e.Picture.PictureUrl1,
      // e.Picture.PictureUrl2,
      // e.Picture.PictureUrl3,
    ].filter(Boolean)

    if (photoSrc.length === 0) {
      photoSrc.push(noImage)
    }

    return {
      city: e.City,
      id: e.ScenicSpotID,
      title: e.ScenicSpotName,
      phone: e.Phone,
      openTime: e.OpenTime,
      tagText,
      startNum: generateRandomNumber(3, 5),
      photoSrc,
      description: e.DescriptionDetail,
      ZipCode: e.ZipCode,
      Address: e.Address,
      websiteUrl: e.WebsiteUrl || null,
      hasParking: Object.keys(e.ParkingPosition || {}).length > 0,
    }
  })
}
