import { useState, useEffect, useRef, useCallback } from 'react';
import { Video, VideoOff, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function BrowserStream({
  isRecording,
  autoConnect = true,
  wsUrl = 'ws://localhost:8080',
  className = '',
}) {
  const [ws, setWs] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected'); // 'disconnected', 'connecting', 'connected'
  const [frameCount, setFrameCount] = useState(0);
  const [fps, setFps] = useState(0);
  const [currentImage, setCurrentImage] = useState(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  const connectionStartTime = useRef(null);
  const fpsCounter = useRef([]);
  const reconnectTimeoutRef = useRef(null);
  const heartbeatTimeoutRef = useRef(null);
  const pingIntervalRef = useRef(null);
  const maxReconnectAttempts = 10;
  const baseReconnectDelay = 1000; // 1 second base delay

  // Clear all timers
  const clearTimers = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
      heartbeatTimeoutRef.current = null;
    }
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
  }, []);

  // Start heartbeat mechanism
  const startHeartbeat = useCallback((websocket) => {
    // Send ping every 30 seconds
    pingIntervalRef.current = setInterval(() => {
      if (websocket.readyState === WebSocket.OPEN) {
        websocket.send(JSON.stringify({ type: 'ping' }));

        // Set timeout for pong response
        heartbeatTimeoutRef.current = setTimeout(() => {
          console.log('WebSocket heartbeat timeout, closing connection');
          websocket.close(1000, 'Heartbeat timeout');
        }, 5000); // 5 second timeout for pong response
      }
    }, 30000);
  }, []);

  const connect = useCallback(() => {
    // Prevent multiple connection attempts
    if (
      ws &&
      (ws.readyState === WebSocket.CONNECTING ||
        ws.readyState === WebSocket.OPEN)
    ) {
      return;
    }

    // Clear any existing timers
    clearTimers();

    setConnectionStatus('connecting');
    console.log(
      `Connecting to browser stream... (attempt ${reconnectAttempts + 1})`
    );

    const websocket = new WebSocket(wsUrl);
    let connectionTimeout;

    // Set connection timeout
    connectionTimeout = setTimeout(() => {
      if (websocket.readyState === WebSocket.CONNECTING) {
        console.log('Connection timeout, closing WebSocket');
        websocket.close(1000, 'Connection timeout');
      }
    }, 10000); // 10 second timeout

    websocket.onopen = () => {
      console.log('Browser stream WebSocket connected');
      clearTimeout(connectionTimeout);
      setConnectionStatus('connected');
      setWs(websocket);
      connectionStartTime.current = Date.now();
      setReconnectAttempts(0);

      // Start heartbeat
      startHeartbeat(websocket);
    };

    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'screenshot' && data.data) {
          setFrameCount((prev) => prev + 1);
          fpsCounter.current.push(Date.now());
          setCurrentImage(
            `data:image/${data.format || 'png'};base64,${data.data}`
          );
        } else if (data.type === 'pong') {
          // Clear heartbeat timeout on pong response
          if (heartbeatTimeoutRef.current) {
            clearTimeout(heartbeatTimeoutRef.current);
            heartbeatTimeoutRef.current = null;
          }
        }
      } catch (error) {
        console.error('Error parsing browser stream message:', error);
      }
    };

    websocket.onerror = (error) => {
      console.error('Browser stream WebSocket error:', error);
      clearTimeout(connectionTimeout);
      setConnectionStatus('disconnected');
    };

    websocket.onclose = (event) => {
      console.log(
        `Browser stream WebSocket closed: ${event.code} - ${
          event.reason || 'No reason provided'
        }`
      );
      clearTimeout(connectionTimeout);
      clearTimers();
      setConnectionStatus('disconnected');
      setWs(null);

      // Auto-reconnect if recording and haven't exceeded max attempts
      if (
        isRecording &&
        autoConnect &&
        reconnectAttempts < maxReconnectAttempts
      ) {
        const newAttempts = reconnectAttempts + 1;
        setReconnectAttempts(newAttempts);

        // Exponential backoff: delay = baseDelay * 2^attempts (max 30 seconds)
        const delay = Math.min(
          baseReconnectDelay * Math.pow(2, newAttempts - 1),
          30000
        );

        console.log(
          `Reconnecting browser stream in ${delay}ms... (${newAttempts}/${maxReconnectAttempts})`
        );

        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, delay);
      } else if (reconnectAttempts >= maxReconnectAttempts) {
        console.error(
          'Max reconnection attempts reached. Stopping auto-reconnect.'
        );
      }
    };

    setWs(websocket);
  }, [
    wsUrl,
    isRecording,
    autoConnect,
    reconnectAttempts,
    clearTimers,
    startHeartbeat,
    baseReconnectDelay,
    maxReconnectAttempts,
  ]);

  const disconnect = useCallback(() => {
    clearTimers();

    if (ws && ws.readyState !== WebSocket.CLOSED) {
      ws.close(1000, 'Manual disconnect');
    }

    setWs(null);
    setConnectionStatus('disconnected');
    setCurrentImage(null);
    setFrameCount(0);
    setFps(0);
    fpsCounter.current = [];
    setReconnectAttempts(0);
  }, [ws, clearTimers]);

  // Connect when recording starts
  useEffect(() => {
    if (isRecording && autoConnect) {
      connect();
    } else if (!isRecording) {
      disconnect();
    }
  }, [isRecording, autoConnect, connect, disconnect]);

  // Calculate FPS
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      fpsCounter.current = fpsCounter.current.filter(
        (time) => now - time < 1000
      );
      setFps(fpsCounter.current.length);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimers();
      if (ws && ws.readyState !== WebSocket.CLOSED) {
        ws.close(1000, 'Component unmount');
      }
    };
  }, [ws, clearTimers]);

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'text-green-600';
      case 'connecting':
        return 'text-yellow-600';
      default:
        return 'text-red-600';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Conectado';
      case 'connecting':
        return reconnectAttempts > 0
          ? `Reconectando... (${reconnectAttempts}/${maxReconnectAttempts})`
          : 'Conectando...';
      default:
        if (reconnectAttempts >= maxReconnectAttempts) {
          return `Desconectado (máximo de tentativas atingido)`;
        }
        return reconnectAttempts > 0
          ? `Desconectado (tentativa ${reconnectAttempts})`
          : 'Desconectado';
    }
  };

  // Force reconnect function (resets attempt counter)
  const forceReconnect = useCallback(() => {
    setReconnectAttempts(0);
    disconnect();
    setTimeout(() => connect(), 500);
  }, [disconnect, connect]);

  const getStatusIcon = () => {
    if (connectionStatus === 'connected') {
      return <Wifi className="h-4 w-4" />;
    }
    return <WifiOff className="h-4 w-4" />;
  };

  return (
    <div className={`flex flex-col h-full bg-black ${className}`}>
      {/* Stream Status Header */}
      <div className="bg-gray-900 text-white p-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Video className="h-4 w-4" />
          <span className="text-sm font-medium">Browser Stream</span>
          {connectionStatus === 'connected' && (
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          )}
        </div>

        <div
          className={`flex items-center space-x-2 text-xs ${getStatusColor()}`}
        >
          {getStatusIcon()}
          <span>{getStatusText()}</span>
          {connectionStatus === 'disconnected' &&
            reconnectAttempts >= maxReconnectAttempts && (
              <Button
                size="sm"
                variant="outline"
                onClick={forceReconnect}
                className="text-xs px-2 py-1 h-6 border-gray-300 hover:bg-gray-50"
              >
                Tentar novamente
              </Button>
            )}
        </div>
      </div>

      {/* Stream Content */}
      <div className="flex-1 relative flex items-center justify-center">
        {currentImage ? (
          <img
            src={currentImage}
            alt="Browser Screenshot"
            className="max-w-full max-h-full object-contain"
            style={{ imageRendering: 'auto' }}
          />
        ) : (
          <div className="text-gray-400 text-center p-6">
            <VideoOff className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">
              {connectionStatus === 'connecting'
                ? 'Conectando ao stream do browser...'
                : isRecording
                ? 'Aguardando stream do browser...'
                : 'Stream disponível durante gravações'}
            </p>
            {!isRecording && (
              <p className="text-xs text-gray-500 mt-1">
                O stream aparecerá automaticamente quando o agente estiver
                gravando
              </p>
            )}
          </div>
        )}
      </div>

      {/* Manual Controls (shown when not auto-connecting) */}
      {!autoConnect && (
        <div className="bg-gray-900 p-3 border-t border-gray-700">
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-400">{wsUrl}</div>
            <div className="flex space-x-2">
              <Button
                size="sm"
                variant="outline"
                onClick={connect}
                disabled={
                  connectionStatus === 'connecting' ||
                  connectionStatus === 'connected'
                }
                className="text-xs"
              >
                Conectar
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={disconnect}
                disabled={connectionStatus === 'disconnected'}
                className="text-xs"
              >
                Desconectar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
