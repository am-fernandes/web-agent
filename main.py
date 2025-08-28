import asyncio
from agno.agent import Agent
from agno.models.openai import OpenAIChat
from agno.tools.mcp import MCPTools
from textwrap import dedent
from dotenv import load_dotenv

load_dotenv()

async def run_mcp_agent():
    s_thinking_tool = MCPTools(
        command="npx -y @modelcontextprotocol/server-sequential-thinking", 
        timeout_seconds=120
    )
    browser_tool = MCPTools(
        command="node /home/matheus/Projects/playwright-mcp/cli.js --no-sandbox --save-trace --save-video --viewport-size=1920,1080 --output-dir=mcp_results --headless --isolated", 
        timeout_seconds=120
    )
    
    try:
        await s_thinking_tool.connect()
        await browser_tool.connect()

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
            tools=[browser_tool, s_thinking_tool],
            show_tool_calls=True
        )

        user_input = input("Task: ")
        await agent.aprint_response(user_input, stream=False)
        
    except Exception as e:
        print(f"Error during execution: {e}")
    finally:
        if browser_tool._session_context is not None:
            await browser_tool.close()
            print("Browser tool session closed.")
        if s_thinking_tool._session_context is not None:
            await s_thinking_tool.close()
            print("Sequential Thinking tool session closed.")

if __name__ == "__main__":
    try:
        asyncio.run(run_mcp_agent())
    except Exception as e:
        print(f"Fatal error: {e}")