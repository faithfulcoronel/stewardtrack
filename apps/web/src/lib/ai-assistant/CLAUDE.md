# CLAUDE.md - StewardTrack AI Assistant Architecture

This file provides guidance for working with the AI Assistant layer in StewardTrack, which implements **Clean Architecture** with **SOLID principles** throughout.

## Overview

The AI Assistant is the core of StewardTrack's AI capabilities, providing a plugin-based system for AI tools with streaming responses. It enables church staff to interact with the system using natural language and can process multimodal input (text, images, documents).

## Architecture

### Clean Architecture Layers

```
┌───────────────────────────────────────────────────────────┐
│              Infrastructure Layer                         │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ Tools (4+ implementations, extensible)             │  │
│  │ - CreateFinancialTransactionTool                    │  │
│  │ - GetFinancialCategoriesTool                        │  │
│  │ - GetFinancialFundsTool                             │  │
│  │ - GetFinancialSourcesTool                           │  │
│  ├─────────────────────────────────────────────────────┤  │
│  │ AI Services                                         │  │
│  │ - PluginAwareAgenticExecutor (tool execution)      │  │
│  │ - SystemPromptBuilder (church domain prompts)      │  │
│  ├─────────────────────────────────────────────────────┤  │
│  │ Streaming                                           │  │
│  │ - SSEStreamHandler (Server-Sent Events)            │  │
│  └─────────────────────────────────────────────────────┘  │
├───────────────────────────────────────────────────────────┤
│              Application Layer                            │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ ChatOrchestrator                                    │  │
│  │ - Main coordinator for AI conversations            │  │
│  │ - Handles streaming, tool execution, attachments   │  │
│  ├─────────────────────────────────────────────────────┤  │
│  │ ToolRegistry                                        │  │
│  │ - Plugin discovery and registration                │  │
│  │ - Dynamic tool loading                             │  │
│  └─────────────────────────────────────────────────────┘  │
├───────────────────────────────────────────────────────────┤
│              Core/Domain Layer                            │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ Interfaces                                          │  │
│  │ - ITool, IToolRegistry                             │  │
│  │ - IExecutor, IStreamHandler                        │  │
│  ├─────────────────────────────────────────────────────┤  │
│  │ Value Objects                                       │  │
│  │ - UserContext (tenant, ministry, campus)           │  │
│  └─────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────┘
```

### SOLID Principles Applied

1. **Single Responsibility Principle (SRP)**
   - Each tool has one specific responsibility
   - Orchestrator focuses on coordination, not implementation
   - Services handle business logic, repositories handle data

2. **Open/Closed Principle (OCP)**
   - System is open for extension (new tools) via plugins
   - Closed for modification (core interfaces stable)
   - New tools added without changing existing code

3. **Liskov Substitution Principle (LSP)**
   - All tools implement `ITool` interface
   - Any `ITool` implementation is substitutable
   - AI services implement `IAIService` interface

4. **Interface Segregation Principle (ISP)**
   - Small, focused interfaces (`ITool`, `IStreamHandler`)
   - Tools only implement what they need
   - No fat interfaces with unused methods

5. **Dependency Inversion Principle (DIP)**
   - High-level modules depend on abstractions (interfaces)
   - Low-level modules implement abstractions
   - Dependency injection via InversifyJS container

## Directory Structure

```
apps/web/src/lib/ai-assistant/
├── core/                          # Domain Layer
│   ├── interfaces/                # Core abstractions
│   │   ├── IExecutor.ts           # Tool execution interface
│   │   ├── IStreamHandler.ts      # Streaming interface
│   │   ├── ITool.ts               # Tool interface
│   │   └── IToolRegistry.ts       # Registry interface
│   └── value-objects/             # Domain value objects
│       └── UserContext.ts         # User context (tenant, ministry, campus)
├── application/                   # Application Layer
│   └── services/
│       ├── ChatOrchestrator.ts    # Main AI coordinator
│       └── ToolRegistry.ts        # Tool plugin registry
├── infrastructure/                # Infrastructure Layer
│   ├── tools/                     # Tool implementations
│   │   ├── BaseTool.ts            # Abstract base for tools
│   │   └── plugins/               # Tool plugins organized by domain
│   │       └── finance/           # Finance tools
│   │           ├── CreateFinancialTransactionTool.ts
│   │           ├── GetFinancialCategoriesTool.ts
│   │           ├── GetFinancialFundsTool.ts
│   │           └── GetFinancialSourcesTool.ts
│   ├── ai/                        # AI service implementations
│   │   ├── IAIService.ts          # AI service interface
│   │   ├── PluginAwareAgenticExecutor.ts  # Tool execution engine
│   │   └── SystemPromptBuilder.ts # Church domain system prompts
│   └── streaming/                 # Streaming implementations
│       └── SSEStreamHandler.ts    # Server-Sent Events handler
├── config/
│   └── ToolConfiguration.ts       # Central tool registration
├── AIAssistantFactory.ts          # Dependency injection factory
├── index.ts                       # Main module exports
└── CLAUDE.md                      # This file
```

## Core Interfaces

### ITool Interface

```typescript
/**
 * Core tool interface that all AI tools must implement
 */
export interface ITool {
  /** Unique identifier for the tool */
  readonly name: string;

  /** Human-readable description for AI to understand when to use */
  readonly description: string;

  /** Get tool definition for Claude API (includes input schema) */
  getDefinition(): ToolDefinition;

  /**
   * Execute the tool with given input
   * @param input - Tool-specific input parameters
   * @param context - Execution context (user info, tenant, etc.)
   * @returns ToolResult with success status and data/error
   */
  execute(input: any, context: ToolExecutionContext): Promise<ToolResult>;

  /** Get a human-readable progress message for streaming */
  getProgressMessage(input: any): string;

  /** Get the category this tool belongs to (for UI organization) */
  getCategory(): string;

  /** Get display name for the tool (human-readable) */
  getDisplayName(): string;

  /** Get sample prompts that demonstrate how to use this tool */
  getSamplePrompts(): string[];

  /** Optional: Generate UI components from tool result */
  generateComponents?(result: ToolResult): any[] | null;

  /** Optional: Get system prompt section for this tool */
  getSystemPromptSection?(): string | null;
}
```

### IToolRegistry Interface

```typescript
/**
 * Registry for managing tool plugins
 */
export interface IToolRegistry {
  /** Register a tool plugin */
  register(tool: ITool): void;

  /** Get tool by name */
  getTool(name: string): ITool | undefined;

  /** Get all registered tools */
  getAllTools(): ITool[];

  /** Get tool definitions for Claude API */
  getToolDefinitions(): ToolDefinition[];

  /** Check if a tool is registered */
  hasTool(name: string): boolean;

  /** Unregister a tool (for testing/cleanup) */
  unregister(name: string): void;

  /** Get count of registered tools */
  count(): number;
}
```

### IExecutor Interface

```typescript
/**
 * Interface for executing AI workflows with tool use
 */
export interface IExecutor {
  /**
   * Execute an AI workflow with tool use
   * @param request - Execution request with query and history
   * @param onProgress - Optional callback for progress updates
   * @returns Execution result with response and components
   */
  execute(
    request: ExecutionRequest,
    onProgress?: ProgressCallback
  ): Promise<ExecutionResult>;
}
```

### IStreamHandler Interface

```typescript
/**
 * Interface for handling streaming responses (Server-Sent Events)
 */
export interface IStreamHandler {
  /** Send a stream event to the client */
  sendEvent(event: StreamEvent): void;

  /** Send start event */
  sendStart(sessionId?: string): void;

  /** Send progress event */
  sendProgress(step: any): void;

  /** Send completion event */
  sendComplete(components: any[], tokensUsed: any): void;

  /** Send error event */
  sendError(error: string): void;

  /** Send title update event */
  sendTitleUpdate(title: string): void;

  /** Close the stream */
  close(): void;
}
```

## Application Layer

### ChatOrchestrator

The main coordinator for AI conversations:

```typescript
export class ChatOrchestrator {
  constructor(
    private executor: IExecutor,
    private toolRegistry: ToolRegistry,
    private streamHandler: IStreamHandler
  ) {}

  async processMessage(request: ChatRequest): Promise<ChatResponse> {
    // 1. Build conversation history with multimodal content
    // 2. Execute AI workflow with tool execution
    // 3. Stream progress updates
    // 4. Collect UI components from tools
    // 5. Return final response
  }
}
```

**Responsibilities**:
- Coordinate AI conversation flow
- Handle streaming responses
- Process multimodal attachments (images, documents)
- Trigger tool execution
- Manage conversation state
- Return structured responses

### ToolRegistry

Plugin discovery and registration:

```typescript
export class ToolRegistry implements IToolRegistry {
  private tools = new Map<string, ITool>();

  register(tool: ITool): void {
    this.tools.set(tool.name, tool);
    console.log(`✅ Registered tool: ${tool.name}`);
  }

  getTool(name: string): ITool | undefined {
    return this.tools.get(name);
  }

  getAllTools(): ITool[] {
    return Array.from(this.tools.values());
  }

  getToolDefinitions(): ToolDefinition[] {
    return this.getAllTools().map(tool => tool.getDefinition());
  }
}
```

## Infrastructure Layer

### Tool Implementations

Example tool implementation (see [CreateFinancialTransactionTool.ts](infrastructure/tools/plugins/finance/CreateFinancialTransactionTool.ts)):

```typescript
export class CreateFinancialTransactionTool extends BaseTool {
  readonly name = 'create_financial_transaction';
  readonly description = 'Creates a new income or expense financial transaction...';

  getCategory(): string {
    return 'Finance Tools';
  }

  getSamplePrompts(): string[] {
    return [
      'Record an expense of $50 for office supplies',
      'Add income of $1000 from donations',
    ];
  }

  protected getInputSchema() {
    return {
      type: 'object' as const,
      properties: {
        transaction_type: { type: 'string', enum: ['income', 'expense'] },
        amount: { type: 'number' },
        description: { type: 'string' },
        // ... more fields
      },
      required: ['transaction_type', 'amount', 'description'],
    };
  }

  async execute(input: CreateFinancialTransactionInput, context: ToolExecutionContext): Promise<ToolResult> {
    // 1. Validate input
    // 2. Get tenant context
    // 3. Call IncomeExpenseTransactionService via container
    // 4. Return success/error result
  }
}
```

### BaseTool Abstract Class

All tools extend `BaseTool` which provides common functionality:

```typescript
export abstract class BaseTool implements ITool {
  abstract readonly name: string;
  abstract readonly description: string;

  // Abstract methods that must be implemented
  protected abstract getInputSchema(): { ... };
  abstract execute(input: any, context: ToolExecutionContext): Promise<ToolResult>;
  abstract getCategory(): string;
  abstract getSamplePrompts(): string[];

  // Helper methods provided by BaseTool
  protected success(data: any): ToolResult { ... }
  protected error(message: string): ToolResult { ... }
  protected validateRequired(input: any, fields: string[]): { ... }
  protected logStart(input: any): void { ... }
  protected logSuccess(duration: number): void { ... }
  protected logError(error: any): void { ... }

  // Default implementations (can be overridden)
  getDisplayName(): string { ... }
  getProgressMessage(input: any): string { ... }
  generateComponents?(result: ToolResult): any[] | null { return null; }
}
```

### PluginAwareAgenticExecutor

Executes multi-turn agentic conversations with tool use:

```typescript
export class PluginAwareAgenticExecutor implements IExecutor {
  private maxTurns: number = 10;

  constructor(
    private aiService: IAIService,
    private toolRegistry: IToolRegistry,
    private onProgress?: ProgressCallback
  ) {}

  async execute(request: ExecutionRequest, onProgress?: ProgressCallback): Promise<ExecutionResult> {
    // 1. Build system prompt with tool instructions
    // 2. Enter agentic loop (up to maxTurns)
    // 3. Send messages to AI with tool definitions
    // 4. Execute tools via registry when AI requests them
    // 5. Feed tool results back to AI
    // 6. Continue until AI provides final response (no tool use)
    // 7. Return final response with collected components
  }
}
```

**Key Features**:
- Zero switch statements (fully delegates to plugins)
- Multi-turn conversation loop
- Progress streaming support
- Token usage tracking
- Cancellation support via AbortSignal

## Adding a New Tool

### Step 1: Create the Tool Class

Create a new file in `infrastructure/tools/plugins/<domain>/`:

```typescript
// Example: GetMembersTool.ts
import { BaseTool } from '../../BaseTool';
import { ToolResult, ToolExecutionContext } from '../../../../core/interfaces/ITool';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { IMemberRepository } from '@/repositories/member.repository';

export interface GetMembersInput {
  filter?: string;
  limit?: number;
}

export class GetMembersTool extends BaseTool {
  readonly name = 'get_members';
  readonly description = 'Retrieves church members with optional filtering';

  getCategory(): string {
    return 'Member Tools';
  }

  getSamplePrompts(): string[] {
    return [
      'Show me all members',
      'Find members named John',
      'List active members',
    ];
  }

  protected getInputSchema() {
    return {
      type: 'object' as const,
      properties: {
        filter: {
          type: 'string',
          description: 'Optional filter for member name or email',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of members to return',
        },
      },
      required: [],
    };
  }

  async execute(input: GetMembersInput, context: ToolExecutionContext): Promise<ToolResult> {
    this.logStart(input);
    const startTime = Date.now();

    try {
      // Get repository via container
      const memberRepo = container.get<IMemberRepository>(TYPES.IMemberRepository);

      // Execute query
      const result = await memberRepo.findAll();

      if (!result.success || !result.data) {
        return this.error('Failed to retrieve members');
      }

      const members = result.data;

      // Apply filter if provided
      let filteredMembers = members;
      if (input.filter) {
        const filterLower = input.filter.toLowerCase();
        filteredMembers = members.filter(m =>
          m.first_name?.toLowerCase().includes(filterLower) ||
          m.last_name?.toLowerCase().includes(filterLower) ||
          m.email?.toLowerCase().includes(filterLower)
        );
      }

      // Apply limit
      if (input.limit && input.limit > 0) {
        filteredMembers = filteredMembers.slice(0, input.limit);
      }

      this.logSuccess(Date.now() - startTime);

      return this.success({
        members: filteredMembers,
        total: filteredMembers.length,
        message: `Found ${filteredMembers.length} members`,
      });
    } catch (error: any) {
      this.logError(error);
      return this.error(`Failed to get members: ${error.message}`);
    }
  }

  getProgressMessage(input: GetMembersInput): string {
    return input.filter
      ? `Searching for members matching "${input.filter}"...`
      : 'Retrieving members...';
  }

  // Optional: Generate UI components
  generateComponents(result: ToolResult): any[] | null {
    if (!result.success || !result.data) {
      return null;
    }

    return [
      {
        type: 'MemberList',
        props: {
          members: result.data.members,
          total: result.data.total,
        },
      },
    ];
  }

  // Optional: Provide tool-specific system prompt instructions
  getSystemPromptSection(): string {
    return `
GET MEMBERS TOOL - Usage Instructions:

**When to Use:**
- User asks about church members
- User wants to find a specific member
- User needs member information

**Important:**
- Always respect privacy and data protection
- Only show member information to authorized users
- Filter results appropriately based on user permissions
    `.trim();
  }
}
```

### Step 2: Register the Tool

Add your tool to [config/ToolConfiguration.ts](config/ToolConfiguration.ts):

```typescript
import { GetMembersTool } from '../infrastructure/tools/plugins/members/GetMembersTool';

export async function configureTools(): Promise<ToolRegistry> {
  const registry = new ToolRegistry();

  console.log('🔧 Configuring AI Assistant tools...');

  // ... existing finance tools ...

  // ============================================================================
  // MEMBER TOOLS
  // ============================================================================
  console.log('👥 Registering member tools...');

  registry.register(new GetMembersTool());

  // ... more tools ...

  console.log(`✅ Configured ${registry.count()} tools`);
  return registry;
}
```

### Step 3: Test Your Tool

The tool is now available to the AI! Test it by:

1. Starting the AI assistant
2. Asking a question like "Show me all members"
3. The AI will automatically call your tool
4. Verify the results are correct

## Integration with StewardTrack

### Dependency Injection

Tools use InversifyJS container to access services and repositories:

```typescript
// Get service from container
const memberService = container.get<MemberService>(TYPES.MemberService);

// Use service
const members = await memberService.findAll();
```

### Tenant Context

All tools have access to tenant context via the execution context:

```typescript
async execute(input: any, context: ToolExecutionContext): Promise<ToolResult> {
  // Get tenant ID from context
  const tenantId = context.tenantId;

  // Or get tenant service
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const tenant = await tenantService.getCurrentTenant();
}
```

### RBAC Integration

Tools should respect user permissions:

```typescript
// Check user permissions before executing sensitive operations
const rbacService = container.get<RbacCoreService>(TYPES.RbacCoreService);
const hasPermission = await rbacService.checkPermission(
  context.userId,
  'members:delete'
);

if (!hasPermission) {
  return this.error('You do not have permission to delete members');
}
```

### Metadata System

Tools integrate with StewardTrack's metadata system for consistent UI rendering:

```typescript
generateComponents(result: ToolResult): any[] | null {
  // Return components that match metadata system component types
  return [
    {
      type: 'AdminDataGridSection',
      props: {
        rows: result.data.members,
        columns: [...],
      },
    },
  ];
}
```

## Best Practices

### 1. Tool Design

- ✅ **Single Responsibility**: Each tool does one thing well
- ✅ **Clear Naming**: Use descriptive names (e.g., `get_financial_categories` not `get_cats`)
- ✅ **Good Descriptions**: Help AI understand when to use the tool
- ✅ **Sample Prompts**: Provide examples of how users might invoke the tool
- ✅ **Input Validation**: Always validate input parameters
- ✅ **Error Handling**: Return clear error messages
- ✅ **Progress Messages**: Provide user-friendly progress updates

### 2. User Confirmation

**CRITICAL**: Always ask for user confirmation before taking actions:

```typescript
getSystemPromptSection(): string {
  return `
**CRITICAL: Always Ask for Confirmation First**
NEVER create/update/delete without user confirmation. Always:
1. Extract/collect the details
2. Present the details to the user for review
3. Ask "Would you like me to [action]?"
4. Only call the tool after user explicitly confirms
  `.trim();
}
```

### 3. Security

- ✅ Respect tenant isolation (always filter by tenant)
- ✅ Check RBAC permissions before sensitive operations
- ✅ Validate all inputs to prevent injection attacks
- ✅ Log all tool executions for audit trails
- ✅ Never expose sensitive data in error messages

### 4. Performance

- ✅ Use caching where appropriate
- ✅ Limit result sets (use pagination)
- ✅ Optimize database queries
- ✅ Stream progress for long-running operations
- ✅ Support cancellation via AbortSignal

### 5. Multimodal Support

Tools can handle image receipts and documents:

```typescript
// ChatOrchestrator automatically handles images in messages
// Tools receive the extracted information via system prompt

// Example: Receipt image → AI extracts amount, vendor, date → Tool creates transaction
```

## Troubleshooting

### Tool Not Being Called

1. Check tool is registered in `ToolConfiguration.ts`
2. Verify tool name matches what AI is trying to call
3. Check tool description is clear and specific
4. Review system prompt instructions (if provided)

### Errors During Execution

1. Check logs for detailed error messages
2. Verify dependencies are available in container
3. Ensure tenant context is available
4. Check RBAC permissions
5. Validate input parameters

### Permission Errors

1. Verify user has required permissions
2. Check RBAC configuration
3. Ensure tenant isolation is working
4. Review RLS policies in Supabase

## Future Enhancements

Planned improvements to the AI Assistant system:

1. **Memory System**: Remember user preferences and past conversations
2. **Response Validation**: Quality checks for AI responses
3. **Integration Tools**: Email, SMS, calendar integration
4. **Member Tools**: Complete CRUD operations for members
5. **Donation Tools**: Track and report donations
6. **Event Tools**: Schedule and manage church events
7. **Communication Tools**: Send announcements and newsletters
8. **Analytics Tools**: Generate reports and insights

## References

- **Clean Architecture**: https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html
- **SOLID Principles**: https://en.wikipedia.org/wiki/SOLID
- **Plugin Architecture**: https://www.martinfowler.com/articles/plugins.html
- **Claude API**: https://docs.anthropic.com/
- **Next.js**: https://nextjs.org/docs
- **InversifyJS**: https://inversify.io/
