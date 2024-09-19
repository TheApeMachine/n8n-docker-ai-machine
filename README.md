# n8n-nodes-docker-ai-machine

This is an n8n community node. It lets you use Docker containers for AI-driven workflows in your n8n workflows.

The Docker AI Machine node is an advanced Docker setup for AI-driven workflows, providing a controllable environment for executing various operations within Docker containers. The main inspiration for this node was to allow an AI agent to have control over an isolated machine for autonomous development purposes. The primary intention is to connect the TTY (terminal) of the container directly to an agent so it can control things, enabling advanced AI-driven automation and development scenarios.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

[Installation](#installation)  
[Operations](#operations)  
[Credentials](#credentials)  
[Compatibility](#compatibility)  
[Usage](#usage)  
[Resources](#resources)  

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

## Operations

The DockerAIMachineNode supports the following operations:

1. Start Interactive Session
2. Execute Command
3. Manage File
4. Transfer File
5. Container Control
6. Snapshot
7. Health Check
8. Retrieve Logs
9. Environment Discovery
10. Manage Packages
11. Run Tests
12. Code Analysis
13. Multi-Container Orchestration

## Credentials

Users need to authenticate with Docker API credentials. The node uses the `dockerApi` credential type, which should be set up with the Docker host and port.

## Compatibility

This node has been developed and tested with n8n version 0.225.0 and later. It requires Node.js version 18.10 or higher.

## Usage

The DockerAIMachineNode provides a versatile set of operations for managing Docker containers in AI-driven workflows. Here are some key features:

1. Interactive Sessions: Start an interactive session with a Docker container, allowing direct TTY access for AI agents.
2. Command Execution: Execute commands within a container, including support for natural language instructions.
3. File Management: Read, write, and transfer files between the host and containers.
4. Container Control: Start, stop, and manage Docker containers.
5. Environment Management: Discover container environments, manage packages, and perform health checks.
6. Development Tools: Run tests and perform code analysis within containers.
7. Multi-Container Support: Orchestrate multiple containers using Docker Compose.

To use the node, configure the Docker API credentials and select the desired operation. Each operation has its own set of parameters that can be customized based on your requirements.

The node is particularly useful for scenarios where AI agents need to perform autonomous development tasks in isolated environments, with full control over the system resources and capabilities.

## Resources

* [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)
* [Docker API documentation](https://docs.docker.com/engine/api/)
