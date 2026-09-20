import React, { useEffect, useState } from 'react'
import '../../styles/reels.css'
import api from '../../config/api'
import ReelFeed from '../../components/ReelFeed'
import PageNav from '../../components/PageNav'
import LoadingState from '../../components/LoadingState'

const Saved = () => {
    const [ videos, setVideos ] = useState([])
    const [ error, setError ] = useState('')
    const [ isLoading, setIsLoading ] = useState(true)

    useEffect(() => {
        api.get('/api/food/save')
            .then(response => {
                setVideos(response.data.savedFoods)
            })
            .catch(() => setError('Unable to load saved videos.'))
            .finally(() => setIsLoading(false))
    }, [])

    const removeSaved = async (item) => {
        try {
            await api.post('/api/food/save', { foodId: item._id })
            setVideos((prev) => prev.filter((v) => v._id !== item._id))
        } catch (err) { void err }
    }

    const likeSaved = async (item) => {
        try {
            const { data } = await api.post('/api/food/like', { foodId: item._id })
            setVideos((previous) => previous.map((video) => video._id === item._id ? { ...video, liked: data.liked, likeCount: data.likeCount } : video))
        } catch {
            setError('Unable to update this like.')
        }
    }

    const commentAdded = (item, count) => setVideos((previous) => previous.map((video) => video._id === item._id ? { ...video, commentsCount: count } : video))

    return (
        <>
        <PageNav homePath="/home" />
        {error && <p className="error-text" role="alert">{error}</p>}
        {isLoading ? <LoadingState label="Loading saved videos..." /> : <ReelFeed
            items={videos}
            onLike={likeSaved}
            onSave={removeSaved}
            onCommentAdded={commentAdded}
            emptyMessage="No saved videos yet."
        />}
        </>
    )
}

export default Saved
