export const createAccountRepo = (firestore, auth, storage) => ({
  async deleteAccount(uid) {
    const favSnap = await firestore.collection('favorites').doc(uid).collection('spots').get()
    const reviewSnap = await firestore.collectionGroup('entries').where('uid', '==', uid).get()

    const batch = firestore.batch()
    favSnap.docs.forEach(d => batch.delete(d.ref))
    reviewSnap.docs.forEach(d => batch.delete(d.ref))
    batch.delete(firestore.collection('favorites').doc(uid))
    await batch.commit()

    await storage.bucket().file(`avatars/${uid}`).delete({ignoreNotFound: true})
    await auth.deleteUser(uid)
  },
})
