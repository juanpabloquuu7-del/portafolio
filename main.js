const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

// --- Selector de idioma ES / EN ---
(function initLangToggle() {
  const toggleBtn = document.getElementById('langToggle');
  if (!toggleBtn) return;

  const nodes = document.querySelectorAll('[data-en]');
  nodes.forEach(el => {
    el.dataset.es = el.textContent;
  });

  // aria-label traducible (iconos, botones)
  const ariaNodes = document.querySelectorAll('[data-aria-en]');
  ariaNodes.forEach(el => {
    el.dataset.ariaEs = el.getAttribute('aria-label') || '';
  });

  // alt traducible (imágenes)
  const altNodes = document.querySelectorAll('[data-alt-en]');
  altNodes.forEach(el => {
    el.dataset.altEs = el.getAttribute('alt') || '';
  });

  let isEnglish = false;

  toggleBtn.addEventListener('click', () => {
    isEnglish = !isEnglish;
    document.documentElement.lang = isEnglish ? 'en' : 'es';
    nodes.forEach(el => {
      el.textContent = isEnglish ? el.dataset.en : el.dataset.es;
    });
    ariaNodes.forEach(el => {
      el.setAttribute('aria-label', isEnglish ? el.dataset.ariaEn : el.dataset.ariaEs);
    });
    altNodes.forEach(el => {
      el.setAttribute('alt', isEnglish ? el.dataset.altEn : el.dataset.altEs);
    });
    toggleBtn.textContent = isEnglish ? 'ES' : 'EN';
    toggleBtn.lang = isEnglish ? 'es' : 'en';
  });
})();

// Navbar + barra de progreso (un solo listener pasivo, agrupado por frame)
const navbar = document.getElementById('navbar');
const scrollProgress = document.getElementById('scrollProgress');
let scrollTicking = false;

function onScrollFrame() {
  navbar.classList.toggle('scrolled', window.scrollY > 40);
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  const pct = docHeight > 0 ? window.scrollY / docHeight : 0;
  if (scrollProgress) scrollProgress.style.transform = `scaleX(${pct})`;
  scrollTicking = false;
}

window.addEventListener('scroll', () => {
  if (!scrollTicking) {
    scrollTicking = true;
    requestAnimationFrame(onScrollFrame);
  }
}, { passive: true });
onScrollFrame();

// --- Tarjetas de proyecto en cubo: portada (nombre) ↔ detalle ---
// Estado visible = fijada (toque / teclado) || ratón encima || foco dentro del detalle.
// Solo la cara visible queda expuesta a lectores de pantalla y al tabulador (inert).
(function initProjectCubes() {
  const cards = document.querySelectorAll('.project-card');

  const setFaceAccess = (face, visible) => {
    face.inert = !visible;
    if (visible) face.removeAttribute('aria-hidden');
    else face.setAttribute('aria-hidden', 'true');
  };

  const states = [...cards].map(card => {
    const front = card.querySelector('.card-front');
    const back = card.querySelector('.card-back');
    const toggle = card.querySelector('.card-toggle');
    const close = card.querySelector('.card-close');
    if (!front || !back || !toggle) return null;

    const st = { card, pinned: false, hovered: false, flipped: false };

    st.render = () => {
      const focusInBack = back.contains(document.activeElement);
      const flipped = st.pinned || st.hovered || focusInBack;
      if (flipped === st.flipped) return;
      st.flipped = flipped;
      // Si el foco está en la cara que se oculta, se pasa a la otra antes de volverla inert
      const focusOnFront = front.contains(document.activeElement);
      setFaceAccess(flipped ? back : front, true);
      if (flipped && focusOnFront) back.focus({ preventScroll: true });
      setFaceAccess(flipped ? front : back, false);
      // Chrome no detecta clics dentro de un cubo 3D girado: al terminar el giro se
      // "asienta" la cara de detalle en 2D (visualmente idéntica) para que los enlaces sirvan.
      clearTimeout(st.settleTimer);
      if (flipped) {
        card.classList.add('is-flipped');
        st.settleTimer = setTimeout(() => card.classList.add('is-settled'), 800);
      } else {
        if (card.classList.contains('is-settled')) {
          card.classList.remove('is-settled');
          void card.offsetWidth; // fija el estado girado antes de volver
        }
        card.classList.remove('is-flipped');
      }
      toggle.setAttribute('aria-expanded', String(flipped));
    };

    st.unflip = (refocus) => {
      st.pinned = false;
      st.hovered = false;
      // La portada está oculta mientras el detalle está asentado: se restaura antes de enfocarla
      if (card.classList.contains('is-settled')) {
        card.classList.remove('is-settled');
        void card.offsetWidth;
      }
      if (refocus) {
        setFaceAccess(front, true);
        toggle.focus({ preventScroll: true });
      } else if (back.contains(document.activeElement)) {
        document.activeElement.blur();
      }
      st.render();
    };

    setFaceAccess(back, false);

    // Ratón: girar al entrar, volver al salir (los toques no cuentan como hover)
    card.addEventListener('pointerenter', (e) => {
      if (e.pointerType !== 'mouse') return;
      st.hovered = true;
      st.render();
    });
    card.addEventListener('pointerleave', (e) => {
      if (e.pointerType !== 'mouse') return;
      st.hovered = false;
      // Un clic con ratón dentro del detalle no debe dejar la tarjeta girada al salir
      const active = document.activeElement;
      if (!st.pinned && back.contains(active) && !active.matches(':focus-visible')) active.blur();
      st.render();
    });

    // Toque / clic / Enter / Espacio sobre la portada
    toggle.addEventListener('click', () => {
      st.pinned = !st.flipped;
      if (st.pinned) states.forEach(o => { if (o && o !== st && o.pinned) o.unflip(false); });
      st.render();
      if (st.flipped) back.focus({ preventScroll: true });
    });

    if (close) {
      close.addEventListener('click', (e) => {
        e.stopPropagation();
        st.unflip(e.detail === 0 || !finePointer);
      });
    }

    // Toque en una zona vacía del detalle (no en enlaces ni botones) → volver a la portada
    back.addEventListener('click', (e) => {
      if (e.target.closest('a, button')) return;
      if (st.hovered) return; // con ratón el giro lo controla el hover
      if (window.getSelection && String(window.getSelection())) return;
      st.unflip(false);
    });

    card.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && st.flipped) {
        e.stopPropagation();
        st.unflip(true);
      }
    });

    card.addEventListener('focusin', () => st.render());
    card.addEventListener('focusout', (e) => {
      if (card.contains(e.relatedTarget)) return;
      if (e.relatedTarget) st.pinned = false; // el foco salió a otro elemento (Tab)
      requestAnimationFrame(st.render);
    });

    return st;
  });
})();

// Menú hamburguesa
const hamburger = document.getElementById('hamburger');
const navLinks = document.querySelector('.nav-links');

function setMenu(open) {
  navLinks.classList.toggle('open', open);
  hamburger.setAttribute('aria-expanded', String(open));
}

hamburger.addEventListener('click', () => {
  setMenu(!navLinks.classList.contains('open'));
});

navLinks.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => setMenu(false));
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && navLinks.classList.contains('open')) {
    setMenu(false);
    hamburger.focus();
  }
});

// Intersection Observer — revela las tarjetas al hacer scroll
const revealTargets = document.querySelectorAll('.project-card, .service-card, .stack-category, .value-card, .contact-card');

if (reducedMotion || !('IntersectionObserver' in window)) {
  revealTargets.forEach(el => el.classList.add('visible'));
} else {
  const observer = new IntersectionObserver((entries) => {
    let i = 0;
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const delay = Math.min(i++, 4) * 90;
        setTimeout(() => entry.target.classList.add('visible'), delay);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  revealTargets.forEach(card => observer.observe(card));
}


// Scroll suave para anclas internas (respeta reduced-motion y mueve el foco)
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', e => {
    const id = anchor.getAttribute('href');
    if (id.length < 2) return;
    const target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
    if (anchor.classList.contains('skip-link')) {
      target.focus({ preventScroll: true });
    }
    history.replaceState(null, '', id);
  });
});
