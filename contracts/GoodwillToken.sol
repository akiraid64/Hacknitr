// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title GoodwillToken
 * @dev ERC-20 token with utility features:
 * - Burn for Tax: Generate cryptographic tax receipts
 * - Staking: Earn visibility on eco-retailer map
 * 
 * Tokenomics:
 * - 1 token = 1 item donated
 * - Retailers earn tokens when NGOs verify donations
 * - NGOs earn a percentage as referral
 */
contract GoodwillToken is ERC20, ERC20Burnable, Ownable {
    
    // Staking data
    struct Stake {
        uint256 amount;
        uint256 stakedAt;
        uint256 unlockTime;
    }
    
    // Tax receipt data
    struct TaxReceipt {
        address burner;
        uint256 amount;
        uint256 timestamp;
        bytes32 receiptHash;
    }
    
    // State
    mapping(address => Stake) public stakes;
    mapping(address => TaxReceipt[]) public taxReceipts;
    mapping(address => bool) public authorizedMinters;
    
    // Staking parameters
    uint256 public constant MIN_STAKE_DURATION = 30 days;
    uint256 public constant VISIBILITY_BOOST_PER_TOKEN = 10; // basis points
    
    // Events
    event TokensMinted(address indexed to, uint256 amount, string reason);
    event Staked(address indexed user, uint256 amount, uint256 unlockTime);
    event Unstaked(address indexed user, uint256 amount);
    event TaxReceiptGenerated(
        address indexed burner, 
        uint256 amount, 
        bytes32 receiptHash
    );
    
    constructor() ERC20("Goodwill Token", "GOOD") Ownable(msg.sender) {}
    
    // ============ MINTING (Only authorized contracts) ============
    
    /**
     * @dev Mint tokens to retailer after verified donation
     * @param _retailer The retailer who donated
     * @param _amount Amount of tokens (1 per item)
     */
    function mintForDonation(address _retailer, uint256 _amount) external {
        require(authorizedMinters[msg.sender], "Not authorized to mint");
        _mint(_retailer, _amount);
        emit TokensMinted(_retailer, _amount, "Donation Reward");
    }
    
    /**
     * @dev Mint referral bonus to NGO
     * @param _ngo The NGO that verified the donation
     * @param _amount Amount (typically 10% of retailer reward)
     */
    function mintNGOReferral(address _ngo, uint256 _amount) external {
        require(authorizedMinters[msg.sender], "Not authorized to mint");
        _mint(_ngo, _amount);
        emit TokensMinted(_ngo, _amount, "NGO Referral Bonus");
    }
    
    /**
     * @dev Set authorized minter (the DonationVerifier contract)
     */
    function setMinter(address _minter, bool _authorized) external onlyOwner {
        authorizedMinters[_minter] = _authorized;
    }
    
    // ============ BURN FOR TAX ============
    
    /**
     * @dev Burn tokens to generate a cryptographic tax receipt
     * This creates an immutable on-chain record for tax authorities
     * @param _amount Amount to burn for tax deduction
     */
    function burnForTax(uint256 _amount) external {
        require(balanceOf(msg.sender) >= _amount, "Insufficient balance");
        
        // Create receipt hash
        bytes32 receiptHash = keccak256(abi.encodePacked(
            msg.sender,
            _amount,
            block.timestamp,
            block.number,
            taxReceipts[msg.sender].length
        ));
        
        // Store receipt
        taxReceipts[msg.sender].push(TaxReceipt({
            burner: msg.sender,
            amount: _amount,
            timestamp: block.timestamp,
            receiptHash: receiptHash
        }));
        
        // Burn tokens
        _burn(msg.sender, _amount);
        
        emit TaxReceiptGenerated(msg.sender, _amount, receiptHash);
    }
    
    /**
     * @dev Get tax receipts for an address
     */
    function getTaxReceipts(address _user) external view returns (TaxReceipt[] memory) {
        return taxReceipts[_user];
    }
    
    /**
     * @dev Verify a tax receipt hash
     */
    function verifyReceipt(
        address _user, 
        uint256 _index
    ) external view returns (bytes32) {
        require(_index < taxReceipts[_user].length, "Receipt not found");
        return taxReceipts[_user][_index].receiptHash;
    }
    
    // ============ STAKING ============
    
    /**
     * @dev Stake tokens to boost visibility on eco-retailer map
     * @param _amount Amount to stake
     */
    function stake(uint256 _amount) external {
        require(balanceOf(msg.sender) >= _amount, "Insufficient balance");
        require(stakes[msg.sender].amount == 0, "Already staking");
        
        _transfer(msg.sender, address(this), _amount);
        
        stakes[msg.sender] = Stake({
            amount: _amount,
            stakedAt: block.timestamp,
            unlockTime: block.timestamp + MIN_STAKE_DURATION
        });
        
        emit Staked(msg.sender, _amount, stakes[msg.sender].unlockTime);
    }
    
    /**
     * @dev Unstake tokens after lock period
     */
    function unstake() external {
        Stake storage s = stakes[msg.sender];
        require(s.amount > 0, "No active stake");
        require(block.timestamp >= s.unlockTime, "Still locked");
        
        uint256 amount = s.amount;
        delete stakes[msg.sender];
        
        _transfer(address(this), msg.sender, amount);
        
        emit Unstaked(msg.sender, amount);
    }
    
    /**
     * @dev Get visibility boost for a staker (in basis points)
     */
    function getVisibilityBoost(address _user) external view returns (uint256) {
        Stake storage s = stakes[_user];
        if (s.amount == 0) return 0;
        return s.amount * VISIBILITY_BOOST_PER_TOKEN;
    }
    
    /**
     * @dev Check if user is actively staking
     */
    function isStaking(address _user) external view returns (bool) {
        return stakes[_user].amount > 0;
    }
}
