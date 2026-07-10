export const createReviewsRepo = firestore => ({
  async list(spotId) {
    const snap = await firestore
      .collection('reviews')
      .doc(spotId)
      .collection('entries')
      .orderBy('createdAt', 'desc')
      .get()
    return snap.docs.map(d => ({id: d.id, ...d.data()}))
  },

  async add(spotId, {uid, authorName, rating, content}) {
    const ref = firestore.collection('reviews').doc(spotId).collection('entries').doc()
    const data = {
      uid,
      authorName,
      rating,
      content,
      isSeed: false,
      createdAt: new Date().toISOString(),
      updatedAt: null,
    }
    await ref.set(data)
    return {id: ref.id, ...data}
  },

  async update(spotId, reviewId, uid, {rating, content}) {
    const ref = firestore.collection('reviews').doc(spotId).collection('entries').doc(reviewId)
    const snap = await ref.get()
    if (!snap.exists) return {error: 'not_found'}
    if (snap.data().uid !== uid) return {error: 'forbidden'}
    const updatedAt = new Date().toISOString()
    await ref.update({rating, content, updatedAt})
    return {id: reviewId, ...snap.data(), rating, content, updatedAt}
  },

  async remove(spotId, reviewId, uid) {
    const ref = firestore.collection('reviews').doc(spotId).collection('entries').doc(reviewId)
    const snap = await ref.get()
    if (!snap.exists) return {error: 'not_found'}
    if (snap.data().uid !== uid) return {error: 'forbidden'}
    await ref.delete()
    return {error: null}
  },
})
