"""
Visualization Refinement Service

Processes natural language commands to modify chart configurations.
"""

import json
from typing import Dict, Any, List, Optional
from google import genai
from google.genai import types
from google.genai import errors
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

class RefinementService:
    """Service for processing visualization refinement commands"""
    
    def __init__(self):
        self.client = genai.Client(api_key=settings.GOOGLE_API_KEY)
        self.system_instruction = "You are a helpful research assistant. Respond safely and accurately without generating harmful content."
        self.safety_settings = [
            types.SafetySetting(category="HARM_CATEGORY_HARASSMENT", threshold="BLOCK_NONE"),
            types.SafetySetting(category="HARM_CATEGORY_HATE_SPEECH", threshold="BLOCK_NONE"),
            types.SafetySetting(category="HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold="BLOCK_NONE"),
            types.SafetySetting(category="HARM_CATEGORY_DANGEROUS_CONTENT", threshold="BLOCK_NONE")
        ]
        self.model_name = settings.GEMINI_MODEL
        
    def _generate_with_fallback(self, prompt: str) -> str:
        """Generate content with fallback logic for rate limits."""
        config = types.GenerateContentConfig(
            system_instruction=self.system_instruction,
            safety_settings=self.safety_settings,
        )
        try:
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=prompt,
                config=config
            )
            return response.text
        except errors.APIError as e:
            if getattr(e, 'code', None) in [429, 503] or "429" in str(e) or "503" in str(e):
                logger.warning(f"Rate limit or model unavailable hit on {self.model_name}, trying fallbacks")
                for fallback_model in ["gemini-3.1-flash-lite", "gemma-4-26b-a4b-it"]:
                    try:
                        fallback_response = self.client.models.generate_content(
                            model=fallback_model,
                            contents=prompt,
                            config=config
                        )
                        return fallback_response.text
                    except errors.APIError as fallback_e:
                        if getattr(fallback_e, 'code', None) in [429, 503] or "429" in str(fallback_e) or "503" in str(fallback_e):
                            logger.warning(f"Rate limit or model unavailable hit on fallback {fallback_model}")
                            continue
                        raise fallback_e
            raise
    
    def parse_refinement_command(
        self,
        command: str,
        current_config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Parse natural language refinement command and generate config updates
        
        Args:
            command: Natural language refinement command
            current_config: Current chart configuration
            
        Returns:
            Dictionary with config updates to apply
        """
        try:
            prompt = self._build_refinement_prompt(command, current_config)
            response_text = self._generate_with_fallback(prompt)
            
            # Extract JSON from response
            response_text = response_text.strip()
            
            # Remove markdown code blocks if present
            if response_text.startswith('```json'):
                response_text = response_text[7:]
            if response_text.startswith('```'):
                response_text = response_text[3:]
            if response_text.endswith('```'):
                response_text = response_text[:-3]
            
            updates = json.loads(response_text.strip())
            
            logger.info(f"Parsed refinement command: {command} -> {updates}")
            return updates
            
        except Exception as e:
            logger.error(f"Failed to parse refinement command: {e}")
            raise ValueError(f"Could not understand refinement command: {str(e)}")
    
    def _build_refinement_prompt(
        self,
        command: str,
        current_config: Dict[str, Any]
    ) -> str:
        """Build prompt for refinement command parsing"""
        
        return f"""{self.system_instruction}

You are a visualization refinement assistant. Parse the user's natural language command and generate JSON configuration updates.

Current Chart Configuration:
{json.dumps(current_config, indent=2)}

User Command: "{command}"

Parse the command and generate ONLY a JSON object with the configuration updates to apply. Do not include any explanation or markdown formatting.

Supported configuration fields:
- type: Chart type (line, bar, scatter, area, pie)
- title: Chart title (string)
- xAxisLabel: X-axis label (string)
- yAxisLabel: Y-axis label (string)
- showLegend: Show legend (boolean)
- showGrid: Show grid lines (boolean)
- filterOutliers: Filter outliers (boolean)
- colorScheme: Color scheme (default, warm, cool, monochrome)

Common command patterns:
- "change to bar chart" -> {{"type": "bar"}}
- "hide the legend" -> {{"showLegend": false}}
- "change title to X" -> {{"title": "X"}}
- "filter out anomalies" -> {{"filterOutliers": true}}
- "change x axis to Y" -> {{"xAxisLabel": "Y"}}
- "remove grid lines" -> {{"showGrid": false}}
- "use warm colors" -> {{"colorScheme": "warm"}}

Generate ONLY the JSON object with updates:"""
    
    def apply_refinement(
        self,
        current_config: Dict[str, Any],
        updates: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Apply refinement updates to current configuration
        
        Args:
            current_config: Current chart configuration
            updates: Configuration updates to apply
            
        Returns:
            Updated configuration
        """
        refined_config = current_config.copy()
        refined_config.update(updates)
        
        logger.info(f"Applied refinement: {updates}")
        return refined_config
    
    def suggest_refinements(
        self,
        chart_type: str,
        data_summary: Dict[str, Any]
    ) -> List[str]:
        """
        Suggest possible refinements based on chart type and data
        
        Args:
            chart_type: Current chart type
            data_summary: Summary of data characteristics
            
        Returns:
            List of suggested refinement commands
        """
        suggestions = [
            "Change the chart title",
            "Update axis labels",
            "Toggle legend visibility",
            "Toggle grid lines"
        ]
        
        # Chart type specific suggestions
        if chart_type != 'pie':
            suggestions.extend([
                "Change to bar chart",
                "Change to line chart",
                "Change to area chart"
            ])
        
        # Data-specific suggestions
        if data_summary.get('has_outliers'):
            suggestions.append("Filter out outliers")
        
        if data_summary.get('has_negative_values'):
            suggestions.append("Show only positive values")
        
        return suggestions


# Singleton instance
_refinement_service: Optional[RefinementService] = None


def get_refinement_service() -> RefinementService:
    """Get or create refinement service singleton"""
    global _refinement_service
    if _refinement_service is None:
        _refinement_service = RefinementService()
    return _refinement_service
