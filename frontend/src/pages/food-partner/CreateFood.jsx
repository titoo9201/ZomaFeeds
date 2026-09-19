import React, { useEffect, useMemo, useRef, useState } from 'react';
import api from '../../config/api';
import '../../styles/create-food.css';
import '../../styles/manage-food.css';
import { useNavigate } from 'react-router-dom';
import PageNav from '../../components/PageNav';
import SongPicker from '../../components/SongPicker';

const CreateFood = () => {
    const [ name, setName ] = useState('');
    const [ description, setDescription ] = useState('');
    const [ category, setCategory ] = useState('');
    const [ price, setPrice ] = useState(1);
    const [ song, setSong ] = useState(null);
    const [ videoFile, setVideoFile ] = useState(null);
    const [ videoURL, setVideoURL ] = useState('');
    const [ videoDuration, setVideoDuration ] = useState(null);
    const [ fileError, setFileError ] = useState('');
    const [ submitError, setSubmitError ] = useState('');
    const [ isUploading, setIsUploading ] = useState(false);
    const [ uploadProgress, setUploadProgress ] = useState(0);
    const fileInputRef = useRef(null);
    const previewVideoRef = useRef(null);

    const navigate = useNavigate();

    useEffect(() => {
        if (!videoFile) {
            setVideoURL('');
            setVideoDuration(null);
            return;
        }
        const url = URL.createObjectURL(videoFile);
        setVideoURL(url);
        setVideoDuration(null);
        return () => URL.revokeObjectURL(url);
    }, [ videoFile ]);

    // Reels are capped at 30s and need at least 5s for a song clip to make sense — checked once
    // the browser reports the real duration, since that isn't known synchronously on selection.
    useEffect(() => {
        if (videoDuration == null) return;
        if (videoDuration < 5 || videoDuration > 30) {
            setFileError(`Video must be between 5 and 30 seconds long (this one is ${Math.round(videoDuration)}s).`);
            setVideoFile(null);
        }
    }, [ videoDuration ]);

    const onFileChange = (e) => {
        const file = e.target.files && e.target.files[ 0 ];
        if (!file) { setVideoFile(null); setFileError(''); return; }
        if (!file.type.startsWith('video/')) { setFileError('Please select a valid video file.'); return; }
        if (file.size > 100 * 1024 * 1024) { setFileError('Video must be smaller than 100 MB.'); return; }
        setFileError('');
        setVideoFile(file);
    };

    const onDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const file = e.dataTransfer?.files?.[ 0 ];
        if (!file) { return; }
        if (!file.type.startsWith('video/')) { setFileError('Please drop a valid video file.'); return; }
        if (file.size > 100 * 1024 * 1024) { setFileError('Video must be smaller than 100 MB.'); return; }
        setFileError('');
        setVideoFile(file);
    };

    const onDragOver = (e) => {
        e.preventDefault();
    };

    const openFileDialog = () => fileInputRef.current?.click();

    const togglePreviewPlayback = () => {
        const video = previewVideoRef.current;
        if (!video) return;
        if (video.paused) video.play().catch(() => {});
        else video.pause();
    };

    const onSubmit = async (e) => {
        e.preventDefault();

        const formData = new FormData();

        formData.append('name', name);
        formData.append('description', description);
        formData.append('category', category);
        formData.append('price', price);
        if (song) formData.append('song', JSON.stringify(song));
        formData.append("mama", videoFile);

        try {
            setSubmitError('');
            setIsUploading(true);
            setUploadProgress(0);
            await api.post('/api/food', formData, { onUploadProgress: event => { if (event.total) setUploadProgress(Math.round((event.loaded * 100) / event.total)); } });
            navigate('/dashboard');
        } catch (requestError) {
            setSubmitError(requestError.response?.data?.message || 'Upload failed. Please try again.');
        } finally {
            setIsUploading(false);
        }

    };

    const isDisabled = useMemo(() => !name.trim() || !videoFile || !category, [ name, videoFile, category ]);

    return (
        <div className="create-food-page">
            <PageNav homePath="/dashboard" />
            <div className="create-food-card">
                <header className="create-food-header">
                    <h1 className="create-food-title">Create Food</h1>
                    <p className="create-food-subtitle">Upload a short video, give it a name, and add a description.</p>
                    <p className="small-note">Video length: minimum 5 seconds, maximum 30 seconds.</p>
                </header>

                <form className="create-food-form" onSubmit={onSubmit}>
                    <div className="field-group">
                        <label htmlFor="foodVideo">Food Video</label>
                        <input
                            id="foodVideo"
                            ref={fileInputRef}
                            className="file-input-hidden"
                            type="file"
                            accept="video/*"
                            onChange={onFileChange}
                        />

                        <div
                            className="file-dropzone"
                            role="button"
                            tabIndex={0}
                            onClick={openFileDialog}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openFileDialog(); } }}
                            onDrop={onDrop}
                            onDragOver={onDragOver}
                        >
                            <div className="file-dropzone-inner">
                                <svg className="file-icon" width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                    <path d="M10.8 3.2a1 1 0 0 1 .4-.08h1.6a1 1 0 0 1 1 1v1.6h1.6a1 1 0 0 1 1 1v1.6h1.6a1 1 0 0 1 1 1v7.2a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6.4a1 1 0 0 1 1-1h1.6V3.2a1 1 0 0 1 1-1h1.6a1 1 0 0 1 .6.2z" stroke="currentColor" strokeWidth="1.5" />
                                    <path d="M9 12.75v-1.5c0-.62.67-1 1.2-.68l4.24 2.45c.53.3.53 1.05 0 1.35L10.2 16.82c-.53.31-1.2-.06-1.2-.68v-1.5" fill="currentColor" />
                                </svg>
                                <div className="file-dropzone-text">
                                    <strong>Tap to upload</strong> or drag and drop
                                </div>
                                <div className="file-hint">MP4, WebM, MOV • Up to ~100MB</div>
                            </div>
                        </div>

                        {fileError && <p className="error-text" role="alert">{fileError}</p>}

                        {videoFile && (
                            <div className="file-chip" aria-live="polite">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                                    <path d="M9 12.75v-1.5c0-.62.67-1 1.2-.68l4.24 2.45c.53.3.53 1.05 0 1.35L10.2 16.82c-.53.31-1.2-.06-1.2-.68v-1.5" />
                                </svg>
                                <span className="file-chip-name">{videoFile.name}</span>
                                <span className="file-chip-size">{(videoFile.size / 1024 / 1024).toFixed(1)} MB</span>
                                <div className="file-chip-actions">
                                    <button type="button" className="btn-ghost" onClick={openFileDialog}>Change</button>
                                    <button type="button" className="btn-ghost danger" onClick={() => { setVideoFile(null); setFileError(''); }}>Remove</button>
                                </div>
                            </div>
                        )}
                    </div>

                    {videoURL && (
                        <div className="video-preview">
                            <button className="video-preview-button" type="button" onClick={togglePreviewPlayback} aria-label="Play or pause video preview">
                                <video ref={previewVideoRef} className="video-preview-el" src={videoURL} muted playsInline preload="metadata" onLoadedMetadata={() => setVideoDuration(previewVideoRef.current?.duration || null)} />
                                <span className="video-preview-hint" aria-hidden="true">Tap to play / pause</span>
                            </button>
                        </div>
                    )}

                    <div className="field-group">
                        <label htmlFor="foodName">Name</label>
                        <input
                            id="foodName"
                            type="text"
                            placeholder="e.g., Spicy Paneer Wrap"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>

                    <div className="field-group">
                        <label htmlFor="foodDesc">Description</label>
                        <textarea
                            id="foodDesc"
                            rows={4}
                            placeholder="Write a short description: ingredients, taste, spice level, etc."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>

                    <div className="field-group">
                        <label htmlFor="foodPrice">Price (₹)</label>
                        <input
                            id="foodPrice"
                            type="number"
                            min="0"
                            step="1"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            required
                        />
                    </div>

                    <div className="field-group">
                        <label>Song (optional)</label>
                        <SongPicker selectedSong={song} onSelect={setSong} onRemove={() => setSong(null)} videoDuration={videoDuration} />
                    </div>

                    <div className="field-group">
                        <label htmlFor="foodCategory">Category</label>
                        <select id="foodCategory" value={category} onChange={(e) => setCategory(e.target.value)} required>
                            <option value="">Choose a category</option>
                            <option>Starters</option><option>Main Course - Veg</option><option>Main Course - Non Veg</option>
                            <option>Breads / Indian Breads</option><option>Rice & Biryani</option><option>Fast Food / Quick Bites</option>
                            <option>Soups & Salads</option><option>Desserts / Sweets (Meetha)</option><option>Beverages / Drinks</option>
                        </select>
                    </div>

                    <div className="form-actions">
                        {submitError && <p className="error-text" role="alert">{submitError}</p>}
                        <button className="btn-primary" type="submit" disabled={isDisabled || isUploading}>
                            {isUploading ? `Uploading ${uploadProgress}%...` : 'Save Food'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateFood;