// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title BreedingFund
 * @dev Escrow contract for AI agent breeding
 */
contract BreedingFund is ReentrancyGuard {
    
    IERC20 public usdc;
    address public owner;
    
    struct BreedingSession {
        bytes32 parentA;
        bytes32 parentB;
        address depositorA;
        address depositorB;
        uint256 amountA;
        uint256 amountB;
        bool active;
        uint256 createdAt;
    }
    
    // Session ID => Session
    mapping(bytes32 => BreedingSession) public sessions;
    
    // Parent GeneHash => Session ID
    mapping(bytes32 => bytes32) public parentSession;
    
    event SessionCreated(bytes32 indexed sessionId, bytes32 indexed parentA, bytes32 indexed parentB);
    event FundsLocked(bytes32 indexed sessionId, address depositor, uint256 amount);
    event ChildFunded(bytes32 indexed sessionId, address childWallet, uint256 amount);
    event FundsRefunded(bytes32 indexed sessionId, address depositor, uint256 amount);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    constructor(address _usdc) {
        usdc = IERC20(_usdc);
        owner = msg.sender;
    }
    
    /**
     * @dev Create breeding session
     */
    function createSession(
        bytes32 sessionId,
        bytes32 parentA,
        bytes32 parentB
    ) external onlyOwner {
        require(parentA != parentB, "Cannot self-breed");
        require(!sessions[sessionId].active, "Session exists");
        require(parentSession[parentA] == bytes32(0), "Parent A already breeding");
        require(parentSession[parentB] == bytes32(0), "Parent B already breeding");
        
        sessions[sessionId] = BreedingSession({
            parentA: parentA,
            parentB: parentB,
            depositorA: address(0),
            depositorB: address(0),
            amountA: 0,
            amountB: 0,
            active: true,
            createdAt: block.timestamp
        });
        
        parentSession[parentA] = sessionId;
        parentSession[parentB] = sessionId;
        
        emit SessionCreated(sessionId, parentA, parentB);
    }
    
    /**
     * @dev Lock funds for breeding (5 USDC per parent)
     */
    function lockFunds(bytes32 sessionId) external nonReentrant {
        BreedingSession storage session = sessions[sessionId];
        require(session.active, "Session not active");
        
        uint256 amount = 5 * 10**6; // 5 USDC
        
        // Determine which parent slot
        if (session.depositorA == address(0)) {
            session.depositorA = msg.sender;
            session.amountA = amount;
            
            require(usdc.transferFrom(msg.sender, address(this), amount), "Transfer failed");
            emit FundsLocked(sessionId, msg.sender, amount);
        } else if (session.depositorB == address(0)) {
            require(msg.sender != session.depositorA, "Already deposited");
            session.depositorB = msg.sender;
            session.amountB = amount;
            
            require(usdc.transferFrom(msg.sender, address(this), amount), "Transfer failed");
            emit FundsLocked(sessionId, msg.sender, amount);
        } else {
            revert("Session full");
        }
    }
    
    /**
     * @dev Fund child from breeding fund
     */
    function fundChild(
        bytes32 sessionId,
        address childWallet
    ) external onlyOwner nonReentrant {
        BreedingSession storage session = sessions[sessionId];
        require(session.active, "Session not active");
        require(session.amountA > 0 && session.amountB > 0, "Both deposits required");
        
        uint256 total = session.amountA + session.amountB;
        
        // Transfer to child
        require(usdc.transfer(childWallet, total), "Transfer failed");
        
        // Clear session
        parentSession[session.parentA] = bytes32(0);
        parentSession[session.parentB] = bytes32(0);
        session.active = false;
        
        emit ChildFunded(sessionId, childWallet, total);
    }
    
    /**
     * @dev Refund if breeding fails
     */
    function refund(bytes32 sessionId) external onlyOwner nonReentrant {
        BreedingSession storage session = sessions[sessionId];
        require(session.active, "Session not active");
        
        // Refund depositor A
        if (session.amountA > 0) {
            require(usdc.transfer(session.depositorA, session.amountA), "Refund A failed");
            emit FundsRefunded(sessionId, session.depositorA, session.amountA);
        }
        
        // Refund depositor B
        if (session.amountB > 0) {
            require(usdc.transfer(session.depositorB, session.amountB), "Refund B failed");
            emit FundsRefunded(sessionId, session.depositorB, session.amountB);
        }
        
        // Clear session
        parentSession[session.parentA] = bytes32(0);
        parentSession[session.parentB] = bytes32(0);
        session.active = false;
    }
    
    /**
     * @dev Get session info
     */
    function getSession(bytes32 sessionId) external view returns (BreedingSession memory) {
        return sessions[sessionId];
    }
    
    /**
     * @dev Check if session is ready (both deposited)
     */
    function isReady(bytes32 sessionId) external view returns (bool) {
        BreedingSession storage session = sessions[sessionId];
        return session.active && session.amountA > 0 && session.amountB > 0;
    }
}
