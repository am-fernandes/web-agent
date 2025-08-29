import { useState, useRef, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import ReactMarkdown from 'react-markdown'
import './App.css'

function App() {
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState(() => uuidv4())
  const [userId] = useState('user-' + Math.random().toString(36).substr(2, 9))
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleNewChat = () => {
    setMessages([])
    setSessionId(uuidv4())
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!inputValue.trim() || loading) return

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputValue,
      timestamp: new Date().toLocaleTimeString()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setLoading(true)

    try {
      const response = await fetch(`http://localhost:8000/agent/${sessionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          task: inputValue,
          user_id: userId
        })
      })
      
      const data = await response.json()
      
      const agentMessage = {
        id: Date.now() + 1,
        type: 'agent',
        content: data.response?.content || 'Erro na resposta',
        timestamp: new Date().toLocaleTimeString(),
        metrics: data.metrics,
        tools: data.response?.tools || [],
        error: data.error
      }

      setMessages(prev => [...prev, agentMessage])
    } catch (error) {
      console.error('Error:', error)
      const errorMessage = {
        id: Date.now() + 1,
        type: 'agent',
        content: 'Falha ao conectar com o backend',
        timestamp: new Date().toLocaleTimeString(),
        error: true
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app">
      <div className="chat-container">
        <header className="chat-header">
          <div className="header-content">
            <h1>Web Agent</h1>
            <p>Automação web inteligente</p>
          </div>
          <button className="new-chat-btn" onClick={handleNewChat}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            Novo Chat
          </button>
        </header>

        <div className="messages-container">
          {messages.length === 0 && (
            <div className="welcome-message">
              <div className="welcome-content">
                <h2>Olá! 👋</h2>
                <p>Sou seu agente de automação web. Posso ajudar você a navegar, extrair informações e automatizar tarefas em sites.</p>
                <div className="example-prompts">
                  <h3>Exemplos do que posso fazer:</h3>
                  <div className="examples">
                    <div className="example" onClick={() => setInputValue('Acesse o site exemplo.com e me diga qual o título da página')}>Acesse o site exemplo.com e me diga qual o título da página</div>
                    <div className="example" onClick={() => setInputValue('Navegue até google.com e pesquise por "automação web"')}>Navegue até google.com e pesquise por "automação web"</div>
                    <div className="example" onClick={() => setInputValue('Vá para github.com e me mostre os repositórios em tendência')}>Vá para github.com e me mostre os repositórios em tendência</div>
                    <div className="example" onClick={() => setInputValue('Acesse o site da Wikipedia sobre automação e me forneça um resumo estruturado com principais tópicos')}>Acesse a Wikipedia sobre automação e crie um resumo estruturado</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {messages.map(message => (
            <MessageBubble key={message.id} message={message} />
          ))}

          {loading && <LoadingBubble />}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSubmit} className="input-form">
          <div className="input-container">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Digite sua mensagem..."
              rows="1"
              disabled={loading}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSubmit(e)
                }
              }}
            />
            <button type="submit" disabled={loading || !inputValue.trim()}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
              </svg>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function MessageBubble({ message }) {
  const [showTools, setShowTools] = useState(false)

  const formatMetrics = (metrics) => {
    if (!metrics) return null
    return `${metrics.input_tokens}/${metrics.output_tokens} tokens • ${metrics.time?.toFixed(1)}s`
  }

  return (
    <div className={`message-bubble ${message.type}`}>
      <div className="message-content">
        <div className="message-text">
          {message.type === 'agent' ? (
            <ReactMarkdown>{message.content}</ReactMarkdown>
          ) : (
            message.content
          )}
        </div>
        
        {message.type === 'agent' && message.metrics && (
          <div className="message-metrics">
            {formatMetrics(message.metrics)}
          </div>
        )}
        
        {message.type === 'agent' && message.tools && message.tools.length > 0 && (
          <div className="tools-section">
            <button 
              className="tools-toggle"
              onClick={() => setShowTools(!showTools)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
              </svg>
              Ver detalhes das ferramentas ({message.tools.length})
            </button>
            
            {showTools && (
              <div className="tools-details">
                {message.tools.map((tool, index) => (
                  <ToolDetail key={index} tool={tool} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className="message-timestamp">
        {message.timestamp}
      </div>
    </div>
  )
}

function ToolDetail({ tool }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="tool-detail">
      <div className="tool-header" onClick={() => setExpanded(!expanded)}>
        <div className="tool-info">
          <span className="tool-name">{tool.tool_name}</span>
          <span className={`tool-status ${tool.tool_call_error ? 'error' : 'success'}`}>
            {tool.tool_call_error ? 'Erro' : 'Sucesso'}
          </span>
        </div>
        <svg 
          width="16" 
          height="16" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2"
          className={`expand-icon ${expanded ? 'expanded' : ''}`}
        >
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </div>
      
      {expanded && (
        <div className="tool-content">
          <div className="tool-section">
            <h5>Argumentos:</h5>
            <pre>{JSON.stringify(tool.tool_args, null, 2)}</pre>
          </div>
          
          {tool.result && (
            <div className="tool-section">
              <h5>Resultado:</h5>
              <div className="tool-result-markdown">
                <ReactMarkdown>{tool.result}</ReactMarkdown>
              </div>
            </div>
          )}
          
          {tool.metrics && (
            <div className="tool-section">
              <h5>Métricas:</h5>
              <pre>{tool.metrics}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function LoadingBubble() {
  return (
    <div className="message-bubble agent loading">
      <div className="message-content">
        <div className="loading-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    </div>
  )
}

export default App