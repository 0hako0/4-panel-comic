export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

  if (!REPLICATE_API_TOKEN) {
    return res.status(500).json({ error: 'Replicate API token not configured' });
  }

  try {
    // Create a prediction using Replicate's API
    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json',
        'Prefer': 'wait'
      },
      body: JSON.stringify({
        // Using Stable Diffusion XL model
        version: 'da77bc59ee60423279fd632efb4795ab731d9e3ca9705ef3341091fb989b7eaf',
        input: {
          prompt: prompt,
          width: 512,
          height: 512,
          num_outputs: 1,
          scheduler: 'K_EULER',
          num_inference_steps: 25,
          guidance_scale: 7.5
        }
      })
    });

    if (!response.ok) {
      const error = await response.json();
      return res.status(response.status).json({ error: error.detail || 'Failed to generate image' });
    }

    const prediction = await response.json();

    // Return the prediction result
    return res.status(200).json({
      id: prediction.id,
      status: prediction.status,
      output: prediction.output,
      urls: prediction.urls
    });

  } catch (error) {
    console.error('Replicate API error:', error);
    return res.status(500).json({ error: 'Failed to generate image' });
  }
}
