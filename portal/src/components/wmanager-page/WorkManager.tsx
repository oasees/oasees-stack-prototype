import './WorkManager.css'

interface WorkManagerProps{
    json:any;
}

const WorkManager = ({json}:WorkManagerProps) => {
    return <>
        <iframe className="workload-manager-frame" title="Workload Manager App" src={`http://${json.main_cluster_ip}:31007`}></iframe>
        </>
};


export default WorkManager;