"""
Research Workspace MVP - Main Streamlit Application
"""
import streamlit as st
import pandas as pd
from pathlib import Path
import config
from database.db_manager import DatabaseManager
from services.file_processor import FileProcessor

# Page configuration
st.set_page_config(
    page_title=config.APP_NAME,
    page_icon="🔬",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Initialize session state
if 'db' not in st.session_state:
    st.session_state.db = DatabaseManager()
if 'file_processor' not in st.session_state:
    st.session_state.file_processor = FileProcessor()
if 'rag_service' not in st.session_state:
    from services.rag_service import RAGService
    st.session_state.rag_service = RAGService()
if 'query_service' not in st.session_state:
    from services.query_service import QueryService
    st.session_state.query_service = QueryService()
if 'viz_service' not in st.session_state:
    from services.viz_service import VisualizationService
    st.session_state.viz_service = VisualizationService()
if 'notes_service' not in st.session_state:
    from services.notes_service import NotesService
    st.session_state.notes_service = NotesService()
if 'export_service' not in st.session_state:
    from services.export_service import ExportService
    st.session_state.export_service = ExportService()

# Initialize page state
if 'current_page' not in st.session_state:
    st.session_state.current_page = "upload"


def render_header():
    """Render application header"""
    st.title("🔬 Research Workspace MVP")
    st.markdown("*AI-driven data engineering workspace for researchers*")
    st.markdown("---")


def render_sidebar():
    """Render sidebar navigation"""
    st.sidebar.title("Navigation")
    
    # Page selection
    page = st.sidebar.radio(
        "Go to",
        ["📤 Upload Files", "📊 Data Explorer", "🔍 Query & Analyze", 
         "📈 Visualizations", "📝 Notes", "💾 Export"],
        key="nav_radio"
    )
    
    # Map display names to page keys
    page_map = {
        "📤 Upload Files": "upload",
        "📊 Data Explorer": "explorer",
        "🔍 Query & Analyze": "query",
        "📈 Visualizations": "visualizations",
        "📝 Notes": "notes",
        "💾 Export": "export"
    }
    
    st.session_state.current_page = page_map[page]
    
    st.sidebar.markdown("---")
    
    # Display stats
    st.sidebar.subheader("📊 Workspace Stats")
    datasets = st.session_state.db.get_datasets()
    literature = st.session_state.db.get_literature()
    indexed_count = st.session_state.rag_service.get_indexed_literature_count()
    
    st.sidebar.metric("Datasets", len(datasets))
    st.sidebar.metric("Literature", len(literature))
    st.sidebar.metric("Indexed Papers", indexed_count)
    
    st.sidebar.markdown("---")
    st.sidebar.caption(f"Version {config.APP_VERSION}")


def render_upload_page():
    """Render file upload page"""
    st.header("📤 Upload Files")
    
    col1, col2 = st.columns(2)
    
    # CSV Upload
    with col1:
        st.subheader("📊 Upload Dataset (CSV)")
        csv_file = st.file_uploader(
            "Choose a CSV file",
            type=['csv'],
            key="csv_uploader",
            help="Upload your quantitative data (max 100MB)"
        )
        
        if csv_file:
            # Validate
            valid, msg = st.session_state.file_processor.validate_csv_file(csv_file)
            
            if valid:
                if st.button("Process CSV", key="process_csv"):
                    with st.spinner("Processing CSV file..."):
                        success, message, dataset_id = st.session_state.file_processor.process_csv(csv_file)
                        
                        if success:
                            st.success(message)
                            st.balloons()
                            
                            # Show preview
                            if dataset_id:
                                preview_df = st.session_state.file_processor.get_csv_preview(dataset_id)
                                if preview_df is not None:
                                    st.subheader("Preview (first 10 rows)")
                                    st.dataframe(preview_df)
                        else:
                            st.error(message)
            else:
                st.error(msg)
    
    # PDF Upload
    with col2:
        st.subheader("📄 Upload Literature (PDF)")
        pdf_file = st.file_uploader(
            "Choose a PDF file",
            type=['pdf'],
            key="pdf_uploader",
            help="Upload research papers (max 100MB)"
        )
        
        if pdf_file:
            # Validate
            valid, msg = st.session_state.file_processor.validate_pdf_file(pdf_file)
            
            if valid:
                if st.button("Process PDF", key="process_pdf"):
                    with st.spinner("Processing PDF file..."):
                        success, message, lit_id = st.session_state.file_processor.process_pdf(pdf_file)
                        
                        if success:
                            st.success(message)
                            
                            # Process through RAG pipeline
                            with st.spinner("Indexing PDF for RAG retrieval..."):
                                rag_success, rag_message = st.session_state.rag_service.process_literature(lit_id)
                                
                                if rag_success:
                                    st.success(f"✅ {rag_message}")
                                    st.balloons()
                                else:
                                    st.warning(f"⚠️ RAG indexing failed: {rag_message}")
                        else:
                            st.error(message)
            else:
                st.error(msg)
    
    st.markdown("---")
    
    # Display uploaded files
    st.subheader("📁 Uploaded Files")
    
    tab1, tab2 = st.tabs(["Datasets", "Literature"])
    
    with tab1:
        datasets = st.session_state.db.get_datasets()
        if datasets:
            for ds in datasets:
                with st.expander(f"📊 {ds['name']}"):
                    col_a, col_b, col_c = st.columns([2, 2, 1])
                    with col_a:
                        st.write(f"**Rows:** {ds['row_count']:,}")
                        st.write(f"**Columns:** {ds['column_count']}")
                    with col_b:
                        st.write(f"**Uploaded:** {ds['upload_date']}")
                        st.write(f"**Size:** {ds['file_size_bytes'] / 1024:.1f} KB")
                    with col_c:
                        if st.button("🗑️ Delete", key=f"del_ds_{ds['id']}"):
                            st.session_state.db.delete_dataset(ds['id'])
                            st.rerun()
        else:
            st.info("No datasets uploaded yet")
    
    with tab2:
        literature = st.session_state.db.get_literature()
        if literature:
            for lit in literature:
                # Status badge
                status = lit['processing_status']
                status_emoji = {
                    'pending': '⏳',
                    'processing': '⚙️',
                    'indexed': '✅',
                    'failed': '❌'
                }.get(status, '❓')
                
                with st.expander(f"📄 {lit['filename']} {status_emoji}"):
                    col_a, col_b, col_c = st.columns([2, 2, 1])
                    with col_a:
                        st.write(f"**Pages:** {lit['page_count']}")
                        st.write(f"**Status:** {status}")
                    with col_b:
                        st.write(f"**Uploaded:** {lit['upload_date']}")
                        st.write(f"**Size:** {lit['file_size_bytes'] / 1024:.1f} KB")
                    with col_c:
                        # Reindex button for failed/pending
                        if status in ['pending', 'failed']:
                            if st.button("🔄 Index", key=f"reindex_lit_{lit['id']}"):
                                with st.spinner("Indexing..."):
                                    success, msg = st.session_state.rag_service.process_literature(lit['id'])
                                    if success:
                                        st.success(msg)
                                        st.rerun()
                                    else:
                                        st.error(msg)
                        
                        if st.button("🗑️ Delete", key=f"del_lit_{lit['id']}"):
                            st.session_state.db.delete_literature(lit['id'])
                            st.rerun()
        else:
            st.info("No literature uploaded yet")


def render_explorer_page():
    """Render data explorer page"""
    st.header("📊 Data Explorer")
    
    tab1, tab2 = st.tabs(["Dataset Explorer", "Literature Search"])
    
    with tab1:
        # Show available datasets
        datasets = st.session_state.db.get_datasets()
        if datasets:
            selected_ds = st.selectbox(
                "Select dataset to explore",
                options=[ds['name'] for ds in datasets],
                key="explorer_dataset"
            )
            
            if selected_ds:
                dataset = next(ds for ds in datasets if ds['name'] == selected_ds)
                preview_df = st.session_state.file_processor.get_csv_preview(dataset['id'], rows=100)
                
                if preview_df is not None:
                    st.subheader(f"Dataset: {selected_ds}")
                    st.dataframe(preview_df, use_container_width=True)
                    
                    # Basic stats
                    st.subheader("Basic Statistics")
                    st.dataframe(preview_df.describe(), use_container_width=True)
        else:
            st.warning("No datasets available. Please upload a CSV file first.")
    
    with tab2:
        st.subheader("🔍 Test RAG Literature Search")
        
        indexed_count = st.session_state.rag_service.get_indexed_literature_count()
        
        if indexed_count == 0:
            st.warning("No literature indexed yet. Please upload and process PDF files first.")
        else:
            st.info(f"📚 {indexed_count} papers indexed and ready for search")
            
            # Search interface
            search_query = st.text_input(
                "Search literature",
                placeholder="e.g., machine learning algorithms, protein folding, quantum computing",
                key="lit_search_query"
            )
            
            if search_query:
                with st.spinner("Searching literature..."):
                    results = st.session_state.rag_service.search_literature(search_query, top_k=5)
                    
                    if results:
                        st.success(f"Found {len(results)} relevant papers")
                        
                        for i, result in enumerate(results):
                            with st.expander(f"📄 {result['source']} (Relevance: {result['relevance']:.3f})"):
                                st.write(f"**{len(result['passages'])} relevant passages found:**")
                                
                                for j, passage in enumerate(result['passages'][:3]):  # Show top 3 passages
                                    st.markdown(f"**Passage {j+1}** (Page {passage['page']}):")
                                    st.markdown(f"> {passage['content'][:500]}...")
                                    st.markdown("---")
                    else:
                        st.info("No relevant passages found. Try a different query.")


def render_query_page():
    """Render query page"""
    st.header("🔍 Query & Analyze")
    
    # Check if we have datasets
    datasets = st.session_state.db.get_datasets()
    if not datasets:
        st.warning("No datasets available. Please upload a CSV file first.")
        return
    
    # Dataset selection
    selected_ds_name = st.selectbox(
        "Select dataset to query",
        options=[ds['name'] for ds in datasets],
        key="query_dataset_select"
    )
    
    selected_dataset = next(ds for ds in datasets if ds['name'] == selected_ds_name)
    
    st.info(f"� Dataset: **{selected_dataset['name']}** ({selected_dataset['row_count']:,} rows, {selected_dataset['column_count']} columns)")
    
    # Query input
    st.subheader("💬 Ask a Question")
    
    query_text = st.text_area(
        "Enter your question in natural language",
        placeholder="e.g., What is the average value by category?\nShow me the top 10 items by score\nHow many records are there per region?",
        height=100,
        key="query_input"
    )
    
    col1, col2 = st.columns([1, 4])
    with col1:
        execute_query = st.button("🚀 Execute Query", type="primary", use_container_width=True)
    with col2:
        if st.session_state.get('last_sql'):
            if st.button("📖 Explain SQL", use_container_width=True):
                with st.spinner("Generating explanation..."):
                    explanation = st.session_state.query_service.explain_sql(st.session_state.last_sql)
                    st.info(explanation)
    
    if execute_query and query_text:
        with st.spinner("Processing query..."):
            result = st.session_state.query_service.process_query(
                query_text=query_text,
                dataset_id=selected_dataset['id']
            )
            
            if result['success']:
                st.success("✅ Query executed successfully!")
                
                # Store last SQL for explanation
                st.session_state.last_sql = result['sql']
                st.session_state.last_results = result['results']
                
                # Display SQL query
                with st.expander("🔍 Generated SQL Query", expanded=False):
                    st.code(result['sql'], language='sql')
                
                # Display results
                st.subheader("📊 Query Results")
                st.dataframe(result['results'], use_container_width=True)
                st.caption(f"Showing {len(result['results'])} rows")
                
                # Generate and display visualization
                st.subheader("📈 Visualization")
                with st.spinner("Generating visualization..."):
                    viz_result = st.session_state.viz_service.analyze_and_visualize(
                        result['results'],
                        query_text
                    )
                    
                    if viz_result['success']:
                        st.info(f"📊 Chart type: **{viz_result['viz_type']}** - {viz_result['explanation']}")
                        
                        if viz_result['figure']:
                            st.plotly_chart(viz_result['figure'], use_container_width=True)
                        else:
                            st.info("Data best displayed as table (shown above)")
                    else:
                        st.warning(f"Visualization unavailable: {viz_result.get('error', 'Unknown error')}")
                
                # Display literature context
                if result['literature_context']:
                    st.subheader("📚 Relevant Literature")
                    for i, passage in enumerate(result['literature_context'], 1):
                        with st.expander(f"📄 {passage['source']} (Page {passage['page']}) - Relevance: {passage['relevance_score']:.3f}"):
                            st.markdown(passage['content'])
                else:
                    st.info("No relevant literature found for this query")
                
                # Display synthesis
                st.subheader("🎯 Analysis & Synthesis")
                st.markdown(result['synthesis'])
                
            else:
                st.error(f"❌ Query failed: {result['error']}")
                if 'sql' in result:
                    st.code(result['sql'], language='sql')
    
    # Query history
    st.markdown("---")
    st.subheader("📜 Recent Queries")
    
    history = st.session_state.query_service.get_query_history(limit=5)
    if history:
        for query in history:
            with st.expander(f"🕐 {query['created_at']} - {query['query_text'][:50]}..."):
                st.write(f"**Query:** {query['query_text']}")
                if query['sql_query']:
                    st.code(query['sql_query'], language='sql')
                st.write(f"**Results:** {query['result_count']} rows")
    else:
        st.info("No query history yet")


def render_visualizations_page():
    """Render visualizations page"""
    st.header("📈 Visualizations")
    
    # Check if we have query results
    if 'last_results' not in st.session_state or st.session_state.last_results is None:
        st.info("No visualization data available. Please run a query first from the Query & Analyze page.")
        return
    
    df = st.session_state.last_results
    
    st.subheader("Current Dataset")
    st.caption(f"{len(df)} rows × {len(df.columns)} columns")
    
    # Visualization type selector
    viz_types = ['auto', 'scatter', 'line', 'bar', 'histogram', 'spatial_scatter']
    selected_viz = st.selectbox(
        "Select visualization type",
        options=viz_types,
        format_func=lambda x: {
            'auto': '🤖 Auto-detect',
            'scatter': '📊 Scatter Plot',
            'line': '📈 Line Chart',
            'bar': '📊 Bar Chart',
            'histogram': '📊 Histogram',
            'spatial_scatter': '🗺️ Spatial Map'
        }[x],
        key="viz_type_select"
    )
    
    # Generate visualization
    if st.button("Generate Visualization", type="primary"):
        with st.spinner("Generating visualization..."):
            if selected_viz == 'auto':
                viz_result = st.session_state.viz_service.analyze_and_visualize(df)
            else:
                # Force specific type
                viz_result = {
                    'success': True,
                    'viz_type': selected_viz,
                    'figure': st.session_state.viz_service._generate_visualization(df, selected_viz),
                    'explanation': f'User-selected {selected_viz} visualization'
                }
            
            if viz_result['success'] and viz_result.get('figure'):
                st.success(f"✅ {viz_result['explanation']}")
                st.plotly_chart(viz_result['figure'], use_container_width=True)
                
                # Export options
                st.subheader("💾 Export Visualization")
                col1, col2, col3 = st.columns(3)
                
                with col1:
                    if st.button("📥 Download PNG"):
                        try:
                            img_bytes = st.session_state.viz_service.export_visualization(
                                viz_result['figure'], 'png'
                            )
                            st.download_button(
                                "Download PNG",
                                data=img_bytes,
                                file_name="visualization.png",
                                mime="image/png"
                            )
                        except Exception as e:
                            st.error(f"Export failed: {e}")
                
                with col2:
                    if st.button("📥 Download HTML"):
                        html_bytes = st.session_state.viz_service.export_visualization(
                            viz_result['figure'], 'html'
                        )
                        st.download_button(
                            "Download HTML",
                            data=html_bytes,
                            file_name="visualization.html",
                            mime="text/html"
                        )
                
                with col3:
                    if st.button("📥 Download JSON"):
                        json_bytes = st.session_state.viz_service.export_visualization(
                            viz_result['figure'], 'json'
                        )
                        st.download_button(
                            "Download JSON",
                            data=json_bytes,
                            file_name="visualization.json",
                            mime="application/json"
                        )
            else:
                st.error(f"Visualization failed: {viz_result.get('error', 'Unknown error')}")


def render_notes_page():
    """Render notes page"""
    st.header("📝 Notes")
    
    # Create new note
    st.subheader("✍️ Create New Note")
    note_content = st.text_area("Note content", height=150, key="new_note_content")
    note_tags = st.text_input("Tags (comma-separated)", key="new_note_tags")
    
    if st.button("💾 Save Note", type="primary"):
        if note_content:
            note_id = st.session_state.notes_service.create_note(note_content, note_tags)
            st.success(f"✅ Note saved (ID: {note_id})")
            st.rerun()
        else:
            st.warning("Please enter note content")
    
    st.markdown("---")
    
    # Display notes
    st.subheader("📚 All Notes")
    
    # Search
    search_term = st.text_input("🔍 Search notes", key="note_search")
    
    if search_term:
        notes = st.session_state.notes_service.search_notes(search_term)
    else:
        notes = st.session_state.notes_service.get_notes()
    
    if notes:
        for note in notes:
            with st.expander(f"📝 Note {note['id']} - {note['created_at']}"):
                st.markdown(note['content'])
                if note['tags']:
                    st.caption(f"🏷️ Tags: {note['tags']}")
                if st.button(f"🗑️ Delete", key=f"del_note_{note['id']}"):
                    st.session_state.notes_service.delete_note(note['id'])
                    st.rerun()
    else:
        st.info("No notes yet. Create your first note above!")


def render_export_page():
    """Render export page"""
    st.header("💾 Export")
    
    tab1, tab2, tab3 = st.tabs(["Export Datasets", "Export Query Results", "Export Notes"])
    
    with tab1:
        st.subheader("📊 Export Datasets")
        datasets = st.session_state.db.get_datasets()
        
        if datasets:
            selected_ds = st.selectbox(
                "Select dataset to export",
                options=[ds['name'] for ds in datasets],
                key="export_dataset_select"
            )
            
            dataset = next(ds for ds in datasets if ds['name'] == selected_ds)
            
            col1, col2 = st.columns(2)
            with col1:
                if st.button("📥 Export as CSV"):
                    data = st.session_state.export_service.export_dataset(dataset['id'], 'csv')
                    st.download_button(
                        "Download CSV",
                        data=data,
                        file_name=f"{selected_ds}.csv",
                        mime="text/csv"
                    )
            
            with col2:
                if st.button("📥 Export as JSON"):
                    data = st.session_state.export_service.export_dataset(dataset['id'], 'json')
                    st.download_button(
                        "Download JSON",
                        data=data,
                        file_name=f"{selected_ds}.json",
                        mime="application/json"
                    )
        else:
            st.info("No datasets available to export")
    
    with tab2:
        st.subheader("📊 Export Query Results")
        
        if 'last_results' in st.session_state and st.session_state.last_results is not None:
            df = st.session_state.last_results
            st.info(f"Current results: {len(df)} rows × {len(df.columns)} columns")
            
            col1, col2 = st.columns(2)
            with col1:
                if st.button("📥 Export Results as CSV"):
                    data = st.session_state.export_service.export_query_results(df, 'csv')
                    st.download_button(
                        "Download CSV",
                        data=data,
                        file_name="query_results.csv",
                        mime="text/csv"
                    )
            
            with col2:
                if st.button("📥 Export Results as JSON"):
                    data = st.session_state.export_service.export_query_results(df, 'json')
                    st.download_button(
                        "Download JSON",
                        data=data,
                        file_name="query_results.json",
                        mime="application/json"
                    )
        else:
            st.info("No query results available. Run a query first.")
    
    with tab3:
        st.subheader("📝 Export Notes")
        
        notes = st.session_state.notes_service.get_notes()
        if notes:
            st.info(f"Total notes: {len(notes)}")
            
            col1, col2 = st.columns(2)
            with col1:
                if st.button("📥 Export as Markdown"):
                    data = st.session_state.export_service.export_notes('md')
                    st.download_button(
                        "Download Markdown",
                        data=data,
                        file_name="notes.md",
                        mime="text/markdown"
                    )
            
            with col2:
                if st.button("📥 Export as JSON"):
                    data = st.session_state.export_service.export_notes('json')
                    st.download_button(
                        "Download JSON",
                        data=data,
                        file_name="notes.json",
                        mime="application/json"
                    )
        else:
            st.info("No notes available to export")


def main():
    """Main application entry point"""
    # Check for API key
    if not config.GEMINI_API_KEY:
        st.error("⚠️ GEMINI_API_KEY not found. Please set it in .env file")
        st.info("Get your API key from: https://makersuite.google.com/app/apikey")
        st.stop()
    
    render_header()
    render_sidebar()
    
    # Route to appropriate page
    if st.session_state.current_page == "upload":
        render_upload_page()
    elif st.session_state.current_page == "explorer":
        render_explorer_page()
    elif st.session_state.current_page == "query":
        render_query_page()
    elif st.session_state.current_page == "visualizations":
        render_visualizations_page()
    elif st.session_state.current_page == "notes":
        render_notes_page()
    elif st.session_state.current_page == "export":
        render_export_page()


if __name__ == "__main__":
    main()
