import { useCallback, useEffect, useState } from 'react'
import '../../styles/reels.css'
import ReelFeed from '../../components/ReelFeed'
import PageNav from '../../components/PageNav'
import NoNearbyRestaurants from '../../components/NoNearbyRestaurants'
import api from '../../config/api'
import LoadingState from '../../components/LoadingState'
import { REELS_REFRESH_EVENT } from '../../config/reelsRefresh'

const Reels = () => {
  const [videos, setVideos] = useState([])
  const [hasUserLocation, setHasUserLocation] = useState(true)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  const loadFeed = useCallback(() => api.get('/api/food').then(({ data }) => {
    setVideos(data.foodItems)
    setHasUserLocation(data.hasUserLocation)
    setError('')
  }).catch(() => setError('Unable to load food videos.')), [])

  useEffect(() => { loadFeed().finally(() => setIsLoading(false)) }, [loadFeed])

  // Tapping the Reels tab again while already here re-fetches and jumps back to the top —
  // BottomNav dispatches this same event, matching the Instagram "tap active tab" pattern.
  useEffect(() => {
    window.addEventListener(REELS_REFRESH_EVENT, loadFeed)
    return () => window.removeEventListener(REELS_REFRESH_EVENT, loadFeed)
  }, [loadFeed])

  const update = (key, item, value) => setVideos(previous => previous.map(video => video._id === item._id ? { ...video, [key]: value } : video))
  const likeVideo = async item => { try { const { data } = await api.post('/api/food/like', { foodId: item._id }); update('likeCount', item, data.likeCount); update('liked', item, data.liked) } catch { setError('Unable to update this like.') } }
  const saveVideo = async item => { try { const { data } = await api.post('/api/food/save', { foodId: item._id }); update('savesCount', item, data.savesCount); update('saved', item, data.saved) } catch { setError('Unable to update this save.') } }
  const commentAdded = (item, count) => update('commentsCount', item, count)

  const hasNoNearbyRestaurants = !isLoading && hasUserLocation && videos.length === 0

  return <>
    <PageNav homePath="/home" />
    {error && <p className="error-text" role="alert">{error}</p>}
    {isLoading
      ? <LoadingState label="Loading food videos..." />
      : hasNoNearbyRestaurants
        ? <div className="reels-page"><NoNearbyRestaurants /></div>
        : <ReelFeed items={videos} onLike={likeVideo} onSave={saveVideo} onCommentAdded={commentAdded} onRefresh={loadFeed} emptyMessage="No food videos yet." />}
  </>
}
export default Reels
