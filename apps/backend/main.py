from agno.agent import Agent
from agno.models.openai import OpenAIChat
from agno.storage.sqlite import SqliteStorage
from agno.tools.mcp import MCPTools
from textwrap import dedent
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from contextlib import asynccontextmanager
from pydantic import BaseModel
import json
import os
from typing import Dict, List
import time

load_dotenv()

# Initialize videos directory
videos_dir = "videos"
os.makedirs(videos_dir, exist_ok=True)

# Simple lifespan (no complex setup needed)
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Server starting...")
    yield
    print("Server shutting down...")

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

storage = SqliteStorage(table_name="agent_sessions", db_file="tmp/data.db")

# Video monitoring helper
class VideoMonitor:
    
    def get_session_videos(self, session_id: str) -> List[Dict]:
        """Get all videos for a session"""
        try:
            videos_path = f"videos/{session_id}"
            if not os.path.exists(videos_path):
                return []
            
            video_files = []
            for root, dirs, files in os.walk(videos_path):
                for file in files:
                    if file.endswith('.webm'):
                        file_path = os.path.join(root, file)
                        timestamp_dir = os.path.basename(root)
                        video_files.append({
                            "filename": file,
                            "timestamp": timestamp_dir,
                            "full_path": file_path,
                            "created_time": os.path.getctime(file_path),
                            "size": os.path.getsize(file_path)
                        })
            
            # Sort by creation time (newest first)
            video_files.sort(key=lambda x: x["created_time"], reverse=True)
            return video_files
        except Exception as e:
            print(f"Error getting session videos: {e}")
            return []
    
    def is_recording_session(self, session_id: str) -> bool:
        """Simple check if any video in session is still being written"""
        videos = self.get_session_videos(session_id)
        
        if not videos:
            return False
        
        # Check if the newest video file was modified recently (last 10 seconds)
        latest_video = videos[0]
        try:
            file_mod_time = os.path.getmtime(latest_video["full_path"])
            time_since_modified = time.time() - file_mod_time
            return time_since_modified < 10
        except:
            return False

video_monitor = VideoMonitor()

class AgentRequest(BaseModel):
    task: str
    user_id: str


@app.get("/api/videos/{session_id}")
async def list_videos(session_id: str):
    """Get all videos for a session"""
    try:
        videos = video_monitor.get_session_videos(session_id)
        is_recording = video_monitor.is_recording_session(session_id)
        
        return {
            "videos": videos,
            "is_recording": is_recording,
            "total_count": len(videos)
        }
    except Exception as e:
        return {"error": str(e), "videos": [], "is_recording": False, "total_count": 0}


@app.get("/videos/{session_id}/{timestamp}/{filename}")
async def serve_video(session_id: str, timestamp: str, filename: str):
    """Serve completed video files as static files"""
    try:
        file_path = f"videos/{session_id}/{timestamp}/{filename}"
        
        if not os.path.exists(file_path):
            return JSONResponse(content={"error": "Video not found"}, status_code=404)
        
        # Since we only serve completed videos now, always cache them
        headers = {
            'Cache-Control': 'public, max-age=3600',
            'Content-Type': 'video/webm',
        }
        
        return FileResponse(file_path, media_type='video/webm', headers=headers)
                
    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)

@app.post("/agent/{session_id}")
async def run_agent(session_id: str, agent_call: AgentRequest):
    s_thinking_tool = None
    browser_tool = None
    
    try:
        # Criar e inicializar ferramentas MCP manualmente para melhor controle
        s_thinking_tool = MCPTools(
            command="npx -y @modelcontextprotocol/server-sequential-thinking", 
            timeout_seconds=120
        )
        browser_tool = MCPTools(
            command=f"node /home/matheus/Projects/playwright-mcp/cli.js --no-sandbox --save-trace --save-video --output-video=videos/{session_id} --viewport-size=1920,1080 --output-dir=mcp_results --headless --isolated --streaming ", 
            timeout_seconds=600
        )

        # Inicializar ferramentas manualmente
        await s_thinking_tool.__aenter__()
        await browser_tool.__aenter__()
        
        try:
            agent = Agent(
                model=OpenAIChat(id="gpt-5-mini"),
                instructions=dedent("""\
                    You are a browser automation tool. Your task is to assist the user 
                    in automating web tasks using the Playwright library.
                    
                    You have access to the following tools:
                    - Browser: A headless browser instance for web interaction automation
                    - Sequential Thinking: A tool for structured sequential thinking
                    
                    Always carefully analyze web pages before interacting with them.
                    Look for specific elements and navigate intelligently.

                    Always respond in markdown format, using code blocks for any code snippets, bold for important terms, always use headers for title and subtitles and tables if needed and etc.
                    """),
                tools=[s_thinking_tool, browser_tool],
                user_id=agent_call.user_id,
                session_id=session_id, 
                storage=storage,
                add_history_to_messages=True,
                markdown=True
            )

            await agent.aprint_response(agent_call.task, stream=False)
            
            metrics = agent.session_metrics.__dict__
            agent_response = agent.run_response.__dict__
            # Usar jsonable_encoder para converter objetos complexos em JSON serializável
            response = json.dumps({
                "metrics": {
                    "input_tokens": metrics.get("input_tokens", 0),
                    "output_tokens": metrics.get("output_tokens", 0),
                    "reasoning_tokens": metrics.get("reasoning_tokens", 0),
                    "time": metrics.get("time", 0)
                },
                "response": {
                    "content": agent_response.get("content", ""),
                    "model": agent_response.get("model", ""),
                    "run_id": agent_response.get("run_id", ""),
                    "formatted_tool_calls": agent_response.get("formatted_tool_calls", ""),
                    "tools": [tool.__dict__ for tool in agent_response.get("tools", [])]
                }
            }, default=str, ensure_ascii=False)

            return JSONResponse(content=json.loads(response))

        finally:
            # Cleanup manual mais robusto
            if browser_tool:
                try:
                    await browser_tool.__aexit__(None, None, None)
                except Exception as cleanup_error:
                    print(f"Warning: Error cleaning up browser tool: {cleanup_error}")
                    
            if s_thinking_tool:
                try:
                    await s_thinking_tool.__aexit__(None, None, None)
                except Exception as cleanup_error:
                    print(f"Warning: Error cleaning up thinking tool: {cleanup_error}")
                
    except Exception as e:
        print(f"Error running agent: {e}")
        return {"error": str(e)}
    