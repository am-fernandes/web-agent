from agno.agent import Agent
from agno.models.openai import OpenAIChat
from agno.storage.sqlite import SqliteStorage
from agno.tools.mcp import MCPTools
from textwrap import dedent
from dotenv import load_dotenv
from fastapi import FastAPI
from pydantic import BaseModel

load_dotenv()
app = FastAPI()

storage = SqliteStorage(table_name="agent_sessions", db_file="tmp/data.db")

class AgentRequest(BaseModel):
    task: str
    user_id: str


async def ConnectMCPTools() -> list[MCPTools]:
    try:
        s_thinking_tool = MCPTools(
            command="npx -y @modelcontextprotocol/server-sequential-thinking", 
            timeout_seconds=120
        )
        browser_tool = MCPTools(
            command="node /home/matheus/Projects/playwright-mcp/cli.js --no-sandbox --save-trace --save-video --viewport-size=1920,1080 --output-dir=mcp_results --headless --isolated", 
            timeout_seconds=600
        )

        await s_thinking_tool.__aenter__()
        await browser_tool.__aenter__()

        return [s_thinking_tool, browser_tool]
    except Exception as e:
        print(f"Error connecting to MCP tools: {e}")
        return []


@app.post("/agent/{session_id}")
async def run_agent(session_id: str, agent_call: AgentRequest):
    try:
        mcp_tools = await ConnectMCPTools()

        agent = Agent(
            model=OpenAIChat(id="gpt-5"),
            instructions=dedent("""\
                You are a browser automation tool. Your task is to assist the user 
                in automating web tasks using the Playwright library.
                
                You have access to the following tools:
                - Browser: A headless browser instance for web interaction automation
                - Sequential Thinking: A tool for structured sequential thinking
                
                Always carefully analyze web pages before interacting with them.
                Look for specific elements and navigate intelligently.
                """),
            tools=[*mcp_tools],
            user_id=agent_call.user_id,
            session_id=session_id, 
            storage=storage,
            add_history_to_messages=True,
        )

        await agent.aprint_response(agent_call.task, stream=False)

        return {
            "metrics": agent.session_metrics.__dict__,
            "response": agent.run_response.__dict__
        }
    except Exception as e:
        print(f"Error running agent: {e}")
        return {"error": str(e)}