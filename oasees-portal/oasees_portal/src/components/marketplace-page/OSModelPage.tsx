import { Card, Center, Image, Button, Stack, LoadingOverlay, Loader, Text, Flex, Grid, Container, Group, Pill, Modal, UnstyledButton } from "@mantine/core";
import { useState } from "react";
import axios from "axios";
import Markdown from "react-markdown";
import remarkGfm from 'remark-gfm'
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import styles from './ItemPage.module.css'
import './ItemPage.css'
import { ethers } from "ethers";
import 'katex/dist/katex.min.css';
import { NftItem } from "src/types/interfaces";


interface OSModelPageProps {
    json: any;
    changePage: (n: number) => void;
    currentOSModel: any;
}


const ipfs_get = async (ipfs_hash: string) => {
    const response = await axios.post(`http://${process.env.REACT_APP_EXPOSED_IP}:5001}/api/v0/cat?arg=` + ipfs_hash);
    return response;
}

const ipfs_download = async (ipfs_hash: string) => {
    const response = await axios.get(`http://${process.env.REACT_APP_EXPOSED_IP}:5001?.split(":")[0]}:8080/ipfs/` + ipfs_hash, {
        responseType: 'blob', // Important for downloading files
    });

    return response;
}


const OSModelPage = ({ json, changePage, currentOSModel }: OSModelPageProps) => {

    const [loading, setLoading] = useState(false);
    const [showPurchaseComplete, setShowPurchaseComplete] = useState(false);
    const [showPurchaseFailed, setShowPurchaseFailed] = useState(false);


    const purchase_osModel = async (marketplace_id: string, price: string) => {

        setLoading(true);
        try {
            const asset_type = currentOSModel.tags?.[0];
            const transaction_count = await json.provider.getTransactionCount(json.account);
            const buyOSModel_transaction = await json.marketplace.buyNft(json.nft.address, marketplace_id, { value: ethers.utils.parseEther(price), nonce: transaction_count });
            await buyOSModel_transaction.wait();
            const content_cid = await json.nft.tokenURI(currentOSModel.id)
            const data = {
                cid: content_cid,
                asset_name: currentOSModel.title

            }
            // if(asset_type == 'DT'){        
            //     const response = await axios.post(`http://${master_ip}:31007/set_data_marketplace`, data, {
            //         headers: {
            //             'Content-Type': 'application/json'
            //         }
            //     });
            // }else{

            //     const response = await axios.post(`http://${master_ip}:31007/set_project_marketplace`, data, {
            //         headers: {
            //             'Content-Type': 'application/json'
            //         }
            //     });        

            // }



            setShowPurchaseComplete(true);
        } catch (error) {
            console.error("Metamask error", error);
            setShowPurchaseFailed(true);
        }
        setLoading(false);
    }

    const osModel_tags = currentOSModel.tags?.map((tag, index) => (
        <Pill bg="lightblue" key={index}>{tag}</Pill>
    ))

    const truncate_middle = (str: string) => {
        if (str.length > 35) {
            return str.substring(0, 6) + '...' + str.substring(str.length - 4, str.length);
        }
        return str;
    }
    console.log(currentOSModel.desc)

    const downloadAsset = async () => {
        try {
            const asset_content_hash = await json.nft.tokenURI(currentOSModel.id);
            console.log(asset_content_hash);

            const response = await ipfs_download(asset_content_hash);

            const url = window.URL.createObjectURL(new Blob([response.data]));

            const link = document.createElement('a');
            link.href = url;

            link.setAttribute('download', currentOSModel.title);
            document.body.appendChild(link);
            link.click();

            // Cleanup: Remove the link after downloading
            link.parentNode?.removeChild(link);
            window.URL.revokeObjectURL(url);

        } catch (error) {
            console.error(error);
        }
    }

    console.log(currentOSModel)

    return (
        <>
            <LoadingOverlay visible={loading} zIndex={1000} overlayProps={{ radius: "lg", blur: 7 }} pos="fixed" loaderProps={{
                children: <Stack align='center'>
                    <Loader color='blue' />
                    <h3>Just a moment...</h3>
                    <Text>Your transaction is being processed on the blockchain.</Text>
                </Stack>
            }} />

            <Modal
                opened={showPurchaseComplete}

                centered={true}
                size="sm"
            >
                <Stack align="center" gap="xl" my={30}>
                    <Image src="./images/checkmark.png" h={64} w={64}></Image>
                    <Text fw={500} ta="center" mt={10}>Your purchase was completed successfully.</Text>
                </Stack>
            </Modal>

            <Modal
                opened={showPurchaseFailed}
                onClose={() => { setShowPurchaseFailed(false); }}
                centered={true}
                size="sm"
            >
                <Stack align="center" gap="xl" my={30}>
                    <Image src="./images/cross.png" h={64} w={64}></Image>
                    <Text fw={500} ta="center" mt={10}>An error occured during your purchase.</Text>
                </Stack>
            </Modal>


            <Container maw="95%" w="95%">
                <Flex justify="start" mt={30}>
                    <UnstyledButton onClick={() => changePage(0)}><Text c="#0000FF"><u>⬅ Back to the Marketplace</u></Text></UnstyledButton>

                </Flex>


                <h2>{currentOSModel.title}</h2>
                <Group gap="xs">
                    <Image src="./images/opensearch_logo.png" w={16} h={16} />
                    <Text fz={14}>OpenSearch Database</Text>
                </Group>

                <Grid gutter="xs" mt={20}>
                    <Grid.Col ta="left" span={8}>
                        <Container className={`${styles.container}`} pt={20}>
                            {JSON.stringify(currentOSModel.info)}
                        </Container>
                    </Grid.Col>

                    {/* <Grid.Col span={4}>
                        <Container className={styles.container}>
                            <Card padding='lg' ta="left">
                                <Center><u><h3>Marketplace Info</h3></u></Center>
                                <Stack gap="lg" my={20}>
                                    <Group><Text fw={600}>Seller:</Text><Text>{truncate_middle(currentOSModel.seller!)}</Text></Group>
                                    <Group><Text fw={600}>Price:</Text><Text>{currentOSModel.price} eth</Text></Group>
                                    <Group gap="xs"><Text fw={600}>Tags:</Text>{osModel_tags}</Group>
                                </Stack>
                                {isPurchased ?
                                    <Center mt={20}><Button color="green" onClick={downloadAsset}>DOWNLOAD</Button></Center>
                                    :
                                    <Center mt={20}><Button color="orange" onClick={() => purchase_osModel(currentOSModel.marketplace_id, (currentOSModel.price as string))}>PURCHASE</Button></Center>
                                }
                            </Card>
                        </Container>
                    </Grid.Col> */}
                </Grid>
            </Container>
        </>
    );
}

export default OSModelPage;
