import { NextResponse } from 'next/server';
import { getAI, VOICE_MAP, type PersonalityType } from '@/lib/ai';

// ─── Request Types ───────────────────────────────────────────────────────────

interface TTSRequest {
  text: string;
  voice: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const TTS_MAX_INPUT_LENGTH = 1024;

// ─── Helper: Chunk text for TTS ──────────────────────────────────────────────

function chunkText(text: string, maxLength: number): string[] {
  if (text.length <= maxLength) return [text];

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      chunks.push(remaining);
      break;
    }

    // Try to split at a sentence boundary within the limit
    let splitIndex = remaining.lastIndexOf('.', maxLength);
    if (splitIndex === -1 || splitIndex < maxLength * 0.3) {
      splitIndex = remaining.lastIndexOf('!', maxLength);
    }
    if (splitIndex === -1 || splitIndex < maxLength * 0.3) {
      splitIndex = remaining.lastIndexOf('?', maxLength);
    }
    if (splitIndex === -1 || splitIndex < maxLength * 0.3) {
      splitIndex = remaining.lastIndexOf(',', maxLength);
    }
    if (splitIndex === -1 || splitIndex < maxLength * 0.3) {
      splitIndex = remaining.lastIndexOf(' ', maxLength);
    }
    if (splitIndex === -1 || splitIndex < maxLength * 0.3) {
      // Hard split
      splitIndex = maxLength;
    }

    chunks.push(remaining.slice(0, splitIndex + 1).trim());
    remaining = remaining.slice(splitIndex + 1).trim();
  }

  return chunks;
}

// ─── POST Handler ────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const body: TTSRequest = await request.json();

    const { text, voice } = body;

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Text is required for TTS' },
        { status: 400 }
      );
    }

    // Resolve voice: accept personality name or direct voice name
    const resolvedVoice =
      VOICE_MAP[voice as PersonalityType] || voice || 'tongtong';

    const zai = await getAI();

    // Chunk the text if it exceeds the TTS max input length
    const chunks = chunkText(text, TTS_MAX_INPUT_LENGTH);

    if (chunks.length === 1) {
      // Single chunk - return audio directly
      const ttsResponse = await zai.audio.tts.create({
        input: chunks[0],
        voice: resolvedVoice as 'tongtong' | 'jam' | 'xiaochen' | 'chuichui',
        response_format: 'wav',
        stream: false,
      });

      const audioBuffer = Buffer.from(
        new Uint8Array(await ttsResponse.arrayBuffer())
      );

      return new Response(audioBuffer, {
        headers: {
          'Content-Type': 'audio/wav',
          'Content-Length': audioBuffer.length.toString(),
        },
      });
    }

    // Multiple chunks - concatenate WAV data
    // WAV files have a 44-byte header, so we skip headers for chunks after the first
    const audioBuffers: Buffer[] = [];
    let firstHeader: Buffer | null = null;

    for (const chunk of chunks) {
      const ttsResponse = await zai.audio.tts.create({
        input: chunk,
        voice: resolvedVoice as 'tongtong' | 'jam' | 'xiaochen' | 'chuichui',
        response_format: 'wav',
        stream: false,
      });

      const fullBuffer = Buffer.from(
        new Uint8Array(await ttsResponse.arrayBuffer())
      );

      if (!firstHeader) {
        // Save the first file's header (44 bytes for standard WAV)
        firstHeader = fullBuffer.slice(0, 44);
        audioBuffers.push(fullBuffer.slice(44));
      } else {
        // Skip WAV header for subsequent chunks
        audioBuffers.push(fullBuffer.slice(44));
      }
    }

    // Reconstruct WAV file with combined data
    const pcmData = Buffer.concat(audioBuffers);
    const totalSize = 44 + pcmData.length;

    // Update WAV header with new total size
    const header = Buffer.from(firstHeader!);
    header.writeUInt32LE(totalSize - 8, 4); // ChunkSize (file size - 8)
    header.writeUInt32LE(pcmData.length, 40); // Subchunk2Size (data size)

    const finalBuffer = Buffer.concat([header, pcmData]);

    return new Response(finalBuffer, {
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Length': finalBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('[TTS API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate audio' },
      { status: 500 }
    );
  }
}
