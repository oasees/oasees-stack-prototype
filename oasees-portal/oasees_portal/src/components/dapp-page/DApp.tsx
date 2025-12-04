import { useState, useEffect } from 'react';
import { Alert, Text, Loader, Center } from '@mantine/core';
import './DApp.css';

interface NotebookProps {
    json: any;
}

const url = `http://${process.env.REACT_APP_EXPOSED_IP}:30021/k8s_api`;

var dapp_url = '';



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




const getUIServiceUrl = async (serviceName?: string) => {
    const nodesData = await kubectlRequest('get nodes -o json');
    const masterIp = nodesData.items.find((node: any) => 
      node.metadata.labels['node-role.kubernetes.io/master']
    )?.metadata.annotations['alpha.kubernetes.io/provided-node-ip'].split(",")[0];
  
    const cmd = "get services -l oasees-ui=true -o jsonpath='{range .items[*]}{.metadata.name}:{.metadata.labels.oasees-ui-port}{\"\\n\"}{end}'";
    const response = await kubectlRequest(cmd);


    
    const services = response.trim().split('\n').filter((line: any) => line).map((line: { split: (arg0: string) => [any, any]; }) => {
      const [name, port] = line.split(':');
      return { name, port };
    });
  
    // Get specific service or first one
    const targetService = serviceName 
      ? services.find((svc: { name: string; }) => svc.name === serviceName)
      : services[0];
  
    if (!targetService) {
      throw new Error(`UI service ${serviceName || 'not found'}`);
    }
  
    return `http://${masterIp}:${targetService.port}`;
  };



const DApp = ({ json }: NotebookProps) => {
    const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
    const [isChecking, setIsChecking] = useState(true);


    
    useEffect(() => {
        const checkEndpoint = async () => {



            try {
                dapp_url = await getUIServiceUrl();

                
                const response = await fetch(dapp_url, {
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
            <Center style={{ height: '500px' }}>
                <Loader size="md" />
            </Center>
        );
    }

    if (!isAvailable) {
        return (
            <Alert 
                title="Application Not Found" 
                color="blue"
                mb="md"
            >
                <Text>Deploy your application using the Oasees SDK</Text>
            </Alert>
        );
    }

    return (
        <iframe 
            title="User Application" 
            className="notebook" 
            src={dapp_url}
        />
    );
};

export default DApp;