// NO-OP OverlayFix: rollback seguro para parar de mexer em pointer-events em tempo de execução.
// Este stub substitui a heurística anterior que desativava pointer-events em elementos "transparentes" e grandes.
// Com isso, os cliques voltam a funcionar (inclusive na tela de login e na metade superior das páginas).

export default class OverlayFix {
  constructor(options = {}) {
    this.options = options;
    this.observer = null;
  }

  // Antes: iniciava observers e varria DOM aplicando pointer-events:none.
  // Agora: não faz nada.
  init() {
    return this;
  }

  // Antes: escaneava e aplicava patches em elementos.
  // Agora: não faz nada.
  checkAndFixOverlays() {}

  // Antes: processava elemento (aplicava pointer-events:none).
  // Agora: não faz nada.
  processElement() {}

  // Antes: restaurava pointer-events.
  // Agora: não faz nada.
  restoreIfVisible() {}

  // Antes: destruía observers.
  // Agora: apenas garante que não há observers ativos.
  destroy() {
    if (this.observer) {
      try { this.observer.disconnect?.(); } catch {}
      this.observer = null;
    }
  }
}
