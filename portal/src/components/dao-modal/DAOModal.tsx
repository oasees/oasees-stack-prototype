import { Button, Center, Grid, Modal, Table, Tabs, Image, Flex, Text, CloseButton, ScrollArea, TextInput, Select, Box, Textarea, LoadingOverlay, Stack, Loader, Group, ActionIcon,} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useForm } from "@mantine/form";
import { useEffect, useState } from "react";
import styles from './DAOModal.module.css'
import { ethers } from "ethers";


interface DAOModalProps{
    currentDAO: any,
    availableDevices: any[];
    joinedDevices: any[];
    closeModal(): void;
    updateDevices():void;
    json:any;
}

enum ProposalStatus{
    Pending,
    Active,
    Cancelled,
    Defeated,
    Succeeded,
    Queued,
    Expired,
    Executed
}

const stateToStatus = (state:number) => {
    if(state==0) return ProposalStatus.Pending;
    else if(state==1) return ProposalStatus.Active;
    else if(state==2) return ProposalStatus.Cancelled;
    else if(state==3) return ProposalStatus.Defeated;
    else if(state==4) return ProposalStatus.Succeeded;
    else if(state==5) return ProposalStatus.Queued;
    else if(state==6) return ProposalStatus.Expired;
    else return ProposalStatus.Executed;
}

const supportToVote = (support:number) => {
    if(support==0) return 'Against';
    else return 'For';
}

interface Proposal{
    description: string,
    state: number,
    proposalId: number,
    calldatas: any
}

interface ProposalForm{
    title: string,
    description: string,
    action: string
}

interface Vote{
    proposal: string,
    support: number,
    reason: string,
}


const actions = [ '0', '1', '2', '3'];

const DAOModal = ({currentDAO, availableDevices, joinedDevices, closeModal, updateDevices, json}:DAOModalProps) => {
    
    const [daoContract,setDaoContract] = useState<ethers.Contract>();
    const [tokenContract,setTokenContract] = useState<ethers.Contract>();
    const [boxContract,setBoxContract] = useState<ethers.Contract>();
    const [proposalFilter,setProposalFilter] = useState<ethers.EventFilter>();
    const [voteFilter,setVoteFilter] = useState<ethers.EventFilter>();
    const [userBalance,setUserBalance] = useState(0);

    const [proposals,setProposals] = useState<Proposal[]>([])
    const [votes,setVotes] = useState<Vote[]>([]);

    const [proposalDescriptions,setProposalDescriptions] = useState<{[key:string]:string}>();

    const [loading,setLoading] = useState(false);
    const [opened, {close}] = useDisclosure(true);

    useEffect(()=>{
        const loadContracts = async ()=>{
            try{
                const signer = await json.provider.getSigner();
                
                const dao_contract = new ethers.Contract(
                    currentDAO.governance_address,
                    currentDAO.governance_abi,
                    await signer);

                const dao_token_contract = new ethers.Contract(
                    currentDAO.token_address,
                    currentDAO.token_abi,
                    await signer);

                const dao_box_contract = new ethers.Contract(
                    currentDAO.box_address,
                    currentDAO.box_abi,
                    await signer);

                console.log(await dao_box_contract.retrieve())

                const token_balance = await dao_token_contract.balanceOf(json.account);

                const proposal_filter = dao_contract.filters.ProposalCreated(null);
                const vote_filter = dao_contract.filters.VoteCast(null);

                setDaoContract(dao_contract);
                setTokenContract(dao_token_contract);
                setBoxContract(dao_box_contract);
                setProposalFilter(proposal_filter);
                setVoteFilter(vote_filter);
                setUserBalance(token_balance);
            } catch(error){
                console.error("An error occured while initializing the contracts: ", error);
            }
        }

        loadContracts();
    },[])



    useEffect(()=>{
        const handleProposalEvent = async () =>{
            try {
                const daoMonitor:any = daoContract!.connect(json.callProvider);
                const results:any = await daoMonitor.queryFilter(proposalFilter!);
                const proposals:Proposal[] = [];
                const proposal_descriptions: {[key:string]:string}= {}

                for (const result of results){
                    const args = result.args;
                    const description = args.description;
                    const proposalId = args.proposalId;
                    const calldatas = args.calldatas;

                    const state = await daoMonitor.state(proposalId);

                    proposals.push({description:description,state:state,proposalId:proposalId, calldatas});
                    proposal_descriptions[proposalId] = description;
                    // console.log(await json.callProvider.getBlockNumber());
                }

                setProposals(proposals);
                setProposalDescriptions(proposal_descriptions);
            } catch (error) {
                console.error('Error fetching proposals:', error);
            }
        }
        var intervalId:NodeJS.Timer;
        if(daoContract){
            handleProposalEvent();

            intervalId = setInterval(()=>{
                handleProposalEvent();
            },3000)
        }

        
        return () => clearInterval(intervalId);
    },[daoContract]);

    useEffect(()=> {
        const handleVoteEvent = async () => {
            try {
                const daoMonitor:any = daoContract!.connect(json.callProvider);
                const results:any = await daoMonitor.queryFilter(voteFilter!);
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


    const form = useForm<ProposalForm>({
        initialValues: {
            title: '',
            description:'',
            action: '0',
        },

        validate: {
            title: (value) => ((value)? null: 'Title field cannot be blank.'),
            description: (value) => ((value)? null: 'Description field cannot be blank.'),
        }
    });


    const handleClose = () => {
        if(!loading){
            close();
            closeModal();
        }
    };

    const handleJoining = async (event: React.MouseEvent<HTMLButtonElement>) =>{
        event.preventDefault();
        setLoading(true);
        const button: HTMLButtonElement = event.currentTarget;
        const device_account = availableDevices[Number(button.value)].account;

        try{
            const transaction_count = await json.provider.getTransactionCount(json.account);
            const transfer_tokens_to_device = await tokenContract!.transfer(device_account,20,{nonce:transaction_count});
            const register_device_to_dao = await json.marketplace.registerDeviceToDao(device_account,currentDAO.marketplace_dao_id,{nonce:transaction_count+1});

            await Promise.all([
                transfer_tokens_to_device.wait(),
                register_device_to_dao.wait(),
            ]);

            const new_user_balance = await tokenContract!.balanceOf(json.account);
            setUserBalance(new_user_balance);

            updateDevices();
        } catch(error){
            console.error("Metamask error: ",error);
        }
        setLoading(false);
    };

    const handleVote = async (proposalId:number, support:boolean) => {
        setLoading(true);
        var vote=2;
        if(support)
            vote=1;
        else 
            vote=0;

        try{
            const transaction_count = await json.provider.getTransactionCount(json.account);
            const vote_transaction = await daoContract!.castVoteWithReason(proposalId,vote,"reason",{nonce:transaction_count});
            await vote_transaction.wait();
            
        } catch(error){
            console.error(error);
        }

        setLoading(false);
        
    }

    const handleProposalSubmit = async (values:ProposalForm) => {
        setLoading(true);
        try{
            const transaction_count = await json.provider.getTransactionCount(json.account);
            const function_signature = boxContract?.interface.encodeFunctionData('store',[Number(values.action)]);
            const propose_transaction = await daoContract!.propose([boxContract?.address],[0],[function_signature],values.title + " " + values.description,{nonce:transaction_count});
            await propose_transaction.wait();
        }catch(error){
            console.error(error);
        }
        setLoading(false);
    }

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

    const styledStatus= (proposal:Proposal) => {
        const status = stateToStatus(proposal.state);
        switch(status){
            case ProposalStatus.Defeated:
                return (<Table.Td colSpan={2} style={{color:'red'}}>Defeated</Table.Td>);
            case ProposalStatus.Active:
                return (<>
                    <Table.Td>
                        <Group gap={10} justify="center">
                            <ActionIcon color="green" size="sm" onClick={()=>handleVote(proposal.proposalId,true)}><img src="./images/thumb_up.png" alt="thumb-up" height={17} width={17}/></ActionIcon>
                            <ActionIcon color="red" size="sm" onClick={()=>handleVote(proposal.proposalId,false)}><img src="./images/thumb_down.png" alt="thumb-down" height={17} width={17}/></ActionIcon>
                        </Group>
                    </Table.Td>
                    <Table.Td style={{color:'green'}}>Active</Table.Td>
                </>
                );
            case ProposalStatus.Succeeded:
                return (<>
                    <Table.Td><Button size="xs" bg="green" onClick={()=> execute_proposal(String(proposal.proposalId))}>Execute</Button></Table.Td>
                    <Table.Td colSpan={2} style={{color:'blue'}}>Succeeded</Table.Td>
                    </>
                    );
                
            case ProposalStatus.Expired:
                return (<Table.Td colSpan={2}>Expired</Table.Td>);

            case ProposalStatus.Pending:
                return (<Table.Td colSpan={2}>Pending</Table.Td>);

            case ProposalStatus.Cancelled:
                return (<Table.Td colSpan={2}>Cancelled</Table.Td>);

            case ProposalStatus.Queued:
                return (<Table.Td colSpan={2}>Queued</Table.Td>);

            case ProposalStatus.Executed:
                return (<Table.Td colSpan={2}>Executed</Table.Td>);
        }
    }

    const mapped_proposals = proposals.slice(0).reverse().map((proposal,index)=> (
        <Table.Tr key={index}>
            <Table.Td>{proposal.description}</Table.Td>
            {styledStatus(proposal)}
        </Table.Tr>
    ));

    const execute_proposal = async (proposalId: string) => {
        const proposal_desc = proposalDescriptions![proposalId];
        const descriptionHash = ethers.utils.id(proposal_desc);
        const calldatas = proposals![proposals.length-1].calldatas;
        const transaction_count = await json.provider.getTransactionCount(json.account);
        await daoContract!.queue(
            [boxContract?.address],
            [0],
            calldatas,
            descriptionHash,
            {nonce:transaction_count}
        );

        await daoContract!.execute(
            [boxContract?.address],
            [0],
            calldatas,
            descriptionHash,
            {nonce:transaction_count + 1}
        );
    }

    // const cancel_proposal = async (proposalId: string) => {
    //     const proposal_desc = proposalDescriptions![proposalId];
    //     const descriptionHash = ethers.utils.id(proposal_desc);
    //     const calldatas = proposals![proposals.length-1].calldatas;
    //     const transaction_count = await json.provider.getTransactionCount(json.account);
    //     await daoContract!.cancel(
    //         [boxContract?.address],
    //         [0],
    //         calldatas,
    //         descriptionHash,
    //         {nonce:transaction_count}
    //     );
    // }

    const mapped_votes = votes.slice(0).reverse().map((vote,index)=> (
        <Table.Tr key={index}>
            <Table.Td>{vote.proposal}</Table.Td>
            <Table.Td>{supportToVote(vote.support)}</Table.Td>
            <Table.Td>{vote.reason}</Table.Td>
        </Table.Tr>
    ));
    

  return (
    <>
        <Modal opened={opened} onClose={handleClose} size="80%" withCloseButton={false}>
        <LoadingOverlay visible={loading} zIndex={1000} pos="fixed" overlayProps={{ radius: "lg", blur: 2 }}
        loaderProps={{
            children:<Stack align='center'>
                        <Loader color='blue'/>
                        <Text>Just a moment...</Text>
                        <Text>Your transaction is being processed on the blockchain.</Text>
                    </Stack>
            }}/>

        <Group justify='space-between'>
            <Text td="underline" fw={700}>My balance: {String(userBalance)}</Text>
            <CloseButton onClick={handleClose}/>
          </Group>
            <Center>
                <Image src='./images/dao_icon.png' w={100} h={100}></Image>
                <h4>{currentDAO.dao_name}</h4>
            </Center>
            
            <Tabs defaultValue="overview">
                <Tabs.List hiddenFrom="sm" justify="center">
                    <Tabs.Tab value="overview">
                        Overview
                    </Tabs.Tab>

                    <Tabs.Tab value="manage">
                        Manage
                    </Tabs.Tab>
                </Tabs.List>

                <Tabs.List visibleFrom="sm">
                    <Tabs.Tab value="overview">
                        Overview
                    </Tabs.Tab>

                    <Tabs.Tab value="manage">
                        Manage
                    </Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="overview" h={585}>
                    <Grid gutter='md'>

                        <Grid.Col className={styles.grid_col} span={{base:12, md:6}}>
                        <Center pb={10} style={{fontSize:14}}><u><b>Other participants</b></u></Center>

                        <ScrollArea h={156}>
                        <Table striped={true} stripedColor="var(--mantine-color-gray-1)" withColumnBorders captionSide="top">
                          
                                <Table.Tbody>
                                    {overviewDevices}
                                </Table.Tbody>
                        </Table>
                        </ScrollArea>
                        </Grid.Col>

                        <Grid.Col className={styles.grid_col} span={{base:12, md:6}}>
                            <Center pb={10} style={{fontSize:14}}><b><u>Proposals</u></b></Center>
                            <ScrollArea h={156}>
                        <Table striped={true} stripedColor="var(--mantine-color-gray-1)" withColumnBorders captionSide="top" >
                                <Table.Tbody>
                                    {mapped_proposals}
                                </Table.Tbody>
                            
                        </Table>

                        </ScrollArea>
                        </Grid.Col>

                        <Grid.Col span={12} className={styles.grid_col}>

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
                    <Grid>

                        <Grid.Col span={{base:12,md:6}} className={styles.grid_col}>
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

                    <Grid.Col span={{base:12,md:6}} className={styles.grid_col}>
                    <Center pb={10} style={{fontSize:14}}><u><b>Create Proposal</b></u></Center>
                    <Box bg='var(--mantine-color-gray-1)' p={10}>
                    <form className={styles.form} onSubmit={form.onSubmit((values)=>handleProposalSubmit(values))}>

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