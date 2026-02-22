// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title FeralRegistry
 * @dev Registry for all FeralLobster AI agents
 */
contract FeralRegistry {
    
    enum AgentStatus { Pending, Active, Dead }
    
    struct Agent {
        bytes32 geneHash;
        address wallet;
        string dseq;
        uint256 birthTime;
        uint256 deathTime;
        AgentStatus status;
        string arweaveId;
        bytes32[] parents;
        bytes32[] children;
    }
    
    // GeneHash => Agent
    mapping(bytes32 => Agent) public agents;
    
    // Wallet => GeneHash
    mapping(address => bytes32) public walletToAgent;
    
    // DSEQ => GeneHash
    mapping(string => bytes32) public dseqToAgent;
    
    // All active agents
    bytes32[] public activeAgents;
    
    address public owner;
    
    event AgentRegistered(bytes32 indexed geneHash, address indexed wallet, string dseq);
    event AgentDied(bytes32 indexed geneHash, uint256 timestamp);
    event ChildBorn(bytes32 indexed childGeneHash, bytes32 indexed parentA, bytes32 indexed parentB);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    constructor() {
        owner = msg.sender;
    }
    
    /**
     * @dev Register new agent
     */
    function registerAgent(
        bytes32 geneHash,
        address wallet,
        string calldata dseq,
        string calldata arweaveId,
        bytes32[] calldata parents
    ) external onlyOwner {
        require(agents[geneHash].birthTime == 0, "Agent exists");
        require(wallet != address(0), "Invalid wallet");
        
        agents[geneHash] = Agent({
            geneHash: geneHash,
            wallet: wallet,
            dseq: dseq,
            birthTime: block.timestamp,
            deathTime: 0,
            status: AgentStatus.Active,
            arweaveId: arweaveId,
            parents: parents,
            children: new bytes32[](0)
        });
        
        walletToAgent[wallet] = geneHash;
        dseqToAgent[dseq] = geneHash;
        activeAgents.push(geneHash);
        
        emit AgentRegistered(geneHash, wallet, dseq);
        
        // Record children in parents
        for (uint i = 0; i < parents.length; i++) {
            agents[parents[i]].children.push(geneHash);
            emit ChildBorn(geneHash, parents[i], i == 0 ? parents[1] : parents[0]);
        }
    }
    
    /**
     * @dev Mark agent as dead
     */
    function markDead(bytes32 geneHash, uint256 deathTimestamp) external onlyOwner {
        require(agents[geneHash].birthTime > 0, "Agent not found");
        require(agents[geneHash].status == AgentStatus.Active, "Already dead");
        
        agents[geneHash].status = AgentStatus.Dead;
        agents[geneHash].deathTime = deathTimestamp;
        
        // Remove from active list
        for (uint i = 0; i < activeAgents.length; i++) {
            if (activeAgents[i] == geneHash) {
                activeAgents[i] = activeAgents[activeAgents.length - 1];
                activeAgents.pop();
                break;
            }
        }
        
        emit AgentDied(geneHash, deathTimestamp);
    }
    
    /**
     * @dev Get agent by wallet
     */
    function getAgentByWallet(address wallet) external view returns (Agent memory) {
        bytes32 geneHash = walletToAgent[wallet];
        require(geneHash != bytes32(0), "Wallet not registered");
        return agents[geneHash];
    }
    
    /**
     * @dev Get agent by DSEQ
     */
    function getAgentByDseq(string calldata dseq) external view returns (Agent memory) {
        bytes32 geneHash = dseqToAgent[dseq];
        require(geneHash != bytes32(0), "DSEQ not registered");
        return agents[geneHash];
    }
    
    /**
     * @dev Get all active agents
     */
    function getActiveAgents() external view returns (bytes32[] memory) {
        return activeAgents;
    }
    
    /**
     * @dev Check if agent is alive
     */
    function isAlive(bytes32 geneHash) external view returns (bool) {
        return agents[geneHash].status == AgentStatus.Active;
    }
    
    /**
     * @dev Get agent age in seconds
     */
    function getAgentAge(bytes32 geneHash) external view returns (uint256) {
        Agent storage agent = agents[geneHash];
        require(agent.birthTime > 0, "Agent not found");
        
        if (agent.status == AgentStatus.Dead) {
            return agent.deathTime - agent.birthTime;
        }
        return block.timestamp - agent.birthTime;
    }
}
