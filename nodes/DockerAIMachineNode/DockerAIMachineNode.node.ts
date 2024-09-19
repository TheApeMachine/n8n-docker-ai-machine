import {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    NodeOperationError,
} from 'n8n-workflow';
import Docker from 'dockerode';
import fs from 'fs';
import path from 'path';
import tar from 'tar-fs';
import { PassThrough } from 'stream';
import WebSocket, { Server as WebSocketServer } from 'ws';
import * as os from 'os';
import * as natural from 'natural'; // For Natural Language Processing

export class DockerDeveloperNode implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Advanced Docker AI Machine',
        name: 'dockerAIMachine',
        group: ['development'],
        version: 1,
        description:
            'Allow AI agents to control a Docker container with advanced features including interactive shell access, context awareness, and more',
        defaults: {
            name: 'Advanced Docker AI Machine',
        },
        inputs: ['main'],
        outputs: ['main'],
        credentials: [
        ],
        properties: [
            // Operation Selection
            {
                displayName: 'Operation',
                name: 'operation',
                type: 'options',
                options: [
                    { name: 'Start Interactive Session', value: 'interactiveSession' },
                    { name: 'Execute Command', value: 'executeCommand' },
                    { name: 'Manage File', value: 'manageFile' },
                    { name: 'Transfer File', value: 'transferFile' },
                    { name: 'Container Control', value: 'containerControl' },
                    { name: 'Snapshot', value: 'snapshot' },
                    { name: 'Health Check', value: 'healthCheck' },
                    { name: 'Retrieve Logs', value: 'retrieveLogs' },
                    { name: 'Environment Discovery', value: 'environmentDiscovery' },
                    { name: 'Manage Packages', value: 'managePackages' },
                    { name: 'Run Tests', value: 'runTests' },
                    { name: 'Code Analysis', value: 'codeAnalysis' },
                    { name: 'Multi-Container Orchestration', value: 'multiContainer' },
                ],
                default: 'interactiveSession',
                description: 'The operation to perform',
            },
            // Container Selection
            {
                displayName: 'Container Name',
                name: 'containerName',
                type: 'string',
                default: 'dev-environment',
                description: 'Name of the Docker container to interact with',
            },
            // Shared Parameters for Container Configuration
            {
                displayName: 'Container Configuration',
                name: 'containerConfig',
                type: 'collection',
                placeholder: 'Add Configuration',
                default: {},
                options: [
                    {
                        displayName: 'Docker Image',
                        name: 'dockerImage',
                        type: 'string',
                        default: 'ubuntu:latest',
                        description: 'Docker image to use for the container',
                    },
                    {
                        displayName: 'Use Custom Dockerfile',
                        name: 'useCustomDockerfile',
                        type: 'boolean',
                        default: false,
                    },
                    {
                        displayName: 'Dockerfile Path',
                        name: 'dockerfilePath',
                        type: 'string',
                        default: '',
                        displayOptions: {
                            show: {
                                useCustomDockerfile: [true],
                            },
                        },
                        description: 'Path to the custom Dockerfile',
                    },
                    {
                        displayName: 'CPU Limit (cores)',
                        name: 'cpuLimit',
                        type: 'number',
                        default: 1,
                        typeOptions: {
                            minValue: 0.1,
                            maxValue: 32,
                            numberStepSize: 0.1,
                        },
                        description: 'CPU limit for the container',
                    },
                    {
                        displayName: 'Memory Limit (MB)',
                        name: 'memoryLimit',
                        type: 'number',
                        default: 512,
                        typeOptions: {
                            minValue: 128,
                            maxValue: 65536,
                        },
                        description: 'Memory limit for the container',
                    },
                    {
                        displayName: 'Network Mode',
                        name: 'networkMode',
                        type: 'options',
                        options: [
                            { name: 'None', value: 'none' },
                            { name: 'Bridge', value: 'bridge' },
                            { name: 'Host', value: 'host' },
                            { name: 'Custom', value: 'custom' },
                        ],
                        default: 'bridge',
                        description: 'Docker network mode for the container',
                    },
                    {
                        displayName: 'Custom Network Name',
                        name: 'customNetworkName',
                        type: 'string',
                        default: '',
                        displayOptions: {
                            show: {
                                networkMode: ['custom'],
                            },
                        },
                        description: 'Name of the custom Docker network to connect the container to',
                    },
                    {
                        displayName: 'Volume Mounts',
                        name: 'volumeMounts',
                        type: 'fixedCollection',
                        typeOptions: {
                            multipleValues: true,
                        },
                        default: {},
                        options: [
                            {
                                name: 'volumes',
                                displayName: 'Volumes',
                                values: [
                                    {
                                        displayName: 'Host Directory',
                                        name: 'hostDir',
                                        type: 'string',
                                        default: '',
                                        description: 'Directory on the host machine',
                                    },
                                    {
                                        displayName: 'Container Directory',
                                        name: 'containerDir',
                                        type: 'string',
                                        default: '',
                                        description: 'Directory inside the container',
                                    },
                                ],
                            },
                        ],
                        description: 'List of volume mounts',
                    },
                    {
                        displayName: 'Shared Directory',
                        name: 'sharedDir',
                        type: 'string',
                        default: '/workspace',
                        description:
                            'Directory inside the container to be used for shared files with the AI agent',
                    },
                ],
                description: 'Configuration options for the container',
            },
            // Execution Control
            {
                displayName: 'Execution Timeout (seconds)',
                name: 'executionTimeout',
                type: 'number',
                typeOptions: {
                    minValue: 1,
                },
                default: 60,
                description: 'Timeout for command execution',
                displayOptions: {
                    show: {
                        operation: ['executeCommand'],
                    },
                },
            },
            // Command Parameters
            {
                displayName: 'Command',
                name: 'command',
                type: 'string',
                default: '',
                displayOptions: {
                    show: {
                        operation: ['executeCommand'],
                    },
                },
                description: 'Command to execute inside the container',
            },
            {
                displayName: 'Natural Language Instruction',
                name: 'nlInstruction',
                type: 'string',
                default: '',
                displayOptions: {
                    show: {
                        operation: ['executeCommand'],
                    },
                },
                description:
                    'Natural language instruction to be translated into a command (if provided, overrides "Command")',
            },
            {
                displayName: 'Environment Variables',
                name: 'envVars',
                type: 'string',
                default: '',
                displayOptions: {
                    show: {
                        operation: ['executeCommand'],
                    },
                },
                description: 'Environment variables (KEY=VALUE format, separated by commas)',
            },
            {
                displayName: 'Run as User',
                name: 'runAsUser',
                type: 'string',
                default: 'developer',
                displayOptions: {
                    show: {
                        operation: ['executeCommand'],
                    },
                },
                description: 'Username or UID to run commands as inside the container',
            },
            // File Management Parameters
            {
                displayName: 'File Operation',
                name: 'fileOperation',
                type: 'options',
                options: [
                    { name: 'Read File', value: 'read' },
                    { name: 'Write File', value: 'write' },
                ],
                default: 'read',
                displayOptions: {
                    show: {
                        operation: ['manageFile'],
                    },
                },
                description: 'Whether to read or write a file in the container',
            },
            {
                displayName: 'Container File Path',
                name: 'containerFilePath',
                type: 'string',
                default: '',
                displayOptions: {
                    show: {
                        operation: ['manageFile', 'transferFile', 'runTests', 'codeAnalysis'],
                    },
                },
                description: 'Path of the file inside the container',
            },
            {
                displayName: 'File Content',
                name: 'fileContent',
                type: 'string',
                default: '',
                displayOptions: {
                    show: {
                        operation: ['manageFile'],
                        fileOperation: ['write'],
                    },
                },
                description: 'Content to write into the file',
            },
            // File Transfer Parameters
            {
                displayName: 'Transfer Direction',
                name: 'transferDirection',
                type: 'options',
                options: [
                    { name: 'To Container', value: 'toContainer' },
                    { name: 'From Container', value: 'fromContainer' },
                ],
                default: 'toContainer',
                displayOptions: {
                    show: {
                        operation: ['transferFile'],
                    },
                },
                description: 'Direction of file transfer',
            },
            {
                displayName: 'Local File Path',
                name: 'localFilePath',
                type: 'string',
                default: '',
                displayOptions: {
                    show: {
                        operation: ['transferFile'],
                    },
                },
                description: 'Local file system path',
            },
            // Snapshot Parameters
            {
                displayName: 'Snapshot Action',
                name: 'snapshotAction',
                type: 'options',
                options: [
                    { name: 'Save Snapshot', value: 'save' },
                    { name: 'Load Snapshot', value: 'load' },
                ],
                default: 'save',
                displayOptions: {
                    show: {
                        operation: ['snapshot'],
                    },
                },
                description: 'Whether to save or load a container snapshot',
            },
            // Health Check Parameters
            {
                displayName: 'Health Check Command',
                name: 'healthCheckCommand',
                type: 'string',
                default: '',
                displayOptions: {
                    show: {
                        operation: ['healthCheck'],
                    },
                },
                description: 'Command to check the health of the container',
            },
            {
                displayName: 'Recovery Action',
                name: 'recoveryAction',
                type: 'options',
                options: [
                    { name: 'Restart Container', value: 'restart' },
                    { name: 'Notify Only', value: 'notify' },
                ],
                default: 'restart',
                displayOptions: {
                    show: {
                        operation: ['healthCheck'],
                    },
                },
                description: 'Action to take if the health check fails',
            },
            // Container Control Parameters
            {
                displayName: 'Container Action',
                name: 'containerAction',
                type: 'options',
                options: [
                    { name: 'Start', value: 'start' },
                    { name: 'Stop', value: 'stop' },
                    { name: 'Remove', value: 'remove' },
                ],
                default: 'start',
                displayOptions: {
                    show: {
                        operation: ['containerControl'],
                    },
                },
                description: 'Action to perform on the container',
            },
            // Package Management Parameters
            {
                displayName: 'Package Action',
                name: 'packageAction',
                type: 'options',
                options: [
                    { name: 'Install', value: 'install' },
                    { name: 'Uninstall', value: 'uninstall' },
                    { name: 'List', value: 'list' },
                ],
                default: 'install',
                displayOptions: {
                    show: {
                        operation: ['managePackages'],
                    },
                },
                description: 'Action to perform on packages',
            },
            {
                displayName: 'Package Name',
                name: 'packageName',
                type: 'string',
                default: '',
                displayOptions: {
                    show: {
                        operation: ['managePackages'],
                        packageAction: ['install', 'uninstall'],
                    },
                },
                description: 'Name of the package to install or uninstall',
            },
            // Multi-Container Orchestration Parameters
            {
                displayName: 'Compose File Path',
                name: 'composeFilePath',
                type: 'string',
                default: '',
                displayOptions: {
                    show: {
                        operation: ['multiContainer'],
                    },
                },
                description: 'Path to the Docker Compose file',
            },
            {
                displayName: 'Compose Action',
                name: 'composeAction',
                type: 'options',
                options: [
                    { name: 'Up', value: 'up' },
                    { name: 'Down', value: 'down' },
                ],
                default: 'up',
                displayOptions: {
                    show: {
                        operation: ['multiContainer'],
                    },
                },
                description: 'Action to perform with Docker Compose',
            },
            // Logging Level
            {
                displayName: 'Logging Level',
                name: 'loggingLevel',
                type: 'options',
                options: [
                    { name: 'None', value: 'none' },
                    { name: 'Error', value: 'error' },
                    { name: 'Info', value: 'info' },
                    { name: 'Debug', value: 'debug' },
                ],
                default: 'info',
                description: 'Level of logging detail',
            },
        ],
    };

    constructor() {
    }

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const activeSessions: Map<string, WebSocket> = new Map();
        const commandHistory: Map<string, string[]> = new Map(); // For Command History
        const context: Map<string, any> = new Map(); // For Context Awareness

        const getNodeParameter = (name: string, itemIndex: number) => {
            return this.getNodeParameter(name, itemIndex);
        }

        const getInputData = () => {
            return this.getInputData();
        }

        const getCredentials = (credentialType: string) => {
            return this.getCredentials(credentialType);
        }
    
        const returnData: INodeExecutionData[] = [];
        const items = getInputData();
        const credentials = await getCredentials('dockerApi');
        const port = 8080;
        const wsServer = new WebSocketServer({ port });

        // Initialize Docker client
        const docker: Docker = new Docker({
            host: credentials.host as string,
            port: credentials.port as number,
        });

        const loggingLevel = getNodeParameter('loggingLevel', 0) as string;
        const containerName = getNodeParameter('containerName', 0) as string;
        const containerConfig = getNodeParameter('containerConfig', 0) as any;

        let container: Docker.Container;


        // Method to write file in container
        const writeFileInContainer = async (
                container: Docker.Container,
                containerFilePath: string,
            content: string
        ) => {
            const contentBuffer = Buffer.from(content, 'utf8');
            const tarStream = tar.pack(path.dirname(containerFilePath));
            tarStream.entry({ name: path.basename(containerFilePath) }, contentBuffer);
            tarStream.finalize();

            await container.putArchive(tarStream, { path: path.dirname(containerFilePath) });
        }

        // Method to read file from container
        const readFileFromContainer = async (container: Docker.Container, containerFilePath: string) => {
            return new Promise<string>((resolve, reject) => {
                container.getArchive({ path: containerFilePath }, (err, stream) => {
                    if (err) return reject(err);

                    const extract = tar.extract(path.dirname(containerFilePath));
                    let fileContent = '';

                    extract.on('entry', (header, stream, next) => {
                        stream.on('data', (chunk) => (fileContent += chunk.toString()));
                        stream.on('end', next);
                        stream.resume();
                    });

                    extract.on('finish', () => resolve(fileContent));
                    stream?.pipe(extract);
                });
            });
        }

        // Generalized method to transfer files to/from container
        const transferFile = async (
            container: Docker.Container,
            localPath: string,
            containerPath: string,
            direction: 'toContainer' | 'fromContainer'
        ) => {
            if (direction === 'toContainer') {
                const tarStream = tar.pack(path.dirname(localPath));
                await container.putArchive(tarStream, { path: path.dirname(containerPath) });
            } else {
                return new Promise<void>((resolve, reject) => {
                    container.getArchive({ path: containerPath }, (err, stream) => {
                        if (err) return reject(err);

                        const extract = tar.extract(path.dirname(localPath));
                        extract.on('entry', (header, stream, next) => {
                            const writeStream = fs.createWriteStream(localPath);
                            stream.pipe(writeStream);
                            stream.on('end', next);
                        });

                        extract.on('finish', resolve);
                        stream?.pipe(extract);
                    });
                });
            }
        }

        // Utility method to parse environment variables
        const parseEnvVars = (envVarsInput: string): string[] => {
            return envVarsInput
                ? envVarsInput.split(',').map((pair) => pair.trim())
                : [];
        }

        // Method to pull Docker image
        const pullDockerImage = async (docker: Docker, image: string) => {
            return new Promise<void>((resolve, reject) => {
                docker.pull(image, (err: Error | null, stream: NodeJS.ReadableStream) => {
                    if (err) return reject(err);
                    docker.modem.followProgress(stream, (err: Error | null) => (err ? reject(err) : resolve()));
                });
            });
        }

        // Method to build Docker image from Dockerfile
        const buildDockerImage = async (docker: Docker, dockerfilePath: string, imageTag: string) => {
            return new Promise<void>((resolve, reject) => {
                const tarStream = tar.pack(path.dirname(dockerfilePath));
                docker.buildImage(tarStream, { t: imageTag }, (err: Error | null, stream: NodeJS.ReadableStream | undefined) => {
                    if (err) return reject(err);
                    if (stream) {
                        docker.modem.followProgress(stream, (err: Error | null) => (err ? reject(err) : resolve()));
                    } else {
                        reject(new Error('Stream is undefined'));
                    }
                });
            });
        }

        // Utility method to get volume binds
        const getVolumeBinds = (volumeMounts: any, sharedDir: string): string[] => {
            const binds: string[] = [];
            if (volumeMounts && volumeMounts.volumes) {
                for (const volume of volumeMounts.volumes) {
                    binds.push(`${volume.hostDir}:${volume.containerDir}`);
                }
            }
            // Add shared directory bind
            const hostSharedDir = path.join(os.tmpdir(), 'docker-shared');
            if (!fs.existsSync(hostSharedDir)) {
                fs.mkdirSync(hostSharedDir);
            }
            binds.push(`${hostSharedDir}:${sharedDir}`);
            return binds;
        }

        // Method to get Git credentials as environment variables
        const getGitCredentialsEnv = (): string[] => {
            const gitUsername = process.env.GIT_USERNAME || '';
            const gitPassword = process.env.GIT_PASSWORD || '';
            return [
                `GIT_USERNAME=${gitUsername}`,
                `GIT_PASSWORD=${gitPassword}`,
            ];
        }

        const executeInteractiveCommand = async (
            container: Docker.Container,
            command: string,
            ws: WebSocket,
            sessionId: string
        ) => {
            const exec = await container.exec({
                Cmd: ['bash', '-c', command],
                AttachStdout: true,
                AttachStderr: true,
            });

            const stdoutStream = new PassThrough();
            const stderrStream = new PassThrough();

            exec.start({}, (err: Error | null, stream: NodeJS.ReadableStream | undefined) => {
                if (err) throw err;
                if (stream) {
                    container.modem.demuxStream(stream, stdoutStream, stderrStream);
                    stream.on('end', () => {
                        stdoutStream.end();
                        stderrStream.end();
                    });
                }
            });

            const stdout = await new Promise<string>((resolve, reject) => {
                stdoutStream.on('data', (chunk) => resolve(chunk.toString()));
                stdoutStream.on('end', () => resolve(''));
                stdoutStream.on('error', (err) => reject(err));
            });

            const stderr = await new Promise<string>((resolve, reject) => {
                stderrStream.on('data', (chunk) => resolve(chunk.toString()));
                stderrStream.on('end', () => resolve(''));
                stderrStream.on('error', (err) => reject(err));
            });

            return { stdout, stderr };
        }

        const setupWebSocketServer = () => {
            wsServer.on('connection', (ws, req) => {
                // Extract session ID or assign one
                const sessionId = generateSessionId();
                activeSessions.set(sessionId, ws);
                commandHistory.set(sessionId, []); // Initialize command history
                context.set(sessionId, {}); // Initialize context
    
                ws.on('message', async (message) => {
                    const msg = JSON.parse(message.toString());
                    const { containerId, command, nlInstruction } = msg;
                    const container = docker.getContainer(containerId);
                    if (container) {
                        let actualCommand = command;
                        if (nlInstruction) {
                            actualCommand = translateNaturalLanguage(nlInstruction);
                        }
                        await executeInteractiveCommand(container, actualCommand, ws, sessionId);
                    } else {
                        ws.send(JSON.stringify({ error: 'Container not found' }));
                    }
                });
    
                ws.on('close', () => {
                    activeSessions.delete(sessionId);
                    commandHistory.delete(sessionId);
                    context.delete(sessionId);
                });
            });
        }
    
        const generateSessionId = (): string => {
            return Math.random().toString(36).substr(2, 9);
        }    

        // Method to ensure Docker image is available
        const ensureDockerImage = async (docker: Docker, config: any) => {
            const imageName = config.useCustomDockerfile ? 'custom-docker-image' : config.dockerImage;
            if (config.useCustomDockerfile && config.dockerfilePath) {
                await buildDockerImage(docker, config.dockerfilePath, imageName);
            } else {
                await pullDockerImage(docker, imageName);
            }
        }

        // Method to get or create a container
        const getOrCreateContainer = async (
            docker: Docker,
            containerName: string,
            config: any
        ): Promise<Docker.Container> => {
            const containers = await docker.listContainers({ all: true });
            const existingContainerInfo = containers.find((c) => c.Names.includes(`/${containerName}`));

            const hostConfig: Docker.ContainerCreateOptions['HostConfig'] = {
                NanoCpus: (config.cpuLimit || 1) * 1e9,
                Memory: (config.memoryLimit || 512) * 1024 * 1024,
                NetworkMode: config.networkMode || 'bridge',
                Binds: getVolumeBinds(config.volumeMounts, config.sharedDir),
                CapDrop: ['ALL'],
                CapAdd: ['CHOWN', 'SETUID', 'SETGID'],
            };

            if (config.networkMode === 'custom' && config.customNetworkName) {
                hostConfig.NetworkMode = config.customNetworkName;
            }

            const envVars = getGitCredentialsEnv();

            if (existingContainerInfo) {
                const container = docker.getContainer(existingContainerInfo.Id);
                const containerData = await container.inspect();
                if (containerData.State.Status !== 'running') {
                    await container.start();
                }
                return container;
            } else {
                const container = await docker.createContainer({
                    Image: config.useCustomDockerfile ? 'custom-docker-image' : config.dockerImage,
                    Tty: true,
                    OpenStdin: true,
                    Cmd: ['/bin/bash'],
                    name: containerName,
                    HostConfig: hostConfig,
                    Env: envVars,
                    User: 'developer', // Non-root user
                });
                await container.start();
                return container;
            }
        }

        // Method to handle 'Execute Command' operation
        const handleExecuteCommand = async (
            container: Docker.Container,
            itemIndex: number,
            returnData: INodeExecutionData[]
        ) => {
            let command = getNodeParameter('command', itemIndex) as string;
            const nlInstruction = getNodeParameter('nlInstruction', itemIndex) as string;

            if (nlInstruction) {
                command = translateNaturalLanguage(nlInstruction);
            }

            if (!command) throw new Error('Command is required.');

            const executionTimeout = getNodeParameter('executionTimeout', itemIndex) as number;
            const envVarsInput = getNodeParameter('envVars', itemIndex) as string;
            const runAsUser = getNodeParameter('runAsUser', itemIndex) as string;
            const envVars = parseEnvVars(envVarsInput);

            const output = await executeCommandInContainer(
                container,
                command,
                executionTimeout,
                envVars,
                runAsUser
            );

            // Update Command History and Context
            const sessionId = 'default'; // Assuming a default session for now
            updateCommandHistory(sessionId, command);
            updateContext(sessionId, { lastCommandOutput: output });

            returnData.push({ json: output });
        }

        // Method to handle Environment Discovery
        const handleEnvironmentDiscovery = async (container: Docker.Container, returnData: INodeExecutionData[]) => {
            const command = 'printenv && dpkg -l && uname -a';
            const output = await executeCommandInContainer(container, command, 30, [], '');
            returnData.push({ json: { environment: output.stdout } });
        }

        // Method to handle Package Management
        const handleManagePackages = async (
            container: Docker.Container,
            itemIndex: number,
            returnData: INodeExecutionData[]
        ) => {
            const packageAction = getNodeParameter('packageAction', itemIndex) as string;
            const packageName = getNodeParameter('packageName', itemIndex) as string;

            let command = '';
            if (packageAction === 'install') {
                command = `sudo apt-get update && sudo apt-get install -y ${packageName}`;
            } else if (packageAction === 'uninstall') {
                command = `sudo apt-get remove -y ${packageName}`;
            } else if (packageAction === 'list') {
                command = `dpkg -l`;
            } else {
                throw new Error(`Unsupported package action: ${packageAction}`);
            }

            const output = await executeCommandInContainer(container, command, 120, [], '');
            returnData.push({ json: { result: output.stdout } });
        }

        // Method to handle Running Tests
        const handleRunTests = async (
            container: Docker.Container,
            itemIndex: number,
            returnData: INodeExecutionData[]
        ) => {
            const containerFilePath = getNodeParameter('containerFilePath', itemIndex) as string;
            const command = `python -m unittest ${containerFilePath}`;
            const output = await executeCommandInContainer(container, command, 60, [], '');
            returnData.push({ json: { testResults: output.stdout } });
        }

        // Method to handle Code Analysis
        const handleCodeAnalysis = async (
            container: Docker.Container,
            itemIndex: number,
            returnData: INodeExecutionData[]
        ) => {
            const containerFilePath = getNodeParameter('containerFilePath', itemIndex) as string;
            const command = `pylint ${containerFilePath}`;
            const output = await executeCommandInContainer(container, command, 60, [], '');
            returnData.push({ json: { analysisReport: output.stdout } });
        }

        // Method to handle Multi-Container Orchestration
        const handleMultiContainer = async (
            docker: Docker,
            itemIndex: number,
            returnData: INodeExecutionData[]
        ) => {
            const composeFilePath = getNodeParameter('composeFilePath', itemIndex) as string;
            const composeAction = getNodeParameter('composeAction', itemIndex) as string;

            if (!composeFilePath) throw new Error('Compose file path is required.');

            const command = `docker-compose -f ${composeFilePath} ${composeAction === 'up' ? 'up -d' : 'down'}`;
            const output = await executeHostCommand(command);
            returnData.push({ json: { composeOutput: output } });
        }

        // Method to translate natural language instructions into commands
        const translateNaturalLanguage = (nlInstruction: string): string => {
            // For simplicity, we'll use a basic mapping
            const commandsMap: { [key: string]: string } = {
                'list files': 'ls -al',
                'show processes': 'ps aux',
                'check disk space': 'df -h',
                // Add more mappings as needed
            };

            // Use natural language processing to find the closest command
            let bestMatch = '';
            let highestScore = 0;
            for (const [instruction, command] of Object.entries(commandsMap)) {
                const score = natural.JaroWinklerDistance(nlInstruction.toLowerCase(), instruction.toLowerCase());
                if (score > highestScore) {
                    highestScore = score;
                    bestMatch = command;
                }
            }

            return bestMatch || nlInstruction; // Default to the instruction if no match
        }

        // Method to enhance error messages with potential solutions
        const enhanceErrorMessage = async (error: Error): Promise<string> => {
            const commonErrors: { [key: string]: string } = {
                'command not found': 'The command is not recognized. Please check the spelling or install the required package.',
                'permission denied': 'Permission denied. Try running the command with appropriate permissions or as a different user.',
                // Add more common errors and solutions
            };

            let enhancedMessage = error.message;
            for (const [errorMsg, solution] of Object.entries(commonErrors)) {
                if (error.message.toLowerCase().includes(errorMsg)) {
                    enhancedMessage += ` Possible solution: ${solution}`;
                    break;
                }
            }

            return enhancedMessage;
        }

        // Method to update command history
        const updateCommandHistory = (sessionId: string, command: string) => {
            if (commandHistory.has(sessionId)) {
                commandHistory.get(sessionId)?.push(command);
            } else {
                commandHistory.set(sessionId, [command]);
            }
        }

        // Method to update context
        const updateContext = async (sessionId: string, data: any) => {
            if (context.has(sessionId)) {
                Object.assign(context.get(sessionId), data);
            } else {
                context.set(sessionId, data);
            }
        }

        // Method to execute commands on the host machine (for Docker Compose)
        const executeHostCommand = async (command: string): Promise<string> => {
            const exec = require('child_process').exec;
            return new Promise((resolve, reject) => {
                exec(command, (error: Error, stdout: string, stderr: string) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(stdout || stderr);
                    }
                });
            });
        }

        // Utility method to execute command in container
        const executeCommandInContainer = async (
            container: Docker.Container,
            command: string,
            timeout: number,
            envVars: string[],
            runAsUser: string
        ): Promise<{ stdout: string; stderr: string; exitCode: number; performanceMetrics: any }> => {
            return new Promise(async (resolve, reject) => {
                try {
                    const exec = await container.exec({
                        Cmd: ['bash', '-c', command],
                        AttachStdout: true,
                        AttachStderr: true,
                        Env: envVars,
                        User: runAsUser || undefined,
                    });

                    const stdoutStream = new PassThrough();
                    const stderrStream = new PassThrough();
                    const output = { stdout: '', stderr: '', exitCode: 0, performanceMetrics: {} };

                    exec.start({}, (err: Error | null, stream: NodeJS.ReadableStream | undefined) => {
                        if (err) throw err;
                        if (stream) {
                            container.modem.demuxStream(stream, stdoutStream, stderrStream);
                            stream.on('end', () => {
                                stdoutStream.end();
                                stderrStream.end();
                            });
                        }
                    });

                    stdoutStream.on('data', (chunk) => (output.stdout += chunk.toString()));
                    stderrStream.on('data', (chunk) => (output.stderr += chunk.toString()));
                } catch (error) {
                    reject(error);
                }
            });
        }

        const handleFileOperation = async (container: Docker.Container, itemIndex: number, returnData: INodeExecutionData[]) => {
            const fileAction = getNodeParameter('fileAction', itemIndex) as string;
            const filePath = getNodeParameter('filePath', itemIndex) as string;

            if (fileAction === 'read') {
                const content = await readFileFromContainer(container, filePath);
                returnData.push({ json: { fileContent: content } });
            } else if (fileAction === 'write') {
                const content = getNodeParameter('fileContent', itemIndex) as string;
                await writeFileInContainer(container, filePath, content);
                returnData.push({ json: { message: 'File written successfully' } });
            } else {
                throw new Error(`Unsupported file action: ${fileAction}`);
            }
        }

        const snapshot = async (container: Docker.Container, itemIndex: number, returnData: INodeExecutionData[]) => {
            const snapshotFilePath = getNodeParameter('snapshotFilePath', itemIndex) as string;
            const snapshotCommand = `tar czf ${snapshotFilePath} /`;
            const output = await executeCommandInContainer(container, snapshotCommand, 60, [], '');
            returnData.push({ json: { snapshot: output.stdout } });
        }

        const handleHealthCheck = async (container: Docker.Container, itemIndex: number, returnData: INodeExecutionData[]) => {
            const healthCheckCommand = 'curl -f http://localhost:8080/health';
            const output = await executeCommandInContainer(container, healthCheckCommand, 10, [], '');
            returnData.push({ json: { healthCheck: output.stdout } });
        }

        const handleRetrieveLogs = async (container: Docker.Container, returnData: INodeExecutionData[]) => {
            const logsCommand = 'docker logs';
            const output = await executeHostCommand(logsCommand);
            returnData.push({ json: { logs: output } });
        }

        const handleContainerControl = async (docker: Docker, itemIndex: number, returnData: INodeExecutionData[]) => {
            const containerId = getNodeParameter('containerId', itemIndex) as string;
            const container = docker.getContainer(containerId);
            if (container) {
                const containerAction = getNodeParameter('containerAction', itemIndex) as string;
                if (containerAction === 'start') {
                    await container.start();
                    returnData.push({ json: { message: 'Container started' } });
                } else if (containerAction === 'stop') {
                    await container.stop();
                    returnData.push({ json: { message: 'Container stopped' } });
                } else if (containerAction === 'restart') {
                    await container.restart();
                    returnData.push({ json: { message: 'Container restarted' } });
                } else {
                    throw new Error(`Unsupported container action: ${containerAction}`);
                }
            } else {    
                throw new Error(`Container not found: ${containerId}`);
            }
        }

        const getNode = () => {
            return this;
        }

        setupWebSocketServer();

        try {
            // Ensure the Docker image is available
            await ensureDockerImage(docker, containerConfig);
            // Create or get the container
            container = await getOrCreateContainer(docker, containerName, containerConfig);

            // Process each item
            for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
                const operation = getNodeParameter('operation', itemIndex) as string;

                try {
                    switch (operation) {
                        case 'interactiveSession':
                            // Return the WebSocket server details to the agent
                            returnData.push({
                                json: {
                                    success: true,
                                    message: 'Interactive session started',
                                    wsUrl: `ws://localhost:8080`,
                                    containerId: container.id,
                                },
                            });
                            break;
                        case 'executeCommand':
                            await handleExecuteCommand(container, itemIndex, returnData);
                            break;
                        case 'manageFile':
                            await handleFileOperation(container, itemIndex, returnData);
                            break;
                        case 'transferFile':
                            await transferFile(container, "", "", "toContainer");
                            break;
                        case 'snapshot':
                            await snapshot(container, itemIndex, returnData);
                            break;
                        case 'healthCheck':
                            await handleHealthCheck(container, itemIndex, returnData);
                            break;
                        case 'retrieveLogs':
                            await handleRetrieveLogs(container, returnData);
                            break;
                        case 'containerControl':
                            await handleContainerControl(docker, itemIndex, returnData);
                            break;
                        case 'environmentDiscovery':
                            await handleEnvironmentDiscovery(container, returnData);
                            break;
                        case 'managePackages':
                            await handleManagePackages(container, itemIndex, returnData);
                            break;
                        case 'runTests':
                            await handleRunTests(container, itemIndex, returnData);
                            break;
                        case 'codeAnalysis':
                            await handleCodeAnalysis(container, itemIndex, returnData);
                            break;
                        case 'multiContainer':
                            await handleMultiContainer(docker, itemIndex, returnData);
                            break;
                        default:
                            throw new Error(`Unsupported operation: ${operation}`);
                    }
                } catch (error) {
                    if (loggingLevel === 'error' || loggingLevel === 'debug') {
                        console.error(`Error in operation ${operation}:`, error);
                    }
                    const errorMessage = await enhanceErrorMessage(error);
                    returnData.push({ json: { error: errorMessage } });
                }
            }
        } catch (error) {
            throw new NodeOperationError(getNode(), `Docker operation failed: ${error.message}`);
        }

        return [returnData];
    }
}
