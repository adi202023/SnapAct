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
  return 15000;
};

/**
 * Tries each model in GEMINI_MODELS in order.
 */
const callGeminiWithRotation = async (requestBody) => {
  for (let i = 0; i < GEMINI_MODELS.length; i++) {
    const model = GEMINI_MODELS[i];
    console.log(`[SnapAct] Trying model: ${model}`);
    const { ok, status, data } = await callGeminiModel(model, requestBody);

    if (ok) {
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return text;
      console.warn(`[SnapAct] ${model} returned empty text, trying next model...`);
      continue;
    }

    if (status === 429) {
      const waitMs = getRetryDelayMs(data);
      const nextModel = GEMINI_MODELS[i + 1];
      if (nextModel) {
        console.warn(`[SnapAct] ${model} rate limited (${waitMs}ms). Switching to ${nextModel}...`);
        await new Promise((r) => setTimeout(r, 1000));
      } else {
        console.warn(`[SnapAct] All models tried. Waiting ${waitMs}ms then retrying ${GEMINI_MODELS[0]}...`);
        await new Promise((r) => setTimeout(r, waitMs));
        const retry = await callGeminiModel(GEMINI_MODELS[0], requestBody);
        if (retry.ok) {
          return retry.data?.candidates?.[0]?.content?.parts?.[0]?.text || null;
        }
      }
      continue;
    }

    if (status === 0) {
      console.warn(`[SnapAct] ${model} network error (offline):`, data?.error?.message);
    } else {
      console.warn(`[SnapAct] ${model} error ${status}:`, JSON.stringify(data?.error?.message || data));
    }
  }
  return null;
};

/**
 * Helper to identify medical report text keywords
 */
const isMedicalReportText = (text) => {
  if (!text) return false;
  const lower = text.toLowerCase();
  return (
    lower.includes('glucose') ||
    lower.includes('hba1c') ||
    lower.includes('cholesterol') ||
    lower.includes('mg/dl') ||
    lower.includes('mmhg') ||
    (lower.includes('blood') && lower.includes('pressure'))
  );
};

/**
 * Validates that all critical fields are returned from LLM
 */
const validateRequiredFields = (parsed) => {
  const detected = parsed?.detected;
  const status = parsed?.status;
  const insight = parsed?.insight;
  const recommendation = parsed?.recommendation || parsed?.action;
  
  if (!detected || !status || !insight || !recommendation) {
    return false;
  }
  return true;
};

/**
 * Recovers partial fields from a truncated or messy JSON response
 */
const attemptPartialRecovery = (rawText, scanMode) => {
  const firstBrace = rawText.indexOf('{');
  const partial = firstBrace !== -1 ? rawText.slice(firstBrace) : rawText;
  
  const detectedMatch = partial.match(/"detected"\s*:\s*"([^"]+)"/);
  const statusMatch   = partial.match(/"status"\s*:\s*"([^"]+)"/);
  const insightMatch  = partial.match(/"insight"\s*:\s*"([^"]+)"/);
  const tempSolMatch  = partial.match(/"temporarySolution"\s*:\s*"([^"]+)"/);
  const recMatch      = partial.match(/"recommendation"\s*:\s*"([^"]+)"/);
  const actionMatch   = partial.match(/"action"\s*:\s*"([^"]+)"/);
  const buddyMatch    = partial.match(/"buddyNote"\s*:\s*"([^"]+)"/);
  const objTypeMatch  = partial.match(/"objectType"\s*:\s*"([^"]+)"/);

  return {
    detected:          detectedMatch?.[1]  || '',
    status:            statusMatch?.[1]    || '',
    insight:           insightMatch?.[1]   || '',
    recommendation:    recMatch?.[1] || actionMatch?.[1] || '',
    temporarySolution: tempSolMatch?.[1]   || '',
    buddyNote:         buddyMatch?.[1]     || '',
    action:            actionMatch?.[1]    || 'Consult Expert',
    actionType:        'none',
    actionPayload:     '',
    scanMode,
    objectType:        objTypeMatch?.[1]   || 'normal',
  };
};

/**
 * Builds a context-aware text prompt for Gemini.
 */
const buildTextPrompt = (extractedText, userProfile, scanMode, buddyContext = '') => {
  const medicines = userProfile?.medicines?.join(', ') || 'None listed';
  const allergies = userProfile?.allergies?.join(', ') || 'None listed';
  const language = userProfile?.language || 'English';
  const emergencyName = userProfile?.emergencyContact?.name || 'Not set';

  let prompt = `You are SnapAct, a personal AI assistant embedded in a phone camera app.
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

Respond in STRICT JSON format only. No markdown. No code blocks. Return only a single valid JSON object:
{
  "detected": "what was detected — one concise line",
  "status": "danger" or "warning" or "safe",
  "insight": "what this means specifically for THIS user based on their exact profile — 2 to 3 sentences, highly personal",
  "temporarySolution": "an immediate quick-fix or temporary workaround the user can do RIGHT NOW with household items or bare hands — always provide this regardless of object type.",
  "buddyNote": "one short friendly sentence or empty string (only populate if BUDDY CONTEXT shows this item conflicts with their profile or is unhealthy to repeat)",
  "action": "the single most important action label — short, imperative (e.g. Alert My Doctor)",
  "actionType": "whatsapp" or "url" or "none",
  "actionPayload": "the complete WhatsApp message text or full URL to open, or empty string",
  "scanMode": "${scanMode}",
  "objectType": "normal or medical_report"
}`;

  if (buddyContext) {
    prompt += `\n\n${buddyContext}`;
  }

  return prompt;
};

/**
 * Builds a prompt for Gemini Vision that does EVERYTHING in one shot.
 */
const buildImagePrompt = (userProfile, scanMode, buddyContext = '') => {
  const medicines = userProfile?.medicines?.join(', ') || 'None listed';
  const allergies = userProfile?.allergies?.join(', ') || 'None listed';
  const language = userProfile?.language || 'English';
  const emergencyName = userProfile?.emergencyContact?.name || 'Not set';

  let prompt = `You are SnapAct, a personal AI assistant embedded in a phone camera app.
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

SPECIAL CLINICAL NOTE: If you detect medical report content in the image (like glucose, BP, HbA1c, cholesterol, mg/dL, mmHg patterns) during document/medicine/auto scans:
- Set 'objectType' to 'medical_report'
- Set 'detected' to 'Medical Report — [1-line summary, e.g. High Sugar & BP]'
- Set 'recommendation' to exactly 3 to 4 short actionable lines separated by \\n (no bullet characters like '*' or '•'):
  Line 1: Key finding (e.g. "Blood sugar high at 180 — target under 140")
  Line 2: What to avoid + quantity (e.g. "Cut rice to 1 cup/meal, avoid sugar after 6pm")
  Line 3: What to add (e.g. "Add 30min walk after dinner, more leafy greens")
  Line 4 (only if critical): "See doctor within X days"
- Set 'action' to 'Consult Doctor'
- Set 'actionType' to 'whatsapp'
- Set 'actionPayload' to a brief summary message for the doctor

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
  "buddyNote": "one short friendly sentence or empty string (only populate if BUDDY CONTEXT shows this item conflicts with their profile or is unhealthy to repeat)",
  "action": "single most important action label — short imperative phrase",
  "actionType": "whatsapp / url / none",
  "actionPayload": "complete WhatsApp message or full URL, or empty string",
  "scanMode": "${scanMode}",
  "objectType": "normal or medical_report"
}`;

  if (buddyContext) {
    prompt += `\n\n${buddyContext}`;
  }

  return prompt;
};

/**
 * Prompt builder for Medical Reports
 */
const buildMedicalReportPrompt = (extractedText, userProfile) => {
  const medicines = userProfile?.medicines?.join(', ') || 'None listed';
  const allergies = userProfile?.allergies?.join(', ') || 'None listed';
  const language = userProfile?.language || 'English';

  return `You are SnapAct, a personal medical report analyzer.
User Profile:
- Medicines: ${medicines}
- Allergies: ${allergies}
- Language: ${language}

Analyze the following health report metrics:
"${extractedText}"

Identify abnormal health metrics in this report. For the recommendation field, write SHORT actionable lines (max 4 lines total, plain text with \n line breaks, no bullet symbols like '*' or '•'):
Line 1: Key finding (e.g. "Blood sugar high at 180 — target under 140")
Line 2: What to avoid + quantity (e.g. "Cut rice to 1 cup/meal, avoid sugar after 6pm")
Line 3: What to add (e.g. "Add 30min walk after dinner, more leafy greens")
Line 4 (only if critical): "See doctor within X days"

Respond in STRICT JSON format only. No markdown. No code blocks. Return only a single valid JSON object:
{
  "detected": "Medical Report — [1-line summary, e.g. 'High Sugar & BP']",
  "objectType": "medical_report",
  "status": "warning" or "danger" or "safe",
  "insight": "2 sentences max — what this means for the user",
  "recommendation": "the 3-4 line plan described above, \\n separated",
  "temporarySolution": "single most urgent action for today",
  "buddyNote": "",
  "action": "Consult Doctor",
  "actionType": "whatsapp",
  "actionPayload": "brief summary message for doctor"
}`;
};

/**
 * Specific method to analyze medical reports
 */
export const analyzeMedicalReport = async (extractedText, userProfile) => {
  try {
    const prompt = buildMedicalReportPrompt(extractedText, userProfile);
    const requestBody = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 1000 },
    };

    const rawText = await callGeminiWithRotation(requestBody);
    console.log('[SnapAct] RAW medical report response:', rawText);

    if (!rawText) return { isError: true };

    const firstBrace = rawText.indexOf('{');
    const lastBrace = rawText.lastIndexOf('}');
    if (firstBrace === -1 || lastBrace === -1) return { isError: true };

    const parsed = JSON.parse(rawText.slice(firstBrace, lastBrace + 1));
    if (!validateRequiredFields(parsed)) {
      return { isError: true };
    }
    return parsed;
  } catch (error) {
    console.error('geminiService.analyzeMedicalReport error:', error);
    return { isError: true };
  }
};

/**
 * Analyzes an image directly with Gemini Vision.
 */
export const analyzeImageWithContext = async (base64Image, userProfile, scanMode, buddyContext = '') => {
  try {
    const prompt = buildImagePrompt(userProfile, scanMode, buddyContext);
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
        maxOutputTokens: 1000, // Explicitly set to 1000 to prevent truncation errors
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
      ],
    };

    const rawText = await callGeminiWithRotation(requestBody);
    console.log('[SnapAct] RAW model response:', rawText);

    if (!rawText) {
      console.warn('geminiService: Empty response.');
      return { isError: true };
    }

    let parsed;
    try {
      const firstBrace = rawText.indexOf('{');
      const lastBrace = rawText.lastIndexOf('}');
      if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
        throw new Error('Missing JSON braces');
      }
      parsed = JSON.parse(rawText.slice(firstBrace, lastBrace + 1));
    } catch (e) {
      console.warn('[SnapAct] Initial parse failed. Retrying once with JSON strict prompt...');
      
      const retryRequestBody = {
        ...requestBody,
        contents: [
          {
            parts: [
              { text: prompt + '\n\nRespond with ONLY the JSON object, nothing else' },
              { inline_data: { mime_type: 'image/jpeg', data: base64Image } },
            ],
          },
        ],
      };

      const retryRawText = await callGeminiWithRotation(retryRequestBody);
      console.log('[SnapAct] RAW model response (retry):', retryRawText);

      try {
        const firstBrace = retryRawText.indexOf('{');
        const lastBrace = retryRawText.lastIndexOf('}');
        if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
          throw new Error('Retry missing JSON braces');
        }
        parsed = JSON.parse(retryRawText.slice(firstBrace, lastBrace + 1));
      } catch (retryErr) {
        console.warn('[SnapAct] Retry parse failed too. Attempting partial recovery...');
        parsed = attemptPartialRecovery(rawText, scanMode);
      }
    }

    if (!validateRequiredFields(parsed)) {
      console.warn('[SnapAct] Missing required fields in parsed result.');
      return { isError: true };
    }

    return parsed;
  } catch (error) {
    console.error('geminiService.analyzeImageWithContext error:', error);
    return { isError: true };
  }
};

/**
 * Sends extracted OCR text + user profile to Gemini.
 */
export const analyzeTextWithContext = async (extractedText, userProfile, scanMode = 'Auto', buddyContext = '') => {
  try {
    // Detect medical report content and route to specialized analyzer
    if ((scanMode === 'Document' || scanMode === 'Medicine' || scanMode === 'Auto') && isMedicalReportText(extractedText)) {
      console.log('[SnapAct] Medical report signature detected. Routing to specialized health metric analyzer.');
      return await analyzeMedicalReport(extractedText, userProfile);
    }

    const prompt = buildTextPrompt(extractedText, userProfile, scanMode, buddyContext);
    const requestBody = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1000, // Explicitly set to 1000 to prevent truncation errors
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
      console.warn('geminiService: API error');
      return { isError: true };
    }

    const json = await response.json();
    const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    console.log('[SnapAct] RAW text response:', rawText);

    if (!rawText) return { isError: true };

    let parsed;
    try {
      const firstBrace = rawText.indexOf('{');
      const lastBrace = rawText.lastIndexOf('}');
      if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
        throw new Error('Missing JSON braces');
      }
      parsed = JSON.parse(rawText.slice(firstBrace, lastBrace + 1));
    } catch (e) {
      console.warn('[SnapAct] Text parse failed. Retrying once with strict instructions...');
      
      const retryRequestBody = {
        ...requestBody,
        contents: [
          {
            parts: [{ text: prompt + '\n\nRespond with ONLY the JSON object, nothing else' }],
          },
        ],
      };

      const retryRes = await fetch(GEMINI_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(retryRequestBody),
      });

      if (retryRes.ok) {
        const retryJson = await retryRes.json();
        const retryRawText = retryJson?.candidates?.[0]?.content?.parts?.[0]?.text;
        console.log('[SnapAct] RAW text response (retry):', retryRawText);
        
        try {
          const firstBrace = retryRawText.indexOf('{');
          const lastBrace = retryRawText.lastIndexOf('}');
          parsed = JSON.parse(retryRawText.slice(firstBrace, lastBrace + 1));
        } catch (_) {
          parsed = attemptPartialRecovery(rawText, scanMode);
        }
      } else {
        parsed = attemptPartialRecovery(rawText, scanMode);
      }
    }

    if (!validateRequiredFields(parsed)) {
      return { isError: true };
    }

    return parsed;
  } catch (error) {
    console.error('geminiService.analyzeTextWithContext error:', error);
    return { isError: true };
  }
};

/**
 * Smart merge logic for both text OCR and object visual results.
 */
export async function analyzeWithContext(extractedText, objectData, userProfile, scanMode = 'Auto') {
  const hasText = extractedText && extractedText.trim().length > 10;
  const hasObject = objectData && objectData.objectDetected;

  if (hasText && isMedicalReportText(extractedText)) {
    return await analyzeMedicalReport(extractedText, userProfile);
  }

  if (hasText && hasObject) {
    return {
      detected: objectData.objectDetected,
      condition: objectData.condition,
      conditionDetail: objectData.conditionDetail,
      status: objectData.status,
      insight: objectData.insight,
      recommendation: objectData.recommendation || objectData.action,
      howTo: objectData.howTo,
      temporarySolution: objectData.temporarySolution,
      buddyNote: objectData.buddyNote || '',
      urgency: objectData.urgency,
      action: objectData.action,
      actionType: objectData.actionType,
      actionPayload: objectData.actionPayload,
      extractedText: extractedText,
      source: 'combined',
      scanMode,
      objectType: objectData.objectType || 'normal',
    };
  }

  if (hasText && !hasObject) {
    return await analyzeTextWithContext(extractedText, userProfile, scanMode);
  }

  if (!hasText && hasObject) {
    return {
      ...objectData,
      detected: objectData.objectDetected || 'Object detected',
      recommendation: objectData.recommendation || objectData.action,
      source: 'visual',
      scanMode,
      objectType: objectData.objectType || 'normal',
    };
  }

  return {
    detected: 'Nothing clear detected',
    status: 'warning',
    insight: 'Could not read this clearly. Try better lighting or move closer.',
    recommendation: 'Try again',
    action: 'Scan again',
    actionType: 'none',
    actionPayload: '',
    scanMode,
    buddyNote: '',
    objectType: 'normal',
  };
}
