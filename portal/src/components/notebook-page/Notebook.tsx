import './Notebook.css'

interface NotebookProps{
    json:any;
}

const Notebook = ({json}:NotebookProps) => {
    return <>
        <iframe title="Jupyter notebook" className='notebook' src={json.jupyter_url}></iframe>
        </>
};


export default Notebook;