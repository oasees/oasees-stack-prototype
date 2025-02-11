import pytest
import time
from brownie import chain, web3
import warnings
warnings.filterwarnings("ignore", message="Development network has a block height of*")

def get_proposal_state_string(state):
    states = {
        0: "Pending", 1: "Active", 2: "Canceled", 3: "Defeated",
        4: "Succeeded", 5: "Queued", 6: "Expired", 7: "Executed"
    }
    return states.get(state, "Unknown")

def test_proposal_creation_and_voting(setup_dao):
    governance = setup_dao['governance']
    daoaction = setup_dao['daoaction']
    deployer = setup_dao['deployer']
    voter1 = setup_dao['voter1']
    voter2 = setup_dao['voter2']
    non_voter = setup_dao['non_voter']
    token = setup_dao['token']

    description = "Set daoaction value to 42"
    calldata = daoaction.store.encode_input(42)
    
    # Get snapshot before proposal
    chain.mine(1)
    prev_block = chain[-1].number
    
    tx = governance.propose(
        [daoaction.address], [0], [calldata], description,
        {'from': deployer}
    )
    proposal_id = tx.return_value
    print(f"✓ Proposal created at block {prev_block + 1}")

    # Verify voting weights at snapshot
    voting_power = governance.getVotes(deployer, prev_block)
    assert voting_power > 0, "Proposer should have voting power"
    print(f"✓ Proposer voting power: {voting_power}")

    # Wait for voting delay
    chain.mine(governance.votingDelay() + 1)
    assert governance.state(proposal_id) == 1, "Proposal should be active"

    # Test voting
    votes_needed = governance.proposalThreshold() + 1
    governance.castVote(proposal_id, 1, {'from': deployer})
    governance.castVote(proposal_id, 1, {'from': voter1})
    governance.castVote(proposal_id, 1, {'from': voter2})
    print(f"✓ Cast {votes_needed} votes")