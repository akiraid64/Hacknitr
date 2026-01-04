"""
Blockchain Integration for Goodwill Token Rewards
Connects to Shardeum blockchain to mint tokens for verified donations
"""

from web3 import Web3
from eth_account import Account
import os
from dotenv import load_dotenv

load_dotenv()

# Shardeum Configuration
SHARDEUM_RPC = os.getenv('SHARDEUM_RPC', 'https://api-mezame.shardeum.org')
GOODWILL_TOKEN_ADDRESS = os.getenv('GOODWILL_TOKEN_ADDRESS', '0x7b2563838420A1B52419c28EA1E73685eaB3aC65')
WALLET_PRIVATE_KEY = os.getenv('WALLET_PRIVATE_KEY', '')

# Initialize Web3
w3 = Web3(Web3.HTTPProvider(SHARDEUM_RPC))

# GoodwillToken Contract ABI (only the functions we need)
GOODWILL_TOKEN_ABI = [
    {
        "inputs": [
            {"name": "_retailer", "type": "address"},
            {"name": "_amount", "type": "uint256"}
        ],
        "name": "mintForDonation",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {"name": "_ngo", "type": "address"},
            {"name": "_amount", "type": "uint256"}
        ],
        "name": "mintNGOReferral",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{"name": "account", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    }
]

# Initialize contract
contract = w3.eth.contract(
    address=Web3.to_checksum_address(GOODWILL_TOKEN_ADDRESS),
    abi=GOODWILL_TOKEN_ABI
)


def mint_tokens_for_donation(retailer_wallet: str, quantity: int, ngo_wallet: str = None):
    """
    Mint Goodwill Tokens for verified donation
    
    Args:
        retailer_wallet: Retailer's MetaMask address
        quantity: Number of items donated
        ngo_wallet: Optional NGO wallet for referral bonus
    
    Returns:
        dict with transaction hash and tokens minted
    """
    
    if not WALLET_PRIVATE_KEY:
        print("⚠️ No wallet private key configured - skipping blockchain mint")
        return {
            "success": False,
            "message": "Blockchain not configured",
            "tokens_minted": 0
        }
    
    try:
        # Convert addresses to checksum format
        retailer_address = Web3.to_checksum_address(retailer_wallet)
        
        # Get wallet account
        account = Account.from_key(WALLET_PRIVATE_KEY)
        
        # Fixed reward: 0.5 GOOD tokens per donation (regardless of quantity)
        tokens_amount = w3.to_wei(0.5, 'ether')  # Convert to Wei (18 decimals)
        
        print(f"\n{'='*60}")
        print(f"[BLOCKCHAIN] Minting 0.5 GOOD tokens to {retailer_address} (for {quantity} items)")
        
        # Build transaction
        nonce = w3.eth.get_transaction_count(account.address)
        
        transaction = contract.functions.mintForDonation(
            retailer_address,
            tokens_amount
        ).build_transaction({
            'from': account.address,
            'nonce': nonce,
            'gas': 200000,
            'gasPrice': w3.eth.gas_price,
            'chainId': 8119  # Shardeum Mezame
        })
        
        # Sign transaction
        signed_txn = w3.eth.account.sign_transaction(transaction, WALLET_PRIVATE_KEY)
        
        # Send transaction
        tx_hash = w3.eth.send_raw_transaction(signed_txn.raw_transaction)
        
        print(f"[BLOCKCHAIN] Transaction sent: {tx_hash.hex()}")
        
        # Wait for confirmation (with timeout)
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
        
        if receipt.status == 1:
            print(f"✅ Tokens minted successfully!")
            print(f"[BLOCKCHAIN] Tx: https://explorer-mezame.shardeum.org/tx/{tx_hash.hex()}")
            print(f"{'='*60}\n")
            
            # Optionally mint NGO referral (10% bonus)
            if ngo_wallet:
                try:
                    mint_ngo_referral(ngo_wallet, quantity // 10)
                except Exception as e:
                    print(f"⚠️ NGO referral mint failed: {e}")
            
            return {
                "success": True,
                "tx_hash": tx_hash.hex(),
                "tokens_minted": quantity,
                "explorer_url": f"https://explorer-mezame.shardeum.org/tx/{tx_hash.hex()}"
            }
        else:
            print(f"❌ Transaction failed")
            return {
                "success": False,
                "message": "Transaction reverted",
                "tokens_minted": 0
            }
            
    except Exception as e:
        print(f"❌ Blockchain error: {str(e)}")
        return {
            "success": False,
            "message": str(e),
            "tokens_minted": 0
        }


def mint_ngo_referral(ngo_wallet: str, quantity: int):
    """Mint referral bonus for NGO (10% of retailer reward)"""
    
    if quantity < 1:
        return
    
    try:
        ngo_address = Web3.to_checksum_address(ngo_wallet)
        account = Account.from_key(WALLET_PRIVATE_KEY)
        
        tokens_amount = w3.to_wei(quantity, 'ether')
        
        print(f"[BLOCKCHAIN] Minting {quantity} GOOD referral to NGO {ngo_address}")
        
        nonce = w3.eth.get_transaction_count(account.address)
        
        transaction = contract.functions.mintNGOReferral(
            ngo_address,
            tokens_amount
        ).build_transaction({
            'from': account.address,
            'nonce': nonce,
            'gas': 150000,
            'gasPrice': w3.eth.gas_price,
            'chainId': 8119
        })
        
        signed_txn = w3.eth.account.sign_transaction(transaction, WALLET_PRIVATE_KEY)
        tx_hash = w3.eth.send_raw_transaction(signed_txn.raw_transaction)
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
        
        if receipt.status == 1:
            print(f"✅ NGO referral minted!")
            
    except Exception as e:
        print(f"⚠️ NGO referral error: {e}")


def get_token_balance(wallet_address: str) -> float:
    """Get GOOD token balance for an address"""
    try:
        checksum_address = Web3.to_checksum_address(wallet_address)
        balance_wei = contract.functions.balanceOf(checksum_address).call()
        balance = w3.from_wei(balance_wei, 'ether')
        return float(balance)
    except Exception as e:
        print(f"Error getting balance: {e}")
        return 0.0


def is_blockchain_configured() -> bool:
    """Check if blockchain is properly configured"""
    return bool(WALLET_PRIVATE_KEY and w3.is_connected())


if __name__ == "__main__":
    # Test connection
    print("Testing Shardeum connection...")
    print(f"Connected: {w3.is_connected()}")
    print(f"Chain ID: {w3.eth.chain_id}")
    print(f"Contract: {GOODWILL_TOKEN_ADDRESS}")
    
    if WALLET_PRIVATE_KEY:
        account = Account.from_key(WALLET_PRIVATE_KEY)
        print(f"Wallet: {account.address}")
        balance = w3.eth.get_balance(account.address)
        print(f"SHM Balance: {w3.from_wei(balance, 'ether')}")
