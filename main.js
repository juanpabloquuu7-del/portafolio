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
