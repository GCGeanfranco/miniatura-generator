import { useState } from 'react';
import './App.css';

const FLOW_URL_HINT = 'flow.google.com';

type Status = { type: 'idle' | 'ok' | 'error'; text: string };

function App() {
  const [prompt, setPrompt] = useState('');
  const [status, setStatus] = useState<Status>({ type: 'idle', text: '' });
  const [sending, setSending] = useState(false);


  async function handleSend() {
    const text = prompt.trim();
    if (!text) {
      setStatus({ type: 'error', text: 'Escribe o pega un prompt primero.' });
      return;
    }

    setSending(true);
    setStatus({ type: 'idle', text: 'Enviando…' });

    try {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });

      if (!tab?.id || !tab.url?.includes(FLOW_URL_HINT)) {
        setStatus({
          type: 'error',
          text: `Abre ${FLOW_URL_HINT} en la pestaña activa antes de enviar.`,
        });
        return;
      }

      let response;
      try {
        response = await browser.tabs.sendMessage(tab.id, {
          type: 'FLOW_SEND_PROMPT',
          prompt: text,
        });
      } catch {
        // El content script no estaba inyectado (pestaña abierta antes de
        // instalar/recargar la extensión). Lo inyectamos y reintentamos.
        await ensureContentScriptInjected(tab.id);
        response = await browser.tabs.sendMessage(tab.id, {
          type: 'FLOW_SEND_PROMPT',
          prompt: text,
        });
      }

      if (response?.ok) {
        setStatus({ type: 'ok', text: 'Prompt enviado a Flow.' });
      } else {
        setStatus({ type: 'error', text: response?.error || 'No se pudo enviar el prompt.' });
      }
    } catch (err) {
      setStatus({
        type: 'error',
        text: 'No pude comunicarme con la pestaña de Flow. ¿Está abierta y ya cargada?',
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="popup">
      <h1>Enviar prompt a Flow</h1>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Pega aquí el prompt para Google Flow"
        rows={6}
        autoFocus
      />
      <button onClick={handleSend} disabled={sending}>
        {sending ? 'Enviando…' : 'Enviar a Flow'}
      </button>
      {status.text && <p className={`status status-${status.type}`}>{status.text}</p>}
    </div>
  );
}

async function ensureContentScriptInjected(tabId: number) {
  await browser.scripting.executeScript({
    target: { tabId, allFrames: true },
    files: ['content-scripts/content.js'],
  });
}

export default App;
