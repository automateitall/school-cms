let _settings = null
let _classes = null

export const getCachedSettings = async (api) => {
  if (_settings) return _settings
  const res = await api.get('/settings')
  _settings = res.data
  return _settings
}

export const getCachedClasses = async (api) => {
  if (_classes) return _classes
  const res = await api.get('/settings/classes')
  _classes = res.data.classes || []
  return _classes
}

export const clearCache = () => {
  _settings = null
  _classes = null
}
