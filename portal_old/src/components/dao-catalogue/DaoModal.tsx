import React, { useEffect, useState } from 'react';
import styles from './dao-modal.module.scss';
import { Int32 } from 'react-native/Libraries/Types/CodegenTypes';
import { Contract,ContractEventName} from 'ethers';

interface DaoModalProps {
  account: any;
  signer: any;
  daojson: {
    dao_name:string;
    dao_desc:string;
    governance_address:string; 
    governance_abi:any;
    governance_token_address:string;
    governance_token_abi:any;
    box_address:string;
    box_abi:any;
    dao_hash:string;
    icon_url:string;
  };
  onClose: () => void;
  
}

interface Proposal {
  desc: string;
  proposal_id: Int32;
  status: string;
}

interface Votes {
  desc: string;
  event_id: Int32;
  support: string;
  reason: string;
}

interface VoteStates{
  0: string;
  1: string;

}


interface ProposalStates {
  0: string;
  1: string;
  2: string;
  3: string;
  4: string;
  5: string;
  6: string;
  7: string;
}


export const DaoModal: React.FC<DaoModalProps> = ({ account,signer,daojson, onClose }) => {

  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [votes, setVotes] = useState<Votes[]>([]);

  const [proposal_filter, setProposalFilter] = useState<ContractEventName | undefined>();
  const [vote_filter, setVoteFilter] = useState<ContractEventName | undefined>();
  const [Dao, setDao] = useState<Contract | undefined>();

  const proposalMap: { [key: string]: string } = {};
  

  const proposalStates: ProposalStates = {
    0: "Pending",
    1: "Active",
    2: "Canceled",
    3: "Defeated",
    4: "Succeeded",
    5: "Queued",
    6: "Expired",
    7: "Executed",
  };

  const voteStates: VoteStates = {
    0: "Against",
    1: "For"

  }


  useEffect(() => {
    const loadContracts = async () => {
      if (signer) {
        console.log(daojson.dao_hash);
        const dao = new Contract(daojson.governance_address, daojson.governance_abi, signer);
        const proposal_filter = dao.filters.ProposalCreated(null);
        const vote_filter = dao.filters.VoteCast(null);

        setDao(dao);
        setProposalFilter(proposal_filter);
        setVoteFilter(vote_filter);
      }
    };

    loadContracts();
  }, [signer, daojson.governance_address, daojson.governance_abi]);

  const handleProposalEvent = async () => {
    try {
      const results = await Dao?.queryFilter(proposal_filter!);

      if (results && results.length > 0) {


        const get_proposals = await Promise.all(
            results.map(
                async (i: any) => {   
                  i = i.args
                  proposalMap[i.proposalId] = i.description;
                  const state = await Dao?.state(i.proposalId);
                  const currentState: keyof ProposalStates =  state;
                  let proposal = {
                    desc: i.description,
                    proposal_id: i.proposalId,
                    status: proposalStates[currentState]
                  }

                  return proposal
                
                }
            )
     
        )

        setProposals(get_proposals);

        
      }
    } catch (error) {
      console.error('Error fetching proposals:', error);
    }
  };





  const handleVoteEvent = async () => {

    

    try {
      const results = await Dao?.queryFilter(vote_filter!);

      if (results && results.length > 0) {

        console.log(results[0]);

        const get_votes = await Promise.all(
            results.map(
                async (i: any) => {   
                  i = i.args
                  const currentState: keyof VoteStates =  i.support;
                  const description = proposalMap[i.proposalId];
                  let vote = {
                    desc: description,
                    event_id: 93993,
                    support: voteStates[currentState],
                    reason: i.reason
                  }

                  return vote
                
                }
            )
     
        )

        setVotes(get_votes);

        
      }
    } catch (error) {
      console.error('Error fetching proposals:', error);
    }
  };


  useEffect(() => {
    const interval = setInterval(() => {
      if (Dao && proposal_filter) {
        handleProposalEvent();
      }
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [Dao, proposal_filter]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (Dao && vote_filter) {
        handleVoteEvent();
      }
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [Dao, vote_filter]);


  const [formData, setFormData] = useState({
    proposalDescription: '',
    proposalNumber: '',
  });

  const handleBackgroundClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const isActionDisabled = (status: string) => {
    return status === 'Passed' || status === 'Defeated';
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  return (
<div className={styles.modalBackground} onClick={onClose}>
  <div className={styles.modalContent} onClick={handleBackgroundClick}>
    <button className={styles.closeButton} onClick={onClose}>
      Close
    </button>
    <div className={styles.modalContainer}>
      <div className={styles.modalHeader}>
        <div className={styles.headerLeft}>
          <img src={"../images/dao_icon.png"} alt="Icon" className={styles.icon} />
        </div>
        <div className={styles.headerRight}>
          <h3 className={styles.dao_title}>{daojson.dao_name}</h3>
          <h3 className={styles.dao_title}>{daojson.dao_hash}</h3>
          <p>{daojson.dao_desc}</p>
        </div>
      </div>

      <div className={styles.modalContentContainer}>
        <div className={styles.modalContentLeft}>
          <div className={styles.createProposalForm}>
            <h4>Create Proposal</h4>
            <form onSubmit={handleFormSubmit}>
              <label>
                Proposal Description:
                <input
                  type="text"
                  name="proposalDescription"
                  value={formData.proposalDescription}
                  onChange={handleInputChange}
                />
              </label>
              <label>
                Action Number:
                <input
                  type="number"
                  name="proposalNumber"
                  value={formData.proposalNumber}
                  onChange={handleInputChange}
                />
              </label>
              <button type="submit">Create</button>
            </form>
          </div>
        </div>
        <div className={styles.modalContentRight}>
          <div className={styles.scrollableTable}>
            <table>
              <thead>
                <tr>
                  <th>Proposal Description</th>
                  <th>Status</th>
                  <th>Vote Action</th>
                </tr>
              </thead>
              <tbody>
                {proposals.map((proposal, index) => (
                  <tr key={index}>
                    <td>{proposal.desc}</td>
                    <td className={styles.status} style={{ color: getStatusColor(proposal.status) }}>
                      {proposal.status}
                    </td>
                    <td className={styles.voteAction}>
                      <button disabled={isActionDisabled(proposal.status)}>For</button>
                      <button disabled={isActionDisabled(proposal.status)}>Against</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <div className={styles.monitoringTable}>
      <div className={styles.scrollableTableMonitoring}>
        <table>
          <thead>
            <tr>
              <th>Proposal Description</th>
              <th>Vote</th>
              <th>Reason</th>
            </tr>
          </thead>
          <tbody>
          {votes.map((vote, index) => (
                  <tr key={index}>
                    <td>{vote.desc}</td>
                    <td>{vote.support}</td>
                    <td>{vote.reason}</td>
                  </tr>
                ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  </div>
</div>

  );
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Active':
      return 'green';
    case 'Succeeded':
      return 'blue';
    case 'Defeated':
      return 'red';
    default:
      return 'black';
  };
};

export default DaoModal;
