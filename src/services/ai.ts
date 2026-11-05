import NetInfo from '@react-native-community/netinfo';
import { GROQ_API_URL, GROQ_MODEL } from '../constants';
import { getGroqApiKey } from './aiKey';
import { buildSystemPrompt } from './prompt';
import { GROQ_TOOLS } from './tools';
import { executeToolCall, ChartSnapshot } from './toolExecutor';
import { ChatMessage } from '../db/chats';

export interface AIResponse {
  text: string;
  chartSnapshot?: ChartSnapshot;
  error?: string;
  needsKey?: boolean;
  canRetry?: boolean;
}

const OVERALL_DEADLINE_MS = 25000;
const MAX_STEPS = 3;
const MAX_REQUESTS = 4;
const MAX_TOOL_CALLS = 6;

/**
 * Sends a user message to Groq, executes tool calls locally, and returns the final answer.
 */
export async function sendChatMessage(
  userText: string,
  history: ChatMessage[] = []
): Promise<AIResponse> {
  // 1. Check network connectivity
  const netState = await NetInfo.fetch();
  if (netState.isConnected === false) {
    return {
      text: "No internet right now. I can chat again when you're back online.",
      canRetry: true,
    };
  }

  // 2. Check Groq API key
  const apiKey = await getGroqApiKey();
  if (!apiKey) {
    return {
      text: 'I need my AI key first. Add it in Settings → AI.',
      needsKey: true,
    };
  }

  // 3. Build initial conversation messages
  const systemPrompt = await buildSystemPrompt();
  const recentHistory = history.slice(-6); // Last 6 messages

  const messages: any[] = [
    { role: 'system', content: systemPrompt },
    ...recentHistory.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    { role: 'user', content: userText },
  ];

  // Overall deadline controller
  const overallController = new AbortController();
  const deadlineTimeout = setTimeout(() => {
    overallController.abort();
  }, OVERALL_DEADLINE_MS);

  let requestCount = 0;
  let toolCallCount = 0;
  let finalChartSnapshot: ChartSnapshot | undefined;
  let lastAssistantText = '';

  try {
    for (let step = 0; step < MAX_STEPS; step++) {
      if (requestCount >= MAX_REQUESTS) break;
      requestCount++;

      // Call Groq API
      const res = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages,
          tools: GROQ_TOOLS,
          tool_choice: 'auto',
          temperature: 0.2,
          max_tokens: 600,
        }),
        signal: overallController.signal,
      });

      if (res.status === 401) {
        clearTimeout(deadlineTimeout);
        return {
          text: "My key doesn't seem right. Check it in Settings → AI.",
          needsKey: true,
        };
      }

      if (res.status === 429) {
        clearTimeout(deadlineTimeout);
        return {
          text: "I've hit my free limit for now. Try again in a little while.",
          canRetry: true,
        };
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        // If tool_use_failed, stop tool loop and fallback
        if (res.status === 400 && errorData?.error?.code === 'tool_use_failed' && step > 0) {
          break;
        }
        clearTimeout(deadlineTimeout);
        return {
          text: "I'm a bit slow right now. Try again?",
          canRetry: true,
        };
      }

      const data = await res.json();
      const choice = data?.choices?.[0];
      const assistantMsg = choice?.message;

      if (!assistantMsg) {
        break;
      }

      if (assistantMsg.content) {
        lastAssistantText = assistantMsg.content;
      }

      // If no tool calls, we have our final text response
      if (!assistantMsg.tool_calls || assistantMsg.tool_calls.length === 0) {
        clearTimeout(deadlineTimeout);
        return {
          text: assistantMsg.content || lastAssistantText || 'All done!',
          chartSnapshot: finalChartSnapshot,
        };
      }

      // Process tool calls
      messages.push(assistantMsg);

      for (const call of assistantMsg.tool_calls) {
        if (toolCallCount >= MAX_TOOL_CALLS) break;
        toolCallCount++;

        const toolName = call.function.name;
        let toolArgs: Record<string, any> = {};
        try {
          toolArgs = JSON.parse(call.function.arguments || '{}');
        } catch {
          toolArgs = {};
        }

        const execution = await executeToolCall(toolName, toolArgs);

        if (execution.chartSnapshot) {
          finalChartSnapshot = execution.chartSnapshot;
        }

        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: JSON.stringify(execution.result),
        });
      }
    }

    clearTimeout(deadlineTimeout);

    return {
      text:
        lastAssistantText ||
        "Here is what I found from your spending records! Check the chart below.",
      chartSnapshot: finalChartSnapshot,
    };
  } catch (err: any) {
    clearTimeout(deadlineTimeout);
    if (err.name === 'AbortError') {
      return {
        text: 'I took too long to answer (over 25s). Try asking a simpler or shorter question.',
        canRetry: true,
      };
    }
    return {
      text: "I ran into a connection issue while replying. Try again?",
      canRetry: true,
    };
  }
}
