import { NextResponse } from 'next/server';
import { getAI, type PersonalityType } from '@/lib/ai';

// ─── Request Types ───────────────────────────────────────────────────────────

interface GoalExtractRequest {
  statedGoal: string;
  tool: string;
}

// ─── POST Handler ────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const body: GoalExtractRequest = await request.json();

    const { statedGoal, tool = 'general' } = body;

    if (!statedGoal || statedGoal.trim().length === 0) {
      return NextResponse.json(
        { error: 'statedGoal is required' },
        { status: 400 }
      );
    }

    const zai = await getAI();

    const systemPrompt = `You are an expert at understanding what people REALLY want when they say they want to learn something. 

The user said they want to learn ${tool}. But what's their REAL goal? Extract their deeper motivation.

For example:
- If they said "google ads" → the real goal might be "get people to buy my candles" or "grow my small business"
- If they said "figma" → the real goal might be "design my own app" or "get a UX design job"
- If they said "shopify" → the real goal might be "start my online candle store" or "quit my 9-5"
- If they said "excel" → the real goal might be "stop being embarrassed at work" or "get promoted"

Based on the tool and their stated goal, infer:
1. Their real underlying motivation (what success looks like for them)
2. Their business/life context (what situation are they in)
3. Which personality would help them most:
   - "chill" if they seem casual or just exploring
   - "drill_sergeant" if they have a deadline or need tough love
   - "patient" if they seem like a complete beginner or anxious
   - "hype" if they seem excited and energetic

You MUST respond with ONLY valid JSON in this exact format, no other text:
{"realGoal": "their deeper goal in plain language", "businessContext": "their situation/context", "suggestedPersonality": "chill|drill_sergeant|patient|hype"}`;

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `I want to learn ${tool}. My goal: "${statedGoal}"`,
        },
      ],
      thinking: { type: 'disabled' },
    });

    const rawContent =
      completion.choices?.[0]?.message?.content || '';

    // Parse the JSON response from the LLM
    let parsed: {
      realGoal: string;
      businessContext: string;
      suggestedPersonality: PersonalityType;
    };

    try {
      // Try to extract JSON from the response (may have markdown wrapping)
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      // Fallback if LLM doesn't return valid JSON
      parsed = {
        realGoal: statedGoal,
        businessContext: `Learning ${tool}`,
        suggestedPersonality: 'chill' as PersonalityType,
      };
    }

    // Validate personality
    const validPersonalities: PersonalityType[] = [
      'chill',
      'drill_sergeant',
      'patient',
      'hype',
    ];
    if (!validPersonalities.includes(parsed.suggestedPersonality)) {
      parsed.suggestedPersonality = 'chill';
    }

    return NextResponse.json({
      realGoal: parsed.realGoal,
      businessContext: parsed.businessContext,
      suggestedPersonality: parsed.suggestedPersonality,
    });
  } catch (error) {
    console.error('[Goal Extract API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to extract goal' },
      { status: 500 }
    );
  }
}
