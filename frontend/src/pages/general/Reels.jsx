import { useEffect, useState } from 'react'
import '../../styles/reels.css'
import ReelFeed from '../../components/ReelFeed'
import PageNav from '../../components/PageNav'
import api from '../../config/api'
import LoadingState from '../../components/LoadingState'

const Reels = () => {
  const [videos, setVideos] = useState([])
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  useEffect(() => { api.get('/api/food').then(({ data }) => setVideos(data.foodItems)).catch(() => setError('Unable to load food videos.')).finally(() => setIsLoading(false)) }, [])
  const update = (key, item, value) => setVideos(previous => previous.map(video => video._id === item._id ? { ...video, [key]: value } : video))
  const likeVideo = async item => { try { const { data } = await api.post('/api/food/like', { foodId: item._id }); update('likeCount', item, data.likeCount); update('liked', item, data.liked) } catch { setError('Unable to update this like.') } }
  const saveVideo = async item => { try { const { data } = await api.post('/api/food/save', { foodId: item._id }); update('savesCount', item, data.savesCount); update('saved', item, data.saved) } catch { setError('Unable to update this save.') } }
  const commentAdded = (item, count) => update('commentsCount', item, count)
  return <><PageNav homePath="/home" />{error && <p className="error-text" role="alert">{error}</p>}{isLoading ? <LoadingState label="Loading food videos..." /> : <ReelFeed items={videos} onLike={likeVideo} onSave={saveVideo} onCommentAdded={commentAdded} emptyMessage="No food videos yet." />}</>
}
export default Reels
