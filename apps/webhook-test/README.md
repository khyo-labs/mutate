# Webhook Test Server

A simple Fastify-based webhook receiver for testing Mutate transformation callbacks.

## Features

- ✅ Receives webhook/callback requests
- ✅ Verifies HMAC signatures (optional)
- ✅ Logs detailed webhook information
- ✅ Stores webhook history in memory
- ✅ Pretty console output with timestamps
- ✅ RESTful API to view webhook history
- ✅ Simulate failures for testing retry logic

## Quick Start

1. **Install dependencies:**

   ```bash
   cd tools/webhook-test
   npm install
   ```

2. **Start the server:**

   ```bash
   npm run dev  # With auto-restart
   # or
   npm start    # Standard mode
   ```

3. **The server will start on `http://localhost:8080`**

## Environment Variables

- `PORT` - Server port (default: 8080)
- `HOST` - Server host (default: 0.0.0.0)
- `WEBHOOK_SECRET` - Secret for signature verification (default: test-secret-123)

## Endpoints

### Webhook Receiver

- **POST** `/webhook` - Main webhook endpoint
  - Accepts any JSON payload
  - Verifies signatures if `X-Webhook-Signature` header is present
  - Logs detailed information about transformation jobs

### History & Management

- **GET** `/webhooks` - List recent webhooks
  - Query params: `limit` (default: 10), `offset` (default: 0)
- **GET** `/webhooks/:id` - Get specific webhook by ID
- **DELETE** `/webhooks` - Clear webhook history

### Testing & Utilities

- **GET** `/health` - Health check endpoint
- **POST** `/webhook/fail` - Simulate webhook failures
  - Body: `{ "statusCode": 500, "delay": 1000 }`

## Usage with Mutate API

When making transformation requests, use the webhook test server as your callback URL:

```bash
curl -X POST http://localhost:3000/v1/transform \
  -H "Authorization: Bearer your-api-key" \
  -F "configId=your-config-id" \
  -F "callbackUrl=http://localhost:8080/webhook" \
  -F "uid=my-unique-id-123" \
  -F "file=@spreadsheet.xlsx"
```

## Sample Webhook Payload

The server will receive payloads like this:

```json
{
	"jobId": "01HZXXX...",
	"status": "completed",
	"configurationId": "01HZYYY...",
	"organizationId": "01HZZZZ...",
	"uid": "my-unique-id-123",
	"downloadUrl": "https://storage.../output.csv",
	"expiresAt": "2024-01-01T12:00:00.000Z",
	"executionLog": ["Step 1 completed", "Step 2 completed"],
	"completedAt": "2024-01-01T10:30:00.000Z",
	"fileSize": 2048,
	"originalFileName": "spreadsheet.xlsx"
}
```

## Console Output

The server provides rich console logging:

```
🚀 Webhook test server started!
📡 Listening on: http://0.0.0.0:8080
🎯 Webhook endpoint: http://0.0.0.0:8080/webhook
📊 History endpoint: http://0.0.0.0:8080/webhooks
🔐 Webhook secret: test-secret-123

Ready to receive webhooks! 🎉

[10:30:15] INFO: Webhook received
[10:30:15] INFO: Transformation job completed: 01HZXXX... (uid: my-unique-id-123)
```

## Signature Verification

The server automatically verifies HMAC-SHA256 signatures when the `X-Webhook-Signature` header is present. Make sure your `WEBHOOK_SECRET` matches the secret configured in your Mutate API instance.

## Development

The server includes auto-restart functionality:

```bash
npm run dev
```

This uses Node.js's built-in `--watch` flag to restart the server when files change.
