import { useState, useEffect } from 'react'
import Layout from '../components/layout/Layout'
import api from '../lib/api'

const CATEGORIES = ['General', 'Sports', 'Events', 'Classroom', 'Festivals', 'Trips']

export default function Gallery() {
  const [images, setImages] = useState([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('General')
  const [school, setSchool] = useState('CMP')
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [filterCategory, setFilterCategory] = useState('All')

  useEffect(() => { fetchImages() }, [])

  const fetchImages = async () => {
    setLoading(true)
    try {
      const res = await api.get('/gallery')
      setImages(res.data)
    } catch {}
    setLoading(false)
  }

  const handleFileChange = (e) => {
    const f = e.target.files[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  const handleUpload = async () => {
    if (!file || !title.trim()) return alert('Please select a file and enter a title')
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('image', file)
      formData.append('title', title)
      formData.append('category', category)
      formData.append('school', school)
      await api.post('/gallery', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setTitle('')
      setCategory('General')
      setFile(null)
      setPreview(null)
      fetchImages()
    } catch (err) {
      alert('Upload failed. Please try again.')
    }
    setUploading(false)
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this image?')) return
    try {
      await api.delete(`/gallery/${id}`)
      fetchImages()
    } catch {}
  }

  const filtered = filterCategory === 'All' ? images : images.filter(i => i.category === filterCategory)

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 style={{ color: '#083e78' }} className="text-2xl font-bold">Gallery</h1>
          <p className="text-gray-500 text-sm mt-1">{images.length} photos uploaded</p>
        </div>
      </div>

      {/* Upload Card */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <h3 className="font-semibold mb-4" style={{ color: '#083e78' }}>Upload New Photo</h3>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Annual Sports Day 2026"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select value={category} onChange={e => setCategory(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">School</label>
            <select value={school} onChange={e => setSchool(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
              <option value="CMP">CM Public School</option>
              <option value="TZP">Taare Zameen Par</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Photo *</label>
            <input type="file" accept="image/*" onChange={handleFileChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />
          </div>
        </div>

        {preview && (
          <div style={{ marginBottom: '16px' }}>
            <img src={preview} alt="Preview" style={{ width: '120px', height: '120px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={uploading}
          style={{ background: '#083e78' }}
          className="text-white px-6 py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {uploading ? 'Uploading...' : 'Upload Photo'}
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {['All', ...CATEGORIES].map(c => (
          <button key={c} onClick={() => setFilterCategory(c)}
            style={{
              padding: '6px 14px', borderRadius: '8px',
              border: filterCategory === c ? '2px solid #083e78' : '1.5px solid #e2e8f0',
              background: filterCategory === c ? '#083e78' : 'white',
              color: filterCategory === c ? 'white' : '#1e293b',
              fontWeight: '600', fontSize: '13px', cursor: 'pointer'
            }}>
            {c}
          </button>
        ))}
      </div>

      {/* Images Grid */}
      {loading ? (
        <p className="text-center text-gray-400 py-12">Loading...</p>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-400">
          No photos yet. Upload your first photo above.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
          {filtered.map(img => (
            <div key={img.id} style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <img src={img.imageUrl} alt={img.title} style={{ width: '100%', height: '160px', objectFit: 'cover' }} />
              <div style={{ padding: '12px' }}>
                <p style={{ fontWeight: '600', fontSize: '13px', color: '#1e293b', marginBottom: '4px' }}>{img.title}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', color: '#64748b', background: '#f1f5f9', padding: '2px 8px', borderRadius: '99px' }}>{img.category}</span>
                  <button onClick={() => handleDelete(img.id)} className="text-red-400 hover:text-red-600 text-xs">Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  )
}