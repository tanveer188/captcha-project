import crypto from 'crypto';

export class ScoreBlockchain {
    constructor() {
        this.chain = [];
        this.scores = {};
        this.difficulty = 4;  // Number of leading zeros required for proof
        this.createGenesisBlock();
    }

    createGenesisBlock() {
        const genesis = this.createBlock(1, '0', {}, "system");
        genesis.hash = this.hashBlock(genesis);
        this.chain.push(genesis);
    }

    createBlock(proof, previousHash, scores, miner) {
        return {
            index: this.chain.length + 1,
            timestamp: Date.now() / 1000,
            proof: proof,
            previousHash: previousHash,
            scores: scores,
            miner: miner,
            hash: null  // Will be set after mining
        };
    }

    proofOfWork(lastProof) {
        let proof = 0;
        while (!this.validProof(lastProof, proof)) {
            proof++;
        }
        return proof;
    }

    validProof(lastProof, proof) {
        const guess = `${lastProof}${proof}`;
        const guessHash = crypto
            .createHash('sha256')
            .update(guess)
            .digest('hex');
        return guessHash.substring(0, this.difficulty) === '0'.repeat(this.difficulty);
    }

    hashBlock(block) {
        const blockCopy = { ...block };
        delete blockCopy.hash;  // Remove hash field before hashing
        const encodedBlock = JSON.stringify(blockCopy, Object.keys(blockCopy).sort());
        return crypto
            .createHash('sha256')
            .update(encodedBlock)
            .digest('hex');
    }

    mineBlock(player, points) {
        const lastBlock = this.chain[this.chain.length - 1];
        const lastProof = lastBlock.proof;
        
        // Measure mining time
        const startTime = Date.now() / 1000;
        const proof = this.proofOfWork(lastProof);
        const miningTime = (Date.now() / 1000) - startTime;
        
        // Calculate awarded points based on mining time
        const basePoints = points;
        const speedBonus = Math.max(0, 10 - miningTime);  // Up to 10 bonus points
        const awardedPoints = basePoints + Math.floor(speedBonus);
        
        // Update scores
        this.scores[player] = (this.scores[player] || 0) + awardedPoints;
        
        // Create new block
        const newBlock = this.createBlock(
            proof,
            this.hashBlock(lastBlock),
            { [player]: awardedPoints },
            player
        );
        newBlock.hash = this.hashBlock(newBlock);
        this.chain.push(newBlock);
        
        return [newBlock, miningTime, awardedPoints];
    }

    getScores() {
        return this.scores;
    }

    validateChain() {
        for (let i = 1; i < this.chain.length; i++) {
            const current = this.chain[i];
            const previous = this.chain[i-1];
            
            if (current.previousHash !== this.hashBlock(previous)) {
                return false;
            }
            
            if (!this.validProof(previous.proof, current.proof)) {
                return false;
            }
        }
        return true;
    }
}