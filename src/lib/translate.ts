// Admin only ever types product characteristics in French — this translates
// it to English and Arabic at save time via MyMemory (mymemory.translated.net),
// a free translation API with no key and no billing required. Anonymous
// requests are capped at ~500 bytes per query and ~5000 words/day per IP,
// which comfortably covers a product description.
async function translateText(text: string, targetLangCode: 'en' | 'ar'): Promise<string | null> {
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=fr|${targetLangCode}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`MyMemory API responded ${res.status}`);
    const json = await res.json();
    if (json.responseStatus && json.responseStatus !== 200) throw new Error(`MyMemory error: ${json.responseDetails}`);
    const translated = json.responseData?.translatedText;
    return translated || null;
  } catch (err) {
    console.error(`[translate] ${targetLangCode} translation failed:`, err);
    return null;
  }
}

export async function translateCharacteristics(frText: string): Promise<{ en: string | null; ar: string | null }> {
  if (!frText.trim()) return { en: null, ar: null };
  const [en, ar] = await Promise.all([
    translateText(frText, 'en'),
    translateText(frText, 'ar'),
  ]);
  return { en, ar };
}
