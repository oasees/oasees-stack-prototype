let editor;
let currentStep = 'governance';
let compiledContracts = {};
let allContractsCompiled = false;

const contractTemplates = {
    governance: '/contracts/Governance.sol',
    votetoken: '/contracts/VoteToken.sol',
    timelock: '/contracts/TimeLock.sol',
    box: '/contracts/Box.sol'
};

console.log("hi")

// Initialize Monaco Editor
require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.34.0/min/vs' }});
require(['vs/editor/editor.main'], function() {
    editor = monaco.editor.create(document.getElementById('editor'), {
        language: 'sol',
        theme: 'vs-dark',
        automaticLayout: true
    });
    loadContract('governance');
});

function showError(message) {
    updateStepStatus(currentStep, `Error: ${message}`);
    // const stepItem = document.querySelector(`.step-item[data-step="${currentStep}"]`);
    // if (stepItem) {
    //     const abiPreview = stepItem.querySelector('.abi-preview .preview-content');
    //     const bytecodePreview = stepItem.querySelector('.bytecode-preview .preview-content');
        
    //     if (abiPreview) abiPreview.textContent = '';
    //     if (bytecodePreview) bytecodePreview.textContent = '';
    // }
    document.getElementById('nextBtn').disabled = true;
}

function updateStepStatus(step, status) {
    const stepItem = document.querySelector(`.step-item[data-step="${step}"]`);
    if (stepItem) {
        const statusEl = stepItem.querySelector('.compilation-status');
        if (statusEl) {
            statusEl.textContent = status;
            statusEl.className = 'compilation-status ' + 
                (status === 'Compiled Successfully' ? 'success' : 
                 status.startsWith('Error') ? 'error' : '');
        }
    }
}

function updateStepData(step) {
    const stepItem = document.querySelector(`.step-item[data-step="${step}"]`);
    if (stepItem) {
        const statusEl = stepItem.querySelector('.compilation-status');
        // const abiPreview = stepItem.querySelector('.abi-preview .preview-content');
        // const bytecodePreview = stepItem.querySelector('.bytecode-preview .preview-content');
        
        if (statusEl) {
            statusEl.textContent = 'Compiled Successfully';
            statusEl.className = 'compilation-status success';
        }
        
        // if (abiPreview) {
        //     abiPreview.textContent = JSON.stringify(abi, null, 2);
        // }
        
        // if (bytecodePreview) {
        //     bytecodePreview.textContent = bytecode || '';
        // }
    }
}

async function loadContract(step) {
    try {
        const response = await fetch(contractTemplates[step]);
        const content = await response.text();
        editor.setValue(content);
        currentStep = step;
        updateSteps();
    } catch (error) {
        console.error('Error loading contract:', error);
        showError('Failed to load contract');
    }
}

async function compile() {
    try {
        updateStepStatus(currentStep, 'Compiling...');
        const source = editor.getValue();
        const response = await fetch('/compile', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                source,
                contractName: currentStep
            })
        });
        
        const result = await response.json();
        handleCompilationResult(result);
    } catch (error) {
        console.error('Compilation failed:', error);
        showError('Compilation failed: ' + error.message);
    }
}

function handleCompilationResult(result) {

    if (result.success && result.output) {
        if (result.output.errors && result.output.errors.some(error => error.severity === 'error')) {
            const errors = result.output.errors
                .filter(error => error.severity === 'error')
                .map(error => error.formattedMessage)
                .join('\n');
            showError(errors);
            return;
        }

        const contracts = result.output.contracts['contract.sol'];
        if (contracts) {
            // Store all contracts from the file
            // for (const [contractName, contract] of Object.entries(contracts)) {
            //     compiledContracts[contractName.toLowerCase()] = {
            //         abi: contract.abi,
            //         bytecode: contract.evm.bytecode.object
            //     };
            // }
            // console.log(contracts);

            for (const [contractName, contract] of Object.entries(contracts)) {
                compiledContracts[contractName.toLowerCase()] = true
            }
            console.log(contracts);

            // Update the UI for the current step
            // const mainContract = contracts[Object.keys(contracts)[0]]; // Use first contract for display
            // updateStepData(currentStep, mainContract.abi, mainContract.evm.bytecode.object);
            updateStepData(currentStep)
            document.getElementById('nextBtn').disabled = false;
            
            const stepItem = document.querySelector(`.step-item[data-step="${currentStep}"]`);
            stepItem.classList.add('completed');

            // Check if all required contracts are compiled
            const requiredContracts = ['governance', 'votetoken', 'timelock', 'box'];
            allContractsCompiled = requiredContracts.every(c => 
                Object.keys(compiledContracts).some(name => name.toLowerCase().includes(c))
            );
            // allContractsCompiled = true;
            
            if (allContractsCompiled) {
                document.getElementById('deploymentPanel').style.display = 'block';
                if (window.daoDeployer) {
                    window.daoDeployer.setCompiledContracts(compiledContracts);
                }
            }
        } else {
            showError('No contracts found in compilation output');
        }
    } else {
        showError(result.error || 'Compilation failed');
    }
}

function nextStep() {
    const steps = ['governance', 'votetoken', 'timelock', 'box'];
    const currentIndex = steps.indexOf(currentStep);
    const deploymentOutputContainer = document.getElementById('hiddenContainer');
                deploymentOutputContainer.style.display = 'block';
                deploymentOutputContainer.innerHTML = "Test<br>test";
    if (currentIndex < steps.length - 1) {
        loadContract(steps[currentIndex + 1]);
        document.getElementById('nextBtn').disabled = true;
    }
}

function updateSteps() {
    const steps = document.querySelectorAll('.step-item');
    steps.forEach(step => {
        const isCurrentStep = step.dataset.step === currentStep;
        step.classList.toggle('active', isCurrentStep);
        if (isCurrentStep) {
            step.querySelector('.step-details').style.display = 'block';
        } else {
            step.querySelector('.step-details').style.display = 'none';
        }
    });
}

// Add styles
const additionalStyles = `
.compilation-status.success {
    color: #4CAF50;
}
.compilation-status.error {
    color: #ff4444;
    white-space: pre-wrap;
    font-family: monospace;
    font-size: 0.9em;
}
.step-item.active .step-details {
    display: block !important;
}
`;

const styleSheet = document.createElement("style");
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);

// Initialize step click handlers
document.querySelectorAll('.step-header').forEach(header => {
    header.addEventListener('click', () => {
        const step = header.parentElement.dataset.step;
        if (step) {
            loadContract(step);
        }
    });
});