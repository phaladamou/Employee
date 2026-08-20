@'
# Employee


> **Build AI workers, not chatbots.**


![Status](https://img.shields.io/badge/status-developer%20preview-orange)
![License](https://img.shields.io/badge/license-MIT-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)


Employee is an open-source foundation for building **autonomous AI workers**.


The goal is not to create another chatbot.


Employee is being designed as a runtime where an AI entity can receive missions, reason about them, use tools, operate in an environment, recover from failures, verify its work, maintain memory, and progressively become more capable.


---


## What Works Today


### ✅ Mission Control


Employee now has a mission-oriented execution layer.


Missions are:


- classified
- initialized
- assigned an identity
- tracked through execution
- connected to a plan
- completed after execution and observation


Example:


```text
[MISSION] Input classifié comme mission
[MISSION CONTROL] Mission démarrée
✅ Multi-Task Mission Plans

A mission can be decomposed into multiple tasks.

Employee can execute tasks sequentially and track progress.

Example:

[PLAN] Plan créé avec 3 tâches


[TASK] List files in src/agent
[TOOL] exec
[OBSERVATION] tool: exec
[TASK COMPLETED] List files in src/agent


[PROGRESS] Objectif non satisfait, on continue...


[TASK] Read key files
[TOOL] exec
[OBSERVATION] tool: exec
[TASK COMPLETED] Read key files


[TASK] Write report
...

This moves Employee beyond a single
prompt → response interaction toward an actual mission execution loop.

✅ Working Memory

The current mission is added to working memory.

Relevant memories are filtered before being injected into the reasoning context.

Example:

[MEMORY] Mission ajoutée à la working memory
[MEMORY] 1159 chars filtrés et injectés

The objective is to prevent the model from receiving an uncontrolled amount of historical context.

✅ Persistent Memory Architecture

Employee contains infrastructure for multiple forms of memory:

Working memory
Episodic memory
Semantic memory
Procedural memory

Memory can be filtered for relevance and automatically deduplicated.

Example:

[MEMORY] 65 doublons supprimés

The memory system is still evolving.

✅ Observation Layer

Tool execution produces structured observations.

Example:

[OBSERVATION] tool: exec
  success: true
  stdout: command sent

The runtime can therefore distinguish between:

THINK
   ↓
ACTION
   ↓
OBSERVATION

rather than treating the model's text as proof that an action happened.

✅ Progress Tracking

Employee does not necessarily stop after the first successful tool call.

The mission can evaluate whether the objective has actually been satisfied.

Example:

[TASK COMPLETED] List files in src/agent
[PROGRESS] Objectif non satisfait, on continue...
[TASK] Read key files

This allows a mission to continue across multiple tasks.

✅ Environment Awareness

Employee is being designed to understand the environment in which it operates.

The runtime can distinguish execution environments and shell behavior instead of blindly assuming a specific operating system.

The current development environment is Windows.

✅ Tool Execution

Employee currently exposes execution capabilities including:

shell commands
file system operations
environment inspection
memory operations
other registered tools

Tools are executed by the runtime and return observations to the agent.

Current Working Cycle
MISSION
   ↓
CLASSIFY
   ↓
MISSION CONTROL
   ↓
PLAN
   ↓
WORKING MEMORY
   ↓
FILTER RELEVANT CONTEXT
   ↓
THINK
   ↓
TOOL / ACTION
   ↓
OBSERVATION
   ↓
PROGRESS EVALUATION
   ↓
TASK COMPLETED
   ↓
NEXT TASK
   │
   ├── Objective not satisfied → continue
   │
   └── Objective satisfied
             ↓
        VERIFICATION
             ↓
         COMPLETED
             ↓
          SLEEPING

This execution cycle is the foundation of Employee.

Example Execution

A multi-task mission can produce a sequence such as:

[WAKE UP] Employee is alive.


[MISSION] Input classifié comme mission
[MISSION CONTROL] Mission démarrée


[PLAN] Plan créé avec 3 tâches


[MEMORY] Mission ajoutée à la working memory
[MEMORY] Relevant memories filtered and injected


[THINK] Routing inference...


[TOOL] exec


[OBSERVATION] tool: exec
  success: true


[TASK COMPLETED] List files in src/agent


[PROGRESS] Objectif non satisfait, on continue...


[TASK] Read key files


[THINK] Routing inference...


[TOOL] exec


[OBSERVATION] tool: exec


[TASK COMPLETED] Read key files


[TASK] Write report


...


[MISSION] Mission complétée


State: sleeping

The important property is that the worker continues working when the objective requires multiple actions.

Why Employee?

Most AI applications are optimized around conversation.

Employee is designed around work.

Traditional Chatbot	Employee
Answers a message	Pursues a mission
Generates a response	Executes actions
Mostly reactive	Goal-oriented
Short-lived context	Persistent state and memory
Text in → text out	Mission → Action → Observation
Claims completion	Uses execution evidence
One interaction	Multi-step execution

The difference is fundamental.

Model Agnostic

Employee is designed around a model-independent inference layer.

Current architecture is intended to support:

Provider	Inference
DeepSeek	API-based
OpenAI	API-based
Anthropic	API-based
Ollama	Local inference

The runtime should not be fundamentally tied to a single model provider.

Architecture

The project is organized around independent runtime components:

Employee
│
├── Agent
│   ├── Loop
│   ├── Context
│   ├── Policy
│   ├── Tools
│   └── Inference Bridge
│
├── Orchestration
│   ├── Mission Control
│   ├── Planner
│   ├── Task Graph
│   ├── Workspace
│   ├── Attention
│   └── Health Monitor
│
├── Memory
│   ├── Working Memory
│   ├── Episodic Memory
│   ├── Semantic Memory
│   └── Procedural Memory
│
├── Skills
│
├── Registry
│   ├── Agent Cards
│   ├── Discovery
│   └── Capabilities
│
├── Self Modification
│   ├── Audit
│   ├── Code
│   └── Upstream
│
├── Replication
│   ├── Lifecycle
│   ├── Lineage
│   ├── Health
│   └── Spawn
│
├── State
│   └── Database
│
└── Runtime Infrastructure
    ├── Heartbeat
    ├── Observability
    ├── Identity
    ├── Security
    └── Local Environment

The architecture is intentionally being developed as a runtime foundation, rather than as a single role-specific agent.

Design Philosophy

Employee follows a simple principle:

An AI worker should be defined by what it can accomplish, not only by what it can say.

The runtime comes first.

Roles come later.

Employee should eventually make it possible to create different workers on top of the same underlying runtime:

                 EMPLOYEE RUNTIME
                        │
        ┌───────────────┼───────────────┐
        ↓               ↓               ↓
       CEO           ENGINEER       RESEARCHER
        │               │               │
        └───────────────┼───────────────┘
                        ↓
                Shared capabilities
                Shared runtime
                Shared primitives
Roadmap
Foundation
 Agent execution loop
 Model inference
 Mission classification
 Mission Control
 Mission identity
 Multi-task mission plans
 Working memory
 Memory filtering
 Memory deduplication
 Tool execution
 Structured observations
 Progress tracking
 Basic verification
 Environment awareness
In Progress
 Stronger recovery policies
 Formal capability system
 Resource budgets
 Persistent mission state
 More robust verification
 Parallel task execution
 Long-running missions
 Procedural memory
Next
 Role system
 Custom Employee profiles
 Specialized capabilities
 Multi-Employee collaboration
 Experience-based adaptation
 Advanced planning
 Mission scheduling
 Worker-to-worker communication
Quick Start
# Clone
git clone https://github.com/your-user/employee.git
cd employee


# Install
npm install


# Build
npx tsc


# Configure your model
# PowerShell:
$env:DEEPSEEK_API_KEY = "your-key"


# Run
node test-agent.mjs
Current Status

Developer Preview — Experimental

Employee is actively being developed.

The runtime already demonstrates:

Mission
   ↓
Planning
   ↓
Memory
   ↓
Inference
   ↓
Tool execution
   ↓
Observation
   ↓
Progress
   ↓
Next task
   ↓
Completion

However, the system is not yet production-ready.

Internal APIs, architecture, runtime behavior, and interfaces may change significantly.

The objective at this stage is not perfection.

The objective is to build a solid autonomous-worker runtime that can progressively become more capable.

Contributing

Employee is currently in an early development stage.

Architecture, APIs, runtime behavior, and internal interfaces are subject to change.

Contributions, experiments, architecture discussions, and technical feedback are welcome.

License

MIT License
'@ | Set-Content "README.md" -Encoding UTF8