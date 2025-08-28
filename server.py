import os
from contextlib import asynccontextmanager
from textwrap import dedent

from agno.agent import Agent
from agno.models.openai import OpenAIChat
from agno.playground import Playground
from agno.tools.mcp import MCPTools
from dotenv import load_dotenv

load_dotenv()

app = None
browser_tool = None
s_thinking_tool = None

@asynccontextmanager
async def lifespan(app):
    global browser_tool, s_thinking_tool
    
    print("Initializing MCP tools...")
    
    # Inicializa as ferramentas MCP
    s_thinking_tool = MCPTools(
        command="npx -y @modelcontextprotocol/server-sequential-thinking", 
        timeout_seconds=120
    )
    browser_tool = MCPTools(
        command="npx -y @playwright/mcp@latest --no-sandbox --save-trace --viewport-size=1920,1080 --output-dir=mcp_results --headless --isolated", 
        timeout_seconds=120
    )
    
    try:
        await s_thinking_tool.__aenter__()
        await browser_tool.__aenter__()
        
        # Configura as ferramentas no agente
        web_agent.set_tools([browser_tool, s_thinking_tool])
        print("MCP tools initialized successfully")
        
        yield
    finally:
        print("Cleaning up MCP tools...")
        if browser_tool:
            await browser_tool.__aexit__(None, None, None)
            browser_tool = None
        if s_thinking_tool:
            await s_thinking_tool.__aexit__(None, None, None)
            s_thinking_tool = None

web_agent = Agent(
    name="Web Automation Agent",
    instructions=dedent("""\
        You are a browser automation tool. Your task is to assist the user 
        in automating web tasks using the Playwright library.
        
        You have access to the following tools:
        - Browser: A headless browser instance for web interaction automation
        - Sequential Thinking: A tool for structured sequential thinking
        
        Always carefully analyze web pages before interacting with them.
        Look for specific elements and navigate intelligently.
        Use headings to organize your responses and be concise.
    """),
    model=OpenAIChat(
        id="gpt-4o",
        api_key=os.getenv("OPENAI_API_KEY"),
    ),
    add_history_to_messages=True,
    num_history_responses=3,
    add_datetime_to_instructions=True,
    markdown=True,
    show_tool_calls=True
)

playground = Playground(
    agents=[web_agent],
    name="Web Agent",
    description="A playground for web automation using browser tools",
    app_id="web-agent",
)

app = playground.get_app()
app.router.lifespan_context = lifespan

if __name__ == "__main__":
    playground.serve(app="main:app", reload=True)
