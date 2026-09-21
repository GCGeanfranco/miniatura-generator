export default defineContentScript({
  // Google Flow vive en flow.google.com/project/<id>
  matches: ['*://flow.google.com/*'],
  allFrames: true,
  main() {
    console.log('[Flow Prompt Sender] content script cargado');

    const EDITOR_SELECTOR = 'flow-rich-text-editor .ProseMirror[contenteditable="true"]';
    const SUBMIT_SELECTOR = 'span.submit-button-slot button[type="submit"]';

    function findEditor(): HTMLElement | null {
      return document.querySelector<HTMLElement>(EDITOR_SELECTOR);
    }

    function findSubmitButton(): HTMLButtonElement | null {
      return document.querySelector<HTMLButtonElement>(SUBMIT_SELECTOR);
    }

    function selectAllContents(el: HTMLElement) {
      const range = document.createRange();
      range.selectNodeContents(el);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }

    // Simula "escribir" el prompt en el editor ProseMirror. execCommand('insertText')
    // dispara los mismos eventos beforeinput/input que produce el teclado real,
    // que es lo que ProseMirror (y Angular por detrás) necesitan para reaccionar.
    function insertPrompt(text: string): boolean {
      const editor = findEditor();
      if (!editor) return false;

      editor.focus();
      selectAllContents(editor); // reemplaza cualquier texto que hubiera quedado
      document.execCommand('insertText', false, text);
      return true;
    }

    // El botón de enviar nace con "disabled" hasta que Angular detecta que el
    // editor tiene contenido. Esperamos ese cambio en vez de asumir un tiempo fijo.
    function waitForEnabledButton(timeoutMs = 4000): Promise<HTMLButtonElement | null> {
      return new Promise((resolve) => {
        const existing = findSubmitButton();
        if (existing && !existing.disabled) {
          resolve(existing);
          return;
        }

        const observer = new MutationObserver(() => {
          const btn = findSubmitButton();
          if (btn && !btn.disabled) {
            observer.disconnect();
            clearTimeout(timer);
            resolve(btn);
          }
        });

        observer.observe(document.body, {
          attributes: true,
          attributeFilter: ['disabled'],
          subtree: true,
        });

        const timer = setTimeout(() => {
          observer.disconnect();
          resolve(findSubmitButton());
        }, timeoutMs);
      });
    }

    async function sendPrompt(text: string) {
      const inserted = insertPrompt(text);
      if (!inserted) {
        return {
          ok: false as const,
          error: 'No encontré el cuadro de prompt de Flow en esta página.',
        };
      }

      const btn = await waitForEnabledButton();
      if (!btn || btn.disabled) {
        return {
          ok: false as const,
          error: 'El prompt se escribió pero el botón de generar sigue deshabilitado.',
        };
      }

      // button.click() dispara un evento "click" confiable (isTrusted: true),
      // a diferencia de dispatchEvent(new MouseEvent(...)).
      btn.click();
      return { ok: true as const };
    }

    browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message?.type === 'FLOW_SEND_PROMPT') {
        sendPrompt(String(message.prompt ?? '')).then(sendResponse);
        return true; // indica que la respuesta llega de forma asíncrona
      }
      return undefined;
    });
  },
});
