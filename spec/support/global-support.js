globalThis.HTMLElement = class HTMLElement {
  addEventListener() {

  }

  dispatchEvent() {

  }
};

globalThis.customElements = {
  get:    () => {},
  define: () => {},
};

global.MutationObserver = class MutationObserver {
  observe() {

  }
};

global.window = new HTMLElement();
global.document = new HTMLElement();
