from brownie import (
    VoteTokenProvider,
    VoteToken,
    TimeLock,
    Governance,
    DaoAction
)

def test_contracts_compile():
    """Verify that all contracts compile successfully"""
    print("\nTesting contract compilation...")
    print("Expected outcome:")
    print("✓ All smart contracts should be compiled")
    
    contracts = [
        VoteTokenProvider,
        VoteToken,
        TimeLock,
        Governance,
        DaoAction
    ]
    
    for contract in contracts:
        assert len(contract.abi) > 0, f"{contract._name} ABI should be available"
        print(f"✓ {contract._name} compiled successfully")