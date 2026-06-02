"""
Query processing service for natural language to SQL conversion and execution.
"""
import time
import json
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
from sqlalchemy import text, inspect
from sqlalchemy.orm import Session

import google.generativeai as genai
from backend.config import get_settings
from backend.models.dataset import Dataset
from backend.models.query_history import QueryHistory
from backend.services.csv_processor import CSVProcessor
from backend.services.rag_service import get_rag_service
from backend.utils.logger import get_logger

logger = get_logger(__name__)
settings = get_settings()


class QueryService:
    """Service for processing natural language queries."""
    
    def __init__(self):
        """Initialize query service."""
        self.settings = settings
        
        # Configure Gemini
        genai.configure(api_key=settings.GEMINI_API_KEY)
        self.model = genai.GenerativeModel(settings.GEMINI_MODEL)
        
        logger.info("Query service initialized")
    
    def get_database_schema(self, db: Session) -> List[Dict[str, Any]]:
        """
        Get database schema information for all dataset tables.
        
        Args:
            db: Database session
            
        Returns:
            List of schema information dictionaries
        """
        try:
            schemas = []
            datasets = db.query(Dataset).filter(Dataset.table_name.isnot(None)).all()
            
            for dataset in datasets:
                try:
                    # Get schema
                    schema = CSVProcessor.get_table_schema(dataset.table_name, db)
                    
                    # Get sample data
                    sample_data = CSVProcessor.get_table_preview(dataset.table_name, db, limit=3)
                    
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
    
    def generate_sql(
        self,
        query: str,
        schemas: List[Dict[str, Any]],
        dataset_ids: Optional[List[int]] = None
    ) -> Dict[str, Any]:
        """
        Generate SQL query from natural language using Gemini.
        
        Args:
            query: Natural language query
            schemas: Database schema information
            dataset_ids: Optional filter by dataset IDs
            
        Returns:
            Dictionary with SQL generation results
        """
        try:
            # Filter schemas if dataset_ids provided
            if dataset_ids:
                filtered_schemas = []
                for schema in schemas:
                    # Find dataset by table name
                    table_name = schema["table_name"]
                    # Extract dataset ID from table name (format: dataset_{id}_{name})
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
            
            # Build schema context
            schema_context = self._build_schema_context(schemas)
            
            # Create prompt
            prompt = f"""
You are an expert SQL query generator. Convert the natural language query to SQL based on the provided database schema.

DATABASE SCHEMA:
{schema_context}

NATURAL LANGUAGE QUERY:
{query}

INSTRUCTIONS:
1. Generate a valid SQLite SQL query
2. Use only the tables and columns provided in the schema
3. Include appropriate WHERE clauses, JOINs, GROUP BY, ORDER BY as needed
4. Return results that directly answer the user's question
5. If the query involves aggregation, include appropriate aggregate functions
6. If the query involves filtering, use appropriate WHERE conditions
7. Limit results to 100 rows unless specifically asked for more

RESPONSE FORMAT (JSON):
{{
    "sql_query": "SELECT ... FROM ... WHERE ...",
    "explanation": "This query does X by joining Y and filtering on Z...",
    "tables_used": ["table1", "table2"],
    "columns_used": ["col1", "col2", "col3"],
    "confidence": 0.95
}}

Respond with valid JSON only:
"""
            
            # Generate SQL
            response = self.model.generate_content(prompt)
            
            # Parse response
            try:
                result = json.loads(response.text)
                
                # Validate required fields
                required_fields = ["sql_query", "explanation", "tables_used", "columns_used", "confidence"]
                for field in required_fields:
                    if field not in result:
                        result[field] = "" if field != "confidence" else 0.0
                
                # Ensure confidence is between 0 and 1
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
    
    def execute_sql(self, sql_query: str, db: Session) -> Dict[str, Any]:
        """
        Execute SQL query and return results.
        
        Args:
            sql_query: SQL query to execute
            db: Database session
            
        Returns:
            Dictionary with query results
        """
        try:
            start_time = time.time()
            
            # Execute query
            result = db.execute(text(sql_query))
            
            # Get column names
            columns = list(result.keys()) if result.keys() else []
            
            # Fetch all rows
            rows = []
            for row in result.fetchall():
                row_dict = dict(zip(columns, row))
                # Convert any non-serializable types
                for key, value in row_dict.items():
                    if isinstance(value, (datetime,)):
                        row_dict[key] = value.isoformat()
                rows.append(row_dict)
            
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
    
    def get_literature_context(
        self,
        query: str,
        max_results: int = 3,
        literature_ids: Optional[List[int]] = None
    ) -> List[Dict[str, Any]]:
        """
        Get relevant literature context using RAG.
        
        Args:
            query: Natural language query
            max_results: Maximum number of literature results
            literature_ids: Optional filter by literature IDs
            
        Returns:
            List of literature context dictionaries
        """
        try:
            if max_results <= 0:
                return []
            
            rag_service = get_rag_service()
            
            # Search literature
            results = rag_service.search_literature(
                query=query,
                top_k=max_results,
                literature_ids=literature_ids
            )
            
            # Format results
            context = []
            for result in results:
                context.append({
                    "literature_id": result["literature_id"],
                    "filename": result["filename"],
                    "text": result["text"],
                    "relevance_score": result["score"],
                    "metadata": result["metadata"]
                })
            
            return context
            
        except Exception as e:
            logger.error(f"Error getting literature context: {str(e)}")
            return []
    
    def synthesize_results(
        self,
        query: str,
        sql_result: Dict[str, Any],
        literature_context: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Synthesize data results with literature context using Gemini.
        
        Args:
            query: Original natural language query
            sql_result: SQL execution results
            literature_context: Literature context from RAG
            
        Returns:
            Dictionary with synthesis results
        """
        try:
            # Prepare data summary
            data_summary = f"Query returned {sql_result['row_count']} rows"
            if sql_result['row_count'] > 0:
                data_summary += f" with columns: {', '.join(sql_result['columns'])}"
                if sql_result['row_count'] <= 5:
                    data_summary += f"\nSample data: {json.dumps(sql_result['rows'][:5], indent=2)}"
                else:
                    data_summary += f"\nFirst 3 rows: {json.dumps(sql_result['rows'][:3], indent=2)}"
            
            # Prepare literature summary
            literature_summary = ""
            if literature_context:
                literature_summary = f"Found {len(literature_context)} relevant literature sources:\n"
                for i, lit in enumerate(literature_context, 1):
                    literature_summary += f"{i}. {lit['filename']}: {lit['text'][:200]}...\n"
            
            # Create synthesis prompt
            prompt = f"""
You are a research analyst. Synthesize the data query results with relevant literature context to provide comprehensive insights.

ORIGINAL QUERY:
{query}

DATA RESULTS:
{data_summary}

LITERATURE CONTEXT:
{literature_summary}

INSTRUCTIONS:
1. Provide a clear summary of what the data shows
2. Identify key findings from the data
3. Extract insights from the literature that relate to the query
4. Note any methodology considerations
5. Identify limitations or caveats
6. Be objective and evidence-based

RESPONSE FORMAT (JSON):
{{
    "summary": "Brief overview of findings...",
    "key_findings": ["Finding 1", "Finding 2", "Finding 3"],
    "data_insights": ["Data insight 1", "Data insight 2"],
    "literature_insights": ["Literature insight 1", "Literature insight 2"],
    "methodology_notes": "Notes about methodology or approach...",
    "limitations": "Limitations or caveats to consider..."
}}

Respond with valid JSON only:
"""
            
            # Generate synthesis
            response = self.model.generate_content(prompt)
            
            # Parse response
            try:
                result = json.loads(response.text)
                
                # Ensure all fields exist
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
    
    def save_query_history(
        self,
        db: Session,
        query: str,
        sql_query: str,
        row_count: int,
        literature_count: int,
        processing_time_ms: float
    ) -> QueryHistory:
        """
        Save query to history.
        
        Args:
            db: Database session
            query: Original natural language query
            sql_query: Generated SQL query
            row_count: Number of rows returned
            literature_count: Number of literature results
            processing_time_ms: Total processing time
            
        Returns:
            Created QueryHistory instance
        """
        try:
            history = QueryHistory(
                query=query,
                sql_query=sql_query,
                row_count=row_count,
                literature_count=literature_count,
                processing_time_ms=processing_time_ms
            )
            
            db.add(history)
            db.commit()
            db.refresh(history)
            
            return history
            
        except Exception as e:
            logger.error(f"Error saving query history: {str(e)}")
            raise
    
    def get_query_history(
        self,
        db: Session,
        page: int = 1,
        page_size: int = 20
    ) -> Tuple[List[QueryHistory], int]:
        """
        Get query history with pagination.
        
        Args:
            db: Database session
            page: Page number (1-based)
            page_size: Number of items per page
            
        Returns:
            Tuple of (query list, total count)
        """
        try:
            offset = (page - 1) * page_size
            
            queries = db.query(QueryHistory)\
                .order_by(QueryHistory.created_at.desc())\
                .offset(offset)\
                .limit(page_size)\
                .all()
            
            total_count = db.query(QueryHistory).count()
            
            return queries, total_count
            
        except Exception as e:
            logger.error(f"Error getting query history: {str(e)}")
            raise
    
    def _build_schema_context(self, schemas: List[Dict[str, Any]]) -> str:
        """
        Build schema context string for LLM prompt.
        
        Args:
            schemas: List of schema dictionaries
            
        Returns:
            Formatted schema context string
        """
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


# Singleton instance
_query_service_instance = None


def get_query_service() -> QueryService:
    """Get or create query service singleton."""
    global _query_service_instance
    if _query_service_instance is None:
        _query_service_instance = QueryService()
    return _query_service_instance