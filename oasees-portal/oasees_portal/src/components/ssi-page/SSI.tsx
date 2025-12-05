import { useState } from "react";
import { ethers } from "ethers";
import { TextInput, Button, Paper, Stack, Title, Text, Group, Center, Badge, ActionIcon, CopyButton, Tooltip } from "@mantine/core";
import { IconCheck, IconX, IconCopy } from "@tabler/icons-react";
import "./SSI.css";

const VC_VERIFIER_ADDRESS =
    process.env.REACT_APP_VC_VERIFIER_ADDRESS ||
    "0x9E545E3C0baAB3E08CdfD552C960A1050f373042";
const DID_REGISTRY_ADDRESS =
    process.env.REACT_APP_DID_REGISTRY_ADDRESS ||
    "0x84eA74d481Ee0A5332c457a4d796187F6Ba67fEB";

interface DIDResult {
    owner: string;
    metadataURI: string;
    created: string;
}

interface IssuerDetails {
    did: string;
    address: string;
    metadataURI?: string;
    registered: boolean;
}

interface SSIProps {
    json?: any;
}

export default function SSI({ json }: SSIProps) {
    const [vcHash, setVcHash] = useState<string>("");
    const [status, setStatus] = useState<"verified" | "not-verified" | "">("");
    const [didInput, setDidInput] = useState<string>("");
    const [didResult, setDidResult] = useState<DIDResult | null>(null);
    const [issuerResult, setIssuerResult] = useState<IssuerDetails | null>(null);
    const [error, setError] = useState<string>("");
    const [checkingVC, setCheckingVC] = useState<boolean>(false);
    const [resolvingDID, setResolvingDID] = useState<boolean>(false);

    async function checkVC() {
        setError("");
        setStatus("");
        setIssuerResult(null);

        if (!ethers.utils.isAddress(VC_VERIFIER_ADDRESS)) {
            setError("Set REACT_APP_VC_VERIFIER_ADDRESS in .env");
            return;
        }

        const trimmedHash = vcHash.trim();
        if (!ethers.utils.isHexString(trimmedHash, 32)) {
            setError("Enter a valid 32-byte VC hash (0x + 64 hex chars).");
            return;
        }

        setCheckingVC(true);
        try {
            const signer = await json.provider.getSigner();
            const verifier = new ethers.Contract(
                VC_VERIFIER_ADDRESS,
                [
                    "function isVerified(bytes32 vcHash) view returns (bool)",
                    "event VCVerified(bytes32 indexed vcHash, address indexed issuer, uint256 when)"
                ],
                signer
            );

            const isVerified = await verifier.isVerified(trimmedHash);
            setStatus(isVerified ? "verified" : "not-verified");

            if (isVerified) {
                // Find who issued it by querying logs
                const filter = verifier.filters.VCVerified(trimmedHash);
                const logs = await verifier.queryFilter(filter, 0, "latest");

                if (logs.length > 0) {
                    const log = logs[0];
                    // Ethers v5 args are in log.args
                    const issuerAddress = log.args?.[1];
                    const issuerDid = `did:ethr:${issuerAddress}`;

                    const registry = new ethers.Contract(
                        DID_REGISTRY_ADDRESS,
                        [
                            "function resolveDID(string did) view returns (address owner, string metadataURI, uint256 created)"
                        ],
                        signer
                    );

                    try {
                        const [owner, metadataURI] = await registry.resolveDID(issuerDid);
                        setIssuerResult({
                            did: issuerDid,
                            address: issuerAddress,
                            metadataURI: metadataURI,
                            registered: owner !== ethers.constants.AddressZero
                        });
                    } catch (e) {
                        console.warn("Failed to resolve issuer DID", e);
                        setIssuerResult({
                            did: issuerDid,
                            address: issuerAddress,
                            registered: false
                        });
                    }
                }
            }
        } catch (err: any) {
            console.error(err);
            setError(err?.shortMessage || err?.message || "Unknown error");
        } finally {
            setCheckingVC(false);
        }
    }

    async function resolveDID() {
        setError("");
        setDidResult(null);

        if (!ethers.utils.isAddress(DID_REGISTRY_ADDRESS)) {
            setError("Set REACT_APP_DID_REGISTRY_ADDRESS in .env");
            return;
        }

        const trimmedDid = didInput.trim();
        if (!trimmedDid) {
            setError("Enter a DID value to resolve (e.g. did:ethr:0x1234...)");
            return;
        }

        setResolvingDID(true);
        try {
            const signer = await json.provider.getSigner();
            const registry = new ethers.Contract(
                DID_REGISTRY_ADDRESS,
                [
                    "function resolveDID(string did) view returns (address owner, string metadataURI, uint256 created)"
                ],
                signer
            );

            const [owner, metadataURI, created] = await registry.resolveDID(
                trimmedDid
            );

            setDidResult({
                owner,
                metadataURI,
                created:
                    created && Number(created) > 0
                        ? new Date(Number(created) * 1000).toLocaleString()
                        : "Not set",
            });
        } catch (err: any) {
            console.error(err);
            setError(err?.shortMessage || err?.message || "Unknown error");
        } finally {
            setResolvingDID(false);
        }
    }

    return (
        <Center pt={30} pb={50}>
            <Stack align="center" gap={40} w={800}>
                <Title order={1} c="dimmed" fw={300} style={{ letterSpacing: '2px' }}>
                    SSI Verifier
                </Title>

                {/* VC Verification Section */}
                <Paper bg="var(--mantine-color-gray-1)" p="xl" shadow="xl" radius="lg" w="100%">
                    <Stack gap="md">
                        <Group justify="space-between" align="center">
                            <Title order={3}>VC Verification</Title>
                            <Badge color="blue" variant="light">Verifiable Credentials</Badge>
                        </Group>

                        <Text c="dimmed" size="sm">
                            Verify the authenticity of a Verifiable Credential by entering its 32-byte hash.
                        </Text>

                        <Group align="flex-end">
                            <TextInput
                                label="VC Hash"
                                placeholder="0x..."
                                value={vcHash}
                                onChange={(e) => setVcHash(e.target.value)}
                                style={{ flex: 1 }}
                                size="md"
                            />
                            <Button
                                onClick={checkVC}
                                loading={checkingVC}
                                size="md"
                                color="blue"
                            >
                                Check Authenticity
                            </Button>
                        </Group>

                        {status && (
                            <Stack>
                                <Paper p="md" withBorder bg={status === "verified" ? "teal.0" : "red.0"} style={{ borderColor: status === "verified" ? "var(--mantine-color-teal-6)" : "var(--mantine-color-red-6)" }}>
                                    <Group>
                                        {status === "verified" ? <IconCheck color="var(--mantine-color-teal-6)" /> : <IconX color="var(--mantine-color-red-6)" />}
                                        <Text c={status === "verified" ? "teal.9" : "red.9"} fw={500}>
                                            {status === "verified" ? "Credential is VALID and Verified on-chain." : "Credential could NOT be verified."}
                                        </Text>
                                    </Group>
                                </Paper>

                                {status === "verified" && issuerResult && (
                                    <Paper p="md" withBorder>
                                        <Stack gap="xs">
                                            <Title order={5} c="dimmed" tt="uppercase" size="xs" fw={700}>Issuer Information</Title>

                                            <Group>
                                                <Text fw={500} w={100} c="dimmed">DID:</Text>
                                                <Text style={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>{issuerResult.did}</Text>
                                            </Group>

                                            <Group>
                                                <Text fw={500} w={100} c="dimmed">Address:</Text>
                                                <Text style={{ fontFamily: 'monospace' }}>{issuerResult.address}</Text>
                                                <CopyButton value={issuerResult.address} timeout={2000}>
                                                    {({ copied, copy }) => (
                                                        <Tooltip label={copied ? 'Copied' : 'Copy'} withArrow position="right">
                                                            <ActionIcon color={copied ? 'teal' : 'gray'} variant="subtle" onClick={copy} size="sm">
                                                                {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                                                            </ActionIcon>
                                                        </Tooltip>
                                                    )}
                                                </CopyButton>
                                            </Group>

                                            {issuerResult.registered ? (
                                                <Group>
                                                    <Text fw={500} w={100} c="dimmed">Metadata:</Text>
                                                    <Text>{issuerResult.metadataURI || "None"}</Text>
                                                </Group>
                                            ) : (
                                                <Text c="dimmed" size="sm" fs="italic" mt={5}>
                                                    <IconX size={14} style={{ display: 'inline', marginRight: 4 }} />
                                                    Issuer is not registered in the DAO Registry.
                                                </Text>
                                            )}
                                        </Stack>
                                    </Paper>
                                )}
                            </Stack>
                        )}
                    </Stack>
                </Paper>

                {/* DID Resolution Section */}
                <Paper bg="var(--mantine-color-gray-1)" p="xl" shadow="xl" radius="lg" w="100%">
                    <Stack gap="md">
                        <Group justify="space-between" align="center">
                            <Title order={3}>DID Resolution</Title>
                            <Badge color="grape" variant="light">Decentralized Identity</Badge>
                        </Group>

                        <Text c="dimmed" size="sm">
                            Resolve a Decentralized Identifier (DID) to retrieve its owner and metadata.
                        </Text>

                        <Group align="flex-end">
                            <TextInput
                                label="Issuer DID"
                                placeholder="did:ethr:0x..."
                                value={didInput}
                                onChange={(e) => setDidInput(e.target.value)}
                                style={{ flex: 1 }}
                                size="md"
                            />
                            <Button
                                onClick={resolveDID}
                                loading={resolvingDID}
                                size="md"
                                color="grape"
                            >
                                Resolve DID
                            </Button>
                        </Group>

                        {didResult && (
                            <Paper p="md" withBorder>
                                <Stack gap="xs">
                                    <Title order={5} c="dimmed" tt="uppercase" size="xs" fw={700}>Resolution Result</Title>

                                    <Group>
                                        <Text fw={500} w={100} c="dimmed">Owner:</Text>
                                        <Text style={{ fontFamily: 'monospace' }}>{didResult.owner}</Text>
                                        <CopyButton value={didResult.owner} timeout={2000}>
                                            {({ copied, copy }) => (
                                                <Tooltip label={copied ? 'Copied' : 'Copy'} withArrow position="right">
                                                    <ActionIcon color={copied ? 'teal' : 'gray'} variant="subtle" onClick={copy} size="sm">
                                                        {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                                                    </ActionIcon>
                                                </Tooltip>
                                            )}
                                        </CopyButton>
                                    </Group>

                                    <Group>
                                        <Text fw={500} w={100} c="dimmed">Metadata:</Text>
                                        <Text>{didResult.metadataURI || "Not set"}</Text>
                                    </Group>

                                    <Group>
                                        <Text fw={500} w={100} c="dimmed">Created:</Text>
                                        <Text>{didResult.created}</Text>
                                    </Group>
                                </Stack>
                            </Paper>
                        )}
                    </Stack>
                </Paper>

                {error && (
                    <Paper p="md" bg="red.1" c="red.9">
                        <Text fw={500}>Error: {error}</Text>
                    </Paper>
                )}

            </Stack>
        </Center>
    );
}
