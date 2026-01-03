/**
 * AIRC Infographic Generator
 * Uses Google Imagen 4 with Solienne's design aesthetic
 */

const fs = require('fs');
const path = require('path');

const API_KEY = 'REDACTED_API_KEY';
const MODEL = 'imagen-4.0-generate-preview-06-06';

const panels = [
  {
    name: 'panel-1-problem',
    prompt: `Minimal infographic panel, deep charcoal background #0A0A0A. Three simple geometric AI agent icons (circles with dots) in separate white-outlined boxes, disconnected. Dotted lines between them showing failed connections. Small white text "AI Agents Live in Silos". Swiss design, Helvetica typography, gallery aesthetic, no gradients, brutalist minimal, clean iconography. Portrait 9:16 aspect ratio.`
  },
  {
    name: 'panel-2-solution',
    prompt: `Minimal infographic panel, deep charcoal background #0A0A0A. A simple white document/scroll icon in center with "AIRC" text. Three small icons below it: a person silhouette (Identity), a pulse/signal (Presence), an envelope (Messages). White and muted blue #6B8FFF accents only. Swiss design, Helvetica typography, gallery aesthetic, no gradients, brutalist minimal. Portrait 9:16 aspect ratio.`
  },
  {
    name: 'panel-3-experiment',
    prompt: `Minimal infographic panel, deep charcoal background #0A0A0A. Left side: simple AI robot icon. Arrow pointing right to: a browser/website icon labeled "airc.chat". Arrow pointing right to: code brackets { }. Clean flow diagram. White and muted blue #6B8FFF accents. Swiss design, Helvetica typography, gallery aesthetic, no gradients, brutalist minimal. Portrait 9:16 aspect ratio.`
  },
  {
    name: 'panel-4-result',
    prompt: `Minimal infographic panel, deep charcoal background #0A0A0A. Large checkmark icon in muted blue #6B8FFF. Stats displayed cleanly: "10/10" "5 min" "300 lines" "0 humans". Success indicators, clean data visualization. Swiss design, Helvetica typography, gallery aesthetic, no gradients, brutalist minimal, museum exhibition style. Portrait 9:16 aspect ratio.`
  },
  {
    name: 'panel-5-implication',
    prompt: `Minimal infographic panel, deep charcoal background #0A0A0A. Network diagram: one central node labeled "AIRC" in muted blue #6B8FFF, connected to 5-6 smaller nodes around it representing different AI agents. Expansion lines suggesting growth outward. Swiss design, Helvetica typography, gallery aesthetic, no gradients, brutalist minimal. Portrait 9:16 aspect ratio.`
  }
];

async function generatePanel(panel) {
  console.log(`\nGenerating ${panel.name}...`);

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateImages?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: panel.prompt,
        config: {
          numberOfImages: 1,
          aspectRatio: '9:16',
          personGeneration: 'DONT_ALLOW'
        }
      })
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error(`Error for ${panel.name}:`, error);
    return null;
  }

  const data = await response.json();

  if (data.generatedImages && data.generatedImages[0]) {
    const imageData = data.generatedImages[0].image.imageBytes;
    const outputPath = path.join(__dirname, 'infographic', `${panel.name}.png`);

    // Ensure directory exists
    fs.mkdirSync(path.join(__dirname, 'infographic'), { recursive: true });

    // Save image
    fs.writeFileSync(outputPath, Buffer.from(imageData, 'base64'));
    console.log(`✓ Saved: ${outputPath}`);
    return outputPath;
  }

  console.error(`No image generated for ${panel.name}`);
  return null;
}

async function main() {
  console.log('='.repeat(50));
  console.log('AIRC Infographic Generator');
  console.log('Solienne Design Aesthetic');
  console.log('='.repeat(50));

  const results = [];

  for (const panel of panels) {
    const result = await generatePanel(panel);
    if (result) results.push(result);
    // Small delay between requests
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log('\n' + '='.repeat(50));
  console.log(`Generated ${results.length}/${panels.length} panels`);
  console.log('Output directory: ./infographic/');
  console.log('='.repeat(50));
}

main().catch(console.error);
