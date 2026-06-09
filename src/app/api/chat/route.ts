import { NextResponse } from 'next/server';
import { getAI, buildSystemPrompt, parseMistakes, type PersonalityType } from '@/lib/ai';

// ─── Request Types ───────────────────────────────────────────────────────────

interface ChatRequest {
  messages: Array<{ role: string; content: string }>;
  personality: PersonalityType;
  goal: string;
  businessContext: string;
  tool: string;
  screenContext?: string;
}

// ─── POST Handler ────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const body: ChatRequest = await request.json();

    const {
      messages = [],
      personality = 'chill',
      goal = '',
      businessContext = '',
      tool = 'general',
      screenContext,
    } = body;

    if (messages.length === 0) {
      return NextResponse.json(
        { error: 'Messages array is required and cannot be empty' },
        { status: 400 }
      );
    }

    // Build dynamic system prompt based on personality, goal, context
    const systemPrompt = buildSystemPrompt({
      personality,
      goal,
      businessContext,
      tool,
      screenContext,
    });

    // Prepare messages for LLM
    const llmMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...messages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ];

    const zai = await getAI();
    const completion = await zai.chat.completions.create({
      messages: llmMessages,
      thinking: { type: 'disabled' },
    });

    const aiContent =
      completion.choices?.[0]?.message?.content ||
      "Hmm, I couldn't think of a response. Try again?";

    // Parse any mistake markers from the response
    const mistakes = parseMistakes(aiContent);

    return NextResponse.json({
      content: aiContent,
      ...(mistakes.length > 0 && { mistakes }),
    });
  } catch (error) {
    console.error('[Chat API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate AI response' },
      { status: 500 }
    );
  }
}
