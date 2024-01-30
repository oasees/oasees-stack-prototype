import { Button, Center, CloseButton, Flex, Table } from "@mantine/core";
import axios from "axios";
import { useEffect, useState } from "react";

interface DAppHTML{
    html_page: string;
    closeFunction(): void;
    device_endpoint: string;
}


const DApp = ({html_page, closeFunction,device_endpoint}:DAppHTML) => {

    const [wavFiles, setWavFiles] = useState<string[]>([])
    const [fileToPlay, setFileToPlay] = useState(-1);

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

        await axios.post(`${device_endpoint}/play`,{audio_file:wavFiles[Number(button.value)]});
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
    },[]);

    const mapped_files = () => {
        if(wavFiles){
            return (
                wavFiles.map((file,index) => (
                <Table.Tr key={index}>
                    <Table.Td>{file}</Table.Td>
                    <Table.Td><Button color='green' onClick={playFile} value={index}>Play</Button></Table.Td>
                </Table.Tr>
            )));
        }
    };

    return (
        <>
        <Flex justify="end">
            <CloseButton onClick={closeFunction}/>
        </Flex>

        <Center>
            <h3>Sample DApp</h3>
        </Center>
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
        <Flex justify='center'>
            {device_endpoint && <Button color="red">Record</Button>}
        </Flex>
        {/* <div dangerouslySetInnerHTML={{ __html: html_page }} /> */}
        </>
    );
}


export default DApp;