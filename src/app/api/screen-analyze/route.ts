import { NextResponse } from 'next/server';
import { getAI, parseMistakes } from '@/lib/ai';

// ─── Request Types ───────────────────────────────────────────────────────────

interface ScreenAnalyzeRequest {
  frame: string; // base64 encoded screenshot
  tool: string;
  goal: string;
  businessContext: string;
  conversationContext?: string;
}

// ─── POST Handler ────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const body: ScreenAnalyzeRequest = await request.json();

    const {
      frame,
      tool = 'general',
      goal = '',
      businessContext = '',
      conversationContext,
    } = body;

    if (!frame) {
      return NextResponse.json(
        { error: 'Frame (base64 image) is required' },
        { status: 400 }
      );
    }

    // Build the analysis prompt
    let analysisPrompt = `You are analyzing a screen capture of someone learning ${tool}. Their goal is: ${goal}. Business context: ${businessContext}.

Analyze what's on screen and provide:
1. What the user is currently looking at or doing (1 sentence)
2. Any mistakes or potential issues you notice
3. A helpful suggestion or next step

Keep it concise - no yapping. If you spot a mistake, format it as: [MISTAKE:category] description [SUGGESTION:what to do instead]`;

    if (conversationContext) {
      analysisPrompt += `\n\nRecent conversation context: ${conversationContext}`;
    }

    const zai = await getAI();
    const completion = await zai.chat.completions.createVision({
      model: 'glm-4.6v',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: analysisPrompt,
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/png;base64,${frame}`,
              },
            },
          ],
        },
      ],
    });

    const analysis =
      completion.choices?.[0]?.message?.content ||
      'Could not analyze the screen.';

    // Parse any mistakes detected in the VLM response
    const mistakes = parseMistakes(analysis);

    // Extract suggestions from mistakes or provide generic ones
    const suggestions: string[] =
      mistakes.length > 0 ? mistakes.map((m) => m.suggestion) : [];

    return NextResponse.json({
      analysis,
      suggestions,
      ...(mistakes.length > 0 && { mistakes }),
    });
  } catch (error) {
    console.error('[Screen Analyze API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze screen' },
      { status: 500 }
    );
  }
}
