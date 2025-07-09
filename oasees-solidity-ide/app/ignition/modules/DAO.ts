// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const ONE_GWEI: bigint = 1_000_000_000n;
const minDelay = `${process.env.minDelay}`
const quorumPercentage = `${process.env.quorumPercentage}`
const votingDelay = `${process.env.votingDelay}`
const votingPeriod = `${process.env.votingPeriod}`
const daoName = `${process.env.daoName}`
const daoDesc = `${process.env.daoDesc}`
const deployer = `${process.env.account}`

const DAOModule = buildModule("DAOModule", (m) => {


  const vote_token = m.contract("VoteToken", ["DAO_TOKEN", "DT",100],{
    from: deployer
  })

  const vote_token_provider = m.contract("VoteTokenProvider", [vote_token], {
    from: deployer
  });

  const timelock = m.contract("TimeLock", [minDelay, [],[],[]], {
    from: deployer
  });

  const governance = m.contract("Governance", [vote_token,timelock,quorumPercentage,votingDelay,votingPeriod], {
    from: deployer
  })

  const box = m.contract("Box", [], {
    from: deployer
  })


  const proposer_role = m.staticCall(timelock, "PROPOSER_ROLE")
  const executor_role = m.staticCall(timelock, "EXECUTOR_ROLE")
  const admin_role = m.staticCall(timelock, "TIMELOCK_ADMIN_ROLE")

  m.call(timelock, "grantRole", [proposer_role, governance], {id: "GrantProposerRole", from: deployer})
  m.call(timelock, "grantRole", [executor_role, governance], {id: "GrantExecutorRole", from: deployer})
  m.call(timelock, "grantRole", [admin_role, governance], {id: "GrantAdminRole", from: deployer})
  m.call(box, "transferOwnership", [timelock], {from: deployer})


  return {vote_token,vote_token_provider,timelock,governance,box}
});

export default DAOModule;
