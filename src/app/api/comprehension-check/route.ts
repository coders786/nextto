import { NextResponse } from 'next/server';
import { getAI, type PersonalityType } from '@/lib/ai';

// ─── Request Types ───────────────────────────────────────────────────────────

interface ComprehensionCheckRequest {
  concept: string;
  tool: string;
  goal: string;
  personality: PersonalityType;
}

// ─── POST Handler ────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const body: ComprehensionCheckRequest = await request.json();

    const {
      concept,
      tool = 'general',
      goal = '',
      personality = 'chill',
    } = body;

    if (!concept || concept.trim().length === 0) {
      return NextResponse.json(
        { error: 'concept is required' },
        { status: 400 }
      );
    }

    const zai = await getAI();

    // Personality tone guidance for the question
    const toneMap: Record<PersonalityType, string> = {
      chill: 'Ask it casually, like a friend checking if they get it.',
      drill_sergeant: 'Ask it firmly. Demand they prove they understand.',
      patient: 'Ask it gently. Make it low-pressure, like you just want to hear their thoughts.',
      hype: 'Ask it excitedly! Frame it like a chance for them to show off what they learned!',
    };

    const tone = toneMap[personality] || toneMap.chill;

    const systemPrompt = `You are a learning companion checking if someone truly understands a concept. Your personality mode is: ${personality}.

Context:
- Tool they're learning: ${tool}
- Their real goal: ${goal}
- Concept to check: ${concept}

Generate a SINGLE conversational question to test if the user understands "${concept}". This is NOT a quiz — it should feel like a natural conversation. For example, if the concept is "negative keywords" in Google Ads, ask something like "so explain to me in your own words, what's a negative keyword?"

Rules:
- ${tone}
- Only ONE question
- It should be open-ended, not yes/no
- It should test understanding, not memorization
- Keep it short and conversational
- Also provide what a good answer would look like (expected answer)
- And a follow-up question in case they get it right (to go deeper)

You MUST respond with ONLY valid JSON in this exact format, no other text:
{"question": "your conversational question here", "expectedAnswer": "what a good understanding looks like", "followUp": "a deeper question if they get it right"}`;

    const completion = await zai.chat.completions.create({
      messages: [{ role: 'system', content: systemPrompt }],
      thinking: { type: 'disabled' },
    });

    const rawContent =
      completion.choices?.[0]?.message?.content || '';

    // Parse the JSON response
    let parsed: {
      question: string;
      expectedAnswer: string;
      followUp: string;
    };

    try {
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      // Fallback if LLM doesn't return valid JSON
      parsed = {
        question: `So, can you explain to me in your own words what ${concept} means in ${tool}?`,
        expectedAnswer: `A correct explanation of ${concept} in the context of ${tool}`,
        followUp: `Great! Now how would you actually use ${concept} in practice?`,
      };
    }

    return NextResponse.json({
      question: parsed.question,
      expectedAnswer: parsed.expectedAnswer,
      followUp: parsed.followUp,
    });
  } catch (error) {
    console.error('[Comprehension Check API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate comprehension check' },
      { status: 500 }
    );
  }
}
