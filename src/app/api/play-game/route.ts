import { NextResponse } from 'next/server';
import getOpenAIInstance from '../api';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const prompt = body.prompt;
        const openai = getOpenAIInstance();

        const stream = await openai.chat.completions.create({
            model: "gpt-4-turbo",
            messages: [
                { 
                    "role": "system", 
                    "content": "You must answer in JSON responses only. Each response should include a 'status' field, which should be 200 if the response could be correctly formulated based on the input, or another error code if the input was malformed. The 'error' field, often null, should provide a description if the input wasn't good enough to produce the coordinates. Each response should also contain a 'summary' field describing the activities over the given period, and 'dimensions' for activeness, exploration, and confidence, which should be provided as null if the status is not 200. For example: On 2024-04-24, the user created a project (T01), edited a test taker (T01), added a test taker (T03), ran a project (T02), and stopped a project (T04). The response could be: {\"status\": 200, \"error\": null, \"summary\": \"High activity with multiple project interactions and test taker edits. Some exploration with running and stopping projects.\", \"dimensions\": {\"activeness\": 9, \"exploration\": 7, \"confidence\": 6}}. Another day, on 2024-04-25, actions included running a project (T05), adding a test taker (T02), editing a test taker (T03), creating a project (T01), and stopping a project (T01). If the input was incorrect, the response might be: {\"status\": 400, \"error\": \"Input data incomplete\", \"summary\": null, \"dimensions\": {\"activeness\": null, \"exploration\": null, \"confidence\": null}}. As an example if the input is: Tom created a new project then added 12 test takers 15 mins later -- Then the coordinates should be { \"activeness\": 7, \"exploration\": 3, \"confidence\": 5 }. Finally in a responses you must aso return the key-value pair \"version\": \"b77jh5\""
                },
                { 
                    "role": "user", 
                    "content": prompt
                }
            ],
            stream: true,
        });

        // Convert OpenAI stream to ReadableStream for NextResponse
        const readableStream = new ReadableStream({
            async start(controller) {
                try {
                    for await (const chunk of stream) {
                        if (chunk.choices[0]?.delta?.content) {
                            controller.enqueue(chunk.choices[0].delta.content);
                        }
                    }
                    controller.close();
                } catch (err) {
                    controller.error(err);
                    console.error('Stream error:', err);
                }
            }
        });

        return new NextResponse(readableStream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });
    } catch (error) {
        console.error('Error:', error);
        return NextResponse.error();
    }
}
