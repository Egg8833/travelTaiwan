export const createFavoritesRepo = firestore => ({
  async list(uid) {
    const snap = await firestore
      .collection('favorites')
      .doc(uid)
      .collection('spots')
      .orderBy('addedAt', 'desc')
      .get()
    return snap.docs.map(d => d.data())
  },

  async add(uid, spotId, {spotName, pictureUrl}) {
    const ref = firestore.collection('favorites').doc(uid).collection('spots').doc(spotId)
    const data = {spotId, spotName, pictureUrl: pictureUrl || null, addedAt: new Date().toISOString()}
    await ref.set(data)
    return data
  },

  async remove(uid, spotId) {
    await firestore.collection('favorites').doc(uid).collection('spots').doc(spotId).delete()
  },
})
