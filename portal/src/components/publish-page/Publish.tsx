import {TextInput, Center, Button, NumberInput, Paper, Textarea, Flex, CloseButton,Text, PartialVarsResolver, Group, Image, Stack, Tabs, LoadingOverlay, Loader, Tooltip, TagsInput, Modal } from "@mantine/core";
import { useForm } from "@mantine/form";
import './Publish.css'
import {Dropzone, DropzoneFactory} from "@mantine/dropzone";
import axios from "axios";
import { ethers } from "ethers";
import { useState } from "react";
import { AssetBuilder, FileTypes, Nautilus, ServiceBuilder, ServiceTypes, UrlFile } from "@deltadao/nautilus";

interface OaseesFormValues {
    title:string,
    description:string,
    price:number,
    tags:string[],
    file: File[]
}

interface OceanFormValues {
    url: string,
    title:string,
    author: string,
    description: string,
    price: number,
}

interface PublishProps {
    json:any;
}

const varsResolver: PartialVarsResolver<DropzoneFactory> = (theme,props) =>{
    return {
        root: {'--dropzone-accept-bg': 'var(--mantine-color-green-1'},
    };
}

const Publish = ({json}:PublishProps) => {
    const [loading,setLoading] = useState(false);
    const [showOaseesPublishComplete, setShowOaseesPublishComplete] = useState(false);
    const [showOceanPublishComplete, setShowOceanPublishComplete] = useState(false);
    const [nautilus, setNautilus] = useState<Nautilus>();


    const oasees_form = useForm<OaseesFormValues>({
        initialValues: {
            title: '',
            description:'',
            price: 0,
            tags:[],
            file: [],
        },

        validate: {
            title: (value) => ((value)? null: 'Title field cannot be blank.'),
            description: (value) => ((value)? null: 'Description field cannot be blank.'),
            price: (value) => ((value>=1e-6)? null: 'Item price cannot be lower than 0.000001 ETH .'),
            file: (value) => ((value[0])? null: 'No file chosen.')
        }
    });

    const ocean_form = useForm<OceanFormValues>({
        initialValues: {
            url: '',
            title: '',
            author: '',
            description:'',
            price: 0,
        },

        validate: {
            url: (value) => ((value.includes("http://") || value.includes("https://")) ? null: "Enter a valid URL."),
            title: (value) => ((value)? null: "The dataset's title cannot be blank."),
            author: (value) => ((value)? null: "Author field cannot be blank."),
            description: (value) => ((value)? null: 'Description field cannot be blank.'),
            price: (value) => ((value>=1e-2 || value==0)? null: 'Item price cannot be lower than 0.01 OCEAN.'),
        }
    });

    const selectedFile = () => {
        const file = oasees_form.values.file[0];
        if(file){
            return(
            <Text key={file.name} pt={5}>
                <u>File chosen:</u> <b>{file.name}</b> ({(file.size / 1024).toFixed(2)} kb)
                <CloseButton
                    size="xs"
                    onClick={() =>
                    oasees_form.setFieldValue('file', [])
                    }
                />
            </Text>
            );
        }else{
            return(
                <Flex className="m-8f816625 mantine-InputWrapper-error" justify="center" mt={5}><Text>{oasees_form.errors.file}</Text></Flex>
            );
        }
    }


    const handleAlgorithmSubmit = async (values:OaseesFormValues) => {
        setLoading(true);
        try {
            const price = values.price;
            const title = values.title;
            const description = values.description
            const tags = values.tags;

            var ifs_data = new FormData();
            
            ifs_data.append("asset", values.file[0]);
            ifs_data.append("meta",JSON.stringify({price,title,description,tags}));
            

            const nft_hashes = await axios.post(`http://${process.env.REACT_APP_INFRA_HOST}/ipfs_upload`, ifs_data, {
                headers: {
                'Content-Type': 'multipart/form-data'
                }
            })

            await mintThenListAlgorithm(nft_hashes.data.file_hash,nft_hashes.data.meta_hash)
            oasees_form.reset()
            setShowOaseesPublishComplete(true);


        } catch (error) {
            console.error("Submit error: ", error)
        }

        setLoading(false);
    }




    const handleDeviceSubmit = async (values:OceanFormValues) => {
        setLoading(true);
        try {
            const title = values.title;
            const price = values.price;
            const description = values.description;

            var ifs_data = new FormData();
            


        } catch (error) {
            console.error("Submit error: ", error)
        }

        setLoading(false);
    }



    const mintThenListAlgorithm = async (file_hash:string,meta_hash:string) => {

        try{
            const transaction_count = await json.provider.getTransactionCount(json.account);

            const mint_transaction = await json.nft.mint(file_hash, {nonce:transaction_count});
            const mint_receipt = await mint_transaction.wait();

            const id = parseInt(mint_receipt.logs[2].data, 16);
            const _price = ethers.utils.parseEther(oasees_form.values.price.toString())

            const market_fee = await json.marketplace.LISTING_FEE();

            const makeItem_transaction = await json.marketplace.makeItem(json.nft.address, id, _price, meta_hash, {value:market_fee, nonce:transaction_count + 1});
            await makeItem_transaction.wait();



        }catch(error){
            console.error("Metamask error",error)
        }
    }
    




    const switchToSepolia = async () => {
        const chainId = 11155111 // Sepolia Testnet

        if (window.ethereum.net_version !== chainId) {
            try {
                await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: '0xaa36a7' }]
                });
            } catch (err: any) {
                console.log("Could not switch to Sepolia Network.")
            }
            }
    }

    const switchToOasees = async () => {
        const chainId = 31337 // Hardhat Net

        if (window.ethereum.net_version !== chainId) {
            await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x7a69' }]
            });
        }

    }

    const getEth = async () => {
        const signer = json.provider.getSigner();
        const transaction_count = await json.provider.getTransactionCount(json.account);
        await signer.sendTransaction({
            to: "0x516fed8BA832036eC95D5086e340f9ee2685e65F",
            value: ethers.utils.parseEther("1.0"), // Sends exactly 1.0 ether
            nonce:transaction_count
          });
    }

    const publish = async (values:OceanFormValues) => {
        setLoading(true);
        await switchToSepolia();
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });

        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = await provider.getSigner();
        const nautilus = await Nautilus.create(signer);
        setNautilus(nautilus);

        try{

        const assetBuilder = new AssetBuilder();

        assetBuilder
            .setType('dataset') // 'dataset' or 'algorithm'
            .setName(values.title)
            .setDescription(values.description) // supports markdown
            .setAuthor(values.author)
            .setLicense('MIT')

            const serviceBuilder = new ServiceBuilder({serviceType: ServiceTypes.ACCESS, fileType: FileTypes.URL});

            const urlFile: UrlFile = {
            type: 'url', // there are multiple supported types. See the docs above for more info
            url: values.url,
            method: 'GET'
            }

            serviceBuilder
            .setServiceEndpoint('https://v4.provider.oceanprotocol.com')
            .setTimeout(0)
            .addFile(urlFile);

            if(values.price==0){
            serviceBuilder.setPricing({type:'free'});
            } else {
            serviceBuilder.setPricing(
                {
                type: 'fixed', // 'fixed' or 'free'
                // freCreationParams can be ommitted for 'free' pricing schemas
                freCreationParams: {
                fixedRateAddress: '0x80E63f73cAc60c1662f27D2DFd2EA834acddBaa8', // Fixed Rate Contract address on Sepolia network
                baseTokenAddress: '0x1B083D8584dd3e6Ff37d04a6e7e82b5F622f3985', // OCEAN token contract address on Sepolia network
                baseTokenDecimals: 18, // adjusted to OCEAN token
                datatokenDecimals: 18,
                fixedRate: (values.price.toString()), // PRICE
                marketFee: '0',
                marketFeeCollector: '0x0000000000000000000000000000000000000000'
                }
            }
            )
        }
            

            const service = serviceBuilder.build();
            assetBuilder.addService(service);
            assetBuilder.setOwner(json.account);
            const asset = assetBuilder.build()
            const result = await nautilus!.publish(asset);
            console.log(result);
        } catch (error){
            console.error(error);
            setLoading(false);
        }

        switchToOasees();
        setLoading(false);
    }


    return (
        <>
        <LoadingOverlay visible={loading} zIndex={1000} overlayProps={{ radius: "lg", blur: 7 }} pos="fixed" loaderProps={{
        children:<Stack align='center'>
                  <Loader color='blue'/>
                  <h3>Just a moment...</h3>
                  <Text>Your transaction is being processed on the blockchain.</Text>
              </Stack>
          }}/>

        <Modal 
        opened={showOaseesPublishComplete}
        onClose={()=>{setShowOaseesPublishComplete(false);}}
        centered={true}
        size="sm"
        >
            <Stack align="center" gap="xl" my={30}>
                <Image src="./images/checkmark.png" h={64} w={64}></Image>
                <Text fw={500} ta="center" mt={10}>The algorithm was published successfully.</Text>
            </Stack>
        </Modal>

        <Modal 
        opened={showOceanPublishComplete}
        onClose={()=>{setShowOceanPublishComplete(false);}}
        centered={true}
        size="sm"
        >
            <Stack align="center" gap="xl" my={30}>
                <Image src="./images/checkmark.png" h={64} w={64}></Image>
                <Text fw={500} ta="center" mt={10}>The algorithm was published successfully.</Text>
            </Stack>
        </Modal>
        
        <Tabs defaultValue="oasees" pt={30}>
            <Tabs.List grow>
                <Tabs.Tab value="oasees" className="publish_tab">
                    Publish on OASEES Marketplace
                </Tabs.Tab>

                <Tabs.Tab value="ocean" className="publish_tab">
                    Publish on Ocean Market
                </Tabs.Tab>
            </Tabs.List>

        <Tabs.Panel value="oasees" pt={20}>
        <Center>
            <Stack align='center' pt={30} gap={50} w={1000}>
        <Paper bg='var(--mantine-color-gray-1)' p={10} shadow='xl' radius='lg' w="100%">
            <form onSubmit={oasees_form.onSubmit((values)=>handleAlgorithmSubmit(values))}>

                <TextInput className="form_field" size="md" label="Algorithm Title" withAsterisk {...oasees_form.getInputProps('title')}/>

                <TagsInput className="form_field" size="md" label={
                    <Group gap={5} >
                        <Text fw="500">Tags</Text>
                        <Tooltip label="Type in a tag and press Enter to confirm it." position="right-end">
                            <Text fw="500" fz={12}>ⓘ</Text>
                        </Tooltip>
                    </Group>
                    } {...oasees_form.getInputProps('tags')}/>
                
                <Textarea className="form_field" size="md" minRows={3} maxRows={3} autosize label={
                    <Group gap={5} >
                        <Text fw="500">Description</Text>
                        <Text c="red">*</Text>
                        <Tooltip label="You can use Markdown." position="right-end">
                            <Text fw="500" fz={12}>ⓘ</Text>
                        </Tooltip>
                    </Group>
                    }  {...oasees_form.getInputProps('description')}/>

                <NumberInput className="form_field" size="md" label="Price (eth)" placeholder="Insert a price." withAsterisk hideControls {...oasees_form.getInputProps('price')} allowNegative={false}/>

                <Dropzone
                    vars = {varsResolver}
                    h={120}
                    p={0}
                    multiple={false}
                    onDrop={(file) => {
                        oasees_form.setFieldValue('file', file)}}
                    onReject={() => oasees_form.setFieldError('file', 'Please choose a valid file.')}
                >
                    <Center h={120}>
                    <Dropzone.Idle>
                        <Group>
                            <Image src='./images/upload_image.png' mah={80} w="auto"/>
                            Drop file here <br/>or<br/>Click to browse
                        </Group>
                    </Dropzone.Idle>
                    <Dropzone.Accept>Drop file here</Dropzone.Accept>
                    <Dropzone.Reject>Files are invalid</Dropzone.Reject>
                    </Center>
                </Dropzone>

                {selectedFile()}

                <Center pt={30}><Button type='submit' color='green' w={260}>Upload to OASEES Marketplace</Button></Center>

            </form>
        </Paper>

        
        </Stack>
        </Center>
        </Tabs.Panel>


        <Tabs.Panel value="ocean" pt={20}>
            <Center>
                <Stack align='center' pt={30} gap={50} w={1000}>
                    <Paper bg='var(--mantine-color-gray-1)' p={10} shadow='xl' radius='lg' w="100%">

                        <form onSubmit={ocean_form.onSubmit((values)=>publish(values))}>
                            <TextInput size="md" label="URL" withAsterisk {...ocean_form.getInputProps('url')} pb={10}/>

                            <TextInput size="md" label="Dataset Title" withAsterisk {...ocean_form.getInputProps('title')} pb={10}/>

                            <TextInput size="md" label="Dataset Author" withAsterisk {...ocean_form.getInputProps('author')} pb={10}/>

                            <Textarea className="form_field" size="md" minRows={3} maxRows={3} autosize label={
                            <Group gap={5} >
                                <Text fw="500">Description</Text>
                                <Text c="red">*</Text>
                                <Tooltip label="You can use Markdown." position="right-end">
                                    <Text fw="500" fz={12}>ⓘ</Text>
                                </Tooltip>
                            </Group>
                            }  {...ocean_form.getInputProps('description')}/>

                            <NumberInput size="md" label="Price (OCEAN)" placeholder="Insert a price." withAsterisk hideControls {...ocean_form.getInputProps('price')} pb={30} allowNegative={false}/>

                            <Center pt={30}><Button type='submit' color='green' w={260}>Upload to Ocean Market</Button></Center>
                            
                        </form>
                    </Paper>
                    <Button variant="gradient" gradient={{from: 'black', to: 'deeppink', deg: 30}} component="a" href="https://market.oceanprotocol.com/" rightSection={<Image src="./images/external-link-white.png" w={12} h={12} alt="External Link icon"/>}>
                            <Text c="white" fw={500}>Visit the Ocean Market</Text>
                    </Button>
                </Stack>
            </Center>
        </Tabs.Panel>


        </Tabs>
        </>
    );
}


export default Publish;