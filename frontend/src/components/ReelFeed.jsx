import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart, Bookmark, MessageCircle, Volume2, VolumeX, MoreVertical, Trash2 } from 'lucide-react'
import api from '../config/api'
import { STANDARD_DELIVERY_RANGE_KM } from '../config/pricing'

const getStoredMuted = () => {
  try { return window.localStorage.getItem('zomafeeds-muted') !== 'false' } catch { return true }
}

const PULL_THRESHOLD = 70
const PULL_MAX = 100

const ReelFeed = ({ items = [], onLike, onSave, onCommentAdded, onRefresh, emptyMessage = 'No videos yet.' }) => {
  const videoRefs = useRef(new Map())
  const audioRef = useRef(null)
  const feedRef = useRef(null)
  const pullStartYRef = useRef(null)
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [activeItemId, setActiveItemId] = useState(null)
  const [isMuted, setIsMuted] = useState(getStoredMuted)
  const [activeComments, setActiveComments] = useState(null)
  const [comments, setComments] = useState([])
  const [commentText, setCommentText] = useState('')
  const [commentsError, setCommentsError] = useState('')
  const [isCommentsLoading, setIsCommentsLoading] = useState(false)
  const [pendingAction, setPendingAction] = useState('')
  const [currentUserId, setCurrentUserId] = useState('')
  const [commentMenu, setCommentMenu] = useState(null)
  const commentRefs = useRef(new Map())
  const pressTimerRef = useRef(null)
  const activeCommentsRef = useRef(null)
  useEffect(() => { activeCommentsRef.current = activeComments }, [activeComments])

  useEffect(() => { api.get('/api/auth/me').then(({ data }) => setCurrentUserId(data.account?._id || '')).catch(() => {}) }, [])

  const itemIds = items.map(item => item._id).join(',')

  useEffect(() => {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      const el = entry.target
      const isVideo = el.tagName === 'VIDEO'
      if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
        if (isVideo) el.play().catch(() => {})
        if (!activeCommentsRef.current) setActiveItemId(el.dataset.id)
      } else if (isVideo) el.pause()
    }), { threshold: [0, 0.6, 1] })
    videoRefs.current.forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [itemIds])

  const activeItem = items.find(item => item._id === activeItemId) ?? items[0]
  const activeSongUrl = activeItem?.song?.url
  const activeSongStart = activeItem?.song?.startTime || 0
  const activeSongDuration = activeItem?.song?.clipDuration || 30

  useEffect(() => {
    videoRefs.current.forEach((el, id) => {
      if (el.tagName !== 'VIDEO') return
      const item = items.find(candidate => candidate._id === id)
      el.muted = isMuted || Boolean(item?.song?.url)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMuted, itemIds])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    if (!activeSongUrl || isMuted) { audio.pause(); return }

    const seekToStart = () => { audio.currentTime = activeSongStart }
    const loopClip = () => { if (audio.currentTime >= activeSongStart + activeSongDuration || audio.currentTime < activeSongStart) audio.currentTime = activeSongStart }

    if (audio.src !== activeSongUrl) {
      audio.src = activeSongUrl
      audio.addEventListener('loadedmetadata', seekToStart, { once: true })
      audio.play().catch(() => {})
    } else if (audio.paused) {
      audio.play().catch(() => {})
    }
    audio.loop = false
    audio.addEventListener('timeupdate', loopClip)
    return () => { audio.removeEventListener('timeupdate', loopClip); audio.removeEventListener('loadedmetadata', seekToStart) }
  }, [activeSongUrl, activeSongStart, activeSongDuration, isMuted])

  useEffect(() => () => audioRef.current?.pause(), [])

  // A fresh mount (login, first visit to Reels) always starts at the first reel — the browser
  // can otherwise restore a stale scroll position on some navigations.
  useEffect(() => { feedRef.current?.scrollTo({ top: 0 }) }, [])

  // Pull-to-refresh: only engages when already scrolled to the very top and the user drags
  // further down from there (mirrors native app feed-refresh gestures). Uses raw Pointer
  // Events, same pattern as SwipeToConfirm, so it works for touch, mouse and pen alike.
  const onPullStart = event => {
    if (feedRef.current && feedRef.current.scrollTop <= 0) pullStartYRef.current = event.clientY
  }
  const onPullMove = event => {
    if (pullStartYRef.current == null || isRefreshing) return
    if (!feedRef.current || feedRef.current.scrollTop > 0) { pullStartYRef.current = null; setPullDistance(0); return }
    const delta = event.clientY - pullStartYRef.current
    setPullDistance(delta > 0 ? Math.min(PULL_MAX, delta) : 0)
  }
  const onPullEnd = async () => {
    if (pullStartYRef.current == null) return
    pullStartYRef.current = null
    if (pullDistance >= PULL_THRESHOLD && onRefresh) {
      setIsRefreshing(true)
      try { await onRefresh() } finally { setIsRefreshing(false) }
    }
    setPullDistance(0)
  }

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
    try { window.localStorage.setItem('zomafeeds-muted', String(next)) } catch (err) { void err }
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

  const openCommentMenu = comment => {
    if (!comment._id || comment.user?._id !== currentUserId) return
    const el = commentRefs.current.get(comment._id)
    const rect = el?.getBoundingClientRect()
    if (!rect) return
    const width = 190
    setCommentMenu({
      comment,
      style: {
        top: Math.min(rect.bottom + 6, window.innerHeight - 110),
        left: Math.min(rect.left, window.innerWidth - width - 12),
        width
      }
    })
  }
  const closeCommentMenu = () => setCommentMenu(null)

  const startPress = comment => { pressTimerRef.current = window.setTimeout(() => openCommentMenu(comment), 500) }
  const cancelPress = () => window.clearTimeout(pressTimerRef.current)

  const deleteComment = async comment => {
    closeCommentMenu()
    try {
      await api.delete(`/api/comments/${comment._id}`)
      setComments(previous => previous.filter(item => item._id !== comment._id))
      onCommentAdded?.(activeComments, Math.max(0, comments.length - 1))
    } catch (error) {
      setCommentsError(error.response?.data?.message || 'Could not delete this comment.')
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
    <div className="reel-action-group"><button type="button" onClick={toggleMute} className="reel-action" aria-label={isMuted ? 'Turn sound on' : 'Turn sound off'}>{isMuted ? <VolumeX size={22} /> : <Volume2 size={22} />}</button></div>
    <div className="reel-action-group"><button disabled={Boolean(pendingAction)} onClick={() => runAction('like', item, onLike)} className={`reel-action ${item.liked ? 'is-active' : ''}`} aria-label="Like">{pendingAction === `like-${item._id}` ? '...' : <Heart size={22} fill={item.liked ? 'currentColor' : 'none'} />}</button><div className="reel-action__count">{item.likeCount ?? 0}</div></div>
    <div className="reel-action-group"><button disabled={Boolean(pendingAction)} onClick={() => runAction('save', item, onSave)} className={`reel-action ${item.saved ? 'is-active' : ''}`} aria-label="Save">{pendingAction === `save-${item._id}` ? '...' : <Bookmark size={22} fill={item.saved ? 'currentColor' : 'none'} />}</button><div className="reel-action__count">{item.savesCount ?? 0}</div></div>
    <div className="reel-action-group"><button disabled={isCommentsLoading} onClick={() => openComments(item)} className="reel-action" aria-label="Comments">{isCommentsLoading ? '...' : <MessageCircle size={22} />}</button><div className="reel-action__count">{item.commentsCount ?? 0}</div></div>
  </>

  return <div className={`reels-page${activeComments ? ' reels-page--comments-open' : ''}`}><audio ref={audioRef} /><div
    className="reels-feed"
    ref={feedRef}
    role="list"
    onPointerDown={onPullStart}
    onPointerMove={onPullMove}
    onPointerUp={onPullEnd}
    onPointerCancel={onPullEnd}
  >
    <div className="reel-pull-indicator" style={{ opacity: pullDistance / PULL_THRESHOLD, transform: `translate(-50%, ${Math.min(pullDistance, PULL_THRESHOLD) - 40}px)` }} aria-hidden="true">
      <span className={`reel-pull-spinner${isRefreshing ? ' is-spinning' : ''}`} />
    </div>
    {items.length === 0 && <div className="empty-state"><p>{emptyMessage}</p></div>}
    {items.map(item => { const isCommentsActive = activeComments?._id === item._id; return <section key={item._id} className={`reel${isCommentsActive ? ' reel--comments-active' : ''}`} role="listitem">
      <div className={`reel-media${isCommentsActive ? ' reel-media--floating' : ''}`}>
        {item.mediaType === 'image'
          ? <img ref={element => element ? videoRefs.current.set(item._id, element) : videoRefs.current.delete(item._id)} data-id={item._id} className="reel-video" src={item.video} alt={item.name} />
          : <video ref={element => element ? videoRefs.current.set(item._id, element) : videoRefs.current.delete(item._id)} data-id={item._id} className="reel-video" src={item.video} muted={isMuted || Boolean(item.song?.url)} playsInline loop preload="metadata" />}
      </div>
      <div className="reel-overlay"><div className="reel-overlay-gradient" aria-hidden="true" />
        <div className="reel-actions reel-actions--inline">{renderActionButtons(item)}</div>
        <div className="reel-content">{item.song?.title && <div className="reel-song" aria-label={`Song: ${item.song.title} by ${item.song.artist}`}><span aria-hidden="true">♪</span> {item.song.title} {item.song.artist ? `— ${item.song.artist}` : ''}</div>}<strong className="reel-title">{item.name}</strong><div className="reel-rating" aria-label={`${item.averageRating || 0} out of 5 stars from ${item.reviewCount || 0} reviews`}>★ {item.averageRating ? item.averageRating.toFixed(1) : '0.0'} <span>({item.reviewCount || 0})</span></div><p className="reel-description">{item.description}</p>{item.foodPartner?.distanceKm > STANDARD_DELIVERY_RANGE_KM && <p className="reel-distance-note">📍 This restaurant is {item.foodPartner.distanceKm}km away — delivery normally works up to {STANDARD_DELIVERY_RANGE_KM}km, but you can still order from here at a higher delivery fee.</p>}<div className="reel-links">{item.foodPartner?._id && <Link className="reel-btn" to={`/food-partner/${item.foodPartner._id}`}>Visit store</Link>}<Link className="reel-btn reel-btn-light" to={`/order/${item._id}`}>Order now</Link></div></div>
      </div>
    </section> })}
  </div>
  {items.length > 1 && <div className="reels-scroll-nav">
    <button type="button" onClick={() => scrollByReel(-1)} aria-label="Previous reel">▲</button>
    <button type="button" onClick={() => scrollByReel(1)} aria-label="Next reel">▼</button>
  </div>}
  {activeItem && <div className="reel-actions reel-actions--floating">{renderActionButtons(activeItem)}</div>}
  {activeComments && <aside className="comments-panel">
    <div className="comments-drag-handle" aria-hidden="true" />
    <div className="comments-header"><h2>Comments</h2><button className="comments-close" onClick={() => setActiveComments(null)} aria-label="Close comments">×</button></div>
    <div className="comments-list">{isCommentsLoading ? <p>Loading comments...</p> : commentsError ? <p className="error-text" role="alert">{commentsError}</p> : comments.length === 0 ? <p>There is no comment</p> : comments.map(comment => {
      const isMine = comment.user?._id === currentUserId
      return <div
        key={comment._id}
        ref={element => element ? commentRefs.current.set(comment._id, element) : commentRefs.current.delete(comment._id)}
        className={`comment${commentMenu?.comment._id === comment._id ? ' comment--menu-active' : ''}`}
        onTouchStart={isMine ? () => startPress(comment) : undefined}
        onTouchEnd={isMine ? cancelPress : undefined}
        onTouchMove={isMine ? cancelPress : undefined}
        onContextMenu={isMine ? event => event.preventDefault() : undefined}
      >
        {comment.user?.profilePicture ? <img className="comment-avatar" src={comment.user.profilePicture} alt="" /> : <div className="comment-avatar comment-avatar-fallback">{comment.user?.fullName?.slice(0, 1) || 'U'}</div>}
        <div className="comment-body"><strong>{comment.user?.fullName}</strong><span>{comment.text}</span></div>
        {isMine && <button type="button" className="comment-menu-btn" onClick={() => openCommentMenu(comment)} aria-label="Comment options"><MoreVertical size={16} /></button>}
      </div>
    })}</div>
    <form className="comments-form" onSubmit={addComment}><input disabled={pendingAction === 'comment'} value={commentText} onChange={event => setCommentText(event.target.value)} placeholder="Add a comment" /><button disabled={pendingAction === 'comment'} type="submit">{pendingAction === 'comment' ? 'Posting...' : 'Post'}</button></form>
  </aside>}
  {commentMenu && <>
    <div className="comment-menu-backdrop" onClick={closeCommentMenu} />
    <div className="comment-menu-popup" style={commentMenu.style}>
      <button type="button" className="comment-menu-delete" onClick={() => deleteComment(commentMenu.comment)}><Trash2 size={16} /> Delete</button>
      <button type="button" className="comment-menu-cancel" onClick={closeCommentMenu}>Cancel</button>
    </div>
  </>}</div>
}
export default ReelFeed
