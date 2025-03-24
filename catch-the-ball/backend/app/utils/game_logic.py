import math
import time
import random
import hashlib
from dataclasses import dataclass
from typing import Dict, Tuple, List, Optional
from datetime import datetime

@dataclass
class GameState:
    pattern_index: int
    current_time: float
    pattern_start_time: float
    pattern_duration: float = 5.0
    radius: float = 200.0
    center: Dict[str, float] = None
    pattern_sequence: List[int] = None
    last_positions: List[Dict[str, float]] = None
    verification_attempts: int = 0
    last_verification_time: float = 0
    pattern_switch_count: int = 0

    def __post_init__(self):
        if self.center is None:
            self.center = {"x": self.radius, "y": self.radius}
        if self.pattern_sequence is None:
            self.pattern_sequence = []
        if self.last_positions is None:
            self.last_positions = []

class PatternGenerator:
    @staticmethod
    def _apply_noise(pos: Dict[str, float], amplitude: float = 2.0) -> Dict[str, float]:
        """Add subtle noise to the pattern to prevent exact reproduction"""
        return {
            "x": pos["x"] + (random.random() - 0.5) * amplitude,
            "y": pos["y"] + (random.random() - 0.5) * amplitude
        }

    @staticmethod
    def _apply_time_variance(t: float) -> float:
        """Add time-based variance to prevent pattern prediction"""
        return t * (1.0 + math.sin(t * 0.001) * 0.1)

    @staticmethod
    def circle_pattern(t: float, radius: float, center: Dict[str, float]) -> Dict[str, float]:
        t = PatternGenerator._apply_time_variance(t)
        angle = t * 0.002
        pos = {
            "x": center["x"] + math.cos(angle) * (radius * 0.7),
            "y": center["y"] + math.sin(angle) * (radius * 0.7)
        }
        return PatternGenerator._apply_noise(pos)

    @staticmethod
    def square_pattern(t: float, radius: float, center: Dict[str, float]) -> Dict[str, float]:
        t = PatternGenerator._apply_time_variance(t)
        period = 4000
        normalized_time = (t % period) / period
        side = radius * 1.2
        
        if normalized_time < 0.25:
            pos = {
                "x": center["x"] - side/2 + (side * normalized_time * 4),
                "y": center["y"] - side/2
            }
        elif normalized_time < 0.5:
            pos = {
                "x": center["x"] + side/2,
                "y": center["y"] - side/2 + (side * (normalized_time - 0.25) * 4)
            }
        elif normalized_time < 0.75:
            pos = {
                "x": center["x"] + side/2 - (side * (normalized_time - 0.5) * 4),
                "y": center["y"] + side/2
            }
        else:
            pos = {
                "x": center["x"] - side/2,
                "y": center["y"] + side/2 - (side * (normalized_time - 0.75) * 4)
            }
        return PatternGenerator._apply_noise(pos)

    @staticmethod
    def figure_8_pattern(t: float, radius: float, center: Dict[str, float]) -> Dict[str, float]:
        t = PatternGenerator._apply_time_variance(t)
        angle = t * 0.002
        pos = {
            "x": center["x"] + math.sin(angle * 2) * (radius * 0.7),
            "y": center["y"] + math.sin(angle) * (radius * 0.5)
        }
        return PatternGenerator._apply_noise(pos)

    @staticmethod
    def triangle_pattern(t: float, radius: float, center: Dict[str, float]) -> Dict[str, float]:
        t = PatternGenerator._apply_time_variance(t)
        period = 3000
        normalized_time = (t % period) / period
        side = radius * 1.2
        height = side * math.sqrt(3) / 2
        
        if normalized_time < 0.33:
            pos = {
                "x": center["x"] - side/2 + (side * normalized_time * 3),
                "y": center["y"] + height/3
            }
        elif normalized_time < 0.66:
            pos = {
                "x": center["x"] + side/2 - (side/2 * (normalized_time - 0.33) * 3),
                "y": center["y"] + height/3 - (height * (normalized_time - 0.33) * 3)
            }
        else:
            pos = {
                "x": center["x"] - (side/2 * (1 - (normalized_time - 0.66) * 3)),
                "y": center["y"] - height * (2/3) + (height * (normalized_time - 0.66) * 3)
            }
        return PatternGenerator._apply_noise(pos)

    @staticmethod
    def zigzag_pattern(t: float, radius: float, center: Dict[str, float]) -> Dict[str, float]:
        t = PatternGenerator._apply_time_variance(t)
        frequency = 0.003
        amplitude = radius * 0.7
        pos = {
            "x": center["x"] + math.sin(t * frequency) * amplitude,
            "y": center["y"] + ((t % (2 * amplitude)) - amplitude)
        }
        return PatternGenerator._apply_noise(pos)

class GameManager:
    def __init__(self):
        self.patterns = [
            PatternGenerator.circle_pattern,
            PatternGenerator.square_pattern,
            PatternGenerator.figure_8_pattern,
            PatternGenerator.triangle_pattern,
            PatternGenerator.zigzag_pattern
        ]
        self.pattern_names = ["Circle", "Square", "Figure-8", "Triangle", "Zigzag"]
        self.active_games: Dict[str, GameState] = {}
        self.max_verification_attempts = 3
        self.min_verification_interval = 1.0  # seconds
        self.max_pattern_switches = 10
        self.position_history_size = 10
        self.suspicious_tokens: set = set()

    def _is_suspicious_activity(self, game_state: GameState) -> bool:
        """Check for suspicious activity patterns"""
        current_time = time.time()
        
        # Check verification attempt rate
        if (current_time - game_state.last_verification_time) < self.min_verification_interval:
            return True
            
        # Check if too many pattern switches
        if game_state.pattern_switch_count > self.max_pattern_switches:
            return True
            
        # Check for automated/scripted behavior
        if len(game_state.last_positions) >= 2:
            # Check for perfectly regular movements
            distances = []
            for i in range(1, len(game_state.last_positions)):
                dx = game_state.last_positions[i]["x"] - game_state.last_positions[i-1]["x"]
                dy = game_state.last_positions[i]["y"] - game_state.last_positions[i-1]["y"]
                distances.append(math.sqrt(dx*dx + dy*dy))
            
            if len(distances) > 1:
                # Check if movements are too regular (suggesting automation)
                variance = sum((d - sum(distances)/len(distances))**2 for d in distances) / len(distances)
                if variance < 0.1:  # Threshold for detecting too-regular movement
                    return True
        
        return False

    def create_game(self, token: str) -> Tuple[int, str]:
        if token in self.suspicious_tokens:
            raise ValueError("Verification temporarily blocked due to suspicious activity")

        pattern_index = random.randint(0, len(self.patterns) - 1)
        self.active_games[token] = GameState(
            pattern_index=pattern_index,
            current_time=time.time() * 1000,
            pattern_start_time=time.time() * 1000
        )
        return pattern_index, self.pattern_names[pattern_index]

    def get_current_position(self, token: str) -> Optional[Dict]:
        if token not in self.active_games:
            return None

        game_state = self.active_games[token]
        current_time = time.time() * 1000
        game_state.current_time = current_time

        # Check if pattern should change
        elapsed_time = (current_time - game_state.pattern_start_time) / 1000
        if elapsed_time >= game_state.pattern_duration:
            game_state.pattern_start_time = current_time
            game_state.pattern_index = random.randint(0, len(self.patterns) - 1)
            game_state.pattern_switch_count += 1

        pattern_func = self.patterns[game_state.pattern_index]
        position = pattern_func(
            current_time,
            game_state.radius,
            game_state.center
        )

        # Update position history
        game_state.last_positions.append(position)
        if len(game_state.last_positions) > self.position_history_size:
            game_state.last_positions.pop(0)

        # Check for suspicious activity
        if self._is_suspicious_activity(game_state):
            self.suspicious_tokens.add(token)
            del self.active_games[token]
            raise ValueError("Suspicious activity detected")

        return {
            "position": position,
            "pattern_index": game_state.pattern_index,
            "time_remaining": game_state.pattern_duration - (elapsed_time % game_state.pattern_duration)
        }

    def verify_pattern(self, token: str, clicked_pattern_index: int) -> bool:
        if token not in self.active_games:
            return False
        
        game_state = self.active_games[token]
        current_time = time.time()
        
        # Update verification attempt tracking
        game_state.verification_attempts += 1
        game_state.last_verification_time = current_time
        
        # Check for suspicious activity
        if game_state.verification_attempts > self.max_verification_attempts:
            self.suspicious_tokens.add(token)
            del self.active_games[token]
            raise ValueError("Too many verification attempts")
            
        is_correct = clicked_pattern_index == game_state.pattern_index
        
        # Clean up game state
        if is_correct or game_state.verification_attempts >= self.max_verification_attempts:
            del self.active_games[token]
            
        return is_correct

# Create a global instance
game_manager = GameManager() 