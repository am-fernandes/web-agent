import { useState } from 'react'
import './App.css'

function App() {
  const [task, setTask] = useState('')
  const [userId, setUserId] = useState('user-123')
  const [sessionId, setSessionId] = useState('session-' + Date.now())
  const [response, setResponse] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!task.trim()) return

    setLoading(true)
    try {
      const res = await fetch(`http://localhost:8000/agent/${sessionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          task,
          user_id: userId
        })
      })
      
      const data = await res.json()
      setResponse(data)
    } catch (error) {
      console.error('Error:', error)
      setResponse({ error: 'Failed to connect to backend' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app">
      <header>
        <h1>Web Agent</h1>
        <p>Browser automation tool powered by AI</p>
      </header>
      
      <main>
        <form onSubmit={handleSubmit} className="task-form">
          <div className="form-group">
            <label htmlFor="task">Task Description:</label>
            <textarea
              id="task"
              value={task}
              onChange={(e) => setTask(e.target.value)}
              placeholder="Describe what you want the web agent to do..."
              rows="4"
              disabled={loading}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="userId">User ID:</label>
            <input
              id="userId"
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              disabled={loading}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="sessionId">Session ID:</label>
            <input
              id="sessionId"
              type="text"
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              disabled={loading}
            />
          </div>
          
          <button type="submit" disabled={loading || !task.trim()}>
            {loading ? 'Processing...' : 'Run Agent'}
          </button>
        </form>
        
        {response && (
          <div className="response">
            <h3>Response:</h3>
            {response.error ? (
              <div className="error">{response.error}</div>
            ) : (
              <div className="success">
                <div className="metrics">
                  <h4>Metrics:</h4>
                  <p>Input tokens: {response.metrics?.input_tokens || 0}</p>
                  <p>Output tokens: {response.metrics?.output_tokens || 0}</p>
                  <p>Time: {response.metrics?.time || 0}s</p>
                </div>
                <div className="agent-response">
                  <h4>Agent Response:</h4>
                  <p>{response.response?.content || 'No content'}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

export default App
