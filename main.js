// --- Selector de idioma ES / EN ---
(function initLangToggle() {
  const toggleBtn = document.getElementById('langToggle');
  if (!toggleBtn) return;

  const nodes = document.querySelectorAll('[data-en]');
  nodes.forEach(el => {
    el.dataset.es = el.textContent;
  });

  let isEnglish = false;

  toggleBtn.addEventListener('click', () => {
    isEnglish = !isEnglish;
    document.documentElement.lang = isEnglish ? 'en' : 'es';
    nodes.forEach(el => {
      el.textContent = isEnglish ? el.dataset.en : el.dataset.es;
    });
    toggleBtn.textContent = isEnglish ? 'ES' : 'EN';
  });
})();

// Navbar scroll effect
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 40);
});

// Barra de progreso de scroll
const scrollProgress = document.getElementById('scrollProgress');
function updateScrollProgress() {
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  const pct = docHeight > 0 ? (window.scrollY / docHeight) * 100 : 0;
  if (scrollProgress) scrollProgress.style.width = `${pct}%`;
}
window.addEventListener('scroll', updateScrollProgress);
updateScrollProgress();

// Ripple de clic en cualquier parte de la página
document.addEventListener('click', (e) => {
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
    el.style.transform = `translate(${x * 0.15}px, ${y * 0.15}px)`;
  });
  el.addEventListener('mouseleave', () => {
    el.style.transform = '';
  });
});

// Hamburger menu
const hamburger = document.getElementById('hamburger');
const navLinks = document.querySelector('.nav-links');

hamburger.addEventListener('click', () => {
  navLinks.classList.toggle('open');
});

// Close menu on nav link click (mobile)
navLinks.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => navLinks.classList.remove('open'));
});

// Intersection Observer — animate cards on scroll
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      setTimeout(() => entry.target.classList.add('visible'), i * 120);
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.project-card, .stack-category, .value-card, .contact-card')
  .forEach(card => observer.observe(card));

// Tilt 3D sutil en las cartas de proyecto
document.querySelectorAll('.project-card').forEach(card => {
  card.addEventListener('mousemove', (e) => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const rotateX = ((y / rect.height) - 0.5) * -6;
    const rotateY = ((x / rect.width) - 0.5) * 6;
    card.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-2px)`;
  });
  card.addEventListener('mouseleave', () => {
    card.style.transform = '';
  });
});

// --- Cursor personalizado ---
const cursorDot = document.getElementById('cursorDot');
const cursorRing = document.getElementById('cursorRing');

if (cursorDot && cursorRing && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let ringX = mouseX;
  let ringY = mouseY;

  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    cursorDot.style.left = `${mouseX}px`;
    cursorDot.style.top = `${mouseY}px`;
  });

  function animateRing() {
    ringX += (mouseX - ringX) * 0.18;
    ringY += (mouseY - ringY) * 0.18;
    cursorRing.style.left = `${ringX}px`;
    cursorRing.style.top = `${ringY}px`;
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

  const interactiveSelector = 'a, button, .project-card, .stack-category, .value-card, .contact-card, .stack-badge, .tag, .lang-toggle';
  document.querySelectorAll(interactiveSelector).forEach(el => {
    el.addEventListener('mouseenter', () => cursorRing.classList.add('active'));
    el.addEventListener('mouseleave', () => cursorRing.classList.remove('active'));
  });

  document.addEventListener('mousedown', () => cursorRing.style.transform = 'translate(-50%, -50%) scale(0.85)');
  document.addEventListener('mouseup', () => cursorRing.style.transform = 'translate(-50%, -50%) scale(1)');
}

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', e => {
    const target = document.querySelector(anchor.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});
