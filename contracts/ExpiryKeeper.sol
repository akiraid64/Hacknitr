// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ExpiryKeeper
 * @dev Chainlink Automation compatible contract for monitoring batch expiry
 * 
 * Implements Chainlink Automation interface (formerly Keepers)
 * Runs every 24 hours to check for near-expiry batches
 */

interface ISupplyChainBatch {
    function flagNearExpiry(uint256 _batchId) external;
    function isNearExpiry(uint256 _batchId) external view returns (bool);
    function nextBatchId() external view returns (uint256);
    function batches(uint256 _batchId) external view returns (
        uint256 expiry,
        uint256 quantity,
        address manufacturer,
        address currentOwner,
        uint8 status,
        bytes32 gs1Hash,
        uint256 weightKg
    );
}

// Chainlink Automation interface
interface AutomationCompatibleInterface {
    function checkUpkeep(bytes calldata checkData) external returns (bool upkeepNeeded, bytes memory performData);
    function performUpkeep(bytes calldata performData) external;
}

/**
 * @title ExpiryKeeper
 * @dev Automated expiry monitoring with Chainlink Automation
 */
contract ExpiryKeeper is AutomationCompatibleInterface, Ownable {
    
    ISupplyChainBatch public batchContract;
    
    // Configuration
    uint256 public checkBatchSize = 50; // Max batches to check per upkeep
    uint256 public lastCheckedBatchId = 0;
    
    // Webhook notification (off-chain)
    event NearExpiryDetected(
        uint256 indexed batchId,
        uint256 expiry,
        address currentOwner,
        uint256 daysRemaining
    );
    
    event UpkeepPerformed(
        uint256 batchesChecked,
        uint256 batchesFlagged,
        uint256 timestamp
    );
    
    constructor(address _batchContract) Ownable(msg.sender) {
        batchContract = ISupplyChainBatch(_batchContract);
    }
    
    // ============ CHAINLINK AUTOMATION ============
    
    /**
     * @dev Called by Chainlink to determine if upkeep is needed
     * @param checkData Unused in this implementation
     * @return upkeepNeeded True if there are batches to check
     * @return performData Encoded batch IDs that need flagging
     */
    function checkUpkeep(
        bytes calldata checkData
    ) external view override returns (
        bool upkeepNeeded,
        bytes memory performData
    ) {
        uint256[] memory batchesToFlag = new uint256[](checkBatchSize);
        uint256 flagCount = 0;
        
        uint256 totalBatches = batchContract.nextBatchId();
        uint256 startId = lastCheckedBatchId + 1;
        uint256 endId = startId + checkBatchSize;
        
        if (endId > totalBatches) {
            endId = totalBatches;
        }
        
        for (uint256 i = startId; i < endId && flagCount < checkBatchSize; i++) {
            try batchContract.batches(i) returns (
                uint256 expiry,
                uint256,
                address,
                address,
                uint8 status,
                bytes32,
                uint256
            ) {
                // Check if IN_RETAIL (1) and near expiry
                if (status == 1 && block.timestamp >= expiry - 3 days && block.timestamp < expiry) {
                    batchesToFlag[flagCount] = i;
                    flagCount++;
                }
            } catch {
                // Batch doesn't exist or error, skip
            }
        }
        
        upkeepNeeded = flagCount > 0;
        
        // Pack batch IDs into performData
        if (upkeepNeeded) {
            uint256[] memory trimmedBatches = new uint256[](flagCount);
            for (uint256 i = 0; i < flagCount; i++) {
                trimmedBatches[i] = batchesToFlag[i];
            }
            performData = abi.encode(trimmedBatches, endId);
        }
        
        return (upkeepNeeded, performData);
    }
    
    /**
     * @dev Called by Chainlink to perform the upkeep
     * @param performData Encoded batch IDs to flag
     */
    function performUpkeep(bytes calldata performData) external override {
        (uint256[] memory batchIds, uint256 lastChecked) = abi.decode(
            performData, 
            (uint256[], uint256)
        );
        
        uint256 flaggedCount = 0;
        
        for (uint256 i = 0; i < batchIds.length; i++) {
            uint256 batchId = batchIds[i];
            
            try batchContract.flagNearExpiry(batchId) {
                // Get batch details for event
                (uint256 expiry,,, address owner, uint8 status,,) = batchContract.batches(batchId);
                
                if (status == 2) { // Successfully flagged as NEAR_EXPIRY
                    uint256 daysRemaining = (expiry - block.timestamp) / 1 days;
                    emit NearExpiryDetected(batchId, expiry, owner, daysRemaining);
                    flaggedCount++;
                }
            } catch {
                // Silently fail if batch can't be flagged
            }
        }
        
        lastCheckedBatchId = lastChecked;
        
        // Reset if we've checked all batches
        if (lastCheckedBatchId >= batchContract.nextBatchId() - 1) {
            lastCheckedBatchId = 0;
        }
        
        emit UpkeepPerformed(batchIds.length, flaggedCount, block.timestamp);
    }
    
    // ============ MANUAL TRIGGER ============
    
    /**
     * @dev Manual check for a specific batch (backup to automation)
     */
    function manualFlagExpiry(uint256 _batchId) external onlyOwner {
        batchContract.flagNearExpiry(_batchId);
        
        (uint256 expiry,,, address owner,,,) = batchContract.batches(_batchId);
        uint256 daysRemaining = block.timestamp < expiry 
            ? (expiry - block.timestamp) / 1 days 
            : 0;
            
        emit NearExpiryDetected(_batchId, expiry, owner, daysRemaining);
    }
    
    /**
     * @dev Batch manual check
     */
    function manualBatchCheck(uint256[] calldata _batchIds) external onlyOwner {
        for (uint256 i = 0; i < _batchIds.length; i++) {
            try batchContract.flagNearExpiry(_batchIds[i]) {
                (uint256 expiry,,, address owner,,,) = batchContract.batches(_batchIds[i]);
                emit NearExpiryDetected(
                    _batchIds[i], 
                    expiry, 
                    owner, 
                    (expiry - block.timestamp) / 1 days
                );
            } catch {}
        }
    }
    
    // ============ CONFIGURATION ============
    
    function setCheckBatchSize(uint256 _size) external onlyOwner {
        require(_size > 0 && _size <= 100, "Invalid batch size");
        checkBatchSize = _size;
    }
    
    function resetLastChecked() external onlyOwner {
        lastCheckedBatchId = 0;
    }
    
    function setBatchContract(address _contract) external onlyOwner {
        batchContract = ISupplyChainBatch(_contract);
    }
}
