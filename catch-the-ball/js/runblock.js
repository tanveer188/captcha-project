import CryptoJS from 'crypto-js';

// Block class
export class Block {
    constructor(index, timestamp, data, previousHash) {
        this.index = index;
        this.timestamp = timestamp;
        this.data = data || {score: 0, description: ""};
        this.previousHash = previousHash || '';
        this.hash = '';
        this.nonce = 0;
    }

    calculateHash() {
        return CryptoJS.SHA256(
            this.index +
            this.previousHash +
            this.timestamp +
            JSON.stringify(this.data) +
            this.nonce
        ).toString();
    }

    mineBlock(difficulty) {
        const startTime = Date.now();
        const target = Array(difficulty + 1).join('0');
        
        while (this.hash.substring(0, difficulty) !== target) {
            this.nonce++;
            this.hash = this.calculateHash();
            
            if (this.nonce % 10000 === 0) {
                const elapsed = (Date.now() - startTime) / 1000;
                document.getElementById('mining-status').textContent = 
                    `Mining... Hashes: ${this.nonce.toLocaleString()}, Time: ${elapsed.toFixed(1)}s`;
            }
        }
        
        const elapsed = (Date.now() - startTime) / 1000;
        document.getElementById('mining-status').textContent = 
            `Block mined in ${elapsed.toFixed(2)}s with nonce ${this.nonce}`;
    }
}

// Blockchain class
export class Blockchain {
    constructor() {
        this.chain = [];
        this.difficulty = 4;
        this.pendingScores = [];
        this.loadChain();
    }

    createGenesisBlock() {
        return new Block(0, Date.now(), {score: 0, description: "Genesis Block"}, '0');
    }

    getLatestBlock() {
        return this.chain[this.chain.length - 1];
    }

    addScore(newScore, description) {
        this.pendingScores.push({
            score: newScore,
            description: description || `Score added at ${new Date().toLocaleString()}`
        });
        this.updateUI();
    }

    async minePendingScores() {
        if (this.pendingScores.length === 0) {
            document.getElementById('mining-status').textContent = 'No scores to mine';
            return Promise.resolve();
        }
        
        const minePromises = [];
        
        for (const scoreData of this.pendingScores) {
            const newBlock = new Block(
                this.chain.length,
                Date.now(),
                scoreData,
                this.getLatestBlock().hash
            );
            
            minePromises.push(new Promise(resolve => {
                setTimeout(() => {
                    newBlock.mineBlock(this.difficulty);
                    this.chain.push(newBlock);
                    resolve();
                }, 0);
            }));
        }
        
        return Promise.all(minePromises).then(() => {
            this.pendingScores = [];
            this.saveChain();
            this.updateUI();
        });
    }

    // ... rest of the Blockchain methods ...
    saveChain() {
        localStorage.setItem('scoreChain', JSON.stringify(this.chain));
    }

    loadChain() {
        const savedChain = localStorage.getItem('scoreChain');
        if (savedChain) {
            try {
                const parsedChain = JSON.parse(savedChain);
                this.chain = parsedChain.map(blockData => {
                    const block = new Block(
                        blockData.index,
                        blockData.timestamp,
                        blockData.data,
                        blockData.previousHash
                    );
                    block.hash = blockData.hash;
                    block.nonce = blockData.nonce;
                    return block;
                });
            } catch (e) {
                console.error('Error loading chain:', e);
                this.chain = [this.createGenesisBlock()];
            }
        } else {
            this.chain = [this.createGenesisBlock()];
        }
        this.updateUI();
    }

    // ... remaining methods ...
}
