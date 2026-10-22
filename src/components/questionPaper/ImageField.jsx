import { useState } from 'react'
import api from '../../lib/api'
import { IMAGE_SIZES } from '../../lib/questionModel'

const LOW_RES_WIDTH = 800

const uploadQuestionImage = async (file) => {
  const formData = new FormData()
  formData.append('image', file)
  formData.append('folder', 'questions')
  const res = await api.post('/gallery/upload-single', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
  return res.data.url
}

// Upload button + thumbnail (with remove) + image size picker.
// onChange receives a patch: { imageUrl } and/or { imageSize }.
export default function ImageField({ imageUrl, imageSize, onChange, defaultSizeLabel = 'Default (Medium)', compact = false }) {
  const [uploading, setUploading] = useState(false)
  const [lowRes, setLowRes] = useState(false)

  const pick = async (file) => {
    if (!file) return
    setUploading(true)
    try {
      onChange({ imageUrl: await uploadQuestionImage(file) })
    } catch (err) {
      console.error(err)
      alert('Image upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2 flex-wrap">
        <label className="cursor-pointer">
          <input type="file" accept="image/*" className="hidden"
            onChange={e => { pick(e.target.files[0]); e.target.value = '' }} />
          <span style={{ background: '#e8f0fb', color: '#083e78' }}
            className="px-2 py-1.5 rounded text-xs font-medium inline-block whitespace-nowrap">
            {uploading ? 'Uploading...' : imageUrl ? 'Change image' : '+ Add image'}
          </span>
        </label>
        {imageUrl && (
          <>
            <div className="relative flex-shrink-0">
              <img src={imageUrl} alt=""
                onLoad={e => setLowRes(e.currentTarget.naturalWidth < LOW_RES_WIDTH)}
                className={`${compact ? 'h-10 w-10' : 'h-16 w-16'} object-contain rounded border border-gray-200 bg-white`} />
              <button type="button" title="Remove image"
                onClick={() => onChange({ imageUrl: '', imageSize: undefined })}
                className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] leading-4 text-center hover:bg-red-600">
                ×
              </button>
            </div>
            <select value={imageSize || ''} title="Printed image size"
              onChange={e => onChange({ imageSize: e.target.value || undefined })}
              className="border border-gray-300 rounded px-1.5 py-1 text-xs focus:outline-none">
              <option value="">{defaultSizeLabel}</option>
              {IMAGE_SIZES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <span className="text-[11px] text-gray-400">Use Full for images that contain text.</span>
          </>
        )}
      </div>
      {imageUrl && lowRes && (
        <p className="text-[11px]" style={{ color: '#c45e1e' }}>
          Low resolution image - may print blurry. Upload a larger one for text-heavy images.
        </p>
      )}
    </div>
  )
}
