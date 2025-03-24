from flask import Flask
from flask_cors import CORS
from .config.settings import Config
from .routes.captcha_routes import captcha_bp

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Configure CORS
    CORS(app, resources={
        r"/api/*": {
            "origins": app.config['ALLOWED_ORIGINS'],
            "methods": ["GET", "POST"],
            "allow_headers": ["Content-Type", "Authorization"]
        }
    })

    # Register blueprints
    app.register_blueprint(captcha_bp, url_prefix='/api/captcha')

    return app 