# AI Assistant - Quick Start Guide

## Overview

The AI Assistant is a production-ready chatbot powered by Claude AI that helps manage church operations through natural conversation. It uses Clean Architecture principles with a plugin-based tool system.

## Features

- **Natural Conversation**: Multi-turn agentic conversations with context awareness
- **Tool Execution**: Automatically executes tools based on user intent
- **Streaming Responses**: Real-time SSE streaming for smooth UX
- **Multimodal Support**: Handle text, images (receipts), and documents
- **9 Built-in Tools**:
  - **Finance Tools** (4): Create transactions, get categories/funds/sources
  - **Member Tools** (5): Create members, search, get details, birthdays, anniversaries

## Setup

### 1. Install Dependencies

The `@anthropic-ai/sdk` package is already installed via pnpm.

### 2. Configure API Key

Add your Anthropic API key to your environment variables:

```bash
# .env.local
ANTHROPIC_API_KEY=your-api-key-here
```

Get your API key from: https://console.anthropic.com/

### 3. Access the AI Assistant

Navigate to `/admin/ai-assistant` in your browser. The page is:
- **Mobile-first**: Looks like Facebook Messenger
- **Theme-adaptive**: Works with light/dark mode
- **Role-gated**: Accessible to tenant_admin, senior_pastor, associate_pastor, ministry_leader, secretary

## Architecture

```
ai-assistant/
├── core/                        # Domain Layer (Business Logic)
│   ├── interfaces/             # Contracts (ITool, IToolRegistry, IExecutor)
│   └── value-objects/          # Immutable domain objects (UserContext)
├── application/                # Application Layer (Use Cases)
│   └── services/               # ChatOrchestrator, ToolRegistry
├── infrastructure/             # Infrastructure Layer (External Systems)
│   ├── ai/                     # ClaudeAPIService, PluginAwareAgenticExecutor
│   ├── streaming/              # SSEStreamHandler
│   └── tools/                  # Tool implementations
│       └── plugins/            # Finance and Member tools
└── AIAssistantFactory.ts       # Dependency injection factory
```

## Usage Examples

### Example 1: Financial Transaction from Receipt

**User**: *uploads receipt image* "Add this expense"

**AI**: "I can see this is a receipt from Target for $45.67 on January 20, 2026. Would you like me to create an expense transaction for this?"

**User**: "Yes"

**AI**: "Transaction created successfully! [Transaction details...]"

### Example 2: Member Birthdays

**User**: "Who has a birthday this month?"

**AI**: "Here are the birthdays for January:
- John Smith (Jan 5) - turning 45 in 3 days
- Mary Johnson (Jan 12) - turning 32 in 10 days
- Bob Wilson (Jan 28) - turning 67 in 26 days

Would you like me to help plan any birthday celebrations?"

### Example 3: Member Search

**User**: "Find all married members"

**AI**: "I found 45 married members. Here are the first 10: [list...]"

## Adding New Tools

See [CLAUDE.md](./CLAUDE.md) for detailed instructions on adding new tools.

### Quick Steps:

1. Create tool class extending `BaseTool`
2. Implement required methods
3. Register in `ToolConfiguration.ts`
4. Test with natural language prompts

## API Endpoint

**POST** `/api/ai-chat`

```typescript
{
  message: string;
  sessionId: string;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
  attachments?: Array<{ name: string; type: string; url: string }>;
}
```

**Response**: Server-Sent Events (SSE) stream

```
data: {"type":"start","message":"Processing your request..."}

data: {"type":"progress","tool":"get_member_birthdays","message":"Retrieving birthdays..."}

data: {"type":"content","delta":"Here are the birthdays..."}

data: {"type":"complete","finalMessage":"..."}
```

## Health Check

**GET** `/api/ai-chat`

Returns API status and whether ANTHROPIC_API_KEY is configured.

## Troubleshooting

### "ANTHROPIC_API_KEY not configured"

Set the environment variable:
```bash
export ANTHROPIC_API_KEY=your-key-here
# or add to .env.local
```

### TypeScript Errors

Run:
```bash
pnpm install
```

### Tools Not Executing

Check console logs for tool registration:
```
🧰 Registering finance tools...
👥 Registering member tools...
✅ Configured 9 tools
```

## Performance

- **Average Response Time**: 2-5 seconds (with tool execution)
- **Streaming Latency**: 50-200ms to first token
- **Token Usage**: ~500-2000 tokens per conversation turn
- **Max Turns**: 10 (configurable in PluginAwareAgenticExecutor)

## Security

- **Multi-tenancy**: All tools are tenant-aware via InversifyJS container
- **Role-Based Access**: Menu access controlled by RBAC system
- **Feature Flags**: Page access controlled by license features
- **Input Validation**: All tool inputs validated with JSON schemas

## Next Steps

1. Add more tools for events, donations, communications
2. Implement conversation memory persistence
3. Add user feedback collection
4. Create admin analytics dashboard
5. Implement rate limiting per tenant

## Support

For issues or questions, see the main [CLAUDE.md](./CLAUDE.md) documentation or the project README.
