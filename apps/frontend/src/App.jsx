import { useState, useRef, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { MarkdownRenderer } from '@/components/ui/markdown-renderer';
import { VideoPanel } from '@/components/VideoPanel';
import { useVideoPolling } from '@/hooks/useVideoPolling';
import {
  Send,
  Plus,
  Hammer,
  Bot,
  User,
  ChevronDown,
  ChevronRight,
  Copy,
  Video,
  VideoOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';

function App() {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState(() => uuidv4());
  const [userId] = useState('user-' + Math.random().toString(36).substr(2, 9));
  const [showVideoPanel, setShowVideoPanel] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Callback for when new video is detected
  const handleNewVideoDetected = useCallback((newVideo) => {
    console.log('New video detected, opening panel:', newVideo);
    if (!showVideoPanel) {
      setShowVideoPanel(true);
    }
  }, [showVideoPanel]);

  // Video polling hook
  const {
    videos,
    currentVideo,
    setCurrentVideo,
    isRecording,
    getVideoUrl,
    fetchVideos
  } = useVideoPolling(sessionId, handleNewVideoDetected);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isRecording) {
      setShowVideoPanel(true);
    }
  }, [isRecording]);

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setSessionId(uuidv4());
    setShowVideoPanel(false); // Close video panel on new chat
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || loading) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputValue,
      timestamp: new Date().toLocaleTimeString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setLoading(true);
    setIsTyping(true);

    try {
      const response = await fetch(`http://localhost:8000/agent/${sessionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          task: inputValue,
          user_id: userId,
        }),
      });

      const data = await response.json();

      const agentMessage = {
        id: Date.now() + 1,
        type: 'agent',
        content: data.response?.content || 'Erro na resposta',
        timestamp: new Date().toLocaleTimeString(),
        metrics: data.metrics,
        tools: data.response?.tools || [],
        error: data.error,
      };

      setMessages((prev) => [...prev, agentMessage]);
      setIsTyping(false);
    } catch (error) {
      console.error('Error:', error);
      const errorMessage = {
        id: Date.now() + 1,
        type: 'agent',
        content: 'Falha ao conectar com o backend',
        timestamp: new Date().toLocaleTimeString(),
        error: true,
      };
      setMessages((prev) => [...prev, errorMessage]);
      setIsTyping(false);
    } finally {
      setLoading(false);
      setIsTyping(false);
    }
  };

  return (
    <div className="h-screen w-screen bg-white flex flex-col overflow-hidden">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gray-900 rounded-md flex items-center justify-center">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-medium text-gray-900">Web Agent</h1>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Video Panel Toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowVideoPanel(!showVideoPanel)}
              className={`border-gray-300 hover:bg-gray-50 relative ${
                showVideoPanel 
                  ? 'bg-gray-900 text-white hover:bg-gray-800' 
                  : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              {showVideoPanel ? (
                <VideoOff className="h-4 w-4 mr-2" />
              ) : (
                <Video className="h-4 w-4 mr-2" />
              )}
              Vídeo
              
              {/* Recording indicator */}
              {isRecording && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              )}
              
              {/* Connection status */}
              {videos.length > 0 && !isRecording && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full" />
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleNewChat}
              className="border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900"
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo Chat
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 space-y-4">
            {/* Empty state message */}
            {messages.length === 0 && (
              <div className="flex justify-center items-center h-full min-h-[50vh]">
                <div className="text-center max-w-md px-4">
                  <div className="w-16 h-16 bg-gray-50 border border-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Bot className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Como posso ajudar?
                  </h3>
                  <p className="text-gray-500 text-sm leading-relaxed">
                    Digite uma mensagem para começar uma conversa. Posso navegar
                    em sites, extrair informações e automatizar tarefas web.
                  </p>
                </div>
              </div>
            )}

            {/* Messages */}
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}

            {/* Loading */}
            {isTyping && <TypingIndicator />}

            <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input Form */}
          <div className="border-t border-gray-200 bg-white px-4 sm:px-6 py-4">
            <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
            <div className="relative flex items-end space-x-3">
              <div className="flex-1 relative">
                <Textarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={handleInputChange}
                  placeholder={
                    loading ? 'Aguarde a resposta...' : 'Digite sua mensagem...'
                  }
                  disabled={loading}
                  rows={1}
                  className="min-h-[48px] max-h-32 resize-none pr-12 border-gray-300 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-all duration-200"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                />
                {loading && (
                  <Button
                    type="button"
                    onClick={() => {
                      setLoading(false);
                      setIsTyping(false);
                    }}
                    size="sm"
                    variant="ghost"
                    className="absolute right-2 bottom-2 h-8 w-8 p-0 text-gray-500 hover:text-gray-700"
                  >
                    <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                  </Button>
                )}
                {!loading && (
                  <Button
                    type="submit"
                    disabled={loading || !inputValue.trim()}
                    size="sm"
                    className="absolute right-2 bottom-2 h-8 w-8 p-0 bg-gray-900 hover:bg-gray-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </form>
          </div>
        </div>

        {/* Video Panel */}
        {showVideoPanel && (
          <VideoPanel
            videos={videos}
            currentVideo={currentVideo}
            setCurrentVideo={setCurrentVideo}
            getVideoUrl={getVideoUrl}
            isRecording={isRecording}
            isConnected={videos.length > 0}
            sessionId={sessionId}
            onClose={() => setShowVideoPanel(false)}
          />
        )}
      </div>

      <Toaster />
    </div>
  );
}

function MessageBubble({ message }) {
  const isUser = message.type === 'user';

  return (
    <div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 px-1`}
    >
      <div
        className={`flex space-x-4 max-w-3xl ${
          isUser ? 'flex-row-reverse space-x-reverse' : ''
        }`}
      >
        {/* Avatar */}
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
            isUser ? 'bg-gray-900' : 'bg-gray-100'
          }`}
        >
          {isUser ? (
            <User className="h-4 w-4 text-white" />
          ) : (
            <Bot className="h-4 w-4 text-gray-600" />
          )}
        </div>

        {/* Message Content */}
        <div className="space-y-1 min-w-0">
          <div
            className={`rounded-2xl px-4 py-3 overflow-hidden max-w-full ${
              isUser
                ? 'bg-gray-900 text-white'
                : 'bg-gray-50 border border-gray-200'
            }`}
          >
            <MarkdownRenderer
              className={`prose prose-sm max-w-none break-words ${
                isUser ? 'prose-invert' : ''
              }`}
              size="default"
            >
              {message.content}
            </MarkdownRenderer>

            {/* Metrics for agent messages */}
            {!isUser && message.metrics && (
              <div className="mt-3 pt-3 border-t border-gray-200/50">
                <div className="flex flex-wrap gap-1.5 text-xs text-gray-500">
                  <span className="bg-gray-100 px-2 py-1 rounded-md font-mono">
                    Input: {message.metrics.input_tokens}
                  </span>

                  <span className="bg-gray-100 px-2 py-1 rounded-md font-mono">
                    Output: {message.metrics.output_tokens}
                  </span>

                  <span className="bg-gray-100 px-2 py-1 rounded-md font-mono">
                    Tempo: {message.metrics.time?.toFixed(1)}s
                  </span>
                </div>
              </div>
            )}

            {/* Copy Button for agent messages */}
            {!isUser && (
              <div className="mt-3 pt-3 border-t border-gray-200/50">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(message.content);
                    toast('Resposta copiada!', {
                      description:
                        'A resposta foi copiada para a área de transferência.',
                    });
                  }}
                  className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-900 transition-colors hover:bg-gray-50 px-2 py-1 rounded-lg"
                >
                  <Copy className="h-4 w-4" />
                  <span>Copiar resposta</span>
                </button>
              </div>
            )}

            {/* Tools Section */}
            {!isUser && message.tools && message.tools.length > 0 && (
              <ToolsSection tools={message.tools} />
            )}
          </div>

          {/* Timestamp */}
          <p
            className={`text-xs text-gray-400 px-3 ${
              isUser ? 'text-right' : 'text-left'
            }`}
          >
            {message.timestamp}
          </p>
        </div>
      </div>
    </div>
  );
}

function ToolsSection({ tools }) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <div className="mt-4 pt-4 border-t border-gray-200">
        <button
          onClick={() => setIsModalOpen(true)}
          className="w-full flex items-center justify-between p-2 text-sm text-gray-600 hover:text-gray-900 transition-colors hover:bg-gray-50 rounded-lg"
        >
          <div className="flex items-center space-x-2">
            <Hammer className="h-4 w-4" />
            <span>Ver ferramentas utilizadas ({tools.length})</span>
          </div>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {isModalOpen && (
        <ToolsModal tools={tools} onClose={() => setIsModalOpen(false)} />
      )}
    </>
  );
}

function ToolsModal({ tools, onClose }) {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl border border-gray-200 w-full max-w-[80%] max-h-[80%] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
            <Hammer className="h-5 w-5" />
            <span>Ferramentas Utilizadas ({tools.length})</span>
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {tools.map((tool, index) => (
              <ToolDetail key={index} tool={tool} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ToolDetail({ tool }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-gray-200 rounded-lg">
      <button
        className="w-full p-4 text-left text-gray-700 hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <code className="text-sm font-mono bg-gray-100 px-3 py-1 rounded-md">
              {tool.tool_name}
            </code>
            <span
              className={`text-sm px-3 py-1 rounded-md font-medium ${
                tool.tool_call_error
                  ? 'bg-red-100 text-red-700'
                  : 'bg-green-100 text-green-700'
              }`}
            >
              {tool.tool_call_error ? 'Erro' : 'Sucesso'}
            </span>
          </div>
          {expanded ? (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronRight className="h-5 w-5 text-gray-400" />
          )}
        </div>
      </button>

      <Collapsible open={expanded}>
        <CollapsibleContent>
          <div className="px-4 pb-4 border-t border-gray-200 bg-gray-50">
            <div className="space-y-4 pt-4">
              <div>
                <h6 className="font-semibold mb-2 text-gray-800">
                  Argumentos:
                </h6>
                <pre className="text-sm bg-white p-3 rounded-lg border text-gray-600 whitespace-pre-wrap break-all max-w-full">
                  <code>{JSON.stringify(tool.tool_args, null, 2)}</code>
                </pre>
              </div>

              {tool.result && (
                <div>
                  <h6 className="font-semibold mb-2 text-gray-800">
                    Resultado:
                  </h6>
                  <div className="bg-white p-3 rounded-lg border overflow-x-auto custom-scrollbar">
                    <MarkdownRenderer
                      className="prose prose-sm max-w-none text-gray-600"
                      size="small"
                    >
                      {tool.result}
                    </MarkdownRenderer>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start mb-4 px-1">
      <div className="flex space-x-4 max-w-3xl">
        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
          <Bot className="h-4 w-4 text-gray-600" />
        </div>
        <div className="space-y-1 min-w-0">
          <div className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3">
            <div className="flex items-center space-x-2">
              <div className="flex space-x-1">
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: '0ms' }}
                ></div>
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: '150ms' }}
                ></div>
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: '300ms' }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
