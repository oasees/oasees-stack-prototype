import { Button, Center, Grid, Modal, Table, Tabs, Image, Flex, CloseButton, ScrollArea, TextInput, useCombobox, Combobox, Select, Box, Textarea,} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useForm } from "@mantine/form";
import { useEffect, useState } from "react";
import styles from './DAOModal.module.css'


interface DAOModalProps{
    currentDAO: string;
    availableDevices: string[][];
    joinedDevices: string[][];
    addDeviceToDao(v:number):void;
    closeModal(): void;
}

enum ProposalStatus{
    Active,
    Defeated,
    Pending,
    Succeeded
}

const testProposals = [
    ['First Proposal', ProposalStatus.Defeated],
    ['Second Proposal', ProposalStatus.Succeeded],
    ['Best Proposal', ProposalStatus.Active],
    ['New Proposal', ProposalStatus.Pending]
]

const testVotes = [
    ['Me', 'Proposal 1', 'For', 'because'],
    ['Drone1', 'Proposal 2', 'Against', 'tttttfdgfdgfdggdfgt'],
    ['Drone2', 'Best Proposal', 'For', 'good'],
    ['g', 'prpsofpa', 'For','hhfdhfh'],
    ['shdfdh','dfhdfhdfh','dfhhfd','fdhdfhdjg']
]

const actions = ['First Action', 'Second Action', 'Third Action', 'Fourth Action'];



const DAOModal = ({currentDAO, availableDevices, joinedDevices, addDeviceToDao, closeModal}:DAOModalProps) => {
    
    const [opened, {close}] = useDisclosure(true);
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

    const combobox = useCombobox ({
        onDropdownClose: () => combobox.resetSelectedOption(),
    });

    const [comboboxValue,setComboboxValue] = useState<string|null>(null);

    const options = actions.map((item)=>(
        <Combobox.Option value={item} key={item}>
            {item}
        </Combobox.Option> 
    ));

    const handleClose = () => {
        close();
        closeModal();
    };

    const handleJoining = (event: React.MouseEvent<HTMLButtonElement>) =>{
        event.preventDefault();
        const button: HTMLButtonElement = event.currentTarget;

        addDeviceToDao(Number(button.value)-1);
    };

    const manageDevices = availableDevices.map((device,index) => (
        <Table.Tr key={index}>
            <Table.Td>{device[1]}</Table.Td>
            <Table.Td>{device[2]}</Table.Td>
            <Table.Td><Button color='orange' onClick={handleJoining} value={device[0]}>Join</Button></Table.Td>
        </Table.Tr>
    ));

    const overviewDevices = joinedDevices.map((device,index) => (
        <Table.Tr key={index}>
            <Table.Td>{device[1]}</Table.Td>
            <Table.Td>{device[2]}</Table.Td>
        </Table.Tr>
    ));

    const styledStatus= (status:string|ProposalStatus) => {
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

    const proposals = testProposals.map((proposal,index)=> (
        <Table.Tr key={index}>
            <Table.Td>{proposal[0]}</Table.Td>
            {styledStatus(proposal[1])}
        </Table.Tr>
    ));

    const votes = testVotes.map((vote,index)=> (
        <Table.Tr key={index}>
            <Table.Td>{vote[0]}</Table.Td>
            <Table.Td>{vote[1]}</Table.Td>
            <Table.Td>{vote[2]}</Table.Td>
            <Table.Td>{vote[3]}</Table.Td>
        </Table.Tr>
    ));



  return (
    <>
        <Modal opened={opened} onClose={handleClose} size="80%" withCloseButton={false}>
        <Flex justify='flex-end'>
            <CloseButton onClick={handleClose}/>
          </Flex>
            <Center>
                <Image src='./images/dao_icon.png' w={100} h={100}></Image>
                <h4>{currentDAO}</h4>
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


                <Tabs.Panel value="overview">
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
                                    {proposals}
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
                                        <Table.Th>Voter</Table.Th>
                                        <Table.Th>Proposal Description</Table.Th>
                                        <Table.Th>Vote</Table.Th>
                                        <Table.Th>Reason</Table.Th>
                                    </Table.Tr>
                                </Table.Thead>
                                
                                <Table.Tbody>
                                    {votes}
                                </Table.Tbody>
                        </Table>
                        </ScrollArea>
                        </Grid.Col>

                    </Grid>
                </Tabs.Panel>

                <Tabs.Panel value="manage">
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