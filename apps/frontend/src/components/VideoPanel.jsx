import { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  X,
  ChevronDown,
  Video,
  Circle,
  Monitor,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BrowserStream } from './BrowserStream';

export function VideoPanel({
  videos,
  currentVideo,
  setCurrentVideo,
  getVideoUrl,
  isRecording,
  isConnected,
  sessionId,
  onClose,
}) {
  const [activeTab, setActiveTab] = useState('videos'); // 'videos' or 'stream'
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const videoRef = useRef(null);
  const containerRef = useRef(null);

  // Auto-switch to stream tab when recording starts
  useEffect(() => {
    if (isRecording) {
      setActiveTab('stream');
    }
  }, [isRecording]);

  // Update video source when currentVideo changes and autoplay
  useEffect(() => {
    if (!currentVideo) {
      return;
    }

    if (videoRef.current) {
      const videoUrl = getVideoUrl(currentVideo);
      if (videoUrl && videoRef.current.src !== videoUrl) {
        console.log('Loading completed video:', videoUrl);
        videoRef.current.src = videoUrl;
        videoRef.current.load();
        
        // Autoplay when video is loaded
        const handleCanPlay = () => {
          videoRef.current.play().then(() => {
            setIsPlaying(true);
            console.log('Video started playing automatically');
          }).catch((error) => {
            console.log('Autoplay prevented by browser:', error);
            setIsPlaying(false);
          });
          videoRef.current.removeEventListener('canplay', handleCanPlay);
        };
        
        videoRef.current.addEventListener('canplay', handleCanPlay);
        
        // Cleanup listener if component unmounts
        return () => {
          if (videoRef.current) {
            videoRef.current.removeEventListener('canplay', handleCanPlay);
          }
        };
      }
    }
  }, [currentVideo, getVideoUrl]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleSeek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    const newTime = pos * duration;

    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getVideoDisplayName = (video) => {
    if (!video) return 'Nenhum vídeo';
    const date = new Date(video.created_time * 1000);
    return `${date.toLocaleTimeString()} - ${video.filename}`;
  };

  return (
    <div
      ref={containerRef}
      className={`bg-white border-l border-gray-200 shadow-lg transition-all duration-300 z-40 flex flex-col ${
        isFullscreen ? 'fixed inset-0 border-none' : 'w-[32rem] h-full'
      }`}
    >
      {/* Header */}
      <div
        className={`border-b border-gray-200 ${
          isFullscreen
            ? 'absolute top-0 left-0 right-0 bg-black bg-opacity-50 z-50'
            : ''
        }`}
      >
        <div className={`flex items-center justify-between p-4`}>
          <div className="flex items-center space-x-2">
            <Video className="h-5 w-5 text-gray-600" />
            <h3
              className={`font-medium ${
                isFullscreen ? 'text-white' : 'text-gray-900'
              }`}
            >
              Gravação do Agente
            </h3>
            {isConnected && (
              <div
                className={`h-2 w-2 rounded-full bg-green-500 ${
                  isFullscreen ? '' : ''
                }`}
              />
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className={`p-1 ${
              isFullscreen
                ? 'text-white hover:bg-white hover:bg-opacity-20'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Tabs */}
        {!isFullscreen && (
          <div className="flex border-t border-gray-200">
            <button
              onClick={() => setActiveTab('videos')}
              className={`flex-1 px-4 py-3 text-sm font-medium border-r border-gray-200 transition-colors ${
                activeTab === 'videos'
                  ? 'bg-gray-50 text-gray-900 border-b-2 border-blue-500'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <Video className="h-4 w-4" />
                <span>Vídeos ({videos.length})</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('stream')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${
                activeTab === 'stream'
                  ? 'bg-gray-50 text-gray-900 border-b-2 border-blue-500'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <Monitor className="h-4 w-4" />
                <span>Stream Ao Vivo</span>
                {isRecording && (
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                )}
              </div>
            </button>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {activeTab === 'stream' ? (
          /* Browser Stream */
          <div className="flex-1">
            <BrowserStream 
              isRecording={isRecording}
              autoConnect={true}
              wsUrl="ws://localhost:8080"
              className="h-full"
            />
          </div>
        ) : (
          /* Video Player and List */
          <>
            {/* Video Player */}
            <div
              className={`relative bg-black ${
                isFullscreen
                  ? 'h-full flex items-center justify-center'
                  : 'aspect-video'
              }`}
              onMouseEnter={() => setShowControls(true)}
              onMouseLeave={() => setShowControls(false)}
            >
              {currentVideo ? (
                <>
                  <video
                    ref={videoRef}
                    className={`w-full h-full object-contain ${
                      isFullscreen ? 'max-h-screen' : ''
                    }`}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    controls={false}
                  />

                  {/* Video Controls */}
                  <div
                    className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4 transition-opacity duration-300 ${
                      isFullscreen ? 'mb-4' : ''
                    } ${showControls ? 'opacity-100' : 'opacity-0'}`}
                  >
                    {/* Progress Bar */}
                    <div
                      className="w-full h-2 bg-gray-600 rounded cursor-pointer mb-3"
                      onClick={handleSeek}
                    >
                      <div
                        className="h-full bg-white rounded"
                        style={{ width: `${(currentTime / duration) * 100}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={togglePlay}
                          className="text-white hover:bg-white hover:bg-opacity-20"
                        >
                          {isPlaying ? (
                            <Pause className="h-4 w-4" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </Button>

                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={toggleMute}
                            className="text-white hover:bg-white hover:bg-opacity-20"
                          >
                            {isMuted ? (
                              <VolumeX className="h-4 w-4" />
                            ) : (
                              <Volume2 className="h-4 w-4" />
                            )}
                          </Button>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={volume}
                            onChange={handleVolumeChange}
                            className="w-16 h-1 bg-gray-600 rounded outline-none"
                          />
                        </div>

                        <span className="text-white text-sm">
                          {formatTime(currentTime)} / {formatTime(duration)}
                        </span>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={toggleFullscreen}
                        className="text-white hover:bg-white hover:bg-opacity-20"
                      >
                        <Maximize className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 p-6">
                  <Video className="h-12 w-12 mb-2" />
                  <p className="text-sm">
                    {videos.length === 0
                      ? 'Nenhum vídeo disponível'
                      : 'Selecione um vídeo para assistir'}
                  </p>
                </div>
              )}
            </div>

            {/* Video List */}
            {!isFullscreen && videos.length > 0 && (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="p-4 border-b border-gray-200">
                  <h4 className="text-sm font-medium text-gray-700">
                    Vídeos ({videos.length})
                  </h4>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  <div className="space-y-3">
                    {videos.map((video, index) => {
                      const date = new Date(video.created_time * 1000);
                      const isSelected = currentVideo?.filename === video.filename;

                      return (
                        <button
                          key={`${video.timestamp}-${video.filename}`}
                          onClick={() => setCurrentVideo(video)}
                          className={`w-full p-3 text-left rounded-lg border transition-all duration-200 ${
                            isSelected
                              ? 'bg-blue-50 text-blue-900 border-blue-200 shadow-md'
                              : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-1">
                            <span
                              className={`text-sm font-medium truncate ${
                                isSelected ? 'text-blue-900' : 'text-gray-900'
                              }`}
                            >
                              {video.filename}
                            </span>
                            {index === 0 && (
                              <span
                                className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                                  isSelected
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-green-100 text-green-700'
                                }`}
                              >
                                Recente
                              </span>
                            )}
                          </div>
                          <div
                            className={`text-xs ${
                              isSelected ? 'text-blue-600' : 'text-gray-500'
                            }`}
                          >
                            <div>{date.toLocaleDateString('pt-BR')}</div>
                            <div>{date.toLocaleTimeString('pt-BR')}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}