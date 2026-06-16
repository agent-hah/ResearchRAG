"""
Query processing service for natural language to SQL conversion and execution (Django ORM).
"""
import time
import json
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime

from google import genai
from google.genai import types
from google.genai import errors
from django.conf import settings
from django.db import connection

from rag.models import Dataset
from query.models import QueryHistory
from query.services.csv_processor import CSVProcessor
from rag.services.rag_service import get_rag_service

import logging
logger = logging.getLogger(__name__)


def _extract_response_text(response) -> str:
    """Extract text from a Gemini/Gemma response, handling multi-part responses and CoT."""
    try:
        text = response.text
    except ValueError:
        # Multi-part response (often happens with CoT reasoning)
        parts = response.candidates[0].content.parts
        text = "".join(part.text for part in parts if hasattr(part, 'text'))
    
    import re
    import json
    
    # Sanitize invalid escape sequences (common LLM artifact)
    def sanitize(s: str) -> str:
        return re.sub(r'\\(?![\"\\/bfnrtu])', r'\\\\', s)
    
    text = sanitize(text)
    
    # 1. Try to find a markdown JSON code block
    matches = re.findall(r'```(?:json)?\s*([\s\S]*?)\s*```', text)
    if matches:
        return matches[-1].strip()
        
    # 2. Try to find the outermost valid JSON object in the text
    # This handles cases where reasoning is mixed with JSON without code blocks
    start_indices = [i for i, char in enumerate(text) if char == '{']
    end_idx = text.rfind('}')
    
    if end_idx != -1:
        for start_idx in start_indices:
            if start_idx > end_idx:
                break
            candidate = text[start_idx:end_idx+1]
            try:
                json.loads(candidate)
                return candidate
            except json.JSONDecodeError:
                continue
                
    return text.strip()

class QueryService:
    """Service for processing natural language queries."""
    
    def __init__(self, user_id: str = 'default'):
        self.user_id = user_id
        self.client = genai.Client(api_key=settings.GOOGLE_API_KEY)
        self.system_instruction = "You are a helpful research assistant. Respond safely and accurately without generating harmful content."
        self.safety_settings = [
            types.SafetySetting(category="HARM_CATEGORY_HARASSMENT", threshold="BLOCK_NONE"),
            types.SafetySetting(category="HARM_CATEGORY_HATE_SPEECH", threshold="BLOCK_NONE"),
            types.SafetySetting(category="HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold="BLOCK_NONE"),
            types.SafetySetting(category="HARM_CATEGORY_DANGEROUS_CONTENT", threshold="BLOCK_NONE")
        ]
        self.model_name = settings.GEMINI_MODEL
        logger.info("Query service initialized")
        
    def _generate_with_fallback(self, prompt: str) -> str:
        """Generate content with fallback logic for rate limits."""
        config = types.GenerateContentConfig(
            system_instruction=self.system_instruction,
            safety_settings=self.safety_settings,
            response_mime_type="application/json",
        )
        try:
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=prompt,
                config=config
            )
            return response.text
        except errors.APIError as e:
            if getattr(e, 'code', None) == 429 or "429" in str(e):
                logger.warning(f"Rate limit hit on {self.model_name}, trying fallbacks")
                for fallback_model in ["gemini-3.1-flash-lite", "gemma-4-26b-a4b-it"]:
                    try:
                        fallback_response = self.client.models.generate_content(
                            model=fallback_model,
                            contents=prompt,
                            config=config
                        )
                        return fallback_response.text
                    except errors.APIError as fallback_e:
                        if getattr(fallback_e, 'code', None) == 429 or "429" in str(fallback_e):
                            logger.warning(f"Rate limit hit on fallback {fallback_model}")
                            continue
                        raise fallback_e
            raise

    def get_database_schema(self) -> List[Dict[str, Any]]:
        try:
            schemas = []
            datasets = Dataset.objects.filter(user_id=self.user_id).exclude(table_name__isnull=True).exclude(table_name__exact='')
            
            for dataset in datasets:
                try:
                    schema = CSVProcessor.get_table_schema(dataset.table_name)
                    sample_data = CSVProcessor.get_table_preview(dataset.table_name, limit=3)
                    
                    schemas.append({
                        "table_name": dataset.table_name,
                        "original_filename": dataset.filename,
                        "columns": schema,
                        "row_count": dataset.row_count or 0,
                        "sample_data": sample_data
                    })
                except Exception as e:
                    logger.error(f"Error getting schema for table {dataset.table_name}: {str(e)}")
                    continue
            
            return schemas
        except Exception as e:
            logger.error(f"Error getting database schema: {str(e)}")
            raise
    
    def generate_sql(self, query: str, schemas: List[Dict[str, Any]], dataset_ids: Optional[List[int]] = None, previous_query: Optional[str] = None, previous_error: Optional[str] = None) -> Dict[str, Any]:
        try:
            if dataset_ids:
                filtered_schemas = []
                for schema in schemas:
                    table_name = schema["table_name"]
                    try:
                        dataset_id = int(table_name.split('_')[1])
                        if dataset_id in dataset_ids:
                            filtered_schemas.append(schema)
                    except (IndexError, ValueError):
                        continue
                schemas = filtered_schemas
            
            if not schemas:
                return {
                    "sql_query": "",
                    "explanation": "No matching datasets found for the specified filters.",
                    "tables_used": [],
                    "columns_used": [],
                    "confidence": 0.0
                }
            
            schema_context = self._build_schema_context(schemas)
            
            prompt = f"""{self.system_instruction}

You are an expert SQL query generator. Convert the natural language query to SQL based on the provided database schema.

CRITICAL RULES FOR SQL GENERATION:
1. YOU MUST USE EXACTLY THE COLUMN NAMES PROVIDED IN THE SCHEMA. DO NOT GUESS OR INVENT COLUMN NAMES (e.g. if the schema has "rank", do NOT use "ranking").
2. YOU MUST USE EXACTLY THE TABLE NAMES PROVIDED IN THE SCHEMA.
3. If a column name has spaces or special characters, you MUST quote it properly (e.g. "ranking-institution-title").
4. If a column is missing from the schema, do not select it. 

DATABASE SCHEMA:
{schema_context}

NATURAL LANGUAGE QUERY:
{query}

{f'''
PREVIOUS ERROR CONTEXT:
The previous SQL query you generated failed with this error: {previous_error}
Failed Query: {previous_query}

CRITICAL: The previous query failed because you used a column or table that does not exist or has a syntax error.
DO NOT repeat the same mistake. You MUST look at the schema and use a column name that ACTUALLY EXISTS.
''' if previous_query and previous_error else ''}

INSTRUCTIONS:
1. Generate a valid SQLite SQL query
2. Use ONLY the tables and columns provided in the schema
3. Include appropriate WHERE clauses, JOINs, GROUP BY, ORDER BY as needed
4. Return results that directly answer the user's question
5. IMPORTANT FOR SEARCHING: If the user provides a well-known abbreviation (like MIT), search for BOTH the exact abbreviation AND its full expanded name (e.g., 'Massachusetts Institute of Technology') using an OR clause or IN clause.
6. Avoid naive `LIKE '%XYZ%'` queries if it might match partial words inside other words (e.g., matching "Amity" when searching for "MIT"). Prefer exact matches, IN clauses, or surround with spaces like `LIKE '% MIT %'` if wildcarding is necessary.
7. Limit results to 100 rows unless specifically asked for more

RESPONSE FORMAT (JSON ONLY):
{{
    "sql_query": "SELECT ... FROM ... WHERE ...",
    "explanation": "This query does X by joining Y and filtering on Z...",
    "tables_used": ["table1", "table2"],
    "columns_used": ["col1", "col2", "col3"],
    "confidence": 0.95
}}
"""
            response_text = self._generate_with_fallback(prompt)
            
            try:
                result = json.loads(response_text)
                required_fields = ["sql_query", "explanation", "tables_used", "columns_used", "confidence"]
                for field in required_fields:
                    if field not in result:
                        result[field] = "" if field != "confidence" else 0.0
                
                result["confidence"] = max(0.0, min(1.0, float(result.get("confidence", 0.0))))
                return result
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse SQL generation response: {str(e)}")
                return {
                    "sql_query": "",
                    "explanation": f"Failed to generate SQL: {str(e)}",
                    "tables_used": [],
                    "columns_used": [],
                    "confidence": 0.0
                }
        except Exception as e:
            logger.error(f"Error generating SQL: {str(e)}")
            return {
                "sql_query": "",
                "explanation": f"Error generating SQL: {str(e)}",
                "tables_used": [],
                "columns_used": [],
                "confidence": 0.0
            }
    
    def execute_sql(self, sql_query: str) -> Dict[str, Any]:
        try:
            start_time = time.time()
            with connection.cursor() as cursor:
                cursor.execute(sql_query)
                columns = [col[0] for col in cursor.description] if cursor.description else []
                rows = []
                for row in cursor.fetchall():
                    row_values = []
                    for value in row:
                        if isinstance(value, datetime):
                            row_values.append(value.isoformat())
                        else:
                            row_values.append(value)
                    rows.append(row_values)
            
            execution_time = (time.time() - start_time) * 1000
            
            return {
                "rows": rows,
                "row_count": len(rows),
                "columns": columns,
                "execution_time_ms": execution_time
            }
        except Exception as e:
            logger.error(f"Error executing SQL: {str(e)}")
            return {
                "rows": [],
                "row_count": 0,
                "columns": [],
                "execution_time_ms": 0.0,
                "error": str(e)
            }
    
    def get_literature_context(self, query: str, max_results: int = 10000, literature_ids: Optional[List[int]] = None) -> List[Dict[str, Any]]:
        try:
            if max_results <= 0:
                return []
            
            rag_service = get_rag_service(self.user_id)
            results = rag_service.search_literature(query=query, top_k=max_results, literature_ids=literature_ids)
            
            context = []
            for result in results:
                context.append({
                    "literature_id": result["literature_id"],
                    "title": result.get("title") or result.get("filename") or "Unknown Document",
                    "excerpt": (result.get("text") or "")[:300] + "...",
                    "relevance_score": result.get("score", 0.0),
                    "metadata": result.get("metadata", {})
                })
            return context
        except Exception as e:
            logger.error(f"Error getting literature context: {str(e)}")
            return []
    
    def synthesize_results(self, query: str, sql_result: Dict[str, Any], literature_context: List[Dict[str, Any]]) -> Dict[str, Any]:
        try:
            data_summary = f"Query returned {sql_result['row_count']} rows"
            if sql_result['row_count'] > 0:
                data_summary += f" with columns: {', '.join(sql_result['columns'])}"
                if sql_result['row_count'] <= 5:
                    data_summary += f"\nSample data: {json.dumps(sql_result['rows'][:5], indent=2)}"
                else:
                    data_summary += f"\nFirst 3 rows: {json.dumps(sql_result['rows'][:3], indent=2)}"
            
            literature_summary = ""
            if literature_context:
                literature_summary = f"Found {len(literature_context)} relevant literature sources:\n"
                for i, lit in enumerate(literature_context, 1):
                    literature_summary += f"{i}. {lit.get('title', 'Unknown')}: {lit.get('excerpt', '')[:200]}...\n"
            
            prompt = f"""{self.system_instruction}

You are a research analyst. Synthesize the provided information to answer the original query.

ORIGINAL QUERY:
{query}

DATA RESULTS (Structured data from databases, may be empty):
{data_summary}

LITERATURE CONTEXT (Unstructured data from uploaded documents, may be empty):
{literature_summary}

INSTRUCTIONS:
1. Act as a professional research analyst. Provide a clear, authoritative summary that directly answers the user's query.
2. SYNTHESIS STYLE: Write naturally. DO NOT use phrases like "Based on the provided information", "The DATA RESULTS show", "In the LITERATURE CONTEXT", or "The provided snippets". Speak directly about the data and facts.
3. If any data source (structured data or literature) is missing or empty, DO NOT mention the lack of data. Simply synthesize what is available.
4. CRITICAL: Actively cross-reference findings from the structured datasets with insights from the literature. Highlight how they agree, disagree, or complement each other. Do NOT treat the two sources as separate disconnected inputs in your writing.
5. Extract key findings, specific data insights, and literature insights. Ensure they are directly relevant to the query.
6. Identify any methodology considerations if applicable, but avoid stating obvious things like "the list of documents was extracted from the search results." Focus on the methodology of the actual research or data collection.
7. Be objective, concise, and evidence-based. Avoid conversational filler.
8. Format all mathematical expressions and equations using plain text or standard Markdown. Do NOT output raw LaTeX macros unless wrapped in $ or $$ for proper rendering.

RESPONSE FORMAT (JSON):
{{
    "summary": "Brief overview of findings answering the query...",
    "key_findings": ["Finding 1", "Finding 2"],
    "data_insights": ["Data insight 1", "Data insight 2"],
    "literature_insights": ["Literature insight 1", "Literature insight 2"],
    "methodology_notes": "Notes about methodology or approach..."
}}

Respond with valid JSON only:
"""
            response_text = self._generate_with_fallback(prompt)
            
            try:
                result = json.loads(response_text)
                default_result = {
                    "summary": "Analysis completed",
                    "key_findings": [],
                    "data_insights": [],
                    "literature_insights": [],
                    "methodology_notes": None,
                    "limitations": None
                }
                for key, default_value in default_result.items():
                    if key not in result:
                        result[key] = default_value
                return result
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse synthesis response: {str(e)}")
                return {
                    "summary": f"Synthesis failed: {str(e)}",
                    "key_findings": [],
                    "data_insights": [],
                    "literature_insights": [],
                    "methodology_notes": None,
                    "limitations": None
                }
        except Exception as e:
            logger.error(f"Error synthesizing results: {str(e)}")
            return {
                "summary": f"Synthesis error: {str(e)}",
                "key_findings": [],
                "data_insights": [],
                "literature_insights": [],
                "methodology_notes": None,
                "limitations": None
            }
    
    def save_query_history(self, query: str, sql_query: str, row_count: int, processing_time_ms: float, sql_confidence: float = None, data_results: dict = None, literature_context: list = None, synthesis: dict = None) -> QueryHistory:
        try:
            history = QueryHistory.objects.create(
                user_id=self.user_id,
                query_text=query,
                sql_query=sql_query,
                result_count=row_count,
                execution_time_ms=processing_time_ms,
                sql_confidence=sql_confidence,
                data_results=data_results,
                literature_context=literature_context,
                synthesis=synthesis
            )
            return history
        except Exception as e:
            logger.error(f"Error saving query history: {str(e)}")
            raise
    
    def get_query_history(self, page: int = 1, page_size: int = 20) -> Tuple[List[QueryHistory], int]:
        try:
            offset = (page - 1) * page_size
            queries = list(QueryHistory.objects.filter(user_id=self.user_id).order_by('-created_at')[offset:offset+page_size])
            total_count = QueryHistory.objects.filter(user_id=self.user_id).count()
            return queries, total_count
        except Exception as e:
            logger.error(f"Error getting query history: {str(e)}")
            raise
    
    def _build_schema_context(self, schemas: List[Dict[str, Any]]) -> str:
        context = ""
        for schema in schemas:
            context += f"\nTable: {schema['table_name']} (from file: {schema['original_filename']})\n"
            context += f"Rows: {schema['row_count']}\n"
            context += "Columns:\n"
            for col in schema['columns']:
                context += f"  - {col['name']} ({col['type']})\n"
            if schema['sample_data']:
                context += "Sample data:\n"
                for i, row in enumerate(schema['sample_data'][:2], 1):
                    context += f"  Row {i}: {json.dumps(row)}\n"
            context += "\n"
        return context

_query_service_instances = {}

def get_query_service(user_id: str = 'default') -> QueryService:
    global _query_service_instances
    if user_id not in _query_service_instances:
        _query_service_instances[user_id] = QueryService(user_id)
    return _query_service_instances[user_id]