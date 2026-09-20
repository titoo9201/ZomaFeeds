import { useEffect, useMemo, useRef, useState } from 'react'
import api from '../config/api'
import '../styles/song-picker.css'

const MIN_CLIP = 5
const MAX_CLIP = 30
const DURATION_OPTIONS = [5, 10, 15, 20, 25, 30]

const formatTime = seconds => {
  const total = Math.max(0, Math.round(seconds || 0))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

const seededBars = (seed, count) => {
  let value = Array.from(String(seed || 'song')).reduce((sum, ch) => sum + ch.charCodeAt(0), 7)
  const bars = []
  for (let i = 0; i < count; i++) {
    value = (value * 9301 + 49297) % 233280
    bars.push(0.22 + (value / 233280) * 0.78)
  }
  return bars
}

const SongPicker = ({ selectedSong, onSelect, onRemove, videoDuration }) => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState('')
  const [playingId, setPlayingId] = useState('')
  const [isChanging, setIsChanging] = useState(false)
  const [trimming, setTrimming] = useState(null)
  const [clipDuration, setClipDuration] = useState(MAX_CLIP)
  const [startTime, setStartTime] = useState(0)
  const [isClipPlaying, setIsClipPlaying] = useState(false)
  const [isDurationMenuOpen, setIsDurationMenuOpen] = useState(false)
  const audioRef = useRef(null)
  const trackRef = useRef(null)

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    let cancelled = false
    const searchTerm = query.trim()

    const runSearch = attempt => {
      setIsSearching(true)
      setError('')
      api.get(`/api/songs/search?query=${encodeURIComponent(searchTerm)}`)
        .then(({ data }) => { if (!cancelled) setResults(data.songs) })
        .catch(requestError => {
          if (cancelled) return
          const isTransient = !requestError.response || requestError.response.status >= 500
          if (isTransient && attempt === 1) {
            setError('Server is waking up, retrying...')
            window.setTimeout(() => { if (!cancelled) runSearch(2) }, 4000)
            return
          }
          setError('Could not search songs right now.')
        })
        .finally(() => { if (!cancelled) setIsSearching(false) })
    }

    const timer = window.setTimeout(() => runSearch(1), 400)
    return () => { cancelled = true; window.clearTimeout(timer) }
  }, [query])

  useEffect(() => () => audioRef.current?.pause(), [])

  const togglePreview = song => {
    if (playingId === song.id) {
      audioRef.current?.pause()
      setPlayingId('')
      return
    }
    audioRef.current?.pause()
    const audio = new Audio(song.previewUrl)
    audio.addEventListener('ended', () => setPlayingId(''))
    audio.play().catch(() => {})
    audioRef.current = audio
    setPlayingId(song.id)
  }

  const maxClipForSong = song => {
    const candidates = [MAX_CLIP]
    if (song?.duration) candidates.push(Math.floor(song.duration))
    if (videoDuration) candidates.push(Math.floor(videoDuration))
    return Math.max(MIN_CLIP, Math.min(...candidates))
  }
  const maxStartForSong = (song, duration) => song?.duration ? Math.max(0, Math.floor(song.duration) - duration) : 300

  const stopClipPreview = () => { audioRef.current?.pause(); setIsClipPlaying(false) }

  const playClipRange = (song, start, duration) => {
    audioRef.current?.pause()
    const audio = new Audio(song.previewUrl)
    audio.currentTime = start
    const stopAtEnd = () => { if (audio.currentTime >= start + duration) { audio.pause(); setIsClipPlaying(false) } }
    audio.addEventListener('timeupdate', stopAtEnd)
    audio.addEventListener('ended', () => setIsClipPlaying(false))
    audio.play().catch(() => {})
    audioRef.current = audio
    setIsClipPlaying(true)
  }

  const startTrimming = song => {
    setPlayingId('')
    const initialDuration = maxClipForSong(song)
    setTrimming(song)
    setClipDuration(initialDuration)
    setStartTime(0)
    playClipRange(song, 0, initialDuration)
  }

  const playClip = () => { if (trimming) playClipRange(trimming, startTime, clipDuration) }

  const pickDuration = value => {
    setIsDurationMenuOpen(false)
    const nextDuration = Math.min(maxClipForSong(trimming), Math.max(MIN_CLIP, value))
    const nextStart = Math.min(startTime, maxStartForSong(trimming, nextDuration))
    setClipDuration(nextDuration)
    setStartTime(nextStart)
    playClipRange(trimming, nextStart, nextDuration)
  }

  const beginDrag = event => {
    const track = trackRef.current
    if (!track || !trimming) return
    event.preventDefault()
    stopClipPreview()
    const rect = track.getBoundingClientRect()
    const total = trimming.duration || 180
    const maxStart = maxStartForSong(trimming, clipDuration)
    let latestStart = startTime

    const toStart = clientX => Math.min(maxStart, Math.max(0, ((clientX - rect.left) / rect.width) * total))
    const onMove = moveEvent => { latestStart = toStart(moveEvent.clientX); setStartTime(latestStart) }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      playClipRange(trimming, latestStart, clipDuration)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    onMove(event)
  }

  const confirmClip = () => {
    stopClipPreview()
    onSelect({ id: trimming.id, title: trimming.title, artist: trimming.artist, image: trimming.image, url: trimming.previewUrl, startTime, clipDuration })
    setTrimming(null)
    setIsChanging(false)
    setQuery('')
    setResults([])
  }

  const cancelTrimming = () => { stopClipPreview(); setTrimming(null) }

  const bars = useMemo(() => trimming ? seededBars(trimming.id || trimming.title, 48) : [], [trimming])

  const isVideoTooShort = typeof videoDuration === 'number' && videoDuration > 0 && videoDuration < MIN_CLIP
  if (isVideoTooShort) return <div className="song-picker">
    <p className="small-note">This video is only {formatTime(videoDuration)} long — it needs to be at least {MIN_CLIP} seconds to attach a song.</p>
    {selectedSong && <button type="button" className="btn-ghost danger" onClick={onRemove}>Remove attached song</button>}
  </div>

  if (trimming) {
    const totalDuration = trimming.duration || 180
    const startPercent = Math.min(100, (startTime / totalDuration) * 100)
    const windowPercent = Math.min(100 - startPercent, (clipDuration / totalDuration) * 100)

    return <div className="song-picker song-trim">
      <div className="song-trim-header">
        {trimming.image && <img className="song-trim-cover" src={trimming.image} alt="" />}
        <div className="song-picker-result-info"><strong>{trimming.title}</strong><span>{trimming.artist}</span></div>
        <div className="song-trim-timer">
          <button type="button" className="song-trim-timer-circle" onClick={() => setIsDurationMenuOpen(open => !open)} aria-haspopup="true" aria-expanded={isDurationMenuOpen} aria-label="Choose clip length">{clipDuration}s</button>
          {isDurationMenuOpen && <ul className="song-trim-timer-menu" role="menu">
            {DURATION_OPTIONS.filter(option => option <= maxClipForSong(trimming)).map(option => <li key={option}><button type="button" role="menuitem" className={option === clipDuration ? 'is-active' : ''} onClick={() => pickDuration(option)}>{option}s</button></li>)}
          </ul>}
        </div>
      </div>

      <div className="song-trim-waveform" ref={trackRef} onPointerDown={beginDrag}>
        <div className="song-trim-bars" aria-hidden="true">{bars.map((height, index) => <span key={index} style={{ height: `${Math.round(height * 100)}%` }} />)}</div>
        <div className="song-trim-window" style={{ left: `${startPercent}%`, width: `${windowPercent}%` }} />
      </div>

      <div className="song-trim-actions">
        <button type="button" className="song-picker-play" onClick={isClipPlaying ? stopClipPreview : playClip} aria-label={isClipPlaying ? 'Pause preview' : 'Preview this clip'}>{isClipPlaying ? '⏸' : '▶'}</button>
        <span className="small-note">{formatTime(startTime)} – {formatTime(startTime + clipDuration)}{trimming.duration ? ` of ${formatTime(trimming.duration)}` : ''}</span>
      </div>

      <div className="song-trim-footer">
        <button type="button" className="btn-ghost" onClick={cancelTrimming}>Back</button>
        <button type="button" className="btn-primary" onClick={confirmClip}>Use this clip</button>
      </div>
    </div>
  }

  if (selectedSong && !isChanging) return <div className="song-picker-selected">
    {selectedSong.image && <img src={selectedSong.image} alt="" />}
    <div className="song-picker-selected-info"><strong>♪ {selectedSong.title}</strong><span>{selectedSong.artist} · {selectedSong.clipDuration || 30}s clip</span></div>
    <div className="song-picker-selected-actions">
      <button type="button" className="btn-ghost" onClick={() => setIsChanging(true)}>Change</button>
      <button type="button" className="btn-ghost danger" onClick={onRemove}>Remove</button>
    </div>
  </div>

  return <div className="song-picker">
    <input type="text" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search a song to add to this reel..." />
    {isSearching && <p className="small-note">Searching...</p>}
    {error && <p className="error-text" role="alert">{error}</p>}
    {results.length > 0 && <ul className="song-picker-results">
      {results.map(song => <li key={song.id} className="song-picker-result">
        <button type="button" className="song-picker-play" onClick={() => togglePreview(song)} aria-label={playingId === song.id ? 'Pause preview' : 'Play preview'}>{playingId === song.id ? '⏸' : '▶'}</button>
        {song.image && <img src={song.image} alt="" />}
        <div className="song-picker-result-info"><strong>{song.title}</strong><span>{song.artist}</span></div>
        <button type="button" className="btn-primary" onClick={() => startTrimming(song)}>Use this</button>
      </li>)}
    </ul>}
    {isChanging && <button type="button" className="btn-ghost" onClick={() => setIsChanging(false)}>Cancel</button>}
  </div>
}

export default SongPicker
