import json
import logging
from typing import Dict, Any, Optional, List
from litellm import completion, embedding
from django.conf import settings
from core.middleware import get_llm_context

logger = logging.getLogger(__name__)

class LLMClient:
    """
    Client for interacting with various LLM providers using LiteLLM.
    Configuration is pulled per-request from the thread-local context.
    """

    @staticmethod
    def _get_model_string(provider: str, model_name: str) -> str:
        """
        Format the model string correctly for litellm.
        LiteLLM expects format like 'openai/gpt-4', 'anthropic/claude-3', or 'ollama/llama3'.
        If provider is 'google', litellm uses 'gemini/...'.
        If custom, we prepend the provider explicitly if litellm requires it,
        or just use the model name.
        """
        if provider == 'openai':
            return f"{model_name}" # litellm defaults to openai for raw strings without prefixes
        elif provider == 'google':
            # LiteLLM supports gemini directly via gemini/...
            if not model_name.startswith('gemini/'):
                return f"gemini/{model_name}"
            return model_name
        elif provider == 'anthropic':
            if not model_name.startswith('anthropic/'):
                return f"anthropic/{model_name}"
            return model_name
        elif provider == 'custom':
            # For Ollama / local providers usually we prepend 'ollama/' or use 'openai/' for vllm
            # Litellm handles local endpoints beautifully if base_url is provided.
            # We assume OpenAI compatible format if base url is provided
            return f"openai/{model_name}"
        
        return model_name

    def generate_json(self, system_instruction: str, prompt: str, default_fallback: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generates JSON from the LLM. 
        """
        context = get_llm_context()
        
        provider = context.get('provider', 'google')
        api_key = context.get('api_key') or settings.GOOGLE_API_KEY
        model_name = context.get('model_name', settings.GEMINI_MODEL)
        base_url = context.get('base_url')

        litellm_model = self._get_model_string(provider, model_name)
        
        messages = [
            {"role": "system", "content": system_instruction},
            {"role": "user", "content": prompt}
        ]
        
        kwargs = {
            "model": litellm_model,
            "messages": messages,
            "temperature": settings.LLM_TEMPERATURE,
            "response_format": { "type": "json_object" } # Request JSON format
        }

        # Apply credentials
        if api_key:
            kwargs["api_key"] = api_key
        
        if base_url:
            kwargs["api_base"] = base_url
            
        try:
            logger.info(f"Calling LLM: {litellm_model} with provider {provider}")
            response = completion(**kwargs)
            
            content = response.choices[0].message.content
            
            # Basic sanitization
            content = content.strip()
            if content.startswith('```json'):
                content = content[7:]
            if content.startswith('```'):
                content = content[3:]
            if content.endswith('```'):
                content = content[:-3]
            content = content.strip()
            
            return json.loads(content)
            
        except Exception as e:
            logger.error(f"LLM Generation Error: {str(e)}")
            return default_fallback

    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        """
        Generates embeddings for a list of texts using the thread-local configuration.
        """
        context = get_llm_context()
        
        provider = context.get('embed_provider', 'google')
        api_key = context.get('embed_api_key') or settings.GOOGLE_API_KEY
        model_name = context.get('embed_model_name', settings.EMBEDDING_MODEL)
        base_url = context.get('embed_base_url')

        litellm_model = self._get_model_string(provider, model_name)
        
        kwargs = {
            "model": litellm_model,
            "input": texts
        }
        
        if api_key:
            kwargs["api_key"] = api_key
        if base_url:
            kwargs["api_base"] = base_url
            
        try:
            logger.info(f"Calling Embedding API: {litellm_model} with provider {provider}")
            response = embedding(**kwargs)
            # litellm returns an object with a .data array containing .embedding
            return [d["embedding"] for d in response.data]
        except Exception as e:
            logger.error(f"Embedding Generation Error: {str(e)}")
            raise

_llm_client_instance = None

def get_llm_client() -> LLMClient:
    global _llm_client_instance
    if _llm_client_instance is None:
        _llm_client_instance = LLMClient()
    return _llm_client_instance
