import { Button, Center, Grid, Modal, Table, Tabs, Image, Flex, Text, CloseButton, ScrollArea, TextInput, Select, Box, Textarea, LoadingOverlay, Stack, Loader,} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useForm } from "@mantine/form";
import { useEffect, useState } from "react";
import styles from './DAOModal.module.css'
import { ethers } from "ethers";


interface DAOModalProps{
    currentDAO: any;
    availableDevices: any[];
    joinedDevices: any[];
    closeModal(): void;
    updateDevices():void;
    json:any;
}

enum ProposalStatus{
    Active,
    Defeated,
    Pending,
    Succeeded
}

const stateToStatus = (state:number) => {
    if(state==0) return ProposalStatus.Pending;
    else if(state==1) return ProposalStatus.Active;
    else if(state==3) return ProposalStatus.Defeated;
    else if(state==4) return ProposalStatus.Succeeded
}

const supportToVote = (support:number) => {
    if(support==0) return 'Against';
    else return 'For';
}

interface Proposal{
    description: string;
    state: number;
    proposalId: number;
}

interface Vote{
    proposal: string;
    support: number;
    reason: string;
}


const actions = ['First Action', 'Second Action', 'Third Action', 'Fourth Action'];

const DAOModal = ({currentDAO, availableDevices, joinedDevices, closeModal, updateDevices, json}:DAOModalProps) => {
    
    const [daoContract,setDaoContract] = useState<ethers.Contract>();
    const [tokenContract,setTokenContract] = useState<ethers.Contract>();
    const [proposalFilter,setProposalFilter] = useState<ethers.DeferredTopicFilter>();
    const [voteFilter,setVoteFilter] = useState<ethers.DeferredTopicFilter>();

    const [proposals,setProposals] = useState<Proposal[]>([])
    const [votes,setVotes] = useState<Vote[]>([]);

    const [proposalDescriptions,setProposalDescriptions] = useState<{[key:string]:string}>();

    const [loading,setLoading] = useState(false);
    const [refresh,{toggle}] = useDisclosure();
    const [opened, {close}] = useDisclosure(true);

    useEffect(()=>{
        const loadContracts = async ()=>{
            try{
                const signer = await json.provider.getSigner();
                
                const dao_contract = new ethers.Contract(
                    currentDAO.governance_address,
                    currentDAO.governance_abi,
                    await signer)

                const dao_token_contract = new ethers.Contract(
                    currentDAO.token_address,
                    currentDAO.token_abi,
                    await signer)


                const proposal_filter = dao_contract.filters.ProposalCreated(null);
                const vote_filter = dao_contract.filters.VoteCast(null);

                setDaoContract(dao_contract);
                setTokenContract(dao_token_contract);
                setProposalFilter(proposal_filter);
                setVoteFilter(vote_filter);
            } catch(error){
                console.error("An error occured while initializing the contracts: ", error);
            }
        }

        loadContracts();
    },[])





    useEffect(()=>{
        const handleProposalEvent = async () =>{
            try {
                const results:any = await daoContract!.queryFilter(proposalFilter!);
                const proposals:Proposal[] = [];
                const proposal_descriptions: {[key:string]:string}= {}

                for (const result of results){
                    const args = result.args;
                    const description = args.description;
                    const proposalId = args.proposalId

                    const state = await daoContract!.state(proposalId);

                    proposals.push({description:description,state:state,proposalId:proposalId});
                    proposal_descriptions[proposalId] = description;
                }

                setProposals(proposals);
                setProposalDescriptions(proposal_descriptions);
            } catch (error) {
                console.error('Error fetching proposals:', error);
            }
        }

        
        if(daoContract){
            handleProposalEvent();
        }
    },[daoContract]);

    useEffect(()=> {
        const handleVoteEvent = async () => {
            try {
                const results:any = await daoContract!.queryFilter(voteFilter!);
                const votes:Vote[] = [];

                for (const result of results){
                    const args = result.args;
                    if(args.weight>0){
                        const proposal = proposalDescriptions![args.proposalId];
                        const support = args.support;
                        const reason = args.reason;


                        votes.push({proposal:proposal, support:support, reason:reason})
                    }
                }

                setVotes(votes);
            } catch(error){
                console.error('Error fetching votes: ', error);
            }
        }
        if(proposals.length>0){
            handleVoteEvent();
        }
    },[proposals])



    const form = useForm({
        initialValues: {
            title: '',
            description:'',
            action: '',
        },

        validate: {
            title: (value) => ((value)? null: 'Title field cannot be blank.'),
            description: (value) => ((value)? null: 'Description field cannot be blank.'),
            action: (value) => ((value)? null: ' '),
        }
    });


    const handleClose = () => {
        close();
        closeModal();
    };

    const handleJoining = async (event: React.MouseEvent<HTMLButtonElement>) =>{
        event.preventDefault();
        setLoading(true);
        const button: HTMLButtonElement = event.currentTarget;
        const signer = await json.provider.getSigner();
        const device_account = availableDevices[Number(button.value)].account;

        try{
            const transaction_count = await json.provider.getTransactionCount(json.account);
            const transfer_tokens_to_device = await tokenContract!.transfer(device_account,20,{nonce:transaction_count});
            await transfer_tokens_to_device.wait();

            const register_device_to_dao = await json.marketplace.registerDeviceToDao(device_account,currentDAO.marketplace_dao_id,{nonce:transaction_count+1});
            await register_device_to_dao.wait();
            updateDevices();
        } catch(error){
            console.error("Metamask error: ",error);
        }
        setLoading(false);
    };


    const manageDevices = availableDevices.map((device,index) => (
        <Table.Tr key={index}>
            <Table.Td>{device.name}</Table.Td>
            <Table.Td>{device.ip_address}</Table.Td>
            <Table.Td><Button color='orange' onClick={handleJoining} value={index}>Join</Button></Table.Td>
        </Table.Tr>
    ));

    const overviewDevices = joinedDevices.map((device,index) => (
        <Table.Tr key={index}>
            <Table.Td>{device.name}</Table.Td>
            <Table.Td>{device.ip_address}</Table.Td>
        </Table.Tr>
    ));

    const styledStatus= (state:number) => {
        const status = stateToStatus(state);
        switch(status){
            case ProposalStatus.Defeated:
                return (<Table.Td style={{color:'red'}}>Defeated</Table.Td>);
            case ProposalStatus.Active:
                return (<Table.Td style={{color:'green'}}>Active</Table.Td>);
            case ProposalStatus.Succeeded:
                return (<Table.Td style={{color:'blue'}}>Succeeded</Table.Td>);
            case ProposalStatus.Pending:
                return (<Table.Td>Pending</Table.Td>);
        }
    }

    const mapped_proposals = proposals.slice(0).reverse().map((proposal,index)=> (
        <Table.Tr key={index}>
            <Table.Td>{proposal.description}</Table.Td>
            {styledStatus(proposal.state)}
        </Table.Tr>
    ));

    const mapped_votes = votes.map((vote,index)=> (
        <Table.Tr key={index}>
            <Table.Td>{vote.proposal}</Table.Td>
            <Table.Td>{supportToVote(vote.support)}</Table.Td>
            <Table.Td>{vote.reason}</Table.Td>
        </Table.Tr>
    ));



  return (
    <>
        <Modal opened={opened} onClose={handleClose} size="80%" withCloseButton={false}>
        <LoadingOverlay visible={loading} zIndex={1000} overlayProps={{ radius: "lg", blur: 2 }}
        loaderProps={{
            children:<Stack align='center'>
                        <Loader color='blue'/>
                        <Text>Just a moment...</Text>
                        <Text>Your transaction is being processed on the blockchain.</Text>
                    </Stack>
            }} />

        <Flex justify='flex-end'>
            <CloseButton onClick={handleClose}/>
          </Flex>
            <Center>
                <Image src='./images/dao_icon.png' w={100} h={100}></Image>
                <h4>{currentDAO.dao_name}</h4>
            </Center>
            
            <Tabs defaultValue="overview">
                <Tabs.List>
                    <Tabs.Tab value="overview">
                        Overview
                    </Tabs.Tab>

                    <Tabs.Tab value="manage">
                        Manage
                    </Tabs.Tab>
                </Tabs.List>


                <Tabs.Panel value="overview" h={585}>
                    <Grid gutter='md' miw={500}>

                        <Grid.Col span={6}>
                        <Center pb={10} style={{fontSize:14}}><u><b>Participants</b></u></Center>

                        <ScrollArea h={156}>
                        <Table striped={true} stripedColor="var(--mantine-color-gray-1)" withColumnBorders captionSide="top">
                          
                                <Table.Tbody>
                                    {overviewDevices}
                                </Table.Tbody>
                        </Table>
                        </ScrollArea>
                        </Grid.Col>

                        <Grid.Col span={6}>
                            <Center pb={10} style={{fontSize:14}}><b><u>Proposals</u></b></Center>
                            <ScrollArea h={156}>
                        <Table striped={true} stripedColor="var(--mantine-color-gray-1)" withColumnBorders captionSide="top" >
                                <Table.Tbody>
                                    {mapped_proposals}
                                </Table.Tbody>
                            
                        </Table>
                        </ScrollArea>
                        </Grid.Col>

                        <Grid.Col span={12}>

                        <Center pb={10} style={{fontSize:14}}><u><b>Votes</b></u></Center>
                        <ScrollArea h={260}>
                        <Table striped={true} stripedColor="var(--mantine-color-gray-1)" captionSide="top" withColumnBorders withTableBorder stickyHeader>
                            
                                <Table.Thead>
                                    <Table.Tr>
                                        <Table.Th>Proposal</Table.Th>
                                        <Table.Th>Vote</Table.Th>
                                        <Table.Th>Reason</Table.Th>
                                    </Table.Tr>
                                </Table.Thead>
                                
                                <Table.Tbody>
                                    {mapped_votes}
                                </Table.Tbody>
                        </Table>
                        </ScrollArea>
                        </Grid.Col>

                    </Grid>
                </Tabs.Panel>

                <Tabs.Panel value="manage" h={585}>
                    <Grid miw={500}>

                        <Grid.Col span={6}>
                        <Center pb={10} style={{fontSize:14}}><u><b>Available devices</b></u></Center>
                    <Table striped={true} stripedColor="var(--mantine-color-gray-1)">
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>Device Name</Table.Th>
                                <Table.Th>IP</Table.Th>
                                <Table.Th/>
                            </Table.Tr>
                        </Table.Thead>

                        <Table.Tbody>
                            {manageDevices}
                        </Table.Tbody>
                    </Table>
                    </Grid.Col>

                    <Grid.Col span={6}>
                    <Center pb={10} style={{fontSize:14}}><u><b>Create Proposal</b></u></Center>
                    <Box bg='var(--mantine-color-gray-1)' p={10}>
                    <form className={styles.form} onSubmit={form.onSubmit((values)=>console.log(values))}>
                        <TextInput label="Title" placeholder="Insert a title here." withAsterisk {...form.getInputProps('title')} pb={10}/>
                        <Textarea minRows={3} maxRows={3} autosize label="Description" placeholder="Insert a description here." withAsterisk {...form.getInputProps('description')} pb={10}/>
                        <Select label="Action" placeholder="Pick an action." data={actions} withAsterisk allowDeselect={false} {...form.getInputProps('action')} pb={20}/>
                        <Center><Button type='submit' color='green' w={200}>Create</Button></Center>
                    </form>
                    </Box>
                    
                    </Grid.Col>
                    </Grid>

                </Tabs.Panel>

                
            </Tabs>
        </Modal>
    </>
  );
}



export default DAOModal;