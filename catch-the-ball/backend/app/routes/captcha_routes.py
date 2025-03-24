from flask import Blueprint, request, jsonify, current_app
from functools import wraps
from ..utils.security import generate_captcha_token, verify_captcha_token, is_rate_limited
from ..utils.game_logic import game_manager
import jwt

captcha_bp = Blueprint('captcha', __name__)

def require_origin(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        origin = request.headers.get('Origin', '')
        if origin not in current_app.config['ALLOWED_ORIGINS'] and current_app.config['ALLOWED_ORIGINS'] != ['*']:
            return jsonify({'error': 'Unauthorized origin'}), 403
        return f(*args, **kwargs)
    return decorated_function

@captcha_bp.route('/init', methods=['POST'])
@require_origin
def initialize_captcha():
    """Initialize a new CAPTCHA challenge."""
    if is_rate_limited(request.remote_addr):
        return jsonify({'error': 'Rate limit exceeded'}), 429

    try:
        data = request.get_json()
        domain = data.get('domain', request.headers.get('Origin', ''))

        # Generate token and create game
        token = generate_captcha_token(domain)
        pattern_index, pattern_name = game_manager.create_game(token)
        
        return jsonify({
            'token': token,
            'pattern': pattern_name,
            'pattern_index': pattern_index,
            'expires_in': current_app.config['TOKEN_EXPIRATION'].total_seconds()
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 400

@captcha_bp.route('/position', methods=['POST'])
@require_origin
def get_position():
    """Get current position for the pattern."""
    try:
        data = request.get_json()
        token = data.get('token')

        if not token:
            return jsonify({'error': 'Missing token'}), 400

        # Get current position from game manager
        position_data = game_manager.get_current_position(token)
        if position_data is None:
            return jsonify({'error': 'Invalid or expired token'}), 400

        return jsonify(position_data)

    except Exception as e:
        return jsonify({'error': str(e)}), 400

@captcha_bp.route('/verify', methods=['POST'])
@require_origin
def verify_captcha():
    """Verify the CAPTCHA solution."""
    if is_rate_limited(request.remote_addr):
        return jsonify({'error': 'Rate limit exceeded'}), 429

    try:
        data = request.get_json()
        token = data.get('token')
        pattern_index = data.get('pattern_index')

        if not token or pattern_index is None:
            return jsonify({'error': 'Missing required fields'}), 400

        # Verify the pattern with game manager
        is_valid = game_manager.verify_pattern(token, pattern_index)

        if is_valid:
            # Generate new token for verification
            new_token = generate_captcha_token(request.headers.get('Origin', ''))
            return jsonify({
                'success': True,
                'message': 'Verification successful',
                'verification_token': new_token
            })
        else:
            return jsonify({
                'success': False,
                'message': 'Verification failed'
            }), 400

    except Exception as e:
        return jsonify({'error': str(e)}), 400 