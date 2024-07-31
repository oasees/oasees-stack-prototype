import { Button, Center, CloseButton, Flex, Paper, Stack, Table } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import axios from "axios";
import { useEffect, useState } from "react";
import "./DApp.css"

interface DAppHTML{
    dapp_endpoint: string;
    closeFunction(): void;
    device_endpoint: string;
}


const DApp = ({dapp_endpoint, closeFunction,device_endpoint}:DAppHTML) => {

    const [wavFiles, setWavFiles] = useState<string[]>([])
    const [fileToPlay, setFileToPlay] = useState(-1);

    const [loadingPlay, setLoadingPlay] = useState(false);
    const [loadingRecord, setLoadingRecord] = useState(false);
    const [refresh,{toggle}] = useDisclosure();

    // const handleButtonClick = () => {
    //     // Add your custom logic here
    //     const button = document.getElementById('play');
    
    //     if (button) {
    //       button.addEventListener('click', async () => {
    //         console.log(fileToPlay);
    //         console.log(wavFiles[fileToPlay])
    //         await axios.post(`${device_endpoint}/play`,wavFiles[fileToPlay]);
    //       });
    //     }
    //   };

    // const handleButtonClick = async () => {
    //     console.log(wavFiles[fileToPlay]);
    //     await axios.post(`${device_endpoint}/play`,{audio_file:wavFiles[fileToPlay]});
    // }

    const playFile = async (event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        const button:HTMLButtonElement = event.currentTarget;

        setLoadingPlay(true);
        try{
            await axios.post(`${device_endpoint}/play`,{audio_file:wavFiles[Number(button.value)]});
        } catch (error){
            console.error(error);
        }
        setLoadingPlay(false);
    }

    const recordFile = async (event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        const button:HTMLButtonElement = event.currentTarget;

        setLoadingRecord(true);
        try{
            await axios.get(`${device_endpoint}/record`);
        } catch (error) {
            console.error(error);
        }
        toggle();
        setLoadingRecord(false);
    }

    useEffect(()=>{
        const getAudioFiles = async() => {
            if(device_endpoint){
                try{
                    const audio_files:any = await axios.get(`${device_endpoint}/list_wav_files`);
                    setWavFiles(audio_files.data.wav_files);
                }catch (error){
                    console.error(error);
                }
            }
        }

        getAudioFiles();
        // handleButtonClick();
    },[refresh]);

    const mapped_files = () => {
        if(wavFiles){
            return (
                wavFiles.map((file,index) => (
                <Table.Tr key={index}>
                    <Table.Td>{file}</Table.Td>
                    <Table.Td><Button color='green' onClick={playFile} value={index} loading={loadingPlay}>Play</Button></Table.Td>
                </Table.Tr>
            )));
        }
    };


    return (
        <>
        <Paper withBorder>
        <Stack>
        <Flex justify="end">
            <CloseButton onClick={closeFunction}/>
        </Flex>

        {/* <Center>
            <h3>Sample DApp</h3>
        </Center>

        <Center>
        <Flex justify="center">
            <Table striped={true} stripedColor="var(--mantine-color-gray-1)" withRowBorders withTableBorder>
                <Table.Thead>
                    <Table.Tr>
                        <Table.Th>Audio file</Table.Th>
                    </Table.Tr>
                </Table.Thead>

                <Table.Tbody>
                    {mapped_files()}
                </Table.Tbody>
            </Table>
        </Flex>
        </Center>

        <Flex justify='center' pb={10}>
            {device_endpoint && <Button color="red" onClick={recordFile} loading={loadingRecord}>Record</Button>}
        </Flex> */}
        {/* <div dangerouslySetInnerHTML={{ __html: html_page }} /> */}
            <iframe id="iframe" title="Application" className="dapp" src={dapp_endpoint}></iframe>
        </Stack>


        
        </Paper>
        </>
    );
}


export default DApp;