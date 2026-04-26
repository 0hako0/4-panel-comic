import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { prompt } = await request.json()

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      )
    }

    const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN

    if (!REPLICATE_API_TOKEN) {
      return NextResponse.json(
        { error: "Replicate API token not configured" },
        { status: 500 }
      )
    }

    // Start the prediction
    const startResponse = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
        "Content-Type": "application/json",
        Prefer: "wait",
      },
      body: JSON.stringify({
        version: "db21e45d3f7023abc2a46ee38a23973f6dce16bb082a930b0c49861f96d1e5bf",
        input: {
          prompt,
          width: 1024,
          height: 1024,
          num_outputs: 1,
        },
      }),
    })

    if (!startResponse.ok) {
      const error = await startResponse.json()
      return NextResponse.json(
        { error: error.detail || "Failed to generate image" },
        { status: startResponse.status }
      )
    }

    const prediction = await startResponse.json()

    // If using Prefer: wait, the output should be ready
    if (prediction.output && prediction.output.length > 0) {
      return NextResponse.json({
        imageUrl: prediction.output[0],
        status: prediction.status,
      })
    }

    // If prediction is still processing, poll for results
    if (prediction.status === "starting" || prediction.status === "processing") {
      const pollUrl = prediction.urls.get

      for (let i = 0; i < 60; i++) {
        await new Promise((resolve) => setTimeout(resolve, 1000))

        const pollResponse = await fetch(pollUrl, {
          headers: {
            Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
          },
        })

        const pollResult = await pollResponse.json()

        if (pollResult.status === "succeeded" && pollResult.output) {
          return NextResponse.json({
            imageUrl: pollResult.output[0],
            status: pollResult.status,
          })
        }

        if (pollResult.status === "failed") {
          return NextResponse.json(
            { error: pollResult.error || "Generation failed" },
            { status: 500 }
          )
        }
      }

      return NextResponse.json(
        { error: "Generation timed out" },
        { status: 504 }
      )
    }

    return NextResponse.json(
      { error: "Unexpected prediction status" },
      { status: 500 }
    )
  } catch (error) {
    console.error("Error generating image:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
