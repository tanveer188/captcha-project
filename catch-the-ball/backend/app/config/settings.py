import os
from datetime import timedelta

class Config:
    # Security settings
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'your-secret-key-change-in-production'
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY') or 'jwt-secret-key-change-in-production'
    
    # Token settings
    TOKEN_EXPIRATION = timedelta(minutes=5)
    
    # CORS settings
    ALLOWED_ORIGINS = os.environ.get('ALLOWED_ORIGINS', '*').split(',')
    
    # Rate limiting
    RATELIMIT_DEFAULT = "100/hour"
    RATELIMIT_STORAGE_URL = os.environ.get('REDIS_URL', 'memory://')
    
    # Captcha settings
    PATTERNS = ['Circle', 'Square', 'Figure-8', 'Triangle', 'Zigzag']
    PATTERN_DURATION = 5  # seconds
    MAX_ATTEMPTS = 3 