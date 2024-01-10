import { AspectRatio, Box, Container } from "@mantine/core";
import './Notebook.css'

interface NotebookProps{
    json:any;
}

const Notebook = ({json}:NotebookProps) => {
    return <>
        <iframe className='notebook' src={json.jupyter_url}></iframe>
        </>
};


export default Notebook;