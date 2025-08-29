from agno.agent import Agent
from agno.models.openai import OpenAIChat
from agno.storage.sqlite import SqliteStorage
from agno.tools.mcp import MCPTools
from textwrap import dedent
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import json

load_dotenv()
app = FastAPI()

storage = SqliteStorage(table_name="agent_sessions", db_file="tmp/data.db")

class AgentRequest(BaseModel):
    task: str
    user_id: str


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
            command="node /home/matheus/Projects/playwright-mcp/cli.js --no-sandbox --save-trace --save-video --viewport-size=1920,1080 --output-dir=mcp_results --headless --isolated", 
            timeout_seconds=600
        )

        # Inicializar ferramentas manualmente
        await s_thinking_tool.__aenter__()
        await browser_tool.__aenter__()
        
        try:
            agent = Agent(
                model=OpenAIChat(id="gpt-4.1-mini"),
                instructions=dedent("""\
                    You are a browser automation tool. Your task is to assist the user 
                    in automating web tasks using the Playwright library.
                    
                    You have access to the following tools:
                    - Browser: A headless browser instance for web interaction automation
                    - Sequential Thinking: A tool for structured sequential thinking
                    
                    Always carefully analyze web pages before interacting with them.
                    Look for specific elements and navigate intelligently.
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
    