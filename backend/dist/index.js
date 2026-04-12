import cors from 'cors';
import express from 'express';
import fs from 'node:fs/promises';
import { z } from 'zod';
const app = express();
const port = Number(process.env.PORT || 8787);
app.use(cors());
app.use(express.json({ limit: '20mb' }));
const parseBodySchema = z.object({
    content: z.string().min(2),
});
const loadBodySchema = z.object({
    filePath: z.string().min(1),
});
function asString(content) {
    if (typeof content === 'string') {
        return content;
    }
    if (Array.isArray(content)) {
        return content
            .map((item) => (typeof item === 'string' ? item : JSON.stringify(item)))
            .join('\n');
    }
    if (content == null) {
        return '';
    }
    try {
        return JSON.stringify(content);
    }
    catch {
        return String(content);
    }
}
function asPrettyJson(value) {
    if (value == null) {
        return '';
    }
    try {
        return JSON.stringify(value, null, 2);
    }
    catch {
        return asString(value);
    }
}
function classifyTriggerSource(message) {
    if (!message) {
        return 'unknown';
    }
    if (message.role === 'user') {
        return 'user';
    }
    if (message.role === 'tool') {
        return 'tool_result';
    }
    if (message.role === 'assistant') {
        return message.tool_calls?.length ? 'assistant_tool_call' : 'assistant';
    }
    if (message.role === 'system') {
        return 'system';
    }
    return 'unknown';
}
function parseAuditJson(content) {
    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed)) {
        throw new Error('Top-level JSON value must be an array.');
    }
    const events = parsed;
    const turns = [];
    for (let index = 0; index < events.length; index += 1) {
        const event = events[index];
        if (event.event !== 'llm_exchange') {
            continue;
        }
        const messages = event.request?.messages ?? [];
        const roleMap = {};
        for (const message of messages) {
            const role = message.role ?? 'unknown';
            roleMap[role] = (roleMap[role] ?? 0) + 1;
        }
        const reversedMessages = [...messages].reverse();
        const latestUser = reversedMessages.find((m) => m.role === 'user');
        const trigger = messages[messages.length - 1];
        const choice = event.response?.choices?.[0];
        const responseMessage = choice?.message;
        const responseTools = responseMessage?.tool_calls ?? [];
        const declaredTools = event.request?.tools ?? [];
        turns.push({
            step: turns.length + 1,
            timestampMs: typeof event.ts_unix_ms === 'number' ? event.ts_unix_ms : null,
            model: event.request?.model ?? 'unknown',
            requestMessageCount: messages.length,
            rolesHistogram: roleMap,
            latestUserMessage: asString(latestUser?.content),
            triggerSource: classifyTriggerSource(trigger),
            triggerMessageRole: trigger?.role ?? 'unknown',
            triggerMessage: asString(trigger?.content),
            assistantMessageRole: responseMessage?.role ?? 'unknown',
            responseText: asString(responseMessage?.content),
            responseRaw: asPrettyJson(responseMessage),
            responseToolCalls: responseTools.map((tool, toolIndex) => ({
                id: tool.id ?? `tool_call_${toolIndex + 1}`,
                name: tool.function?.name ?? 'unknown',
                arguments: tool.function?.arguments ?? '',
            })),
            finishReason: choice?.finish_reason ?? 'unknown',
            toolCalls: responseTools
                .map((tool) => tool.function?.name)
                .filter((name) => Boolean(name)),
            availableTools: declaredTools
                .map((tool) => tool.function?.name)
                .filter((name) => Boolean(name)),
            tokenUsage: {
                prompt: event.response?.usage?.prompt_tokens ?? 0,
                completion: event.response?.usage?.completion_tokens ?? 0,
                total: event.response?.usage?.total_tokens ?? 0,
            },
        });
    }
    return turns;
}
app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
});
app.post('/api/parse', (req, res) => {
    const result = parseBodySchema.safeParse(req.body);
    if (!result.success) {
        res.status(400).json({ error: 'Request body must include a content string.' });
        return;
    }
    try {
        const turns = parseAuditJson(result.data.content);
        const summary = {
            turns: turns.length,
            totalTokens: turns.reduce((sum, t) => sum + t.tokenUsage.total, 0),
            models: [...new Set(turns.map((t) => t.model))],
            toolCalls: turns.reduce((sum, t) => sum + t.toolCalls.length, 0),
        };
        res.json({ summary, turns });
    }
    catch (error) {
        res.status(400).json({
            error: 'Failed to parse JSON.',
            detail: error instanceof Error ? error.message : String(error),
        });
    }
});
app.post('/api/load-file', async (req, res) => {
    const result = loadBodySchema.safeParse(req.body);
    if (!result.success) {
        res.status(400).json({ error: 'Request body must include a filePath string.' });
        return;
    }
    try {
        const content = await fs.readFile(result.data.filePath, 'utf8');
        const turns = parseAuditJson(content);
        const summary = {
            turns: turns.length,
            totalTokens: turns.reduce((sum, t) => sum + t.tokenUsage.total, 0),
            models: [...new Set(turns.map((t) => t.model))],
            toolCalls: turns.reduce((sum, t) => sum + t.toolCalls.length, 0),
            sourceFile: result.data.filePath,
        };
        res.json({ summary, turns, rawContent: content });
    }
    catch (error) {
        res.status(400).json({
            error: 'Failed to read or parse file.',
            detail: error instanceof Error ? error.message : String(error),
        });
    }
});
app.listen(port, () => {
    console.log(`LLM loop visualizer backend listening on http://localhost:${port}`);
});
