import { useRef, useState } from 'react'
import axios from 'axios'
import api, { errMsg } from '../api'
import { useFeatures } from '../ConfigContext'
import { img } from '../utils'
import { Icon } from './ui'

const TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/gif']

// Pick a photo (uploaded straight to Cloudinary with a signature from our server) or paste a link.
// When uploads are not set up on the server, only the link field is shown.
export default function PhotoInput({ familyId, value, onChange, label = 'Photo', round = false }) {
  const { uploads } = useFeatures()
  const fileRef = useRef(null)
  const [mode, setMode] = useState('upload') // features load async, so the choice is combined with `uploads` below
  const [progress, setProgress] = useState(null)
  const [error, setError] = useState('')
  const useUpload = uploads && mode !== 'link'

  const upload = async (file) => {
    setError('')
    if (!TYPES.includes(file.type) && !/\.heic$/i.test(file.name)) return setError('Choose a JPG, PNG, WebP, HEIC or GIF image')
    try {
      setProgress(0)
      const sig = (await api.post('/uploads/signature', { family: familyId })).data
      if (file.size > sig.maxBytes) throw new Error(`Photo is too big (max ${Math.round(sig.maxBytes / 1024 / 1024)} MB)`)
      const form = new FormData()
      Object.entries(sig.fields).forEach(([k, v]) => form.append(k, v))
      form.append('file', file)
      // plain axios: this goes to Cloudinary, so our token must not be attached
      const res = await axios.post(sig.uploadUrl, form, { onUploadProgress: (e) => e.total && setProgress(Math.round((e.loaded / e.total) * 100)) })
      onChange(res.data.secure_url)
    } catch (err) {
      setError(err.response?.data?.error?.message || (err.response ? errMsg(err) : err.message))
    } finally {
      setProgress(null)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="label !mb-0">{label} <span className="font-normal text-ink-soft">(optional)</span></span>
        {uploads && (
          <button type="button" className="text-xs font-medium text-kumkum hover:underline" onClick={() => setMode(useUpload ? 'link' : 'upload')}>
            {useUpload ? 'Paste a link instead' : 'Upload a photo instead'}
          </button>
        )}
      </div>
      <div className="flex items-center gap-3">
        {value ? (
          <img src={img(value, 160, 160)} alt="" className={`h-16 w-16 shrink-0 border border-line object-cover ${round ? 'rounded-full' : 'rounded-[10px]'}`} />
        ) : (
          <span className={`flex h-16 w-16 shrink-0 items-center justify-center border border-dashed border-line text-ink-soft ${round ? 'rounded-full' : 'rounded-[10px]'}`}><Icon name="image" /></span>
        )}
        <div className="min-w-0 flex-1">
          {useUpload ? (
            <div className="flex flex-wrap items-center gap-2">
              <input ref={fileRef} type="file" accept="image/*" className="sr-only" id={`photo-${label}`} onChange={(e) => e.target.files[0] && upload(e.target.files[0])} />
              <label htmlFor={`photo-${label}`} className={`btn-quiet btn-sm cursor-pointer ${progress !== null ? 'pointer-events-none opacity-60' : ''}`}>
                {progress !== null ? `Uploading ${progress}%` : value ? 'Change photo' : 'Choose photo'}
              </label>
              {value && progress === null && <button type="button" className="text-sm text-ink-soft hover:text-kumkum" onClick={() => onChange('')}>Remove</button>}
            </div>
          ) : (
            <input className="input" type="url" inputMode="url" placeholder="https://..." value={value} onChange={(e) => onChange(e.target.value)} aria-label={`${label} link`} />
          )}
        </div>
      </div>
      {error && <p className="mt-1.5 text-sm text-kumkum" role="alert">{error}</p>}
    </div>
  )
}
