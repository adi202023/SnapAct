import { GEMINI_ENDPOINT, GEMINI_MODELS, GEMINI_BASE, GEMINI_API_KEY } from '../constants/config';

/**
 * Calls a specific Gemini model with the given request body.
 * Returns { ok, status, data } — never throws.
 */
const callGeminiModel = async (modelName, requestBody) => {
  const url = `${GEMINI_BASE}/${modelName}:generateContent?key=${GEMINI_API_KEY}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(requestBody),
    });
    const data = await res.json();
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    return { ok: false, status: 0, data: { error: { message: err.message } } };
  }
};

/**
 * Extracts the retry delay in ms from a 429 error response.
 * The API returns retryDelay as e.g. "51s" or "120s".
 */
const getRetryDelayMs = (errorData) => {
  try {
    const retryInfo = errorData?.error?.details?.find(
      (d) => d['@type'] === 'type.googleapis.com/google.rpc.RetryInfo'
    );
    if (retryInfo?.retryDelay) {
      const seconds = parseInt(retryInfo.retryDelay.replace('s', ''), 10);
      return isNaN(seconds) ? 15000 : seconds * 1000;
    }
  } catch (_) {}
  return 15000; // default 15s if parsing fails
};

/**
 * Tries each model in GEMINI_MODELS in order.
 * On 429 → waits the exact retryDelay the API specifies, then tries next model.
 * On any other error → tries next model immediately.
 * Returns the raw response text on success, or null on total failure.
 */
const callGeminiWithRotation = async (requestBody) => {
  for (let i = 0; i < GEMINI_MODELS.length; i++) {
    const model = GEMINI_MODELS[i];
    console.log(`[SnapAct] Trying model: ${model}`);
    const { ok, status, data } = await callGeminiModel(model, requestBody);

    if (ok) {
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return text;
      // Empty response from this model — try next
      console.warn(`[SnapAct] ${model} returned empty text, trying next model...`);
      continue;
    }

    if (status === 429) {
      const waitMs = getRetryDelayMs(data);
      const nextModel = GEMINI_MODELS[i + 1];
      if (nextModel) {
        console.warn(`[SnapAct] ${model} rate limited (${waitMs}ms). Switching to ${nextModel}...`);
        // Small pause before switching — no need to wait the full delay when we have another model
        await new Promise((r) => setTimeout(r, 1000));
      } else {
        // Last model — wait as instructed then retry the first model once more
        console.warn(`[SnapAct] All models tried. Waiting ${waitMs}ms then retrying ${GEMINI_MODELS[0]}...`);
        await new Promise((r) => setTimeout(r, waitMs));
        const retry = await callGeminiModel(GEMINI_MODELS[0], requestBody);
        if (retry.ok) {
          return retry.data?.candidates?.[0]?.content?.parts?.[0]?.text || null;
        }
      }
      continue;
    }

    // Other errors (404 model not found, 400 bad request, etc.) — log and try next
    if (status === 0) {
      console.warn(`[SnapAct] ${model} network error (offline):`, data?.error?.message);
    } else {
      console.warn(`[SnapAct] ${model} error ${status}:`, JSON.stringify(data?.error?.message || data));
    }
  }
  return null;
};

/**
 * Builds a context-aware text prompt for Gemini based on user profile and scan mode.
 */
const buildTextPrompt = (extractedText, userProfile, scanMode) => {
  const medicines = userProfile?.medicines?.join(', ') || 'None listed';
  const allergies = userProfile?.allergies?.join(', ') || 'None listed';
  const language = userProfile?.language || 'English';
  const emergencyName = userProfile?.emergencyContact?.name || 'Not set';

  return `You are SnapAct, a personal AI assistant embedded in a phone camera app.
The user has shared their personal profile:
- Medicines they currently take: ${medicines}
- Allergies (food, drug, environmental): ${allergies}
- Language preference: ${language}
- Emergency contact: ${emergencyName}

The camera just captured this text from the real world:
"${extractedText}"

Scan mode: ${scanMode}

Instructions:
- Analyze the captured text in the context of this specific user's profile.
- For Medicine mode: check for drug interactions with current medicines, check for allergens.
- For Food/Menu mode: check for allergen ingredients matching the user's allergy list.
- For Bill mode: detect potential overcharges, incorrect units, or suspicious line items.
- For Document mode: flag unusual, unfair, or risky clauses that a layperson should know about.
- For Auto mode: first determine what was captured, then apply the relevant analysis.
- Be specific, personal, and actionable. Never generic.
- For actionPayload in whatsapp type, write a complete ready-to-send WhatsApp message.
- For actionPayload in url type, provide a real working URL.

STEP 3 — Always provide a temporary solution:
- Broken object → what can be done RIGHT NOW to temporarily fix or stabilize it
- Dirty object → quickest immediate cleaning method with whatever is available at home
- Medicine danger → what to do immediately before reaching a doctor
- Food allergen → immediate precaution steps
- Bill/Document issue → immediate protective action before consulting an expert
- Any scan → always give a "do this right now" answer, no matter what
Keep it simple, practical, doable within 5 minutes with household items.

Respond in STRICT JSON format only. No markdown. No code blocks. No explanation outside JSON. Return only a single valid JSON object:
{
  "detected": "what was detected — one concise line",
  "status": "danger" or "warning" or "safe",
  "insight": "what this means specifically for THIS user based on their exact profile — 2 to 3 sentences, highly personal",
  "temporarySolution": "an immediate quick-fix or temporary workaround the user can do RIGHT NOW with household items or bare hands — no special tools needed. If it's a medicine/food/document, give a temporary precaution or immediate action to take until proper help is available. Always provide this regardless of object type.",
  "action": "the single most important action label — short, imperative (e.g. Alert My Doctor)",
  "actionType": "whatsapp" or "url" or "none",
  "actionPayload": "the complete WhatsApp message text or full URL to open, or empty string",
  "scanMode": "${scanMode}"
}`;
};

/**
 * Builds a unified prompt for Gemini Vision that does EVERYTHING in one shot:
 * reads text, identifies the object, evaluates its condition, and generates advice.
 * This is the only prompt needed — one API call per scan.
 */
const buildImagePrompt = (userProfile, scanMode) => {
  const medicines = userProfile?.medicines?.join(', ') || 'None listed';
  const allergies = userProfile?.allergies?.join(', ') || 'None listed';
  const language = userProfile?.language || 'English';
  const emergencyName = userProfile?.emergencyContact?.name || 'Not set';

  return `You are SnapAct, a personal AI assistant embedded in a phone camera app.
The user's profile:
- Current medicines: ${medicines}
- Allergies: ${allergies}
- Language: ${language}
- Emergency contact: ${emergencyName}
Scan mode: ${scanMode}

STEP 1 — Understand the image:
- Read ALL visible text in the image (product names, ingredients, amounts, clauses, etc.)
- Identify the physical object or scene even if there is no text
- Assess its visual CONDITION: look for dirt, damage, rust, wear, mould, expiry, spoilage, clutter, safety risks

STEP 2 — Analyze in context of user profile:
- Medicine mode: drug interactions with current medicines, allergens in ingredients
- Food/Menu mode: allergens matching user's list
- Bill mode: overcharges, suspicious line items
- Document mode: unfair or risky clauses
- Auto/Object mode: assess condition and recommend action
- Cross-reference the user's medicines and allergies even for objects (e.g. mould → respiratory risk if user has asthma)

STEP 3 — Always give a temporary solution:
- Broken/damaged object → what to do RIGHT NOW with bare hands or household items
- Dirty object → fastest cleaning method available at home
- Medicine danger → immediate precaution before reaching a doctor
- Food allergen → immediate steps to take now
- Bill/Document → immediate protective action before consulting an expert
- Any scan → always provide a "do this right now" response, doable in under 5 minutes

Respond in STRICT JSON only. No markdown. No code fences. Return ONLY a single valid JSON object:
{
  "detected": "one concise line describing what was found",
  "condition": "excellent / good / needs_cleaning / needs_repair / needs_replacement / expired / unsafe / unknown",
  "conditionDetail": "one sentence visual observation about its state (empty string if not applicable)",
  "recommendation": "what the user should do — clean, repair, replace, discard, consult doctor, etc (empty string if not applicable)",
  "howTo": "brief practical steps using available products (empty string if not applicable)",
  "temporarySolution": "immediate workaround RIGHT NOW with household items — always provide this no matter what was scanned",
  "urgency": "immediate / soon / low",
  "status": "danger / warning / safe",
  "insight": "2-3 sentences personalised to THIS user's profile — highly specific, never generic",
  "action": "single most important action label — short imperative phrase",
  "actionType": "whatsapp / url / none",
  "actionPayload": "complete WhatsApp message or full URL, or empty string",
  "scanMode": "${scanMode}"
}`;
};

/**
 * Analyzes an image directly with Gemini Vision (no separate OCR step needed).
 * This is the preferred method — single API call, more accurate than OCR → text → analysis.
 *
 * @param {string} base64Image - The base64-encoded image (without data: prefix)
 * @param {object} userProfile  - User profile from AsyncStorage
 * @param {string} scanMode     - One of: Medicine, Food/Menu, Bill, Document, Auto
 * @returns {object} Parsed Gemini result or a fallback error object
 */
export const analyzeImageWithContext = async (base64Image, userProfile, scanMode) => {
  try {
    const prompt = buildImagePrompt(userProfile, scanMode);

    const requestBody = {
      contents: [
        {
          parts: [
            { text: prompt },
            { inline_data: { mime_type: 'image/jpeg', data: base64Image } },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.3,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 4096,
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
      ],
    };

    // Try each model in rotation — automatically switches on 429 rate-limit errors
    const rawText = await callGeminiWithRotation(requestBody);

    if (!rawText) {
      console.warn('geminiService: All models failed or returned empty responses.');
      return buildFallbackResult(scanMode, 'All AI models are currently busy. Please try again in a minute.');
    }

    // Robustly extract JSON — handles markdown fences, preamble text, and truncation.
    const firstBrace = rawText.indexOf('{');
    if (firstBrace === -1) {
      console.warn('geminiService: No JSON found in response:', rawText.slice(0, 200));
      return buildFallbackResult(scanMode, 'AI response was not in expected format.');
    }

    const lastBrace = rawText.lastIndexOf('}');
    if (lastBrace !== -1 && lastBrace > firstBrace) {
      return JSON.parse(rawText.slice(firstBrace, lastBrace + 1));
    }

    // Truncated — recover partial fields
    console.warn('geminiService: Truncated response, attempting partial recovery...');
    const partial = rawText.slice(firstBrace);
    const detectedMatch = partial.match(/"detected"\s*:\s*"([^"]+)"/);
    const statusMatch   = partial.match(/"status"\s*:\s*"([^"]+)"/);
    const insightMatch  = partial.match(/"insight"\s*:\s*"([^"]+)"/);
    const tempSolMatch  = partial.match(/"temporarySolution"\s*:\s*"([^"]+)"/);
    return {
      detected:          detectedMatch?.[1]  || 'Item detected',
      status:            statusMatch?.[1]    || 'warning',
      insight:           insightMatch?.[1]   || 'Analysis was incomplete. Please try scanning again.',
      temporarySolution: tempSolMatch?.[1]   || 'Take appropriate precautions.',
      action: 'Try Again',
      actionType: 'none',
      actionPayload: '',
      scanMode,
    };
  } catch (error) {
    if (error.message?.toLowerCase().includes('network') || error.message?.toLowerCase().includes('fetch')) {
      console.warn('geminiService.analyzeImageWithContext offline/network warning:', error.message);
    } else {
      console.warn('geminiService.analyzeImageWithContext error:', error);
    }
    return buildFallbackResult(scanMode, error.message);
  }
};

/**
 * Sends extracted OCR text + user profile to Gemini and returns
 * a structured analysis result object. (Fallback for when image isn't available.)
 *
 * @param {string} extractedText - OCR text from the camera capture
 * @param {object} userProfile   - User profile from AsyncStorage
 * @param {string} scanMode      - One of: Medicine, Food/Menu, Bill, Document, Auto
 * @returns {object} Parsed Gemini result or a fallback error object
 */
export const analyzeTextWithContext = async (extractedText, userProfile, scanMode = 'Auto') => {
  try {
    const prompt = buildTextPrompt(extractedText, userProfile, scanMode);

    const requestBody = {
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.3,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 4096,
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
      ],
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
      console.warn('geminiService: API responded with error:', errText);
      return buildFallbackResult(scanMode, 'API error — could not analyze content.');
    }

    const json = await response.json();
    const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      console.warn('geminiService: Empty response from Gemini');
      return buildFallbackResult(scanMode, 'Empty response from AI.');
    }

    // Robustly extract JSON — handles markdown fences, preamble text, and truncation.
    const firstBrace = rawText.indexOf('{');
    if (firstBrace === -1) {
      console.warn('geminiService: No JSON object found in response:', rawText.slice(0, 200));
      return buildFallbackResult(scanMode, 'AI response was not in expected format.');
    }

    const lastBrace = rawText.lastIndexOf('}');
    let jsonStr;

    if (lastBrace !== -1 && lastBrace > firstBrace) {
      jsonStr = rawText.slice(firstBrace, lastBrace + 1);
    } else {
      console.warn('geminiService: Response appears truncated, attempting partial recovery...');
      const partial = rawText.slice(firstBrace);
      const detectedMatch = partial.match(/"detected"\s*:\s*"([^"]+)"/);
      const statusMatch = partial.match(/"status"\s*:\s*"([^"]+)"/);
      const insightMatch = partial.match(/"insight"\s*:\s*"([^"]+)"/);
      const tempSolMatch = partial.match(/"temporarySolution"\s*:\s*"([^"]+)"/);
      return {
        detected: detectedMatch?.[1] || 'Item detected',
        status: statusMatch?.[1] || 'warning',
        insight: insightMatch?.[1] || 'Analysis was incomplete. Please try scanning again with better lighting.',
        temporarySolution: tempSolMatch?.[1] || 'Take immediate precautions.',
        action: 'Try Again',
        actionType: 'none',
        actionPayload: '',
        scanMode,
      };
    }

    const parsed = JSON.parse(jsonStr);
    return parsed;
  } catch (error) {
    if (error.message?.toLowerCase().includes('network') || error.message?.toLowerCase().includes('fetch')) {
      console.warn('geminiService.analyzeTextWithContext offline/network warning:', error.message);
    } else {
      console.warn('geminiService.analyzeTextWithContext error:', error);
    }
    return buildFallbackResult(scanMode, error.message);
  }
};

/**
 * Smart merge logic for both text OCR and object visual results.
 *
 * @param {string} extractedText - OCR text
 * @param {object} objectData    - Visual object details from understandObjectFromImage
 * @param {object} userProfile   - Health profile details
 * @param {string} scanMode      - Scan mode
 * @returns {object} Merged or pure result
 */
export async function analyzeWithContext(extractedText, objectData, userProfile, scanMode = 'Auto') {
  // If meaningful text was extracted — use text-based analysis (medicines, bills, documents, menus)
  // If text is empty or less than 10 chars — rely on object visual analysis
  // If both exist — combine them for richer insight

  const hasText = extractedText && extractedText.trim().length > 10;
  const hasObject = objectData && objectData.objectDetected;

  if (hasText && hasObject) {
    // Merge: trust object detection for condition, trust text for specific details
    return {
      detected: objectData.objectDetected,
      condition: objectData.condition,
      conditionDetail: objectData.conditionDetail,
      status: objectData.status,
      insight: objectData.insight,
      recommendation: objectData.recommendation,
      howTo: objectData.howTo,
      temporarySolution: objectData.temporarySolution,
      urgency: objectData.urgency,
      action: objectData.action,
      actionType: objectData.actionType,
      actionPayload: objectData.actionPayload,
      extractedText: extractedText,
      source: 'combined',
      scanMode
    };
  }

  if (hasText && !hasObject) {
    // Text only — use existing Gemini text analysis for medicines, bills, menus, documents
    return await analyzeTextWithContext(extractedText, userProfile, scanMode);
  }

  if (!hasText && hasObject) {
    // Object only — return visual analysis directly
    return {
      ...objectData,
      detected: objectData.objectDetected || 'Object detected',
      source: 'visual',
      scanMode
    };
  }

  // Nothing detected
  return {
    detected: 'Nothing clear detected',
    status: 'warning',
    insight: 'Could not read this clearly. Try better lighting or move closer.',
    recommendation: 'Try again',
    action: 'Scan again',
    actionType: 'none',
    actionPayload: '',
    scanMode
  };
}

/**
 * Returns a safe fallback result object when Gemini is unavailable or fails.
 */
const buildFallbackResult = (scanMode, reason) => ({
  detected: 'Could not analyze content',
  status: 'warning',
  insight: `SnapAct couldn't analyze this content right now. ${reason} Please ensure your Gemini API key is set in config.js and try again.`,
  action: 'Try Again',
  actionType: 'none',
  actionPayload: '',
  scanMode,
  error: true,
});
