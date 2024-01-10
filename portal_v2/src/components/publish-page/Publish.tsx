import {TextInput, Center, Button, NumberInput, Paper, Textarea, Flex, CloseButton,Text, PartialVarsResolver, Group, Image } from "@mantine/core";
import { useForm } from "@mantine/form";
import './Publish.css'
import {Dropzone, DropzoneFactory} from "@mantine/dropzone";

interface FormValues {
    title:string,
    description:string,
    price:number,
    file: File[]
}

const varsResolver: PartialVarsResolver<DropzoneFactory> = (theme,props) =>{
    return {
        root: {'--dropzone-accept-bg': 'var(--mantine-color-green-1'},
    };
}

const Publish = () => {

    const form = useForm<FormValues>({
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

    const selectedFile = () => {
        const file = form.values.file[0];
        if(file){
            return(
            <Text key={file.name} pt={5}>
                <u>File chosen:</u> <b>{file.name}</b> ({(file.size / 1024).toFixed(2)} kb)
                <CloseButton
                    size="xs"
                    onClick={() =>
                    form.setFieldValue('file', [])
                    }
                />
            </Text>
            );
        }else{
            return(
                <Flex className="m-8f816625 mantine-InputWrapper-error" justify="center" mt={5}>{form.errors.file}</Flex>
            );
        }
    }


    return (
        <>
        <Center style={{fontSize:20, fontWeight:"bold"}} pt={30} pb={30}>Upload an Asset</Center>
        <Paper bg='var(--mantine-color-gray-1)' p={10} shadow='xl' radius='lg'>
            <form onSubmit={form.onSubmit((values)=>console.log(values))}>
                <TextInput size="md" label="Name" withAsterisk {...form.getInputProps('title')} pb={10}/>
                <Textarea size="md" minRows={3} maxRows={3} autosize label="Description" withAsterisk {...form.getInputProps('description')} pb={10}/>
                <NumberInput size="md" label="Price (eth)" placeholder="Insert a price." withAsterisk hideControls {...form.getInputProps('price')} pb={20} allowNegative={false}/>
                <Dropzone
                    vars = {varsResolver}
                    h={120}
                    p={0}
                    multiple={false}
                    accept={{'text/x-python':['.py']}}
                    onDrop={(file) => {
                        form.setFieldValue('file', file)}}
                    onReject={() => form.setFieldError('file', 'Please choose a valid file.')}
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
                <Center pt={30}><Button type='submit' w={200}>Upload to Marketplace</Button></Center>
            </form>
        </Paper>
        </>
    );
}


export default Publish;