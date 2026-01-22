# AI Provider Setup Guide

StewardTrack's AI Assistant supports multiple AI providers for flexibility and cost optimization.

## Supported Providers

### 1. Anthropic API (Direct)
**Best for**: Development, smaller deployments, direct API access

**Setup**:
```bash
# .env
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-xxxxx
```

**Pricing**: Pay-as-you-go via Anthropic
- Input: $3 per 1M tokens
- Output: $15 per 1M tokens

**Pros**:
- Simple setup
- Direct access to latest models
- No AWS infrastructure required

**Cons**:
- Higher per-token cost
- No AWS service integration

---

### 2. AWS Bedrock
**Best for**: Production, AWS-integrated environments, cost savings at scale

**Setup**:
```bash
# .env
AI_PROVIDER=bedrock
AWS_REGION=us-west-2

# Option A: Use IAM roles (recommended for EC2/ECS/Lambda)
# No additional configuration needed

# Option B: Use access keys
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=xxxxx
```

**Pricing**: AWS Bedrock pricing (typically 20-30% cheaper than direct API)
- Varies by region
- Volume discounts available

**Pros**:
- Lower cost at scale
- Integrated with AWS services
- IAM role support
- AWS CloudWatch logging
- Private VPC deployment

**Cons**:
- Requires AWS account setup
- Model availability varies by region
- Additional latency (depending on region)

---

## Configuration

### Environment Variables

| Variable | Required | Provider | Description |
|----------|----------|----------|-------------|
| `AI_PROVIDER` | No | All | `anthropic` or `bedrock` (default: `anthropic`) |
| `ANTHROPIC_API_KEY` | Yes | Anthropic | Your Anthropic API key |
| `AWS_REGION` | Yes | Bedrock | AWS region (e.g., `us-west-2`) |
| `AWS_ACCESS_KEY_ID` | No* | Bedrock | AWS access key (if not using IAM roles) |
| `AWS_SECRET_ACCESS_KEY` | No* | Bedrock | AWS secret key (if not using IAM roles) |

*Not required if running on AWS infrastructure with IAM roles (recommended)

### Switching Providers

Simply update the `AI_PROVIDER` environment variable and restart your application:

```bash
# Switch to Bedrock
AI_PROVIDER=bedrock
AWS_REGION=us-east-1

# Switch back to Anthropic
AI_PROVIDER=anthropic
```

No code changes required!

---

## AWS Bedrock Setup

### Prerequisites

1. **AWS Account** with Bedrock access enabled
2. **Model Access** - Enable Claude models in your AWS region:
   - Go to AWS Console → Bedrock → Model access
   - Request access to Anthropic Claude models
   - Wait for approval (usually instant for most regions)

### IAM Permissions

If using IAM roles, ensure your role has these permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream"
      ],
      "Resource": [
        "arn:aws:bedrock:*::foundation-model/anthropic.claude-3-5-sonnet-*"
      ]
    }
  ]
}
```

### Regional Availability

Claude 3.5 Sonnet via Bedrock is available in:
- `us-east-1` (N. Virginia)
- `us-west-2` (Oregon)
- `eu-west-1` (Ireland)
- `ap-southeast-1` (Singapore)
- `ap-northeast-1` (Tokyo)

Check [AWS Bedrock documentation](https://docs.aws.amazon.com/bedrock/latest/userguide/models-regions.html) for latest availability.

---

## Testing Your Setup

### Validate Configuration

The AI chat endpoint will automatically validate your configuration on startup:

```typescript
// Example error responses:
// {
//   "error": "ANTHROPIC_API_KEY is not set. Please configure it to use the Anthropic provider."
// }
//
// {
//   "error": "AWS_REGION is not set. Please configure it to use the Bedrock provider."
// }
```

### Test Connection

Send a test message through the AI Assistant UI or API:

```bash
curl -X POST http://localhost:3000/api/ai-chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello",
    "sessionId": "test-session"
  }'
```

---

## Cost Comparison

### Example: 1 Million API Calls

Assumptions:
- Average conversation: 1,500 input tokens + 500 output tokens
- 1M conversations per month

**Anthropic Direct API**:
- Input: 1.5B tokens × $3/1M = $4,500
- Output: 500M tokens × $15/1M = $7,500
- **Total: $12,000/month**

**AWS Bedrock** (us-west-2 pricing):
- Input: 1.5B tokens × $2.40/1M = $3,600
- Output: 500M tokens × $12/1M = $6,000
- **Total: $9,600/month**
- **Savings: $2,400/month (20%)**

*Prices are approximate and subject to change. Check official pricing pages for current rates.*

---

## Troubleshooting

### Issue: "Failed to send message: Error: Bedrock API error"

**Solution**: Check AWS credentials and permissions
```bash
# Test AWS credentials
aws sts get-caller-identity

# Verify Bedrock access
aws bedrock list-foundation-models --region us-west-2
```

### Issue: "Model not available in region"

**Solution**: Use a supported region
- Change `AWS_REGION` to `us-west-2` or `us-east-1`
- Or request model access in your current region via AWS Console

### Issue: "AccessDeniedException"

**Solution**: Enable model access in AWS Console
- Go to Bedrock → Model access
- Request access to Anthropic Claude models
- Wait for approval

---

## Migration Path

### From Anthropic to Bedrock

1. Set up AWS Bedrock account and enable Claude models
2. Update environment variables:
   ```bash
   AI_PROVIDER=bedrock
   AWS_REGION=us-west-2
   ```
3. Restart application
4. Test thoroughly
5. Remove `ANTHROPIC_API_KEY` from production environment

### From Bedrock to Anthropic

1. Get Anthropic API key from [console.anthropic.com](https://console.anthropic.com)
2. Update environment variables:
   ```bash
   AI_PROVIDER=anthropic
   ANTHROPIC_API_KEY=sk-ant-xxxxx
   ```
3. Restart application
4. Test thoroughly

---

## Support

For issues specific to:
- **Anthropic API**: Contact Anthropic support or check [docs.anthropic.com](https://docs.anthropic.com)
- **AWS Bedrock**: Use AWS Support or check [AWS Bedrock documentation](https://docs.aws.amazon.com/bedrock/)
- **StewardTrack Integration**: Open an issue in the GitHub repository
