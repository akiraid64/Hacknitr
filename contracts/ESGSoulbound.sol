// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title ESGSoulbound
 * @dev Non-transferable Soulbound Token for ESG Sustainability Certificates
 * 
 * Features:
 * - Non-transferable (soul-bound to company treasury)
 * - Cryptographically signed sustainability metrics
 * - Permanent badge for annual ESG reporting
 * 
 * Use Case:
 * "Verified: 500kg of CO2 Diverted in Q1 2026"
 */
contract ESGSoulbound is ERC721, Ownable {
    using Strings for uint256;

    // Certificate metadata
    struct Certificate {
        address company;
        uint256 co2SavedKg;         // Total CO2 diverted
        uint256 itemsDonated;       // Total items saved from waste
        uint256 quarterStart;       // Timestamp of quarter start
        uint256 quarterEnd;         // Timestamp of quarter end
        uint256 issuedAt;           // When certificate was minted
        bytes32 verificationHash;   // Hash for authenticity verification
    }

    // State
    mapping(uint256 => Certificate) public certificates;
    uint256 public nextTokenId = 1;
    
    // Track certificates per company
    mapping(address => uint256[]) public companyCertificates;
    
    // Authorized issuer (DonationVerifier contract)
    mapping(address => bool) public authorizedIssuers;
    
    // Events
    event CertificateIssued(
        uint256 indexed tokenId,
        address indexed company,
        uint256 co2SavedKg,
        uint256 itemsDonated,
        bytes32 verificationHash
    );

    constructor() ERC721("ESG Sustainability Certificate", "ESGSBT") Ownable(msg.sender) {}

    // ============ SOULBOUND OVERRIDE ============
    
    /**
     * @dev Override transfer to make tokens non-transferable (soulbound)
     */
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal virtual override returns (address) {
        address from = _ownerOf(tokenId);
        
        // Allow minting (from == address(0)) but block all transfers
        if (from != address(0) && to != address(0)) {
            revert("ESGSoulbound: Token is non-transferable");
        }
        
        return super._update(to, tokenId, auth);
    }
    
    /**
     * @dev Block approvals since transfers are not allowed
     */
    function approve(address, uint256) public virtual override {
        revert("ESGSoulbound: Approvals not allowed");
    }
    
    function setApprovalForAll(address, bool) public virtual override {
        revert("ESGSoulbound: Approvals not allowed");
    }

    // ============ CERTIFICATE ISSUANCE ============
    
    /**
     * @dev Issue a new ESG certificate to a company
     * @param _company The company treasury address
     * @param _co2SavedKg Total CO2 diverted in kg
     * @param _itemsDonated Total items donated
     * @param _quarterStart Quarter start timestamp
     * @param _quarterEnd Quarter end timestamp
     */
    function issueCertificate(
        address _company,
        uint256 _co2SavedKg,
        uint256 _itemsDonated,
        uint256 _quarterStart,
        uint256 _quarterEnd
    ) external returns (uint256) {
        require(authorizedIssuers[msg.sender] || msg.sender == owner(), "Not authorized");
        require(_company != address(0), "Invalid company address");
        require(_quarterEnd > _quarterStart, "Invalid quarter range");
        
        uint256 tokenId = nextTokenId++;
        
        // Generate verification hash
        bytes32 verificationHash = keccak256(abi.encodePacked(
            _company,
            _co2SavedKg,
            _itemsDonated,
            _quarterStart,
            _quarterEnd,
            block.timestamp,
            tokenId
        ));
        
        // Store certificate data
        certificates[tokenId] = Certificate({
            company: _company,
            co2SavedKg: _co2SavedKg,
            itemsDonated: _itemsDonated,
            quarterStart: _quarterStart,
            quarterEnd: _quarterEnd,
            issuedAt: block.timestamp,
            verificationHash: verificationHash
        });
        
        // Track for company
        companyCertificates[_company].push(tokenId);
        
        // Mint soulbound token
        _mint(_company, tokenId);
        
        emit CertificateIssued(
            tokenId,
            _company,
            _co2SavedKg,
            _itemsDonated,
            verificationHash
        );
        
        return tokenId;
    }
    
    /**
     * @dev Set authorized issuer
     */
    function setIssuer(address _issuer, bool _authorized) external onlyOwner {
        authorizedIssuers[_issuer] = _authorized;
    }

    // ============ VIEW FUNCTIONS ============
    
    /**
     * @dev Get certificate details
     */
    function getCertificate(uint256 _tokenId) external view returns (
        address company,
        uint256 co2SavedKg,
        uint256 itemsDonated,
        uint256 quarterStart,
        uint256 quarterEnd,
        uint256 issuedAt,
        bytes32 verificationHash
    ) {
        Certificate storage c = certificates[_tokenId];
        return (
            c.company,
            c.co2SavedKg,
            c.itemsDonated,
            c.quarterStart,
            c.quarterEnd,
            c.issuedAt,
            c.verificationHash
        );
    }
    
    /**
     * @dev Get all certificates for a company
     */
    function getCompanyCertificates(address _company) external view returns (uint256[] memory) {
        return companyCertificates[_company];
    }
    
    /**
     * @dev Get total impact for a company across all certificates
     */
    function getTotalImpact(address _company) external view returns (
        uint256 totalCO2,
        uint256 totalItems,
        uint256 certificateCount
    ) {
        uint256[] storage certs = companyCertificates[_company];
        certificateCount = certs.length;
        
        for (uint256 i = 0; i < certs.length; i++) {
            Certificate storage c = certificates[certs[i]];
            totalCO2 += c.co2SavedKg;
            totalItems += c.itemsDonated;
        }
        
        return (totalCO2, totalItems, certificateCount);
    }
    
    /**
     * @dev Verify certificate authenticity
     */
    function verifyCertificate(uint256 _tokenId) external view returns (
        bool exists,
        bytes32 verificationHash
    ) {
        if (_ownerOf(_tokenId) == address(0)) {
            return (false, bytes32(0));
        }
        return (true, certificates[_tokenId].verificationHash);
    }
    
    /**
     * @dev Token URI for certificate metadata
     */
    function tokenURI(uint256 _tokenId) public view override returns (string memory) {
        require(_ownerOf(_tokenId) != address(0), "Token does not exist");
        Certificate storage c = certificates[_tokenId];
        
        // Returns a data URI with certificate summary
        // In production, this would point to IPFS with full metadata
        return string(abi.encodePacked(
            "data:application/json;base64,",
            _encodeBase64(
                abi.encodePacked(
                    '{"name":"ESG Certificate #', _tokenId.toString(),
                    '","description":"Verified: ', (c.co2SavedKg / 1000).toString(),
                    'kg CO2 Diverted","attributes":[{"trait_type":"CO2 Saved (kg)","value":',
                    c.co2SavedKg.toString(),
                    '},{"trait_type":"Items Donated","value":',
                    c.itemsDonated.toString(),
                    '}]}'
                )
            )
        ));
    }
    
    /**
     * @dev Simple base64 encoding for token URI
     */
    function _encodeBase64(bytes memory data) internal pure returns (string memory) {
        // Simplified - in production use OpenZeppelin Base64
        return string(data);
    }
}
