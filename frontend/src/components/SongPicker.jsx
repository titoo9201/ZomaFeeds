import { useEffect, useRef, useState } from 'react'
import api from '../config/api'
import '../styles/song-picker.css'

const SongPicker = ({ selectedSong, onSelect, onRemove }) => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState('')
  const [playingId, setPlayingId] = useState('')
  const [isChanging, setIsChanging] = useState(false)
  const audioRef = useRef(null)

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    const timer = window.setTimeout(() => {
      setIsSearching(true)
      setError('')
      api.get(`/api/songs/search?query=${encodeURIComponent(query.trim())}`)
        .then(({ data }) => setResults(data.songs))
        .catch(() => setError('Could not search songs right now.'))
        .finally(() => setIsSearching(false))
    }, 400)
    return () => window.clearTimeout(timer)
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

  const selectSong = song => {
    audioRef.current?.pause()
    setPlayingId('')
    onSelect({ id: song.id, title: song.title, artist: song.artist, image: song.image, url: song.previewUrl })
    setIsChanging(false)
    setQuery('')
    setResults([])
  }

  if (selectedSong && !isChanging) return <div className="song-picker-selected">
    {selectedSong.image && <img src={selectedSong.image} alt="" />}
    <div className="song-picker-selected-info"><strong>♪ {selectedSong.title}</strong><span>{selectedSong.artist}</span></div>
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
        <button type="button" className="btn-primary" onClick={() => selectSong(song)}>Use this</button>
      </li>)}
    </ul>}
    {isChanging && <button type="button" className="btn-ghost" onClick={() => setIsChanging(false)}>Cancel</button>}
  </div>
}

export default SongPicker
