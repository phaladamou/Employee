# Employee Architecture

Employee is an open-source runtime for autonomous AI workers.

This document describes the system architecture, components, execution lifecycle, and data flow.

## Table of Contents

* [System Overview](#system-overview)
* [Runtime Lifecycle](#runtime-lifecycle)
* [Directory Structure](#directory-structure)
* [Agent Loop](#agent-loop)
* [Mission System](#mission-system)
* [Memory System](#memory-system)
* [Tool System](#tool-system)
* [Observation & Verification](#observation--verification)
* [Environment Profile](#environment-profile)
* [Inference](#inference)
* [Database](#database)
* [Security](#security)

---

## System Overview

```text
+------------------------------------------------------------------+
|                         EMPLOYEE RUNTIME                         |
|                                                                  |
|  +------------+  +------------+  +------------+  +------------+ |
|  |  Mission   |  |   Agent    |  |   Memory   |  | Inference  | |
|  |  Control   |->|    Loop    |->|   System   |  |   Engine   | |
|  +------------+  +------------+  +------------+  +------------+ |
|        |               |               |               |        |
|  +------------+  +------------+  +------------+  +------------+ |
|  |    Plan    |  |   Tools    |  |   Filter   |  |   Model    | |
|  |   Manager  |  |   (exec)   |  | (relevant) |  |   Router   | |
|  +------------+  +------------+  +------------+  +------------+ |
|                                                                  |
|  +------------------------------------------------------------+  |
|  |                  SQLite Database (state.db)                |  |
|  | turns | missions | memory | observations | tasks           |  |
|  +------------------------------------------------------------+  |
+------------------------------------------------------------------+
```

Employee is organized around one fundamental principle:

> **The model reasons. The runtime executes, observes, persists, and verifies.**

The inference model is therefore only one component of the system. Employee provides the runtime required to turn model reasoning into controlled autonomous work.

---

## Runtime Lifecycle

The runtime follows a controlled lifecycle:

```text
       START
         |
    [Load config]
         |
    [Initialize database]
         |
    [Detect environment]
         |
    +----v----+
    |  WAKING |
    +---------+
         |
    [Classify input]
         |
    +---------+
    | RUNNING |
    |  Loop   |
    +---------+
         |
    [Mission complete
     or max turns]
         |
    +----------+
    | SLEEPING |
    +----------+
```

### Startup

At startup, Employee:

1. Loads configuration.
2. Initializes persistent state.
3. Detects the execution environment.
4. Initializes the agent runtime.
5. Waits for an input or mission.

### Running

During execution, the agent repeatedly:

1. Builds its context.
2. Retrieves relevant memory.
3. Calls the inference model.
4. Executes tools when required.
5. Observes the results.
6. Evaluates progress.
7. Continues or transitions toward completion.

### Sleeping

The worker enters a sleeping state when:

* The mission has been completed and verified.
* The configured turn limit has been reached.
* Execution must stop safely.

---

## Directory Structure

```text
src/
  index.ts                 Entry point
  config.ts                Configuration
  types.ts                 Shared interfaces

  agent/
    loop.ts                Main execution loop
    tools.ts               Tool definitions
    system-prompt.ts       Prompt builder
    context.ts             Context assembly
    injection-defense.ts   Input sanitization
    environment-profile.ts Environment detection

  orchestration/
    mission-control.ts     Mission state machine
    mission-plan.ts        Task planning
    mission-classifier.ts  Input classification
    observation.ts         Structured observations
    progress-evaluator.ts  Progress evaluation
    task-graph.ts          Task dependencies

  memory/
    working.ts             Working memory
    episodic.ts            Episodic memory
    semantic.ts            Semantic memory
    procedural.ts          Procedural memory
    retrieval.ts           Memory retrieval
    ingestion.ts           Memory ingestion
    memory-filter.ts       Relevance filtering
    memory-manager.ts      Memory management and deduplication

  inference/
    router.ts              Model selection
    registry.ts            Model catalog
    budget.ts              Cost tracking

  state/
    database.ts            Database helpers
    schema.ts              SQLite schema

  observability/
    logger.ts              Structured logging
```

The architecture is modular so that individual subsystems can evolve independently without coupling the entire runtime to a single model or framework.

---

## Agent Loop

The agent loop is the central execution mechanism.

Conceptually:

```text
for each turn:

  1. Build system prompt
        ↓
  2. Retrieve filtered memories
        ↓
  3. Call inference
        ↓
  4. Execute tool if needed
        ↓
  5. Record observation
        ↓
  6. Evaluate progress
        ↓
  7. Mark task completed when appropriate
        ↓
  8. Continue or complete mission
```

The loop is intentionally iterative.

A tool call does not automatically mean that the mission is complete. The worker must inspect the resulting observation and determine whether additional work is necessary.

---

## Mission System

The mission system transforms high-level objectives into controlled execution.

### Mission Classification

Incoming inputs are classified as either:

```text
conversation
mission
```

A mission enters the autonomous execution pipeline.

### Mission Control

Mission execution is governed by a state machine:

```text
executing
    ↓
verifying
    ↓
completed
```

Invalid state transitions are rejected.

This prevents the worker from bypassing the verification stage.

### Mission Plan

Missions can be decomposed into executable tasks.

Example:

```typescript
interface MissionTask {
  id: string;
  description: string;
  tool: string;
  completed: boolean;
  observation?: string;
}
```

A mission can therefore move from:

```text
Objective
   ↓
Plan
   ↓
Tasks
   ↓
Tool execution
   ↓
Observations
   ↓
Verification
   ↓
Completion
```

### Task Progress

Each task has an execution state.

The runtime tracks whether the task:

* Has not started.
* Is currently executing.
* Has completed.
* Has failed.
* Requires further work.

The mission itself is only considered complete when the overall objective has been sufficiently achieved and verified.

---

## Memory System

Employee uses multiple forms of memory.

```text
+-------------------+
| Working Memory    |  Current mission context
+-------------------+
| Episodic Memory   |  Past events and tool outcomes
+-------------------+
| Semantic Memory   |  Facts and knowledge
+-------------------+
| Procedural Memory |  How-to procedures
+-------------------+
```

### Working Memory

Contains information required for the current execution.

It represents the worker's active context.

### Episodic Memory

Stores events from previous execution cycles.

Examples:

* Actions performed.
* Tool results.
* Mission events.
* Important observations.

### Semantic Memory

Stores reusable facts and knowledge.

### Procedural Memory

Stores useful procedures and patterns for accomplishing recurring types of tasks.

### Memory Retrieval

Relevant memories are retrieved according to the current mission and context.

Employee should avoid injecting the entire memory store into every inference request.

### Memory Filtering

Only relevant memories are selected for the active context.

```text
Current Mission
      ↓
Memory Retrieval
      ↓
Relevance Filtering
      ↓
Context Injection
```

### Deduplication

Duplicate memories are removed to prevent unnecessary context growth.

---

## Tool System

Tools provide the worker with the ability to interact with its environment.

### Shell Execution

Employee can execute shell commands through its execution tool.

```typescript
exec(command: string): {
  stdout: string;
  stderr: string;
  exitCode: number;
}
```

The result of execution becomes an observation available to the agent.

### File Operations

The tool system supports operations such as:

* Read files.
* Write files.
* List directories.

Tool access is subject to the runtime's security boundaries.

---

## Observation & Verification

Observation is what connects an agent's action to the real state of the environment.

### Structured Observation

Tool results are represented as structured observations:

```typescript
interface Observation {
  tool: string;
  success: boolean;
  stdout?: string;
  durationMs?: number;
}
```

An observation may contain:

* The tool that was executed.
* Whether execution succeeded.
* Output generated by the tool.
* Execution duration.

### Progress Evaluation

After an action, Employee evaluates the result.

The worker determines whether:

```text
Task succeeded
      OR
Task failed
      OR
More work required
```

### Verification

Verification is a distinct stage of mission execution.

The model cannot simply state:

```text
"Mission completed."
```

and automatically cause the runtime to accept the mission as completed.

Completion should be based on observable evidence and the mission's requirements.

```text
Action
  ↓
Observation
  ↓
Evaluation
  ↓
Evidence
  ↓
Verification
  ↓
Completed
```

---

## Environment Profile

Employee detects characteristics of the environment in which it is running.

Example:

```text
## ENVIRONMENT PROFILE

OS: Windows
Shell: cmd.exe
Working directory: C:\Users\Dell\Downloads\employee
```

The profile can provide information such as:

* Operating system.
* Available shell.
* Current working directory.

This allows the worker to adapt its execution strategy to the environment.

---

## Inference

Employee is designed to be model-agnostic.

The runtime can work with different inference providers:

| Provider  | Type  |
| --------- | ----- |
| DeepSeek  | API   |
| OpenAI    | API   |
| Anthropic | API   |
| Ollama    | Local |

The architecture separates inference from execution.

```text
+-------------------+
|    Employee       |
|     Runtime       |
+---------+---------+
          |
          v
+-------------------+
| Inference Router  |
+---------+---------+
          |
     +----+----+---------+
     |         |         |
     v         v         v
 DeepSeek    OpenAI   Anthropic
```

The model provides reasoning capabilities.

Employee provides the worker runtime around those capabilities.

---

## Database

Employee uses SQLite for persistent runtime state.

The database is accessed through:

```text
state/database.ts
state/schema.ts
```

When using `better-sqlite3`, the runtime can maintain persistent state locally without requiring an external database service.

### Core Tables

```text
turns
```

Stores agent execution turns.

```text
inbox_messages
```

Stores incoming messages and their processing state.

```text
working_memory
```

Stores current mission context.

```text
episodic_memory
```

Stores past execution events.

```text
semantic_memory
```

Stores reusable facts and knowledge.

```text
procedural_memory
```

Stores reusable procedures.

```text
missions
```

Stores mission state and lifecycle information.

The database provides continuity across execution cycles and restarts.

---

## Security

Autonomous workers require explicit boundaries.

Employee therefore separates the worker's reasoning from its security controls.

### Constitution

The constitution defines the worker's fundamental rules.

```text
constitution.md
```

These rules establish the behavioral constraints that the worker must follow.

### Injection Defense

External content must be treated as untrusted.

Potentially untrusted sources include:

* Files.
* Tool output.
* External documents.
* User-provided content.
* Data returned by external services.

External instructions must not automatically override the worker's governing instructions.

### Path Protection

File operations must respect configured filesystem boundaries.

A mission should not grant unrestricted filesystem access merely because the model requests it.

### Execution Boundaries

Tool execution should remain subject to:

* Runtime policies.
* Worker permissions.
* Security constraints.
* Mission context.
* Environment boundaries.

The objective is not to prevent the worker from acting.

The objective is to ensure that autonomous action remains **controlled, observable, and verifiable**.
