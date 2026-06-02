"""
Query service for natural language to SQL conversion and RAG-augmented synthesis
"""
from typing import Dict, List, Tuple, Optional
import pandas as pd
import config
from database.db_manager import DatabaseManager
from services.rag_service import RAGService
import google.generativeai as genai


class QueryService:
    """Handles natural language query processing"""
    
    def __init__(self):
        self.db = DatabaseManager()
        self.rag_service = RAGService()
        self._init_gemini()
    
    def _init_gemini(self):
        """Initialize Gemini API"""
        try:
            genai.configure(api_key=config.GEMINI_API_KEY)
            self.model = genai.GenerativeModel(config.LLM_MODEL)
        except Exception as e:
            print(f"Error initializing Gemini: {e}")
            self.model = None
    
    def process_query(self, query_text: str, dataset_id: int) -> Dict:
        """
        Process natural language query with RAG augmentation
        Returns: Dict with sql, results, literature_context, synthesis
        """
        try:
            # Get dataset info
            dataset = self.db.get_dataset_by_id(dataset_id)
            if not dataset:
                return {
                    'success': False,
                    'error': 'Dataset not found'
                }
            
            # Get table schema
            schema = self._get_table_schema(dataset['table_name'])
            
            # Convert NL to SQL
            sql_query = self._nl_to_sql(query_text, dataset['table_name'], schema)
            
            if not sql_query:
                return {
                    'success': False,
                    'error': 'Failed to generate SQL query'
                }
            
            # Execute SQL
            try:
                results_df = self.db.query_dataset(sql_query)
            except Exception as e:
                return {
                    'success': False,
                    'error': f'SQL execution failed: {str(e)}',
                    'sql': sql_query
                }
            
            # Retrieve relevant literature
            literature_passages = self.rag_service.retrieve_relevant_passages(query_text)
            
            # Synthesize results with literature context
            synthesis = self._synthesize_results(
                query_text, 
                results_df, 
                literature_passages
            )
            
            # Save to query history
            query_id = self.db.add_query_history(
                query_text=query_text,
                sql_query=sql_query,
                dataset_id=dataset_id,
                result_count=len(results_df)
            )
            
            return {
                'success': True,
                'query_id': query_id,
                'sql': sql_query,
                'results': results_df,
                'literature_context': literature_passages,
                'synthesis': synthesis,
                'dataset_name': dataset['name']
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': f'Query processing failed: {str(e)}'
            }
    
    def _get_table_schema(self, table_name: str) -> str:
        """Get table schema as string"""
        try:
            conn = self.db.get_connection()
            cursor = conn.execute(f"PRAGMA table_info({table_name})")
            columns = cursor.fetchall()
            conn.close()
            
            schema_parts = []
            for col in columns:
                schema_parts.append(f"{col['name']} ({col['type']})")
            
            return ", ".join(schema_parts)
        except Exception:
            return "Unknown schema"
    
    def _nl_to_sql(self, query_text: str, table_name: str, schema: str) -> Optional[str]:
        """Convert natural language to SQL using Gemini"""
        try:
            if not self.model:
                return None
            
            prompt = f"""Convert the following natural language query to a SQL query.

Table name: {table_name}
Table schema: {schema}

Natural language query: {query_text}

Requirements:
- Generate ONLY the SQL query, no explanations
- Use SELECT statements only (no INSERT, UPDATE, DELETE)
- Use proper SQL syntax for SQLite
- Include appropriate WHERE, GROUP BY, ORDER BY clauses as needed
- Limit results to 1000 rows maximum

SQL query:"""
            
            response = self.model.generate_content(
                prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=config.LLM_TEMPERATURE,
                    max_output_tokens=config.MAX_TOKENS
                )
            )
            
            sql_query = response.text.strip()
            
            # Clean up the response
            sql_query = sql_query.replace('```sql', '').replace('```', '').strip()
            
            # Add LIMIT if not present
            if 'LIMIT' not in sql_query.upper():
                sql_query += ' LIMIT 1000'
            
            return sql_query
            
        except Exception as e:
            print(f"Error in NL to SQL conversion: {e}")
            return None
    
    def _synthesize_results(self, query_text: str, results_df: pd.DataFrame, 
                           literature_passages: List[Dict]) -> str:
        """Synthesize query results with literature context"""
        try:
            if not self.model:
                return "Synthesis unavailable (Gemini not initialized)"
            
            # Prepare results summary
            results_summary = self._summarize_results(results_df)
            
            # Prepare literature context
            lit_context = self._format_literature_context(literature_passages)
            
            prompt = f"""Synthesize the following query results with relevant literature context.

Original query: {query_text}

Query results summary:
{results_summary}

Relevant literature context:
{lit_context}

Task:
1. Summarize the key findings from the query results
2. Relate the findings to the literature context
3. Highlight any agreements or contradictions with published research
4. Provide citations for literature references (include source and page number)
5. Keep the synthesis concise (3-5 paragraphs maximum)

Synthesis:"""
            
            response = self.model.generate_content(
                prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=config.LLM_TEMPERATURE,
                    max_output_tokens=config.MAX_TOKENS
                )
            )
            
            return response.text.strip()
            
        except Exception as e:
            return f"Synthesis failed: {str(e)}"
    
    def _summarize_results(self, df: pd.DataFrame) -> str:
        """Create a summary of query results"""
        if df.empty:
            return "No results found"
        
        summary_parts = [
            f"Total rows: {len(df)}",
            f"Columns: {', '.join(df.columns.tolist())}"
        ]
        
        # Add basic statistics for numeric columns
        numeric_cols = df.select_dtypes(include=['number']).columns
        if len(numeric_cols) > 0:
            summary_parts.append("\nNumeric column statistics:")
            for col in numeric_cols[:3]:  # Limit to first 3 numeric columns
                summary_parts.append(f"  {col}: mean={df[col].mean():.2f}, min={df[col].min():.2f}, max={df[col].max():.2f}")
        
        # Add sample rows
        summary_parts.append(f"\nFirst 5 rows:\n{df.head(5).to_string()}")
        
        return "\n".join(summary_parts)
    
    def _format_literature_context(self, passages: List[Dict]) -> str:
        """Format literature passages for synthesis"""
        if not passages:
            return "No relevant literature found"
        
        formatted = []
        for i, passage in enumerate(passages[:3], 1):  # Limit to top 3
            formatted.append(
                f"[{i}] Source: {passage['source']}, Page: {passage['page']}\n"
                f"    {passage['content'][:300]}..."
            )
        
        return "\n\n".join(formatted)
    
    def get_query_history(self, limit: int = 10) -> List[Dict]:
        """Get recent query history"""
        return self.db.get_query_history(limit)
    
    def explain_sql(self, sql_query: str) -> str:
        """Explain what a SQL query does in natural language"""
        try:
            if not self.model:
                return "Explanation unavailable (Gemini not initialized)"
            
            prompt = f"""Explain the following SQL query in simple, natural language.

SQL query:
{sql_query}

Provide a clear, concise explanation of:
1. What data is being retrieved
2. Any filtering or conditions applied
3. How the results are organized or sorted
4. What the query is trying to answer

Explanation:"""
            
            response = self.model.generate_content(
                prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=0.3,
                    max_output_tokens=500
                )
            )
            
            return response.text.strip()
            
        except Exception as e:
            return f"Explanation failed: {str(e)}"
