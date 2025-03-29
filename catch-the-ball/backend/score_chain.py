import hashlib
import json
import time
import multiprocessing
from typing import Dict

class ScoreBlockchain:
    def __init__(self):
        self.chain = []
        self.scores: Dict[str, int] = {}
        self.difficulty = 4  # Number of leading zeros required for proof
        self.create_genesis_block()

    def create_genesis_block(self):
        genesis = self.create_block(proof=1, previous_hash='0', scores={}, miner="system")
        genesis['hash'] = self.hash_block(genesis)
        self.chain.append(genesis)

    def create_block(self, proof: int, previous_hash: str, scores: Dict[str, int], miner: str):
        return {
            'index': len(self.chain) + 1,
            'timestamp': time.time(),
            'proof': proof,
            'previous_hash': previous_hash,
            'scores': scores,
            'miner': miner,
            'hash': None  # Will be set after mining
        }

    def proof_of_work(self, last_proof: int):
        """
        Simple POW algorithm - find a number p' such that hash(pp') has leading zeros
        """
        proof = 0
        while not self.valid_proof(last_proof, proof):
            proof += 1
        return proof

    def valid_proof(self, last_proof: int, proof: int):
        guess = f'{last_proof}{proof}'.encode()
        guess_hash = hashlib.sha256(guess).hexdigest()
        return guess_hash[:self.difficulty] == '0' * self.difficulty

    def hash_block(self, block):
        block_copy = block.copy()
        block_copy.pop('hash', None)  # Remove hash field before hashing
        encoded_block = json.dumps(block_copy, sort_keys=True).encode()
        return hashlib.sha256(encoded_block).hexdigest()

    def mine_block(self, player: str, points: int):
        last_block = self.chain[-1]
        last_proof = last_block['proof']
        
        # Measure mining time
        start_time = time.time()
        proof = self.proof_of_work(last_proof)
        mining_time = time.time() - start_time
        
        # Calculate awarded points based on mining time (faster = more points)
        base_points = points
        speed_bonus = max(0, 10 - mining_time)  # Up to 10 bonus points
        awarded_points = base_points + int(speed_bonus)
        
        # Update scores
        self.scores[player] = self.scores.get(player, 0) + awarded_points
        
        # Create new block
        new_block = self.create_block(
            proof=proof,
            previous_hash=self.hash_block(last_block),
            scores={player: awarded_points},
            miner=player
        )
        new_block['hash'] = self.hash_block(new_block)
        self.chain.append(new_block)
        
        return new_block, mining_time, awarded_points

    def get_scores(self):
        return self.scores

    def validate_chain(self):
        for i in range(1, len(self.chain)):
            current = self.chain[i]
            previous = self.chain[i-1]
            
            if current['previous_hash'] != self.hash_block(previous):
                return False
                
            if not self.valid_proof(previous['proof'], current['proof']):
                return False
                
        return True