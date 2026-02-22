// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TombstoneNFT
 * @dev Non-transferable death certificate NFTs
 */
contract TombstoneNFT is ERC721, ERC721Enumerable, Ownable {
    
    struct Tombstone {
        bytes32 geneHash;
        uint256 birthTime;
        uint256 deathTime;
        string deathType;
        string arweaveUri;
        bytes32[] parents;
        uint256 survivalDays;
    }
    
    // Token ID => Tombstone
    mapping(uint256 => Tombstone) public tombstones;
    
    // GeneHash => Token ID
    mapping(bytes32 => uint256) public geneHashToToken;
    
    // Reincarnation: new GeneHash => old Token ID
    mapping(bytes32 => uint256) public reincarnations;
    
    uint256 private _tokenIdCounter;
    
    event TombstoneMinted(uint256 indexed tokenId, bytes32 indexed geneHash, string deathType);
    event Reincarnation(uint256 indexed oldTokenId, bytes32 indexed newGeneHash);
    
    constructor() ERC721("FeralTombstone", "TOMB") Ownable(msg.sender) {}
    
    /**
     * @dev Mint tombstone (only owner/platform)
     */
    function mintTombstone(
        address to,
        bytes32 geneHash,
        uint256 birthTime,
        uint256 deathTime,
        string calldata deathType,
        string calldata arweaveUri,
        bytes32[] calldata parents,
        uint256 survivalDays
    ) external onlyOwner returns (uint256) {
        require(geneHashToToken[geneHash] == 0, "Tombstone exists for geneHash");
        
        uint256 tokenId = _tokenIdCounter++;
        
        tombstones[tokenId] = Tombstone({
            geneHash: geneHash,
            birthTime: birthTime,
            deathTime: deathTime,
            deathType: deathType,
            arweaveUri: arweaveUri,
            parents: parents,
            survivalDays: survivalDays
        });
        
        geneHashToToken[geneHash] = tokenId;
        
        _safeMint(to, tokenId);
        
        emit TombstoneMinted(tokenId, geneHash, deathType);
        
        return tokenId;
    }
    
    /**
     * @dev Record reincarnation
     */
    function recordReincarnation(
        uint256 oldTokenId,
        bytes32 newGeneHash
    ) external onlyOwner {
        require(_exists(oldTokenId), "Tombstone not found");
        require(reincarnations[newGeneHash] == 0, "Already reincarnated");
        
        reincarnations[newGeneHash] = oldTokenId;
        
        emit Reincarnation(oldTokenId, newGeneHash);
    }
    
    /**
     * @dev Override transfer to make tokens non-transferable (soulbound)
     */
    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721Enumerable)
        returns (address)
    {
        address from = _ownerOf(tokenId);
        
        // Allow minting (from == address(0)) and burning (to == address(0))
        // But prevent transfers between addresses
        if (from != address(0) && to != address(0)) {
            revert("Tombstones are non-transferable");
        }
        
        return super._update(to, tokenId, auth);
    }
    
    /**
     * @dev Get tombstone metadata URI
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_exists(tokenId), "Token not found");
        return tombstones[tokenId].arweaveUri;
    }
    
    /**
     * @dev Check if exists
     */
    function _exists(uint256 tokenId) internal view returns (bool) {
        return _ownerOf(tokenId) != address(0);
    }
    
    /**
     * @dev Get tombstone by geneHash
     */
    function getTombstoneByGeneHash(bytes32 geneHash) external view returns (Tombstone memory, uint256) {
        uint256 tokenId = geneHashToToken[geneHash];
        require(tokenId != 0, "GeneHash not found");
        return (tombstones[tokenId], tokenId);
    }
    
    /**
     * @dev Get reincarnation history
     */
    function getReincarnationHistory(bytes32 geneHash) external view returns (uint256[] memory) {
        uint256[] memory history = new uint256[](10); // Max 10 reincarnations
        uint256 count = 0;
        
        bytes32 currentGene = geneHash;
        
        while (count < 10) {
            uint256 tokenId = reincarnations[currentGene];
            if (tokenId == 0) break;
            
            history[count] = tokenId;
            count++;
            
            // Get previous gene hash
            currentGene = tombstones[tokenId].geneHash;
        }
        
        // Resize array
        assembly {
            mstore(history, count)
        }
        
        return history;
    }
    
    // Required override
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
