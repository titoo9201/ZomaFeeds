import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../config/api'

const getStoredMuted = () => {
  try { return window.localStorage.getItem('zomafeeds-muted') !== 'false' } catch { return true }
}

const ReelFeed = ({ items = [], onLike, onSave, onCommentAdded, emptyMessage = 'No videos yet.' }) => {
  const videoRefs = useRef(new Map())
  const audioRef = useRef(null)
  const feedRef = useRef(null)
  const [activeItemId, setActiveItemId] = useState(null)
  const [isMuted, setIsMuted] = useState(getStoredMuted)
  const [activeComments, setActiveComments] = useState(null)
  const [comments, setComments] = useState([])
  const [commentText, setCommentText] = useState('')
  const [commentsError, setCommentsError] = useState('')
  const [isCommentsLoading, setIsCommentsLoading] = useState(false)
  const [pendingAction, setPendingAction] = useState('')

  useEffect(() => {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      const video = entry.target
      if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
        video.play().catch(() => {})
        setActiveItemId(video.dataset.id)
      } else video.pause()
    }), { threshold: [0, 0.6, 1] })
    videoRefs.current.forEach(video => observer.observe(video))
    return () => observer.disconnect()
  }, [items])

  const activeItem = items.find(item => item._id === activeItemId) ?? items[0]

  // A video with its own song attached stays muted (the song plays instead); otherwise it
  // carries its own sound, gated by the shared mute toggle like every other reel.
  useEffect(() => {
    videoRefs.current.forEach((video, id) => {
      const item = items.find(candidate => candidate._id === id)
      video.muted = isMuted || Boolean(item?.song?.url)
    })
  }, [isMuted, items])

  // One shared <audio> element plays whichever active reel's song, looping just the chosen
  // clip (startTime to startTime + clipDuration) alongside its video — not the whole track.
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const song = activeItem?.song
    if (!song?.url || isMuted) { audio.pause(); return }
    const startTime = song.startTime || 0
    const clipDuration = song.clipDuration || 30

    // Seeking works reliably only once the browser has loaded the new track's metadata —
    // setting currentTime right after src is often silently ignored/clamped to 0 otherwise.
    const seekToStart = () => { audio.currentTime = startTime }
    const loopClip = () => { if (audio.currentTime >= startTime + clipDuration || audio.currentTime < startTime) audio.currentTime = startTime }

    if (audio.src !== song.url) {
      audio.src = song.url
      audio.addEventListener('loadedmetadata', seekToStart, { once: true })
    } else {
      seekToStart()
    }
    audio.loop = false
    audio.addEventListener('timeupdate', loopClip)
    audio.play().catch(() => {})
    return () => { audio.removeEventListener('timeupdate', loopClip); audio.removeEventListener('loadedmetadata', seekToStart) }
  }, [activeItem, isMuted])

  useEffect(() => () => audioRef.current?.pause(), [])

  // Desktop-only: click the arrows or press ↑/↓ to move one reel at a time instead of relying
  // on the (now-hidden) native scrollbar — mobile keeps its normal touch scroll/swipe.
  const scrollByReel = useCallback(direction => {
    const feed = feedRef.current
    if (!feed) return
    feed.scrollBy({ top: direction * feed.clientHeight, behavior: 'smooth' })
  }, [])

  useEffect(() => {
    const onKeyDown = event => {
      if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return
      const tag = document.activeElement?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      event.preventDefault()
      scrollByReel(event.key === 'ArrowDown' ? 1 : -1)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [scrollByReel])

  const toggleMute = () => setIsMuted(previous => {
    const next = !previous
    try { window.localStorage.setItem('zomafeeds-muted', String(next)) } catch { /* storage unavailable */ }
    return next
  })

  const openComments = async item => {
    setActiveComments(item)
    setCommentsError('')
    setIsCommentsLoading(true)
    try {
      const { data } = await api.get(`/api/comments/${item._id}`)
      setComments(data.comments)
    } catch (error) {
      setCommentsError(error.response?.data?.message || 'Could not load comments.')
    } finally {
      setIsCommentsLoading(false)
    }
  }
  const addComment = async event => {
    event.preventDefault()
    if (!commentText.trim()) return
    try {
      setPendingAction('comment')
      const { data } = await api.post('/api/comments', { food: activeComments._id, text: commentText })
      setComments(previous => [data.comment, ...previous])
      onCommentAdded?.(activeComments, comments.length + 1)
      setCommentText('')
    } catch (error) {
      setCommentsError(error.response?.data?.message || 'Could not post comment.')
    } finally {
      setPendingAction('')
    }
  }

  const runAction = async (action, item, callback) => {
    const actionKey = `${action}-${item._id}`
    if (pendingAction) return
    setPendingAction(actionKey)
    try {
      await callback?.(item)
    } finally {
      setPendingAction('')
    }
  }

  const renderActionButtons = item => <>
    <div className="reel-action-group"><button type="button" onClick={toggleMute} className="reel-action" aria-label={isMuted ? 'Turn sound on' : 'Turn sound off'}>{isMuted ? '🔇' : '🔊'}</button></div>
    <div className="reel-action-group"><button disabled={Boolean(pendingAction)} onClick={() => runAction('like', item, onLike)} className={`reel-action ${item.liked ? 'is-active' : ''}`} aria-label="Like">{pendingAction === `like-${item._id}` ? '...' : '♥'}</button><div className="reel-action__count">{item.likeCount ?? 0}</div></div>
    <div className="reel-action-group"><button disabled={Boolean(pendingAction)} onClick={() => runAction('save', item, onSave)} className={`reel-action ${item.saved ? 'is-active' : ''}`} aria-label="Save">{pendingAction === `save-${item._id}` ? '...' : '🔖'}</button><div className="reel-action__count">{item.savesCount ?? 0}</div></div>
    <div className="reel-action-group"><button disabled={isCommentsLoading} onClick={() => openComments(item)} className="reel-action" aria-label="Comments">{isCommentsLoading ? '...' : '☵'}</button><div className="reel-action__count">{item.commentsCount ?? 0}</div></div>
  </>

  return <div className="reels-page"><audio ref={audioRef} /><div className="reels-feed" ref={feedRef} role="list">
    {items.length === 0 && <div className="empty-state"><p>{emptyMessage}</p></div>}
    {items.map(item => <section key={item._id} className="reel" role="listitem">
      <video ref={element => element ? videoRefs.current.set(item._id, element) : videoRefs.current.delete(item._id)} data-id={item._id} className="reel-video" src={item.video} muted={isMuted || Boolean(item.song?.url)} playsInline loop preload="metadata" />
      <div className="reel-overlay"><div className="reel-overlay-gradient" aria-hidden="true" />
        <div className="reel-actions reel-actions--inline">{renderActionButtons(item)}</div>
        <div className="reel-content">{item.song?.title && <div className="reel-song" aria-label={`Song: ${item.song.title} by ${item.song.artist}`}><span aria-hidden="true">♪</span> {item.song.title} {item.song.artist ? `— ${item.song.artist}` : ''}</div>}<strong className="reel-title">{item.name}</strong><div className="reel-rating" aria-label={`${item.averageRating || 0} out of 5 stars from ${item.reviewCount || 0} reviews`}>★ {item.averageRating ? item.averageRating.toFixed(1) : '0.0'} <span>({item.reviewCount || 0})</span></div><p className="reel-description">{item.description}</p><div className="reel-links">{item.foodPartner?._id && <Link className="reel-btn" to={`/food-partner/${item.foodPartner._id}`}>Visit store</Link>}<Link className="reel-btn reel-btn-light" to={`/order/${item._id}`}>Order now</Link></div></div>
      </div>
    </section>)}
  </div>
  {items.length > 1 && <div className="reels-scroll-nav">
    <button type="button" onClick={() => scrollByReel(-1)} aria-label="Previous reel">▲</button>
    <button type="button" onClick={() => scrollByReel(1)} aria-label="Next reel">▼</button>
  </div>}
  {activeItem && <div className="reel-actions reel-actions--floating">{renderActionButtons(activeItem)}</div>}
  {activeComments && <aside className="comments-panel">
    <div className="comments-header"><h2>Comments</h2><button className="comments-close" onClick={() => setActiveComments(null)} aria-label="Close comments">×</button></div>
    <div className="comments-list">{isCommentsLoading ? <p>Loading comments...</p> : commentsError ? <p className="error-text" role="alert">{commentsError}</p> : comments.length === 0 ? <p>There is no comment</p> : comments.map(comment => <div className="comment" key={comment._id}><strong>{comment.user?.fullName}</strong><span>{comment.text}</span></div>)}</div>
    <form className="comments-form" onSubmit={addComment}><input disabled={pendingAction === 'comment'} value={commentText} onChange={event => setCommentText(event.target.value)} placeholder="Add a comment" /><button disabled={pendingAction === 'comment'} type="submit">{pendingAction === 'comment' ? 'Posting...' : 'Post'}</button></form>
  </aside>}</div>
}
export default ReelFeed
