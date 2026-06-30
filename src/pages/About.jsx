import React from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useDarkMode } from '@/lib/DarkModeContext';

export default function About() {
  const isMobile = useIsMobile();
  const { dark, theme } = useDarkMode();
  const isRed = theme === 'red';
  const accentLight = isRed ? '#ff8080' : (dark ? '#c77dff' : '#7b2d6e');

  return (
    <div style={{ minHeight: '100vh', padding: isMobile ? '24px' : '48px', fontFamily: 'Roboto, Inter, sans-serif' }}>
      <main style={{ maxWidth: 1100, margin: '0 auto' }}>
        <h1 style={{ fontSize: '2.4rem', marginBottom: 12, color: accentLight }}>About Camellia — the missing pieces</h1>

        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: 10 }}>Why Camellia is different</h2>
          <p style={{ lineHeight: 1.7 }}>
            Look, I am too broke to afford a server. So, your data ONLY stays in your computer's browser cache and the AI provider you chose with our BYOK settings. Nowhere else, you cleared your cookies, you cleared your cache — it's gone. Camellia intentionally keeps your content local unless you explicitly opt to persist it somewhere you control.
          </p>
        </section>

        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: 10 }}>Fullscreen — focused</h2>
          <p style={{ lineHeight: 1.7 }}>
            Every time you exit full screen during a study session, you will be rewarded with three extra questions, and one more for each you missed! If that doesn't stop you from getting distracted, nothing will — Camellia nudges you back toward focus by making it costly to leave your study context.
          </p>
        </section>

        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: 10 }}>The comparison & promise</h2>
          <p style={{ lineHeight: 1.7 }}>
            We are the only program in the world that bridge the crucial gap between controlling endless scrolling and studying efficiently with scientific tools proven by experts.
          </p>
        </section>

        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: 10 }}>AI providers — BYOK</h2>
          <p style={{ lineHeight: 1.7 }}>
            Now this is the part I am most proud of. So, basically you spend two minutes of your precious time, setting up an API key — 4 options, 2 paid & 2 for free — then you plug it into Camellia. Your key stays in your browser. Camellia never sends your key to any server we control. You keep the power to choose the model, the pricing, and the privacy you want.
          </p>

          <div style={{ marginTop: 12, background: dark ? 'rgba(14,6,26,0.9)' : '#F8F4EE', borderRadius: 12, padding: 16, border: `1.5px solid ${dark ? 'rgba(90,40,130,0.35)' : '#E5D8C8'}` }}>
            <p style={{ fontWeight: 700, margin: 0 }}>Settings — AI Provider</p>
            <p style={{ marginTop: 8, marginBottom: 0 }}>
              Example providers we surface in the UI: OpenAI (GPT family), Anthropic (Claude family), Google AI (Gemini), Groq / other LLMs. The UI shows which providers offer a free tier and which are paid so you can pick the one that fits your budget.
            </p>

            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              <div style={{ padding: 12, borderRadius: 10, border: `2px solid ${dark ? 'rgba(90,40,130,0.2)' : '#E5D8C8'}`, background: dark ? 'rgba(30,10,46,0.5)' : 'white' }}>
                <p style={{ margin: 0, fontWeight: 700 }}>OpenAI</p>
                <p style={{ margin: 0, fontSize: '.85rem' }}>GPT-4o, GPT-4o-mini…</p>
              </div>
              <div style={{ padding: 12, borderRadius: 10, border: `2px solid ${dark ? 'rgba(90,40,130,0.2)' : '#E5D8C8'}`, background: dark ? 'rgba(30,10,46,0.5)' : 'white' }}>
                <p style={{ margin: 0, fontWeight: 700 }}>Anthropic</p>
                <p style={{ margin: 0, fontSize: '.85rem' }}>Claude Opus…</p>
              </div>
              <div style={{ padding: 12, borderRadius: 10, border: `2px solid #4285F4`, background: '#4285F418' }}>
                <p style={{ margin: 0, fontWeight: 700, color: '#4285F4' }}>Google AI</p>
                <p style={{ margin: 0, fontSize: '.85rem' }}>Gemini Flash… (free tier)</p>
              </div>
            </div>

            <div style={{ marginTop: 12, background: '#F0FDF4', borderRadius: 8, padding: 10, border: '1.5px solid #22C55E' }}>
              <p style={{ margin: 0, fontWeight: 600 }}>Google AI Studio offers a generous free tier — no billing required to start.</p>
            </div>
          </div>
        </section>

        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: 10 }}>Free? yes — the story</h2>
          <p style={{ lineHeight: 1.7 }}>
            Hey, it's me, founder of Camellia! I am sure you are pretty skeptical about giving your data away to random free services. To be honest, I would be too. What would this even be free for? The short answer: Camellia is intentionally built to keep your data local and to give you control — that lets us ship a product that can remain free for students.
          </p>
          <p style={{ lineHeight: 1.7 }}>
            During freshman finals, I was frustrated that there were no free AI Study options that brought everything together in one place while curbing my urge to scroll. So I started researching, designing, and building tools that actually help you study, not distract you.
          </p>
          <p style={{ lineHeight: 1.7 }}>
            The product is the result of that personal frustration and repeated experiments. I built Camellia because I wanted a study tool that respected my privacy and my wallet.
          </p>
        </section>

        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: 10 }}>Credits & images</h2>
          <p style={{ lineHeight: 1.6 }}>
            Images and mockups used around the site are sample assets — they help demonstrate the UI. If you find something you particularly like or want to contribute assets, reach out on the Contact page.
          </p>
        </section>

        <hr style={{ margin: '32px 0' }} />

        <p style={{ fontSize: '.9rem', color: dark ? '#c0a0e0' : '#7A6A5A' }}>
          This About page contains the copy and provider information that was trimmed from the landing page. If you'd like further adjustments (move a specific paragraph back to the landing page or edit copy), add or edit here.
        </p>
      </main>
    </div>
  );
}
