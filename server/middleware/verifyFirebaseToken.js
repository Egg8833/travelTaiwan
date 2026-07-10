export const createVerifyFirebaseToken = authClient => async (req, res, next) => {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return res.status(401).json({message: 'missing bearer token'})
  try {
    const decoded = await authClient.verifyIdToken(token)
    req.uid = decoded.uid
    req.firebaseUser = decoded
    next()
  } catch {
    res.status(401).json({message: 'invalid or expired token'})
  }
}
