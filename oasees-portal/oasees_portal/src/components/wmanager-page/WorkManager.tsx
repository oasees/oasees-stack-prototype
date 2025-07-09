import { useState, useEffect } from 'react';
import { Alert, Text, Loader, Center } from '@mantine/core';
import './WorkManager.css';

interface WorkManagerProps {
    json: any;
}

const WorkManager = ({ json }: WorkManagerProps) => {
    const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
    const [isChecking, setIsChecking] = useState(true);

    useEffect(() => {
        const checkEndpoint = async () => {
            try {
                const url = `http://${process.env.REACT_APP_EXPOSED_IP}:31007`;
                
                // Create a test request to check if the endpoint is accessible
                const response = await fetch(url, {
                    method: 'HEAD',
                    mode: 'no-cors', // This prevents CORS errors but limits response info
                });
                
                // For no-cors mode, we assume it's available if no error is thrown
                setIsAvailable(true);
            } catch (error) {
                // If fetch fails, the endpoint is not available
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
                title="SDK Manager is not ready" 
                color="blue"
                mb="md"
            >
                <Text>OASEES Stack is still initializing</Text>
            </Alert>
        );
    }

    return (
        <iframe 
            className="workload-manager-frame" 
            title="Workload Manager App" 
            src={`http://${process.env.REACT_APP_EXPOSED_IP}:31007`}
        />
    );
};

export default WorkManager;