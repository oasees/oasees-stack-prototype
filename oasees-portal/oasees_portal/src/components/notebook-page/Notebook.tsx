import { useState, useEffect } from 'react';
import { Alert, Text, Loader, Center } from '@mantine/core';
import './Notebook.css';

interface NotebookProps {
    json: any;
}



const url = `http://${process.env.REACT_APP_EXPOSED_IP}:30021/k8s_api`;

var notebook_url = ''

const kubectlRequest = async (cmd: string) => {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cmd })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Request failed:', error);
      throw error;
    }
  };
  
const getNotebookUrl = async () => {
    const nodesData = await kubectlRequest('get nodes -o json');
    const masterIp = nodesData.items.find((node: any) => 
        node.metadata.labels['node-role.kubernetes.io/master']
    )?.metadata.annotations['alpha.kubernetes.io/provided-node-ip'].split(",")[0];

    const svcsData = await kubectlRequest('get svc -l component=oasees-notebook -o json');
    const port = svcsData.items[0].spec.ports[0].nodePort;

    return `http://${masterIp}:${port}/notebook/lab`;
};



const Notebook = ({ json }: NotebookProps) => {
    const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
    const [isChecking, setIsChecking] = useState(true);

    useEffect(() => {
        const checkEndpoint = async () => {
            try {
                notebook_url = await getNotebookUrl();
                
                const response = await fetch(notebook_url, {
                    method: 'HEAD',
                    mode: 'no-cors',
                });
                
                setIsAvailable(true);
            } catch (error) {
                setIsAvailable(false);
            } finally {
                setIsChecking(false);
            }
        };

        checkEndpoint();
    }, []);

    if (isChecking) {
        return (
            <Center style={{ height: '200px' }}>
                <Loader size="md" />
            </Center>
        );
    }

    if (!isAvailable) {
        return (
            <Alert 
                title="OASEES Notebook is not ready" 
                color="blue"
                mb="md"
            >
                <Text>OASEES Stack is still initializing</Text>
            </Alert>
        );
    }

    return (
        <iframe 
            title="Jupyter notebook" 
            className="notebook" 
            src={notebook_url}
        />
    );
};

export default Notebook;