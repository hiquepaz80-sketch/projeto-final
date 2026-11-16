/* ===== Fundo de circuito: linhas de energia aleatórias =====
   Cada linha nasce num lugar aleatório, anda numa direção, pode fazer
   curvas (90° ou 45°) em momentos aleatórios e some quando o tempo
   dela acaba, mesmo estando no meio da tela. */

(function () {
  // Respeita quem desativou animações no sistema
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // ---------- Ajustes (pode mexer nesses números) ----------
  const COR_PONTA   = '120, 235, 255'; // cor da "cabeça" da linha (R, G, B)
  const COR_MEIO    = '0, 200, 255';   // cor do meio
  const COR_BRILHO  = '#00b7ff';       // brilho em volta
  const VEL_MIN = 90,  VEL_MAX = 280;  // velocidade (pixels por segundo)
  const TAM_MIN = 80,  TAM_MAX = 320;  // comprimento da linha
  const VIDA_MIN = 1.5, VIDA_MAX = 7;  // quantos segundos ela vive
  const RAIO_CURVA = 24;               // quão arredondada é a curva
  // ----------------------------------------------------------

  const canvas = document.createElement('canvas');
  canvas.id = 'fundo-energia';
  Object.assign(canvas.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100%',
    height: '100%',
    zIndex: '-1',
    pointerEvents: 'none'
  });
  document.body.prepend(canvas);
  const ctx = canvas.getContext('2d');

  let w = 0, h = 0;
  const linhas = [];

  const aleatorio = (a, b) => a + Math.random() * (b - a);
  const sortear = (lista) => lista[Math.floor(Math.random() * lista.length)];

  function novaLinha() {
    const x = aleatorio(0, w);
    const y = aleatorio(0, h);
    return {
      x, y,
      ang: sortear([0, 90, 180, 270]),          // direção em graus
      vel: aleatorio(VEL_MIN, VEL_MAX),
      tam: aleatorio(TAM_MIN, TAM_MAX),
      vida: aleatorio(VIDA_MIN, VIDA_MAX),
      idade: 0,
      andou: 0,
      ate: Math.random() < 0.25 ? Infinity : aleatorio(60, 320), // distância até a próxima curva
      espera: aleatorio(0, 3),                   // atraso para aparecer
      pontos: [{ x, y }, { x, y }]
    };
  }

  function reiniciar(l) {
    const n = novaLinha();
    n.espera = aleatorio(0.2, 2.5);
    Object.assign(l, n);
  }

  function ajustarQuantidade() {
    const alvo = Math.max(8, Math.min(26, Math.round((w * h) / 55000)));
    while (linhas.length < alvo) linhas.push(novaLinha());
    while (linhas.length > alvo) linhas.pop();
  }

  function redimensionar() {
    const dpr = window.devicePixelRatio || 1;
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ajustarQuantidade();
  }

  function atualizar(l, dt) {
    if (l.espera > 0) {
      l.espera -= dt;
      return;
    }

    l.idade += dt;

    // anda
    const rad = (l.ang * Math.PI) / 180;
    const d = l.vel * dt;
    l.x += Math.cos(rad) * d;
    l.y += Math.sin(rad) * d;
    l.andou += d;

    const ponta = l.pontos[l.pontos.length - 1];
    ponta.x = l.x;
    ponta.y = l.y;

    // faz uma curva de vez em quando
    if (l.andou >= l.ate) {
      l.ang += sortear([-90, -45, 45, 90]);
      l.pontos.push({ x: l.x, y: l.y });
      l.andou = 0;
      l.ate = Math.random() < 0.3 ? Infinity : aleatorio(60, 320);
    }

    // encurta a cauda para manter o comprimento
    let total = 0;
    for (let i = 1; i < l.pontos.length; i++) {
      total += Math.hypot(l.pontos[i].x - l.pontos[i - 1].x, l.pontos[i].y - l.pontos[i - 1].y);
    }
    let excesso = total - l.tam;
    while (excesso > 0 && l.pontos.length >= 2) {
      const a = l.pontos[0];
      const b = l.pontos[1];
      const seg = Math.hypot(b.x - a.x, b.y - a.y);
      if (seg <= excesso && l.pontos.length > 2) {
        l.pontos.shift();
        excesso -= seg;
      } else {
        const corte = Math.min(excesso, seg);
        if (seg > 0) {
          a.x += ((b.x - a.x) * corte) / seg;
          a.y += ((b.y - a.y) * corte) / seg;
        }
        break;
      }
    }

    // saiu da tela? começa a sumir
    if (l.x < -60 || l.x > w + 60 || l.y < -60 || l.y > h + 60) {
      l.idade = Math.max(l.idade, l.vida);
    }

    // acabou o tempo (mais a duração do sumiço)? renasce em outro lugar
    if (l.idade > l.vida + 0.8) reiniciar(l);
  }

  function desenhar(l) {
    if (l.espera > 0 || l.pontos.length < 2) return;

    // aparece suave no começo e some suave no fim
    let alpha = Math.min(l.idade / 0.3, 1);
    if (l.idade > l.vida) alpha *= Math.max(0, 1 - (l.idade - l.vida) / 0.8);
    if (alpha <= 0) return;

    const p = l.pontos;
    const cauda = p[0];
    const cabeca = p[p.length - 1];

    const g = ctx.createLinearGradient(cauda.x, cauda.y, cabeca.x, cabeca.y);
    g.addColorStop(0, 'rgba(' + COR_MEIO + ', 0)');
    g.addColorStop(0.6, 'rgba(' + COR_MEIO + ', ' + alpha * 0.6 + ')');
    g.addColorStop(1, 'rgba(' + COR_PONTA + ', ' + alpha + ')');

    ctx.strokeStyle = g;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = COR_BRILHO;
    ctx.shadowBlur = 14;

    ctx.beginPath();
    ctx.moveTo(p[0].x, p[0].y);
    for (let i = 1; i < p.length - 1; i++) {
      ctx.arcTo(p[i].x, p[i].y, p[i + 1].x, p[i + 1].y, RAIO_CURVA);
    }
    ctx.lineTo(cabeca.x, cabeca.y);
    ctx.stroke();

    // ponto brilhante na ponta
    ctx.fillStyle = 'rgba(210, 250, 255, ' + alpha + ')';
    ctx.beginPath();
    ctx.arc(cabeca.x, cabeca.y, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }

  let ultimo = performance.now();
  function quadro(agora) {
    const dt = Math.min((agora - ultimo) / 1000, 0.05);
    ultimo = agora;

    ctx.clearRect(0, 0, w, h);
    for (const l of linhas) {
      atualizar(l, dt);
      desenhar(l);
    }
    requestAnimationFrame(quadro);
  }

  window.addEventListener('resize', redimensionar);
  redimensionar();
  requestAnimationFrame(quadro);
})();
