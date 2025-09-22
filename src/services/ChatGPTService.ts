import 'server-only';
import OpenAI from 'openai';

const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY || process.env.OPENAI_API_KEY;

const openai = new OpenAI({
  apiKey,
  // allow use in browser builds
  dangerouslyAllowBrowser: true
});

export async function generateChatGPTReply(prompt: string): Promise<string> {
  const completion = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: prompt }]
  });
  return completion.choices[0]?.message?.content?.trim() || '';
}
