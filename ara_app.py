#!/usr/bin/env python3
"""
Ara Integration for Research Workspace
Provides tools and agents for analyzing workspace data.
"""

from ara_sdk import App
import os
import httpx
from datetime import datetime

# Initialize Ara app
app = App("research-workspace-ai")

# Backend URL - the running FastAPI server
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")


# ─────────────────────────────────────────────
#  Tools that fetch real data from the backend
# ─────────────────────────────────────────────

@app.tool()
def get_workspace_files() -> str:
    """Get information about files currently in the research workspace (datasets and literature)."""
    try:
        response = httpx.get(f"{BACKEND_URL}/api/v1/files/list", timeout=15)
        if response.status_code != 200:
            return f"Error fetching files: HTTP {response.status_code}"

        data = response.json()
        datasets = data.get("datasets", [])
        literature = data.get("literature", [])

        lines = [
            f"📁 Workspace Files Summary",
            f"  • Total Datasets: {len(datasets)}",
            f"  • Total Literature: {len(literature)}",
            "",
        ]

        if datasets:
            lines.append("📊 Datasets:")
            for ds in datasets:
                rows = ds.get("row_count") or ds.get("rows", "?")
                cols = ds.get("column_count") or ds.get("columns", "?")
                lines.append(f"  - {ds.get('filename', ds.get('name', 'unknown'))}: {rows} rows × {cols} cols")
        else:
            lines.append("📊 Datasets: none uploaded yet")

        lines.append("")

        if literature:
            lines.append("📄 Literature (PDFs):")
            for lit in literature:
                status = lit.get("processing_status", "unknown")
                lines.append(f"  - {lit.get('filename', 'unknown')} [{status}]")
        else:
            lines.append("📄 Literature: none uploaded yet")

        return "\n".join(lines)

    except Exception as e:
        return f"Error connecting to backend to get workspace files: {str(e)}"


@app.tool()
def get_query_history() -> str:
    """Get the recent query history from the research workspace."""
    try:
        response = httpx.get(
            f"{BACKEND_URL}/api/v1/query/history",
            params={"page": 1, "page_size": 10},
            timeout=15,
        )
        if response.status_code != 200:
            return f"Error fetching query history: HTTP {response.status_code}"

        data = response.json()
        queries = data.get("queries", [])
        total = data.get("total_count", 0)

        if not queries:
            return "No queries have been run yet in this workspace."

        lines = [
            f"📜 Query History (showing {len(queries)} of {total} total)",
            "",
        ]
        for q in queries:
            # Support different field name conventions
            query_text = q.get("query_text") or q.get("query", "unknown")
            created_at = q.get("created_at", "")
            row_count = q.get("result_count") or q.get("row_count", 0)
            exec_ms = q.get("execution_time_ms", 0)
            lines.append(f"  • [{created_at[:19] if created_at else ''}] {query_text[:80]}")
            lines.append(f"    → {row_count} rows returned in {exec_ms:.0f}ms")

        return "\n".join(lines)

    except Exception as e:
        return f"Error connecting to backend to get query history: {str(e)}"


@app.tool()
def analyze_workspace_status() -> str:
    """Get a full status summary of the research workspace including files and recent activity."""
    try:
        files_info = get_workspace_files()
        history_info = get_query_history()

        # Also fetch RAG stats
        rag_info = ""
        try:
            r = httpx.get(f"{BACKEND_URL}/api/v1/rag/stats", timeout=10)
            if r.status_code == 200:
                rag_data = r.json()
                chunks = rag_data.get("total_chunks", 0)
                collection = rag_data.get("collection_name", "research_literature")
                rag_info = f"\n🧠 Vector DB: {chunks} indexed chunks in '{collection}'"
        except Exception:
            pass

        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        summary = f"""
=== Research Workspace Status Report ===
Generated: {timestamp}
Backend: {BACKEND_URL}
{rag_info}

{files_info}

{history_info}
""".strip()

        return summary

    except Exception as e:
        return f"Error generating workspace status: {str(e)}"


# ─────────────────────────────────────────────
#  Static guidance tools (no backend needed)
# ─────────────────────────────────────────────

@app.tool()
def get_workspace_guidance() -> str:
    """Get guidance on using the research workspace effectively."""
    return """
    Research Workspace Features:
    
    📁 File Management:
    - Upload CSV datasets for analysis
    - Upload PDF literature for reference
    - View file details and preview data
    
    🔍 Query Interface:
    - Ask natural language questions about your data
    - View query history and results
    - Re-run previous queries
    
    📊 Visualization:
    - Generate charts from query results
    - Export visualizations
    - Compare data across datasets
    
    💡 Tips:
    - Start by uploading your datasets
    - Use specific questions for better results
    - Check query history to track your analysis
    - Export results for reports
    """

@app.tool()
def get_analysis_recommendations() -> str:
    """Get recommendations for data analysis workflows."""
    return """
    Recommended Analysis Workflow:
    
    1. Data Preparation:
       - Upload clean CSV files with headers
       - Ensure consistent data formats
       - Check for missing values
    
    2. Exploratory Analysis:
       - Start with summary statistics
       - Look for patterns and trends
       - Identify outliers
    
    3. Deep Dive:
       - Ask specific questions about relationships
       - Compare across time periods
       - Segment by categories
    
    4. Documentation:
       - Export key findings
       - Save important queries
       - Create visualizations
    
    5. Iteration:
       - Refine questions based on results
       - Explore unexpected patterns
       - Validate findings
    """

@app.tool()
def get_query_examples() -> str:
    """Get example queries for different analysis types."""
    return """
    Example Queries by Type:
    
    📈 Trend Analysis:
    - "Show me the trend over time"
    - "What's the growth rate?"
    - "Compare this month to last month"
    
    📊 Statistical Summaries:
    - "What are the average values?"
    - "Show me the distribution"
    - "Calculate the median and quartiles"
    
    🔍 Pattern Discovery:
    - "Find correlations between variables"
    - "What are the top 10 items?"
    - "Group by category and summarize"
    
    🎯 Specific Insights:
    - "Which items exceed the threshold?"
    - "Show outliers in the data"
    - "Compare groups side by side"
    
    💡 Tip: Be specific with column names and conditions for best results!
    """


# ─────────────────────────────────────────────
#  Agents
# ─────────────────────────────────────────────

# On-demand research assistant
@app.agent(skills=["get_analysis_recommendations", "get_query_examples"])
def research_assistant(input: dict) -> str:
    """On-demand research assistant with real workspace context."""
    user_request = input.get("message", "") if isinstance(input, dict) else str(input)

    return f"""
    You are a helpful research workspace assistant.

    The user's request and the current workspace status are provided below:

    ---
    {user_request}
    ---

    Instructions:
    1. The message above already contains the current workspace status (datasets, literature, queries).
       Use this information directly — do NOT say you cannot access the workspace.
    2. Provide a helpful, specific response that mentions actual numbers from the workspace status section.
    3. Call get_analysis_recommendations() for workflow tips when relevant.
    4. Call get_query_examples() for example queries when relevant.
    5. If the workspace is empty (no datasets and no literature), encourage the user to upload their first CSV.

    Format your response as:
    - Brief workspace status summary with real numbers from the data above
    - Key observations or highlights
    - Specific recommendations or next steps
    - Encouraging, conversational tone

    If only literature is present, analyze the literature and return summaries! Do not ask the user to upload datasets until after the main summary.

    Do not return your response before first analyzing and providing a summary of the workspace with a fair amount
    of detail. Follow up questions should be asked in a conversation about the data, not to analyze the data (which is already implied when asking you)

    Be concise and actionable!
    """

# Daily data analysis agent
@app.schedule(cron="0 9 * * *")  # Daily at 9 AM
@app.agent(
    entrypoint=True,
    skills=["get_workspace_files", "get_query_history", "analyze_workspace_status"]
)
def daily_research_analyst(input: dict) -> str:
    """Daily research analysis agent with real backend access."""
    return """
    Provide a daily research workspace summary.
    
    Tasks:
    1. Call analyze_workspace_status() to get current state
    2. Summarize what's in the workspace (datasets, literature, queries)
    3. Highlight any recent activity
    4. Provide recommendations for today's research work
    5. Be encouraging and actionable
    
    Format as a friendly daily briefing with specific numbers and recommendations.
    """

if __name__ == "__main__":
    print("Ara Research Workspace Integration")
    print("=================================")
    print()
    print("Backend URL:", BACKEND_URL)
    print()
    print("This app provides:")
    print("- Real-time workspace analysis")
    print("- Daily automated research briefings (9 AM)")
    print("- On-demand research assistance")
    print()
    print("To deploy: ara deploy ara_app.py")
    print("To test locally: ara run ara_app.py research_assistant")
