// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title SupplyChainBatch
 * @dev ERC-1155 Multi-Token for efficient batch tracking
 * 
 * Optimization: One token ID = one batch (50+ items)
 * This saves 80% gas compared to ERC-721 per-item minting
 */
contract SupplyChainBatch is ERC1155, Ownable {
    using Strings for uint256;

    // Batch status enum
    enum Status {
        MANUFACTURED,
        IN_RETAIL,
        NEAR_EXPIRY,
        READY_FOR_DONATION,
        DONATED,
        EXPIRED
    }

    // Batch metadata stored on-chain (minimal for gas optimization)
    struct Batch {
        uint256 expiry;          // Unix timestamp
        uint256 quantity;        // Number of items in batch
        address manufacturer;
        address currentOwner;
        Status status;
        bytes32 gs1Hash;         // Hash of GS1 data for verification
        uint256 weightKg;        // For carbon credit calculation
    }

    // State variables
    mapping(uint256 => Batch) public batches;
    uint256 public nextBatchId = 1;
    
    // Authorized oracles that can update expiry status
    mapping(address => bool) public authorizedOracles;
    
    // Events
    event BatchRegistered(
        uint256 indexed batchId,
        address indexed manufacturer,
        uint256 expiry,
        uint256 quantity
    );
    event BatchTransferred(
        uint256 indexed batchId,
        address indexed from,
        address indexed to
    );
    event StatusUpdated(
        uint256 indexed batchId,
        Status oldStatus,
        Status newStatus
    );
    event BatchDonated(
        uint256 indexed batchId,
        address indexed retailer,
        address indexed ngo,
        uint256 quantity,
        uint256 weightKg
    );

    constructor() ERC1155("https://ecolink.supply/api/batch/{id}.json") Ownable(msg.sender) {}

    // ============ MANUFACTURER FUNCTIONS ============

    /**
     * @dev Register a new batch (mints ERC-1155 token)
     * @param _expiry Expiry timestamp in unix seconds
     * @param _quantity Number of items in batch
     * @param _gs1Hash Hash of GS1 Digital Link data
     * @param _weightKg Total weight for carbon calculations
     */
    function registerBatch(
        uint256 _expiry,
        uint256 _quantity,
        bytes32 _gs1Hash,
        uint256 _weightKg
    ) external returns (uint256) {
        require(_expiry > block.timestamp, "Expiry must be in future");
        require(_quantity > 0, "Quantity must be positive");

        uint256 batchId = nextBatchId++;

        batches[batchId] = Batch({
            expiry: _expiry,
            quantity: _quantity,
            manufacturer: msg.sender,
            currentOwner: msg.sender,
            status: Status.MANUFACTURED,
            gs1Hash: _gs1Hash,
            weightKg: _weightKg
        });

        // Mint single token representing the entire batch
        _mint(msg.sender, batchId, 1, "");

        emit BatchRegistered(batchId, msg.sender, _expiry, _quantity);

        return batchId;
    }

    // ============ RETAILER FUNCTIONS ============

    /**
     * @dev Claim a batch (transfer from manufacturer to retailer)
     * @param _batchId The batch to claim
     */
    function claimBatch(uint256 _batchId) external {
        Batch storage batch = batches[_batchId];
        require(batch.status == Status.MANUFACTURED, "Batch not available");
        require(balanceOf(batch.currentOwner, _batchId) > 0, "Batch not owned");

        address previousOwner = batch.currentOwner;
        batch.currentOwner = msg.sender;
        batch.status = Status.IN_RETAIL;

        // Transfer the token
        _safeTransferFrom(previousOwner, msg.sender, _batchId, 1, "");

        emit BatchTransferred(_batchId, previousOwner, msg.sender);
        emit StatusUpdated(_batchId, Status.MANUFACTURED, Status.IN_RETAIL);
    }

    /**
     * @dev Mark batch as ready for donation
     * @param _batchId The batch to mark
     */
    function markForDonation(uint256 _batchId) external {
        Batch storage batch = batches[_batchId];
        require(batch.currentOwner == msg.sender, "Not batch owner");
        require(
            batch.status == Status.IN_RETAIL || batch.status == Status.NEAR_EXPIRY,
            "Invalid status for donation"
        );

        Status oldStatus = batch.status;
        batch.status = Status.READY_FOR_DONATION;

        emit StatusUpdated(_batchId, oldStatus, Status.READY_FOR_DONATION);
    }

    // ============ ORACLE FUNCTIONS ============

    /**
     * @dev Update batch status to NEAR_EXPIRY (called by Chainlink Keeper)
     * @param _batchId The batch to update
     */
    function flagNearExpiry(uint256 _batchId) external {
        require(authorizedOracles[msg.sender] || msg.sender == owner(), "Not authorized");
        
        Batch storage batch = batches[_batchId];
        require(batch.status == Status.IN_RETAIL, "Not in retail");
        require(block.timestamp >= batch.expiry - 3 days, "Not near expiry yet");

        batch.status = Status.NEAR_EXPIRY;
        emit StatusUpdated(_batchId, Status.IN_RETAIL, Status.NEAR_EXPIRY);
    }

    /**
     * @dev Authorize an oracle address
     */
    function setOracle(address _oracle, bool _authorized) external onlyOwner {
        authorizedOracles[_oracle] = _authorized;
    }

    // ============ VIEW FUNCTIONS ============

    /**
     * @dev Get batch details
     */
    function getBatch(uint256 _batchId) external view returns (
        uint256 expiry,
        uint256 quantity,
        address manufacturer,
        address currentOwner,
        Status status,
        uint256 weightKg
    ) {
        Batch storage b = batches[_batchId];
        return (b.expiry, b.quantity, b.manufacturer, b.currentOwner, b.status, b.weightKg);
    }

    /**
     * @dev Check if batch is near expiry (for frontend)
     */
    function isNearExpiry(uint256 _batchId) external view returns (bool) {
        Batch storage b = batches[_batchId];
        return block.timestamp >= b.expiry - 3 days && block.timestamp < b.expiry;
    }

    /**
     * @dev Check if batch has expired
     */
    function isExpired(uint256 _batchId) external view returns (bool) {
        return block.timestamp >= batches[_batchId].expiry;
    }

    /**
     * @dev Get days until expiry
     */
    function daysUntilExpiry(uint256 _batchId) external view returns (int256) {
        uint256 expiry = batches[_batchId].expiry;
        if (block.timestamp >= expiry) {
            return -int256((block.timestamp - expiry) / 1 days);
        }
        return int256((expiry - block.timestamp) / 1 days);
    }
}
