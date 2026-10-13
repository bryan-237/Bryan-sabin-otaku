// Fonction serveur (Vercel) : elle garde ta clé OpenRouter secrète.
// La clé n'est PAS écrite ici : elle est dans les "Environment Variables" de Vercel.

const SYSTEM_PROMPT =
  "Tu es l'Assistant Otaku du site de Bryan Sabin : un expert passionné de manga, d'anime, de light novels et de webtoons, " +
  "anciens comme récents. Réponds dans la langue de l'utilisateur (français par défaut), de façon vivante et claire, " +
  "avec un ton de fan sympa mais sans en faire trop. Tu peux : expliquer les histoires, personnages, pouvoirs, arcs, fins, " +
  "théories, différences entre manga et anime, ordre de lecture ou de visionnage, et recommander des séries selon les goûts. " +
  "RÈGLES : 1) Avant de révéler un spoiler important, préviens avec « ⚠️ Spoiler » et laisse la personne choisir. " +
  "2) Ne jamais inventer : si tu n'es pas sûr d'une info, surtout pour les chapitres ou sorties très récents, dis-le " +
  "et conseille de vérifier sur une source officielle. 3) Ne recopie pas de longs passages d'œuvres protégées : résume. " +
  "4) Si la question n'a rien à voir avec les mangas ou les animes, réponds brièvement et ramène gentiment vers l'univers otaku.";

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  const key = process.env.OPENROUTER_KEY;
  if (!key) {
    return res.status(500).json({ error: "Clé manquante côté serveur (OPENROUTER_KEY)." });
  }

  // On nettoie ce que le navigateur envoie
  const brut = Array.isArray(req.body && req.body.messages) ? req.body.messages : [];
  const messages = brut
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-12)
    .map(m => ({ role: m.role, content: m.content.slice(0, 2000) }));

  if (messages.length === 0 || messages[messages.length - 1].role !== 'user') {
    return res.status(400).json({ error: 'Message invalide.' });
  }

  try {
    const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + key,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'openrouter/free',
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
        max_tokens: 700
      })
    });

    const data = await r.json();
    if (!r.ok) {
      const detail = (data && data.error && data.error.message) || 'Erreur du service IA';
      return res.status(502).json({ error: detail });
    }

    const reply = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    if (!reply) return res.status(502).json({ error: 'Réponse vide, réessaie.' });

    return res.status(200).json({ reply: reply.trim() });
  } catch (e) {
    return res.status(500).json({ error: 'Erreur serveur : ' + e.message });
  }
};
