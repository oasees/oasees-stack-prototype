import pytest
import time
from brownie import chain, web3
import warnings
warnings.filterwarnings("ignore", message="Development network has a block height of*")

def test_member_management(setup_dao):
    """Test member addition and removal through governance"""
    print("\nTesting member management...")
    print("Expected outcomes:")
    print("✓ New member should receive voting tokens")
    print("✓ Member should be added through governance")
    print("✓ New member should be able to create proposals and vote")
    print("✓ Member should be removable through governance")
    
    governance = setup_dao['governance']
    daoaction = setup_dao['daoaction']
    deployer = setup_dao['deployer']
    voter1 = setup_dao['voter1']
    voter2 = setup_dao['voter2']
    voter3 = setup_dao['voter3']
    new_member = setup_dao['non_voter']
    token = setup_dao['token']

    if token.balanceOf(new_member) == 0:
        token_amount = 100 * 10**18
        token.transfer(new_member, token_amount, {'from': deployer})
        chain.mine(1)
        
        if hasattr(token, 'delegate'):
            token.delegate(new_member, {'from': new_member})
            chain.mine(1)
    
    chain.mine(1)
    prev_block = chain[-1].number - 1
    voting_power = governance.getVotes(new_member, prev_block)
    print(f"✓ New member voting power: {voting_power / 10**18}")
    assert voting_power > 0, "New member should have voting power"

    description = f"Add new member - {int(time.time())}"
    calldata = governance.addMember.encode_input(new_member.address)
    
    tx = governance.propose(
        [governance.address], [0], [calldata], description,
        {'from': deployer}
    )
    add_proposal_id = tx.return_value
    print(f"✓ Created add member proposal: {add_proposal_id}")
    
    # Wait for voting delay and ensure proposal is active
    chain.mine(governance.votingDelay() + 1)
    assert governance.state(add_proposal_id) == 1, "Proposal should be active"
    
    # Cast sufficient votes to pass
    governance.castVote(add_proposal_id, 1, {'from': deployer})
    governance.castVote(add_proposal_id, 1, {'from': voter1})
    governance.castVote(add_proposal_id, 1, {'from': voter2})
    
    # Complete voting period
    chain.mine(governance.votingPeriod())
    assert governance.state(add_proposal_id) == 4, "Proposal should have succeeded"
    
    governance.queue(
        [governance.address], [0], [calldata],
        web3.keccak(text=description),
        {'from': deployer}
    )
    # chain.sleep(governance.getMinDelay() + 1)
    chain.mine()
    
    governance.execute(
        [governance.address], [0], [calldata],
        web3.keccak(text=description),
        {'from': deployer}
    )
    
    assert governance.isMember(new_member.address), "Should be added as member"
    print("✓ New member added successfully")
    
    test_description = f"Test proposal by new member - {int(time.time())}"
    test_calldata = daoaction.store.encode_input(42)
    
    tx = governance.propose(
        [daoaction.address], [0], [test_calldata], test_description,
        {'from': new_member}
    )
    print("✓ New member can create proposals")
    

    description = f"Remove member - {int(time.time())}"
    calldata = governance.removeMember.encode_input(new_member.address)
    
    tx = governance.propose(
        [governance.address], [0], [calldata], description,
        {'from': deployer}
    )
    remove_proposal_id = tx.return_value
    
    # Wait for voting delay and ensure proposal is active
    chain.mine(governance.votingDelay() + 1)
    assert governance.state(remove_proposal_id) == 1, "Proposal should be active"
    
    # Cast sufficient votes to pass
    governance.castVote(remove_proposal_id, 1, {'from': deployer})
    governance.castVote(remove_proposal_id, 1, {'from': voter1})
    governance.castVote(remove_proposal_id, 1, {'from': voter2})
    
    # Complete voting period
    chain.mine(governance.votingPeriod())
    assert governance.state(remove_proposal_id) == 4, "Proposal should have succeeded"
    
    governance.queue(
        [governance.address], [0], [calldata],
        web3.keccak(text=description),
        {'from': deployer}
    )
    # chain.sleep(governance.getMinDelay() + 1)
    chain.mine()
    
    governance.execute(
        [governance.address], [0], [calldata],
        web3.keccak(text=description),
        {'from': deployer}
    )
    
    assert not governance.isMember(new_member.address), "Member should be removed"
    print("✓ Member removed successfully")
    
    print(f"✓ Final member count: {len(governance.getAllMembers())}")


