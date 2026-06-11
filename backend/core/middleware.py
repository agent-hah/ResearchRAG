import threading

# Thread-local storage for LLM settings per request
_llm_context = threading.local()

def get_llm_context():
    """Get the LLM context for the current request."""
    if not hasattr(_llm_context, 'settings'):
        _llm_context.settings = {}
    return _llm_context.settings

def set_llm_context(context_dict):
    """Set the LLM context for the current thread."""
    _llm_context.settings = context_dict

class LLMContextMiddleware:
    """
    Middleware to extract X-LLM-* and X-Embed-* headers and store them in thread-local context.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Extract headers (Django converts HTTP_X_LLM_PROVIDER to HTTP_X_LLM_PROVIDER)
        settings = {
            'provider': request.META.get('HTTP_X_LLM_PROVIDER', 'google'),
            'api_key': request.META.get('HTTP_X_LLM_API_KEY', ''),
            'model_name': request.META.get('HTTP_X_LLM_MODEL', 'gemma-4-26b-a4b-it'),
            'base_url': request.META.get('HTTP_X_LLM_BASE_URL', ''),
            
            'embed_provider': request.META.get('HTTP_X_EMBED_PROVIDER', 'google'),
            'embed_api_key': request.META.get('HTTP_X_EMBED_API_KEY', ''),
            'embed_model_name': request.META.get('HTTP_X_EMBED_MODEL', 'models/gemini-embedding-2'),
            'embed_base_url': request.META.get('HTTP_X_EMBED_BASE_URL', ''),
        }
        
        # Store in thread-local storage
        _llm_context.settings = settings
        
        response = self.get_response(request)
        
        # Clean up
        if hasattr(_llm_context, 'settings'):
            del _llm_context.settings
            
        return response
