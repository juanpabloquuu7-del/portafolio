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

// Ripple de clic (solo con puntero fino y sin reduced-motion)
if (finePointer && !reducedMotion) {
  document.addEventListener('click', (e) => {
    if (e.detail === 0) return; // clic por teclado
    const ripple = document.createElement('div');
    ripple.className = 'click-ripple';
    ripple.style.left = `${e.clientX}px`;
    ripple.style.top = `${e.clientY}px`;
    document.body.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove());
  });

  // Botones magnéticos — se acercan levemente al cursor
  document.querySelectorAll('.btn').forEach(el => {
    el.addEventListener('mousemove', (e) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      el.style.transform = `translate(${x * 0.12}px, ${y * 0.12}px)`;
    });
    el.addEventListener('mouseleave', () => {
      el.style.transform = '';
    });
  });

  // Tilt 3D sutil en las cartas de proyecto (solo cuando ya son visibles)
  document.querySelectorAll('.project-card').forEach(card => {
    card.addEventListener('mousemove', (e) => {
      if (!card.classList.contains('visible')) return;
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const strength = card.classList.contains('project-card--featured') ? 2 : 4;
      const rotateX = ((y / rect.height) - 0.5) * -strength;
      const rotateY = ((x / rect.width) - 0.5) * strength;
      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-2px)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });
}

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

// --- Cursor personalizado (solo puntero fino y sin reduced-motion) ---
const cursorDot = document.getElementById('cursorDot');
const cursorRing = document.getElementById('cursorRing');

if (cursorDot && cursorRing && finePointer && !reducedMotion) {
  document.documentElement.classList.add('has-custom-cursor');

  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let ringX = mouseX;
  let ringY = mouseY;
  let ringScale = 1;

  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    cursorDot.style.transform = `translate(${mouseX}px, ${mouseY}px) translate(-50%, -50%)`;
  }, { passive: true });

  function animateRing() {
    ringX += (mouseX - ringX) * 0.18;
    ringY += (mouseY - ringY) * 0.18;
    cursorRing.style.transform = `translate(${ringX}px, ${ringY}px) translate(-50%, -50%) scale(${ringScale})`;
    requestAnimationFrame(animateRing);
  }
  animateRing();

  document.addEventListener('mouseleave', () => {
    cursorDot.classList.add('hidden');
    cursorRing.classList.add('hidden');
  });
  document.addEventListener('mouseenter', () => {
    cursorDot.classList.remove('hidden');
    cursorRing.classList.remove('hidden');
  });

  const interactiveSelector = 'a, button, .project-card, .contact-card';
  document.querySelectorAll(interactiveSelector).forEach(el => {
    el.addEventListener('mouseenter', () => cursorRing.classList.add('active'));
    el.addEventListener('mouseleave', () => cursorRing.classList.remove('active'));
  });

  document.addEventListener('mousedown', () => { ringScale = 0.85; });
  document.addEventListener('mouseup', () => { ringScale = 1; });
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
