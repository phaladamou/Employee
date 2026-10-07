# Employee Documentation

Complete reference for creating, configuring, and operating autonomous AI workers.

## Table of Contents

* [What Is Employee?](#what-is-employee)
* [Quick Start](#quick-start)
* [Installation](#installation)
* [Configuration](#configuration)
* [How the Agent Works](#how-the-agent-works)
* [Mission System](#mission-system)
* [Memory System](#memory-system)
* [Tool System](#tool-system)
* [Observation & Verification](#observation--verification)
* [Environment Profile](#environment-profile)
* [Model Agnostic](#model-agnostic)
* [Security](#security)
* [Troubleshooting](#troubleshooting)
* [License](#license)

---

## What Is Employee?

Employee is an open-source runtime for autonomous AI workers.

It receives missions, creates plans, executes tasks, observes results, verifies completion, and maintains memory across sessions.

Employee is **not a chatbot**. It is a worker that pursues objectives.

The goal is to provide a runtime where AI can operate as an actual digital employee rather than simply responding to individual prompts.

---

## Quick Start

```bash
# Clone
git clone https://github.com/phaladamou/Employee.git
cd Employee

# Install dependencies
pnpm install

# Build
pnpm exec tsc

# Configure your model
$env:DEEPSEEK_API_KEY = "your-key"

# Run
node test-agent.mjs
```

---

## Installation

### Prerequisites

* Node.js >= 20.0.0
* npm or pnpm
* Internet access for model APIs
* A supported inference provider and API key

### From Source

```bash
git clone https://github.com/phaladamou/Employee.git
cd Employee
pnpm install
pnpm exec tsc
```

### File Locations

Employee stores persistent runtime data in the user's home directory:

```text
~/.employee/
  employee.json       Main configuration
  state.db            SQLite state database
  WORKLOG.md          Working log
  constitution.md     Core rules
  skills/             Installed skills
```

---

## Configuration

Employee can be configured through its runtime configuration.

Example:

```jsonc
{
  "name": "Employee",
  "genesisPrompt": "You are an AI worker.",
  "inferenceModel": "deepseek-chat",
  "maxTokensPerTurn": 4096,
  "maxTurnsPerCycle": 5
}
```

### Configuration Parameters

| Parameter          | Description                                            |
| ------------------ | ------------------------------------------------------ |
| `name`             | Name of the worker                                     |
| `genesisPrompt`    | Initial identity and behavioral instructions           |
| `inferenceModel`   | Model used for inference                               |
| `maxTokensPerTurn` | Maximum number of generated tokens per turn            |
| `maxTurnsPerCycle` | Maximum number of reasoning/execution turns in a cycle |

The limits exist to prevent uncontrolled execution and allow the runtime to stop safely.

---

## How the Agent Works

Employee operates through a continuous autonomous loop.

```text
Wake up
  ↓
[Classify input: conversation vs mission]
  ↓
[Create mission plan if mission]
  ↓
[Retrieve filtered memories]
  ↓
[Call inference model]
  ↓
[Execute tool if needed]
  ↓
[Observe result]
  ↓
[Evaluate progress]
  ↓
[Complete task or continue]
  ↓
[Verify mission completion]
  ↓
[Sleep]
```

The worker does not simply generate an answer and stop.

It can:

1. Understand an objective.
2. Determine whether the input represents a mission.
3. Break the mission into executable tasks.
4. Select appropriate tools.
5. Execute actions.
6. Observe the resulting environment.
7. Evaluate whether progress was made.
8. Continue when the objective is not satisfied.
9. Verify completion.
10. Persist relevant information for future work.

This creates an execution-oriented agent rather than a conventional conversational assistant.

---

## Mission System

### Mission Classification

Employee distinguishes between two primary types of input:

```text
conversation
mission
```

A conversation can receive a normal response.

A mission creates an execution process designed to achieve an objective.

### Mission Plan

Missions can be decomposed into multiple tasks.

Example:

```text
[PLAN] Plan created with 3 tasks

[TASK] List files in src/agent
[TASK] Read key files
[TASK] Write report
```

The plan gives the worker a structured path toward the objective.

### Multi-Task Execution

Tasks are executed sequentially with progress tracking.

Example:

```text
[TOOL] exec
[OBSERVATION] tool: exec
[TASK COMPLETED] List files in src/agent

[PROGRESS] Objective not satisfied, continuing...

[TASK] Read key files
```

A completed task does not automatically mean that the entire mission is complete.

The worker evaluates the broader objective and continues when necessary.

### Mission Control

Mission execution follows controlled state transitions.

```text
executing
    ↓
verifying
    ↓
completed
```

Invalid transitions are blocked.

This prevents the runtime from arbitrarily marking missions as complete without passing through the appropriate execution and verification stages.

---

## Memory System

Employee uses memory to maintain continuity between execution cycles.

### Working Memory

Working memory contains information relevant to the current mission.

It allows the worker to maintain context while executing multiple tasks.

### Episodic Memory

Episodic memory records events from previous execution.

Examples include:

* Previous actions
* Tool outcomes
* Mission events
* Execution results
* Important observations

### Semantic Memory

Semantic memory stores useful facts and knowledge that can be reused across missions.

### Memory Filtering

Employee does not blindly inject the entire memory database into every model context.

Relevant memories are filtered before being provided to the worker.

Example:

```text
[MEMORY] 1159 chars filtered and injected
```

This keeps the active context focused on information relevant to the current objective.

### Deduplication

Duplicate memories are automatically removed to reduce unnecessary context and prevent repeated information from accumulating.

---

## Tool System

Tools allow Employee to interact with its environment.

### Shell Execution

The runtime can execute shell commands through the execution tool.

Example interface:

```typescript
exec(command: string): {
  stdout: string;
  stderr: string;
  exitCode: number;
}
```

Tool execution produces an observable result that can subsequently be evaluated by the agent.

### File Operations

Employee can work with files and directories through its file-operation capabilities.

Supported operations include:

* Reading files
* Writing files
* Listing directories

Tools transform the worker from a system that only generates text into a system capable of taking actions.

---

## Observation & Verification

Observation is a fundamental part of the Employee execution loop.

### Structured Observation

Tool results are converted into structured observations.

Example:

```typescript
interface Observation {
  tool: string;
  success: boolean;
  stdout?: string;
  durationMs?: number;
}
```

Observations provide the worker with information about what actually happened after an action.

### Progress Evaluation

After an action is executed, Employee evaluates the result.

The worker determines whether:

* The task succeeded.
* The task failed.
* More work is required.
* The mission objective has been reached.

### Verification

Mission completion requires evidence.

The model cannot simply claim that a mission is complete and have the runtime accept the claim automatically.

The execution state must pass through verification before reaching:

```text
completed
```

This distinction is essential for reliable autonomous execution.

---

## Environment Profile

Employee can detect characteristics of its execution environment.

The environment profile can include:

* Operating system
* Shell
* Working directory

Example:

```text
## ENVIRONMENT PROFILE

OS: Windows
Shell: cmd.exe
Working directory: C:\Users\Dell\Downloads\employee
```

This allows the worker to adapt its actions to the environment in which it is operating.

---

## Model Agnostic

Employee is designed around the worker runtime rather than a single AI provider.

Potential inference providers include:

| Provider  | Type  |
| --------- | ----- |
| DeepSeek  | API   |
| OpenAI    | API   |
| Anthropic | API   |
| Ollama    | Local |

The runtime can therefore evolve independently from any particular model provider.

The model is the reasoning engine.

**Employee is the worker runtime.**

---

## Security

Autonomous execution requires explicit safety boundaries.

Employee includes mechanisms designed to control what the worker can do.

### Constitution

The constitution defines the worker's fundamental rules.

```text
constitution.md
```

Core rules should remain protected from arbitrary modification by the agent.

### Policy Engine

Policies define constraints around agent behavior and tool execution.

### Injection Defense

Employee should treat external content as potentially untrusted.

Instructions contained inside files, tool output, web content, or other external sources must not automatically override the worker's governing instructions.

### Path Protection

File operations should respect configured filesystem boundaries.

The worker should not gain unrestricted access to arbitrary paths simply because a mission requests it.

---

## Troubleshooting

### Agent Loops

Employee limits the number of turns in a cycle.

Default configuration:

```json
{
  "maxTurnsPerCycle": 5
}
```

When the maximum is reached, the current cycle stops rather than continuing indefinitely.

### Memory Errors

Check the persistent state database:

```text
~/.employee/state.db
```

Also verify that the Employee data directory is accessible and writable.

### Model Errors

Verify that the required API key is configured.

For DeepSeek:

```powershell
$env:DEEPSEEK_API_KEY
```

If the value is empty, configure the environment variable before starting the worker.

### Build Errors

Run:

```bash
npm install
npx tsc
```

Check the TypeScript compiler output for the first reported error and resolve dependencies or source issues before rerunning the build.

---

## License

MIT License
