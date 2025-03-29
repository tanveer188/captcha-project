// ScoreTracker.sol
pragma solidity ^0.8.0;

contract ScoreTracker {
    mapping(address => uint256) public scores;
    
    function updateScore(uint256 points) public {
        scores[msg.sender] += points;
    }
    
    function getScore(address player) public view returns (uint256) {
        return scores[player];
    }
}