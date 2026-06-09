import { GEMINI_ENDPOINT, GEMINI_API_KEY } from '../constants/config';

/**
 * Uses Gemini's multimodal vision to extract all visible text from a base64 image.
 * Replaces Google Cloud Vision (which requires billing).
 *
 * @param {string} base64Image - The base64-encoded image (without the data: prefix)
 * @returns {string} The extracted text, or empty string on failure
 */
export const extractTextFromImage = async (base64Image) => {
  try {
    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: 'Extract ALL visible text from this image exactly as it appears. Return only the raw text content, preserving line breaks where appropriate. Do not add any explanation, analysis, or commentary — just the text.',
            },
            {
              inline_data: {
                mime_type: 'image/jpeg',
                data: base64Image,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 2048,
      },
    };

    const response = await fetch(GEMINI_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('visionService (Gemini): API responded with error:', errText);
      return '';
    }

    const json = await response.json();
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    return text?.trim() || '';
  } catch (error) {
    console.error('visionService.extractTextFromImage error:', error);
    return '';
  }
};

/**
 * Sends image to Gemini Vision for visual object understanding.
 *
 * @param {string} base64Image - The base64-encoded image
 * @param {object} userProfile - User health profile
 * @returns {object|null} The parsed visual analysis object
 */
export async function understandObjectFromImage(base64Image, userProfile) {
  try {
    const prompt = `
      You are SnapAct, an AI embedded in a phone camera.
      Look at this image carefully and understand what object or scene is shown.
      Also consider this user's personal profile: ${JSON.stringify(userProfile)}

      Analyze the CONDITION and STATE of the object visually.
      Look for: dirt, damage, wear, stains, rust, clutter, malfunction signs, safety issues, health risks, expiry, spoilage.

      Respond in JSON only. No markdown. No text outside JSON.
      {
        "objectDetected": "what object or scene is in the image",
        "condition": "excellent / good / needs_cleaning / needs_repair / needs_replacement / expired / unsafe / unknown",
        "conditionDetail": "specific visual observation about the condition in one sentence",
        "recommendation": "exactly what the user should do — clean, repair, replace, discard, consult doctor, etc",
        "howTo": "brief practical steps or products to use to act on the recommendation",
        "temporarySolution": "an immediate quick-fix or temporary workaround the user can do RIGHT NOW with household items or bare hands — no special tools needed. If it's a medicine/food/document, give a temporary precaution or immediate action to take until proper help is available. Always provide this regardless of object type.",
        "urgency": "immediate / soon / low",
        "status": "danger / warning / safe",
        "insight": "personalised insight combining what was seen with the user profile if relevant, otherwise general advice",
        "action": "most important single action to take",
        "actionType": "whatsapp / url / none",
        "actionPayload": "whatsapp message or URL if applicable, else empty string"
      }
    `;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inline_data: { mime_type: 'image/jpeg', data: base64Image } }
            ]
          }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 4096,
          }
        })
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error('understandObjectFromImage API error:', errText);
      return null;
    }

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      console.error('understandObjectFromImage: empty response');
      return null;
    }

    const firstBrace = rawText.indexOf('{');
    const lastBrace = rawText.lastIndexOf('}');
    if (firstBrace === -1) {
      console.error('understandObjectFromImage: no JSON found:', rawText);
      return null;
    }

    let jsonStr;
    if (lastBrace !== -1 && lastBrace > firstBrace) {
      jsonStr = rawText.slice(firstBrace, lastBrace + 1);
    } else {
      console.warn('understandObjectFromImage: response truncated, recovery mode');
      const partial = rawText.slice(firstBrace);
      const objectMatch = partial.match(/"objectDetected"\s*:\s*"([^"]+)"/);
      const conditionMatch = partial.match(/"condition"\s*:\s*"([^"]+)"/);
      const conditionDetailMatch = partial.match(/"conditionDetail"\s*:\s*"([^"]+)"/);
      const recommendationMatch = partial.match(/"recommendation"\s*:\s*"([^"]+)"/);
      const howToMatch = partial.match(/"howTo"\s*:\s*"([^"]+)"/);
      const tempSolMatch = partial.match(/"temporarySolution"\s*:\s*"([^"]+)"/);
      const urgencyMatch = partial.match(/"urgency"\s*:\s*"([^"]+)"/);
      const statusMatch = partial.match(/"status"\s*:\s*"([^"]+)"/);
      const insightMatch = partial.match(/"insight"\s*:\s*"([^"]+)"/);
      const actionMatch = partial.match(/"action"\s*:\s*"([^"]+)"/);
      const actionTypeMatch = partial.match(/"actionType"\s*:\s*"([^"]+)"/);
      const actionPayloadMatch = partial.match(/"actionPayload"\s*:\s*"([^"]+)"/);
      return {
        objectDetected: objectMatch?.[1] || 'Unknown Object',
        condition: conditionMatch?.[1] || 'unknown',
        conditionDetail: conditionDetailMatch?.[1] || '',
        recommendation: recommendationMatch?.[1] || 'Scan again.',
        howTo: howToMatch?.[1] || '',
        temporarySolution: tempSolMatch?.[1] || 'Take immediate precautions.',
        urgency: urgencyMatch?.[1] || 'low',
        status: statusMatch?.[1] || 'warning',
        insight: insightMatch?.[1] || 'Analysis incomplete.',
        action: actionMatch?.[1] || 'Scan again',
        actionType: actionTypeMatch?.[1] || 'none',
        actionPayload: actionPayloadMatch?.[1] || ''
      };
    }

    return JSON.parse(jsonStr);
  } catch (error) {
    console.error('understandObjectFromImage error:', error);
    return null;
  }
}
