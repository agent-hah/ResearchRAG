import uuid

class UserIsolationMiddleware:
    """
    Middleware to extract X-User-ID from headers and attach it to the request object.
    If not provided, generates a default or returns 400 (if strict).
    For now, we will assign a default 'anonymous' to avoid breaking existing clients without the header,
    but we expect the frontend to always pass X-User-ID.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Extract X-User-ID from headers
        # Django converts headers like X-User-ID to HTTP_X_USER_ID
        user_id = request.META.get('HTTP_X_USER_ID')
        
        if not user_id:
            user_id = 'default'
            
        request.user_id = user_id
        
        response = self.get_response(request)
        return response
