import {TextInput, Center, Button, NumberInput, Paper, Textarea, Flex, CloseButton,Text, PartialVarsResolver, Group, Image, Stack, Tabs, Checkbox } from "@mantine/core";
import { useForm } from "@mantine/form";
import './Publish.css'
import {Dropzone, DropzoneFactory} from "@mantine/dropzone";
import axios from "axios";
import { ethers, isAddress } from "ethers";

interface AlgorithmFormValues {
    title:string,
    description:string,
    price:number,
    file: File[]
}

interface DeviceFormValues {
    account: string,
    name:string,
    ip_address:string,
    port:number,
    description: string,
    price: number,
    listed: boolean
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

    const algorithm_form = useForm<AlgorithmFormValues>({
        initialValues: {
            title: '',
            description:'',
            price: 0,
            file: [],
        },

        validate: {
            title: (value) => ((value)? null: 'Title field cannot be blank.'),
            description: (value) => ((value)? null: 'Description field cannot be blank.'),
            price: (value) => ((value)? null: 'Item price cannot be 0.'),
            file: (value) => ((value[0])? null: 'No file chosen.')
        }
    });

    const device_form = useForm<DeviceFormValues>({
        initialValues: {
            account: '',
            name: '',
            ip_address: '',
            port:0,
            description:'',
            price: 0,
            listed: false
        },

        validate: {
            account: (value) => (isAddress(value)? null: "Insert a vaild blockchain account."),
            name: (value) => ((value)? null: "The device's name cannot be blank."),
            ip_address: (value) => (/^([0-9]{1,3}\.){3}[0-9]{1,3}$/.test(value)? null: "Insert a valid IP address."),
            port:(value)=> ((value>1023 && value<65536) ? null : "Insert a valid port number (1024-65535)."),
            description: (value) => ((value)? null: 'Description field cannot be blank.'),
            price: (value, values) => ((values.listed)? ((value)? null: 'Item price cannot be 0.'): null),
        }
    });

    const selectedFile = () => {
        const file = algorithm_form.values.file[0];
        if(file){
            return(
            <Text key={file.name} pt={5}>
                <u>File chosen:</u> <b>{file.name}</b> ({(file.size / 1024).toFixed(2)} kb)
                <CloseButton
                    size="xs"
                    onClick={() =>
                    algorithm_form.setFieldValue('file', [])
                    }
                />
            </Text>
            );
        }else{
            return(
                <Flex className="m-8f816625 mantine-InputWrapper-error" justify="center" mt={5}><Text>{algorithm_form.errors.file}</Text></Flex>
            );
        }
    }

    const handleAlgorithmSubmit = async (values:AlgorithmFormValues) => {
        try {
            const price = values.price;
            const title = values.title;
            const description = values.description

            var ifs_data = new FormData();
          
            ifs_data.append("asset", values.file[0]);
            ifs_data.append("meta",JSON.stringify({price,title,description}));
          
            

  
            const nft_hashes = await axios.post(`http://${process.env.REACT_APP_INFRA_HOST}/ipfs_upload`, ifs_data, {
              headers: {
                'Content-Type': 'multipart/form-data'
              }
            })

            mintThenListAlgorithm(nft_hashes.data.file_hash,nft_hashes.data.meta_hash)




          } catch (error) {
            console.log("Submit error: ", error)
          }
    }

    const handleDeviceSubmit = async (values:DeviceFormValues) => {
        try {
            const account = values.account;
            const price = values.price;
            const name = values.name;
            const device_endpoint= "http://" + values.ip_address + ":" + values.port;
            const description = values.description;
            const listed = values.listed;

            var ifs_data = new FormData();
          
            ifs_data.append("content", JSON.stringify({account,name,device_endpoint}));
            ifs_data.append("meta",JSON.stringify({price,name,description}));
            

  
            const nft_hashes = await axios.post(`http://${process.env.REACT_APP_INFRA_HOST}/ipfs_upload_device`, ifs_data, {
              headers: {
                'Content-Type': 'multipart/form-data'
              }
            })

            // console.log(nft_hashes.data.file_hash,nft_hashes.data.meta_hash);


            mintThenListDevice(nft_hashes.data.content_hash,nft_hashes.data.meta_hash,listed)




          } catch (error) {
            console.log("Submit error: ", error)
          }
    }

    const mintThenListAlgorithm = async (file_hash:string,meta_hash:string) => {

        try{
            const transaction_count = await json.provider.getTransactionCount(json.account);

            const mint_transaction = await json.nft.mint(file_hash, {nonce:transaction_count});
            const mint_receipt = await mint_transaction.wait();

            const id = parseInt(mint_receipt.logs[2].data, 16);
            const _price = ethers.parseEther(algorithm_form.values.price.toString())

            console.log(_price);
            const market_fee = await json.marketplace.LISTING_FEE();

            const makeItem_transaction = await json.marketplace.makeItem(json.nft.target, id, _price, meta_hash, {value:market_fee, nonce:transaction_count + 1});
            await makeItem_transaction.wait();



        }catch(error){
            console.log("Metamask error",error)
        }
    }

    const mintThenListDevice = async (content_hash:string, meta_hash:string, listed:boolean) => {
        
        try{
            const transaction_count = await json.provider.getTransactionCount(json.account);

            const mint_transaction = await json.nft.mint(content_hash, {nonce:transaction_count});
            const mint_receipt = await mint_transaction.wait();

            const id = parseInt(mint_receipt.logs[2].data, 16);
            const _price = ethers.parseEther(algorithm_form.values.price.toString())

            console.log(_price);
            const market_fee = await json.marketplace.LISTING_FEE();

            const makeItem_transaction = await json.marketplace.makeDevice(json.nft.target, id, _price, meta_hash, listed, {value:market_fee, nonce:transaction_count + 1});
            await makeItem_transaction.wait();



        }catch(error){
            console.log("Metamask error",error)
        }

    }



    return (
        <Tabs defaultValue="algorithms" pt={30}>
            <Tabs.List grow>
                <Tabs.Tab value="algorithms">
                    Publish an Algorithm
                </Tabs.Tab>

                <Tabs.Tab value="devices">
                    Upload a Device
                </Tabs.Tab>
            </Tabs.List>

        <Tabs.Panel value="algorithms" pt={20}>
        <Center>
            <Stack align='center' pt={30} gap={50} w={1000}>
        <Paper bg='var(--mantine-color-gray-1)' p={10} shadow='xl' radius='lg' w="100%">
            <form onSubmit={algorithm_form.onSubmit((values)=>handleAlgorithmSubmit(values))}>

                <TextInput size="md" label="Algorithm Title" withAsterisk {...algorithm_form.getInputProps('title')} pb={10}/>

                <Textarea size="md" minRows={3} maxRows={3} autosize label="Description" withAsterisk {...algorithm_form.getInputProps('description')} pb={10}/>

                <NumberInput size="md" label="Price (eth)" placeholder="Insert a price." withAsterisk hideControls {...algorithm_form.getInputProps('price')} pb={20} allowNegative={false}/>

                <Dropzone
                    vars = {varsResolver}
                    h={120}
                    p={0}
                    multiple={false}
                    accept={{'text/x-python':['.py']}}
                    onDrop={(file) => {
                        algorithm_form.setFieldValue('file', file)}}
                    onReject={() => algorithm_form.setFieldError('file', 'Please choose a valid file.')}
                >
                    <Center h={120}>
                    <Dropzone.Idle>
                        <Group>
                            <Image src='./images/upload_image.png' mah={80} maw={80}/>
                            Drop file here <br/>or<br/>Click to browse
                        </Group>
                    </Dropzone.Idle>
                    <Dropzone.Accept>Drop file here</Dropzone.Accept>
                    <Dropzone.Reject>Files are invalid</Dropzone.Reject>
                    </Center>
                </Dropzone>

                {selectedFile()}

                <Center pt={30}><Button type='submit' color='green' w={200}>Upload to Marketplace</Button></Center>

            </form>
        </Paper>
        </Stack>
        </Center>
        </Tabs.Panel>


        <Tabs.Panel value="devices" pt={20}>
            <Center>
                <Stack align='center' pt={30} gap={50} w={1000}>
                    <Paper bg='var(--mantine-color-gray-1)' p={10} shadow='xl' radius='lg' w="100%">

                        <form onSubmit={device_form.onSubmit((values)=>handleDeviceSubmit(values))}>

                            <TextInput size="md" label="Device Blockchain Account" withAsterisk {...device_form.getInputProps('account')} pb={10}/>

                            <TextInput size="md" label="Device Name" withAsterisk {...device_form.getInputProps('name')} pb={10}/>

                            <Group pb={10}>
                                <TextInput size="md" label="Device IP" withAsterisk {...device_form.getInputProps('ip_address')}/>
                                <NumberInput size="md" label ="Device Port" withAsterisk hideControls {...device_form.getInputProps('port')}/>
                            </Group>

                            <Textarea size="md" minRows={2} maxRows={2} autosize label="Description" withAsterisk {...device_form.getInputProps('description')} pb={10}/>

                            {device_form.values.listed &&
                            <NumberInput size="md" label="Price (eth)" placeholder="Insert a price." withAsterisk hideControls {...device_form.getInputProps('price')} pb={30} allowNegative={false}/>}

                            <Checkbox size="md" color='orange' onClick={()=> {device_form.setFieldValue('price',0)}} {...device_form.getInputProps('listed')} label="List this device on the Marketplace" pb={39}></Checkbox>

                            <Center pt={30}><Button type='submit' color='green' w={200}>Upload to Marketplace</Button></Center>

                        </form>
                    </Paper>
                </Stack>
            </Center>
        </Tabs.Panel>


        </Tabs>
    );
}


export default Publish;