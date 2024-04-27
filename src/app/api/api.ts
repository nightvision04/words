
import OpenAI from 'openai';

export default function getOpenAIInstance() {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  return openai;
}