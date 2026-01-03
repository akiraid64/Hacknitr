// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

interface ISupplyChainBatch {
    function getBatch(uint256 _batchId) external view returns (
        uint256 expiry,
        uint256 quantity,
        address manufacturer,
        address currentOwner,
        uint8 status,
        uint256 weightKg
    );
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

interface IGoodwillToken {
    function mintForDonation(address _retailer, uint256 _amount) external;
    function mintNGOReferral(address _ngo, uint256 _amount) external;
}

interface IESGSoulbound {
    function issueCertificate(
        address _company,
        uint256 _co2SavedKg,
        uint256 _itemsDonated,
        uint256 _quarterStart,
        uint256 _quarterEnd
    ) external returns (uint256);
}

/**
 * @title DonationVerifier
 * @dev Implements the "Double Handshake" verification pattern
 * 
 * Flow:
 * 1. Retailer marks batch for donation
 * 2. NGO driver arrives and scans QR code
 * 3. Both parties sign the donation message
 * 4. Contract verifies both signatures
 * 5. Goodwill tokens minted to retailer
 * 6. NGO gets referral bonus
 * 7. Batch is burned/marked as donated
 */
contract DonationVerifier is Ownable {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    // Contract references
    ISupplyChainBatch public batchContract;
    IGoodwillToken public goodwillToken;
    IESGSoulbound public esgCertificate;

    // Constants
    uint256 public constant CO2_FACTOR = 25; // 2.5 kg CO2 per kg food (x10 for precision)
    uint256 public constant NGO_REFERRAL_PERCENT = 10; // 10% of tokens go to NGO

    // Verified donations
    struct Donation {
        uint256 batchId;
        address retailer;
        address ngo;
        uint256 quantity;
        uint256 weightKg;
        uint256 carbonCredits;
        uint256 goodwillTokens;
        uint256 verifiedAt;
        bytes32 donationHash;
    }

    mapping(uint256 => Donation) public donations;
    uint256 public donationCount;

    // Pending donations awaiting second signature
    mapping(bytes32 => address) public pendingDonations; // hash => first signer

    // Registered NGOs
    mapping(address => bool) public registeredNGOs;

    // Parent company treasury for ESG certificates
    address public parentCompanyTreasury;

    // ESG tracking per quarter
    mapping(uint256 => uint256) public quarterCO2Saved;
    mapping(uint256 => uint256) public quarterItemsDonated;

    // Events
    event DonationPending(
        bytes32 indexed donationHash,
        uint256 indexed batchId,
        address retailer
    );
    event DonationVerified(
        uint256 indexed donationId,
        uint256 indexed batchId,
        address indexed retailer,
        address ngo,
        uint256 goodwillMinted
    );
    event NGORegistered(address indexed ngo, bool registered);
    event ESGCertificateIssued(uint256 indexed tokenId, uint256 quarter);

    constructor(
        address _batchContract,
        address _goodwillToken,
        address _esgCertificate
    ) Ownable(msg.sender) {
        batchContract = ISupplyChainBatch(_batchContract);
        goodwillToken = IGoodwillToken(_goodwillToken);
        esgCertificate = IESGSoulbound(_esgCertificate);
    }

    // ============ CONFIGURATION ============

    function setParentCompanyTreasury(address _treasury) external onlyOwner {
        parentCompanyTreasury = _treasury;
    }

    function registerNGO(address _ngo, bool _registered) external onlyOwner {
        registeredNGOs[_ngo] = _registered;
        emit NGORegistered(_ngo, _registered);
    }

    // ============ DOUBLE HANDSHAKE ============

    /**
     * @dev Create donation hash for signing
     * @param _batchId The batch being donated
     * @param _retailer The retailer donating
     * @param _ngo The NGO receiving
     */
    function getDonationHash(
        uint256 _batchId,
        address _retailer,
        address _ngo
    ) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(
            "ECOLINK_DONATION",
            _batchId,
            _retailer,
            _ngo
        ));
    }

    /**
     * @dev First signature - Retailer initiates donation
     * @param _batchId Batch to donate
     * @param _ngo Target NGO
     * @param _signature Retailer's signature
     */
    function initiateDonation(
        uint256 _batchId,
        address _ngo,
        bytes calldata _signature
    ) external {
        require(registeredNGOs[_ngo], "NGO not registered");
        
        // Get batch data
        (,, , address currentOwner, uint8 status,) = batchContract.getBatch(_batchId);
        require(currentOwner == msg.sender, "Not batch owner");
        require(status == 3, "Batch not marked for donation"); // READY_FOR_DONATION = 3

        bytes32 donationHash = getDonationHash(_batchId, msg.sender, _ngo);
        bytes32 ethSignedHash = donationHash.toEthSignedMessageHash();

        // Verify retailer signature
        address signer = ethSignedHash.recover(_signature);
        require(signer == msg.sender, "Invalid retailer signature");

        // Store pending
        pendingDonations[donationHash] = msg.sender;

        emit DonationPending(donationHash, _batchId, msg.sender);
    }

    /**
     * @dev Second signature - NGO confirms pickup
     * @param _batchId Batch being donated
     * @param _retailer The retailer
     * @param _signature NGO's signature
     */
    function confirmDonation(
        uint256 _batchId,
        address _retailer,
        bytes calldata _signature
    ) external {
        require(registeredNGOs[msg.sender], "Not a registered NGO");

        bytes32 donationHash = getDonationHash(_batchId, _retailer, msg.sender);
        require(pendingDonations[donationHash] == _retailer, "No pending donation");

        bytes32 ethSignedHash = donationHash.toEthSignedMessageHash();

        // Verify NGO signature
        address signer = ethSignedHash.recover(_signature);
        require(signer == msg.sender, "Invalid NGO signature");

        // Get batch data
        (, uint256 quantity,,, uint8 status, uint256 weightKg) = batchContract.getBatch(_batchId);
        require(status == 3, "Invalid batch status");

        // Calculate rewards
        uint256 carbonCredits = (weightKg * CO2_FACTOR) / 10; // CO2 saved in kg
        uint256 retailerTokens = quantity;
        uint256 ngoTokens = (quantity * NGO_REFERRAL_PERCENT) / 100;

        // Mint tokens
        goodwillToken.mintForDonation(_retailer, retailerTokens);
        goodwillToken.mintNGOReferral(msg.sender, ngoTokens);

        // Track ESG metrics
        uint256 currentQuarter = _getCurrentQuarter();
        quarterCO2Saved[currentQuarter] += carbonCredits;
        quarterItemsDonated[currentQuarter] += quantity;

        // Record donation
        donationCount++;
        donations[donationCount] = Donation({
            batchId: _batchId,
            retailer: _retailer,
            ngo: msg.sender,
            quantity: quantity,
            weightKg: weightKg,
            carbonCredits: carbonCredits,
            goodwillTokens: retailerTokens,
            verifiedAt: block.timestamp,
            donationHash: donationHash
        });

        // Cleanup
        delete pendingDonations[donationHash];

        emit DonationVerified(
            donationCount,
            _batchId,
            _retailer,
            msg.sender,
            retailerTokens + ngoTokens
        );
    }

    // ============ ESG CERTIFICATES ============

    /**
     * @dev Issue quarterly ESG certificate to parent company
     * @param _quarter Quarter number (e.g., 20261 for Q1 2026)
     */
    function issueQuarterlyCertificate(uint256 _quarter) external onlyOwner {
        require(parentCompanyTreasury != address(0), "Treasury not set");
        uint256 co2 = quarterCO2Saved[_quarter];
        uint256 items = quarterItemsDonated[_quarter];
        require(co2 > 0 || items > 0, "No impact to certify");

        // Calculate quarter timestamps (simplified)
        uint256 quarterStart = block.timestamp - 90 days;
        uint256 quarterEnd = block.timestamp;

        uint256 tokenId = esgCertificate.issueCertificate(
            parentCompanyTreasury,
            co2,
            items,
            quarterStart,
            quarterEnd
        );

        emit ESGCertificateIssued(tokenId, _quarter);
    }

    // ============ VIEW FUNCTIONS ============

    function getDonation(uint256 _id) external view returns (
        uint256 batchId,
        address retailer,
        address ngo,
        uint256 quantity,
        uint256 carbonCredits,
        uint256 goodwillTokens,
        uint256 verifiedAt
    ) {
        Donation storage d = donations[_id];
        return (
            d.batchId,
            d.retailer,
            d.ngo,
            d.quantity,
            d.carbonCredits,
            d.goodwillTokens,
            d.verifiedAt
        );
    }

    function getQuarterlyImpact(uint256 _quarter) external view returns (
        uint256 co2Saved,
        uint256 itemsDonated
    ) {
        return (quarterCO2Saved[_quarter], quarterItemsDonated[_quarter]);
    }

    function _getCurrentQuarter() internal view returns (uint256) {
        // Returns quarter as YYYYQ format (e.g., 20261 for Q1 2026)
        // Simplified calculation
        uint256 year = 2026; // In production, calculate from timestamp
        uint256 month = (block.timestamp / 30 days) % 12 + 1;
        uint256 quarter = (month - 1) / 3 + 1;
        return year * 10 + quarter;
    }
}
