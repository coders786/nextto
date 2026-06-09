import { NextResponse } from 'next/server';
import { getAI } from '@/lib/ai';

// ─── Request Types ───────────────────────────────────────────────────────────

interface ASRRequest {
  audio: string; // base64 encoded audio
  format?: string; // audio format hint (e.g., 'wav', 'mp3')
}

// ─── POST Handler ────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const body: ASRRequest = await request.json();

    const { audio, format } = body;

    if (!audio) {
      return NextResponse.json(
        { error: 'Audio (base64) is required' },
        { status: 400 }
      );
    }

    const zai = await getAI();

    const asrResult = await zai.audio.asr.create({
      file_base64: audio,
      ...(format && { format }),
    });

    const transcript = asrResult.text || '';

    return NextResponse.json({
      transcript,
    });
  } catch (error) {
    console.error('[ASR API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to transcribe audio' },
      { status: 500 }
    );
  }
}
