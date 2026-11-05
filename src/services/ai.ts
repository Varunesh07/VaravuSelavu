import NetInfo from '@react-native-community/netinfo';
import { GROQ_API_URL, GROQ_MODEL } from '../constants';
import { getGroqApiKey } from './aiKey';
import { buildSystemPrompt } from './prompt';
import { GROQ_TOOLS } from './tools';
import { executeToolCall, executeSpendingSummary, ChartSnapshot } from './toolExecutor';
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

let cachedModel: string | null = null;

/**
 * Resolves the best available tool-capable model for the account.
 */
export async function resolveGroqModel(apiKey: string): Promise<string> {
  if (cachedModel) return cachedModel;

  try {
    const res = await fetch('https://api.groq.com/openai/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (res.ok) {
      const data = await res.json();
      const modelIds: string[] = (data.data || []).map((m: any) => m.id);
      console.log('Available Groq models for account:', modelIds);

      const PREFERRED = [
        'llama-3.1-8b-instant',
        'llama-3.3-70b-versatile',
        'llama-3.3-70b-specdec',
        'openai/gpt-oss-120b',
        'openai/gpt-oss-20b',
        'llama3-70b-8192',
        'llama3-8b-8192',
      ];

      for (const pref of PREFERRED) {
        if (modelIds.includes(pref)) {
          cachedModel = pref;
          console.log('Selected Groq model:', cachedModel);
          return cachedModel;
        }
      }

      const fallback =
        modelIds.find((id) => id.includes('llama') || id.includes('gpt')) || modelIds[0];
      if (fallback) {
        cachedModel = fallback;
        console.log('Fallback Groq model:', cachedModel);
        return cachedModel;
      }
    }
  } catch (err) {
    console.error('Failed to fetch models list, using default:', err);
  }

  cachedModel = GROQ_MODEL;
  return cachedModel;
}

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

  // Resolve best available model
  const activeModel = await resolveGroqModel(apiKey);

  // 3. Build initial conversation messages
  const systemPrompt = await buildSystemPrompt();
  // Filter out any previous error messages
  const cleanHistory = history.filter(
    (m) =>
      !m.content.includes("I'm a bit slow right now") &&
      !m.content.includes('trouble processing') &&
      !m.content.includes('connection issue')
  );
  const recentHistory = cleanHistory.slice(-6); // Last 6 messages

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
  let hasRetriedToolUse = false;
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
          model: activeModel,
          messages,
          tools: GROQ_TOOLS,
          tool_choice: 'auto',
          temperature: 0,
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
        console.warn('Groq API Error:', res.status, JSON.stringify(errorData));

        // If 404 model not found, reset cache
        if (res.status === 404) {
          cachedModel = null;
        }

        // Rule 7 from docs/04-AI-CHAT.md:
        // "If Groq returns a tool-format error (400 tool_use_failed), retry once; if it fails again, answer in text only using a quick this-month summary."
        if (
          res.status === 400 &&
          (errorData?.error?.code === 'tool_use_failed' || errorData?.error?.message)
        ) {
          if (step === 0 && !hasRetriedToolUse) {
            hasRetriedToolUse = true;
            messages.push({
              role: 'system',
              content: 'Please invoke the requested tool directly using native function calling.',
            });
            continue;
          }

          // Fallback: answer in text only using a quick this-month summary
          try {
            const summary = await executeSpendingSummary({});
            const fallbackRes = await fetch(GROQ_API_URL, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model: activeModel,
                messages: [
                  { role: 'system', content: systemPrompt },
                  { role: 'user', content: userText },
                  {
                    role: 'system',
                    content: `Spending summary for this month: Total spent: ₹${summary.total_spent_rupees}, Total income: ₹${summary.total_income_rupees}, Net balance change: ${summary.balance_change}, Transactions: ${summary.transaction_count}, Top expenses: ${summary.top_3_expense_categories.map((c: any) => `${c.category} (₹${c.total_rupees})`).join(', ') || 'None'}. Answer the user question in friendly Panda style using these numbers. Do not call any tools.`,
                  },
                ],
                temperature: 0.2,
                max_tokens: 300,
              }),
              signal: overallController.signal,
            });

            if (fallbackRes.ok) {
              const fallbackData = await fallbackRes.json();
              const fallbackText = fallbackData?.choices?.[0]?.message?.content;
              if (fallbackText) {
                clearTimeout(deadlineTimeout);
                return { text: fallbackText };
              }
            }

            // Direct text fallback if Groq call failed
            clearTimeout(deadlineTimeout);
            return {
              text: `This month you spent ₹${summary.total_spent_rupees} and received ₹${summary.total_income_rupees}. ${
                summary.top_3_expense_categories[0]
                  ? `Your highest expense was ${summary.top_3_expense_categories[0].category} (₹${summary.top_3_expense_categories[0].total_rupees}).`
                  : ''
              }`,
            };
          } catch {
            // continue to error return
          }
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
          name: toolName,
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

