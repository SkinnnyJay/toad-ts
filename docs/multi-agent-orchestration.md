# Multi-Agent Orchestration

TOAD now supports multi-agent orchestration, allowing you to break down complex prompts into sub-tasks that are handled by multiple background agents working in parallel.

## Overview

The multi-agent system consists of:

1. **Plan Generator** - Breaks down prompts into structured tasks
2. **Sub-Agent Manager** - Spawns and manages background agents
3. **Orchestrator** - Coordinates task assignment and inter-agent communication
4. **Communication Bus** - Enables agents to share information and coordinate

## Architecture

```
User Prompt
    ↓
Plan Generator (breaks into tasks)
    ↓
Orchestrator
    ↓
Sub-Agent Manager (spawns agents)
    ↓
[Agent 1] [Agent 2] [Agent 3]
    ↓         ↓         ↓
  Task 1   Task 2   Task 3
    ↓         ↓         ↓
Inter-Agent Communication Bus
    ↓
Results Aggregation
```

## Usage Example

```typescript
import { Orchestrator } from "@/core/orchestrator";
import { SimplePlanGenerator } from "@/core/plan-generator";
import { SubAgentManager } from "@/core/sub-agent-manager";
import { ACPConnection } from "@/core/acp-connection";

// Create dependencies
const planGenerator = new SimplePlanGenerator({
  agentId: "claude-cli",
  sessionId: sessionId,
  maxConcurrentAgents: 3,
});

const subAgentManager = new SubAgentManager({
  agentConfig: {
    command: "claude",
    args: ["--experimental-acp"],
  },
  maxConcurrentAgents: 3,
});

// Create orchestrator
const orchestrator = new Orchestrator({
  planGenerator,
  subAgentManager,
  agentId: "claude-cli",
  sessionId: sessionId,
  maxConcurrentTasks: 3,
});

// Listen to events
orchestrator.on("plan_created", (plan) => {
  console.log("Plan created:", plan.id);
  // Update UI with plan
});

orchestrator.on("task_completed", (taskId, result) => {
  console.log("Task completed:", taskId, result);
});

orchestrator.on("plan_completed", (planId) => {
  console.log("All tasks completed!");
});

// Execute a prompt
const prompt = `
1. Create a new React component
2. Add TypeScript types
3. Write unit tests
4. Update documentation
`;

const plan = await orchestrator.execute(prompt);
```

## Prompt Format

The plan generator recognizes structured prompts:

### Numbered Lists
```
1. First task
2. Second task
3. Third task
```

### Bullet Points
```
- Task one
- Task two
- Task three
```

### With Descriptions
```
1. Create component: Build a new React component
2. Add tests: Write unit tests for the component
```

If no structure is detected, the entire prompt becomes a single task.

## Task Dependencies

Tasks can have dependencies on other tasks:

```typescript
const task1 = {
  id: "task-1",
  title: "Create API endpoint",
  dependencies: [],
};

const task2 = {
  id: "task-2",
  title: "Write tests",
  dependencies: ["task-1"], // Waits for task-1 to complete
};
```

## Inter-Agent Communication

Agents can communicate with each other:

```typescript
// Agent sends a message
subAgentManager.sendMessage({
  from: agentId1,
  to: agentId2, // or undefined for broadcast
  type: "share_result",
  payload: {
    taskId: "task-1",
    result: { data: "..." },
  },
  timestamp: Date.now(),
});
```

Message types:
- `task_complete` - Notify that a task is complete
- `task_failed` - Notify that a task failed
- `need_help` - Request assistance from other agents
- `share_result` - Share results with other agents
- `coordinate` - General coordination message

## UI Integration

Use the `MultiAgentStatus` component to visualize progress:

```typescript
import { MultiAgentStatus } from "@/ui/components/MultiAgentStatus";
import { useAppStore } from "@/store/app-store";

function MyComponent() {
  const plan = useAppStore((state) => state.getPlan(planId));
  const agents = useAppStore((state) => state.getSubAgentsForPlan(planId));

  if (!plan) return null;

  return <MultiAgentStatus plan={plan} agents={agents} />;
}
```

## Configuration

### Max Concurrent Agents
```typescript
const orchestrator = new Orchestrator({
  // ...
  maxConcurrentTasks: 5, // Maximum agents working simultaneously
});
```

### Agent Configuration
```typescript
const subAgentManager = new SubAgentManager({
  agentConfig: {
    command: "claude",
    args: ["--experimental-acp"],
    cwd: process.cwd(),
    env: { ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY },
  },
  maxConcurrentAgents: 3,
});
```

## Future Enhancements

- **LLM-based Planning**: Use an LLM to generate more sophisticated plans
- **Dynamic Task Creation**: Agents can create new tasks during execution
- **Resource Sharing**: Agents can share files, data, and context
- **Conflict Resolution**: Handle conflicts when agents work on related tasks
- **Progress Estimation**: Estimate completion time based on task complexity
- **Retry Logic**: Automatic retry for failed tasks with exponential backoff
