"""
Visualization service for dynamic chart generation with Plotly
"""
from typing import Dict, List, Optional, Tuple
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import config


class VisualizationService:
    """Handles visualization generation and analysis"""
    
    def __init__(self):
        pass
    
    def analyze_and_visualize(self, df: pd.DataFrame, query_text: str = "") -> Dict:
        """
        Analyze data and generate appropriate visualization
        Returns: Dict with viz_type, figure, config, explanation
        """
        try:
            if df.empty:
                return {
                    'success': False,
                    'error': 'No data to visualize'
                }
            
            # Detect visualization type
            viz_type, reason = self._detect_viz_type(df, query_text)
            
            # Generate visualization
            fig = self._generate_visualization(df, viz_type)
            
            if not fig:
                return {
                    'success': False,
                    'error': 'Failed to generate visualization'
                }
            
            # Get configuration
            config_dict = self._get_viz_config(fig, viz_type)
            
            return {
                'success': True,
                'viz_type': viz_type,
                'figure': fig,
                'config': config_dict,
                'explanation': reason,
                'data_shape': df.shape
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': f'Visualization failed: {str(e)}'
            }
    
    def _detect_viz_type(self, df: pd.DataFrame, query_text: str) -> Tuple[str, str]:
        """
        Detect appropriate visualization type
        Returns: (viz_type, reason)
        """
        # Check for spatial data
        if self._has_spatial_data(df):
            return 'spatial_scatter', 'Detected spatial coordinates (latitude/longitude)'
        
        # Get column types
        numeric_cols = df.select_dtypes(include=['number']).columns.tolist()
        categorical_cols = df.select_dtypes(include=['object', 'category']).columns.tolist()
        
        # Decision logic
        if len(numeric_cols) >= 2 and len(df) > 1:
            # Check for time series
            if self._has_time_column(df):
                return 'line', 'Time series data detected'
            # Scatter plot for two numeric columns
            return 'scatter', f'Two numeric columns: {numeric_cols[0]} vs {numeric_cols[1]}'
        
        elif len(categorical_cols) >= 1 and len(numeric_cols) >= 1:
            if len(df) > 20:
                return 'bar', f'Categorical data with numeric values'
            else:
                return 'bar', f'Categorical comparison: {categorical_cols[0]} by {numeric_cols[0]}'
        
        elif len(numeric_cols) == 1:
            if len(df) > 50:
                return 'histogram', f'Distribution of {numeric_cols[0]}'
            else:
                return 'bar', f'Values of {numeric_cols[0]}'
        
        else:
            # Default to table view
            return 'table', 'Data best displayed as table'
    
    def _has_spatial_data(self, df: pd.DataFrame) -> bool:
        """Check if dataframe has spatial coordinates"""
        lat_cols = ['lat', 'latitude', 'Lat', 'Latitude', 'LAT']
        lon_cols = ['lon', 'longitude', 'lng', 'Lon', 'Longitude', 'LON', 'Lng']
        
        has_lat = any(col in df.columns for col in lat_cols)
        has_lon = any(col in df.columns for col in lon_cols)
        
        return has_lat and has_lon
    
    def _has_time_column(self, df: pd.DataFrame) -> bool:
        """Check if dataframe has time/date column"""
        time_keywords = ['date', 'time', 'year', 'month', 'day', 'timestamp']
        return any(keyword in col.lower() for col in df.columns for keyword in time_keywords)
    
    def _generate_visualization(self, df: pd.DataFrame, viz_type: str) -> Optional[go.Figure]:
        """Generate Plotly figure based on visualization type"""
        try:
            if viz_type == 'spatial_scatter':
                return self._create_spatial_scatter(df)
            elif viz_type == 'scatter':
                return self._create_scatter(df)
            elif viz_type == 'line':
                return self._create_line(df)
            elif viz_type == 'bar':
                return self._create_bar(df)
            elif viz_type == 'histogram':
                return self._create_histogram(df)
            elif viz_type == 'table':
                return None  # Table handled separately
            else:
                return self._create_scatter(df)  # Default
                
        except Exception as e:
            print(f"Error generating visualization: {e}")
            return None
    
    def _create_spatial_scatter(self, df: pd.DataFrame) -> go.Figure:
        """Create spatial scatter plot (map)"""
        # Find lat/lon columns
        lat_col = next((col for col in df.columns if col.lower() in ['lat', 'latitude']), None)
        lon_col = next((col for col in df.columns if col.lower() in ['lon', 'longitude', 'lng']), None)
        
        if not lat_col or not lon_col:
            raise ValueError("Latitude/longitude columns not found")
        
        # Find color column (first categorical or numeric)
        color_col = None
        for col in df.columns:
            if col not in [lat_col, lon_col]:
                color_col = col
                break
        
        fig = px.scatter_mapbox(
            df,
            lat=lat_col,
            lon=lon_col,
            color=color_col if color_col else None,
            hover_data=df.columns.tolist(),
            zoom=3,
            height=600
        )
        
        fig.update_layout(
            mapbox_style="open-street-map",
            title="Spatial Distribution"
        )
        
        return fig
    
    def _create_scatter(self, df: pd.DataFrame) -> go.Figure:
        """Create scatter plot"""
        numeric_cols = df.select_dtypes(include=['number']).columns.tolist()
        
        if len(numeric_cols) < 2:
            raise ValueError("Need at least 2 numeric columns for scatter plot")
        
        x_col = numeric_cols[0]
        y_col = numeric_cols[1]
        
        # Find color column
        color_col = None
        categorical_cols = df.select_dtypes(include=['object', 'category']).columns.tolist()
        if categorical_cols:
            color_col = categorical_cols[0]
        
        fig = px.scatter(
            df,
            x=x_col,
            y=y_col,
            color=color_col if color_col else None,
            hover_data=df.columns.tolist(),
            title=f"{y_col} vs {x_col}"
        )
        
        fig.update_layout(height=500)
        
        return fig
    
    def _create_line(self, df: pd.DataFrame) -> go.Figure:
        """Create line chart"""
        # Find time column
        time_col = next((col for col in df.columns 
                        if any(kw in col.lower() for kw in ['date', 'time', 'year'])), 
                       df.columns[0])
        
        # Find numeric columns
        numeric_cols = df.select_dtypes(include=['number']).columns.tolist()
        
        if not numeric_cols:
            raise ValueError("No numeric columns for line chart")
        
        y_col = numeric_cols[0]
        
        fig = px.line(
            df,
            x=time_col,
            y=y_col,
            title=f"{y_col} over {time_col}"
        )
        
        fig.update_layout(height=500)
        
        return fig
    
    def _create_bar(self, df: pd.DataFrame) -> go.Figure:
        """Create bar chart"""
        categorical_cols = df.select_dtypes(include=['object', 'category']).columns.tolist()
        numeric_cols = df.select_dtypes(include=['number']).columns.tolist()
        
        if not categorical_cols or not numeric_cols:
            # Fallback: use index as x
            x_col = df.columns[0]
            y_col = numeric_cols[0] if numeric_cols else df.columns[1]
        else:
            x_col = categorical_cols[0]
            y_col = numeric_cols[0]
        
        # Aggregate if needed
        if len(df) > 50:
            df_agg = df.groupby(x_col)[y_col].mean().reset_index()
        else:
            df_agg = df
        
        fig = px.bar(
            df_agg,
            x=x_col,
            y=y_col,
            title=f"{y_col} by {x_col}"
        )
        
        fig.update_layout(height=500)
        
        return fig
    
    def _create_histogram(self, df: pd.DataFrame) -> go.Figure:
        """Create histogram"""
        numeric_cols = df.select_dtypes(include=['number']).columns.tolist()
        
        if not numeric_cols:
            raise ValueError("No numeric columns for histogram")
        
        col = numeric_cols[0]
        
        fig = px.histogram(
            df,
            x=col,
            title=f"Distribution of {col}",
            nbins=30
        )
        
        fig.update_layout(height=500)
        
        return fig
    
    def _get_viz_config(self, fig: go.Figure, viz_type: str) -> Dict:
        """Get visualization configuration"""
        return {
            'viz_type': viz_type,
            'height': config.DEFAULT_CHART_HEIGHT,
            'width': config.DEFAULT_CHART_WIDTH,
            'responsive': True
        }
    
    def export_visualization(self, fig: go.Figure, format: str = 'png') -> bytes:
        """Export visualization to file format"""
        try:
            if format == 'png':
                return fig.to_image(format='png')
            elif format == 'html':
                return fig.to_html().encode()
            elif format == 'json':
                return fig.to_json().encode()
            else:
                raise ValueError(f"Unsupported format: {format}")
        except Exception as e:
            raise Exception(f"Export failed: {str(e)}")
