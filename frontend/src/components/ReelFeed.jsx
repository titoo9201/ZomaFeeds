import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart, Bookmark, MessageCircle, Volume2, VolumeX, MoreVertical, Trash2 } from 'lucide-react'
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
  const [currentUserId, setCurrentUserId] = useState('')
  const [commentMenu, setCommentMenu] = useState(null)
  const commentRefs = useRef(new Map())
  const pressTimerRef = useRef(null)

  useEffect(() => { api.get('/api/auth/me').then(({ data }) => setCurrentUserId(data.account?._id || '')).catch(() => {}) }, [])

  const itemIds = items.map(item => item._id).join(',')

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
  }, [itemIds])

  const activeItem = items.find(item => item._id === activeItemId) ?? items[0]
  const activeSongUrl = activeItem?.song?.url
  const activeSongStart = activeItem?.song?.startTime || 0
  const activeSongDuration = activeItem?.song?.clipDuration || 30

  useEffect(() => {
    videoRefs.current.forEach((video, id) => {
      const item = items.find(candidate => candidate._id === id)
      video.muted = isMuted || Boolean(item?.song?.url)
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

  return <div className={`reels-page${activeComments ? ' reels-page--comments-open' : ''}`}><audio ref={audioRef} /><div className="reels-feed" ref={feedRef} role="list">
    {items.length === 0 && <div className="empty-state"><p>{emptyMessage}</p></div>}
    {items.map(item => <section key={item._id} className={`reel${activeComments?._id === item._id ? ' reel--shrunk' : ''}`} role="listitem">
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
