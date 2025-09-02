import { useState, useEffect, useCallback, useRef } from 'react';

export function useVideoPolling(sessionId, onNewVideoDetected) {
  const [videos, setVideos] = useState([]);
  const [currentVideo, setCurrentVideo] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const lastVideoCount = useRef(0);
  const pollingInterval = useRef(null);

  const fetchVideos = useCallback(async () => {
    if (!sessionId) return;
    
    try {
      const response = await fetch(`http://localhost:8000/api/videos/${sessionId}`);
      const data = await response.json();
      
      if (data.videos) {
        const newVideoCount = data.videos.length;
        const hadNewVideo = newVideoCount > lastVideoCount.current;
        const wasRecording = isRecording;
        const nowRecording = data.is_recording || false;
        
        setVideos(data.videos);
        setIsRecording(nowRecording);
        
        // Only open panel when recording STOPS and there's a new video
        if (wasRecording && !nowRecording && hadNewVideo && newVideoCount > 0) {
          console.log('Recording finished! New video available, opening panel...');
          if (onNewVideoDetected) {
            onNewVideoDetected(data.videos[0]); // Pass the newest video
          }
        }
        
        // Auto-select newest video when recording finishes or when there's a new video
        if (data.videos.length > 0 && (!currentVideo || hadNewVideo)) {
          setCurrentVideo(data.videos[0]);
        }
        
        // Update the count for next comparison
        lastVideoCount.current = newVideoCount;
      }
    } catch (error) {
      console.error('Error fetching videos:', error);
    }
  }, [sessionId, currentVideo, isRecording, onNewVideoDetected]);

  const getVideoUrl = useCallback((video) => {
    if (!video) return null;
    return `http://localhost:8000/videos/${sessionId}/${video.timestamp}/${video.filename}`;
  }, [sessionId]);

  const startPolling = useCallback(() => {
    if (!sessionId || pollingInterval.current) return;
    
    console.log('Starting video polling for session:', sessionId);
    
    // Fetch immediately
    fetchVideos();
    
    // Then poll every 3 seconds
    pollingInterval.current = setInterval(fetchVideos, 3000);
  }, [sessionId, fetchVideos]);

  const stopPolling = useCallback(() => {
    if (pollingInterval.current) {
      console.log('Stopping video polling');
      clearInterval(pollingInterval.current);
      pollingInterval.current = null;
    }
  }, []);

  // Start/stop polling when sessionId changes
  useEffect(() => {
    if (sessionId) {
      startPolling();
    } else {
      stopPolling();
    }

    return () => stopPolling();
  }, [sessionId, startPolling, stopPolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  return {
    videos,
    currentVideo,
    setCurrentVideo,
    isRecording,
    getVideoUrl,
    fetchVideos
  };
}