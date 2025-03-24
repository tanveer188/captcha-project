import jwt
import time
import hmac
import hashlib
import random
from flask import current_app
from datetime import datetime, timezone

def generate_captcha_token(domain):
    """Generate a secure token for captcha verification."""
    now = datetime.now(timezone.utc)
    pattern_index = random.randint(0, len(current_app.config['PATTERNS']) - 1)
    pattern = current_app.config['PATTERNS'][pattern_index]
    
    payload = {
        'domain': domain,
        'pattern': pattern,
        'pattern_index': pattern_index,
        'iat': now.timestamp(),
        'exp': (now + current_app.config['TOKEN_EXPIRATION']).timestamp()
    }
    
    # Add HMAC signature
    signature = generate_hmac(str(payload))
    payload['sig'] = signature
    
    return jwt.encode(payload, current_app.config['JWT_SECRET_KEY'], algorithm='HS256')

def verify_captcha_token(token, pattern_index):
    """Verify the captcha token and pattern index."""
    try:
        payload = jwt.decode(token, current_app.config['JWT_SECRET_KEY'], algorithms=['HS256'])
        
        # Verify expiration
        if time.time() > payload['exp']:
            return False, "Token expired"
        
        # Verify HMAC signature
        original_sig = payload.pop('sig', None)
        if not original_sig or not hmac.compare_digest(original_sig, generate_hmac(str(payload))):
            return False, "Invalid signature"
        
        # Verify pattern index
        if pattern_index != payload['pattern_index']:
            return False, "Invalid pattern"
        
        return True, "Verification successful"
        
    except jwt.InvalidTokenError:
        return False, "Invalid token"

def generate_hmac(data):
    """Generate HMAC signature for data."""
    key = current_app.config['SECRET_KEY'].encode()
    return hmac.new(key, data.encode(), hashlib.sha256).hexdigest()

def is_rate_limited(ip_address):
    """Check if the IP address is rate limited."""
    # Implement rate limiting logic here
    # For now, returning False (no rate limiting)
    return False 