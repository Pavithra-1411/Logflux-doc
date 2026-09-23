/* ===== main.js — LOGFLUX site interactions ===== */

// ===== NAVBAR =====
const navbar = document.getElementById('navbar');
const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');

window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 20);
  updateActiveNav();
});

navToggle && navToggle.addEventListener('click', () => {
  navLinks.classList.toggle('open');
});

// Close mobile nav on link click
document.querySelectorAll('.nav-links a').forEach(a => {
  a.addEventListener('click', () => navLinks.classList.remove('open'));
});

function updateActiveNav() {
  const sections = document.querySelectorAll('section[id]');
  const links = document.querySelectorAll('.nav-links a[href^="#"]');
  let current = '';
  sections.forEach(s => {
    if (window.scrollY + 80 >= s.offsetTop) current = s.id;
  });
  links.forEach(l => {
    l.classList.toggle('active', l.getAttribute('href') === '#' + current);
  });
}

// ===== HERO CANVAS GRID =====
(function initGrid() {
  const canvas = document.getElementById('gridCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, dots = [], animFrame;

  function resize() {
    W = canvas.width = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
    initDots();
  }

  function initDots() {
    dots = [];
    const spacing = 60;
    for (let x = 0; x < W; x += spacing) {
      for (let y = 0; y < H; y += spacing) {
        dots.push({
          x: x + (Math.random() - 0.5) * 20,
          y: y + (Math.random() - 0.5) * 20,
          r: Math.random() * 1 + 0.5,
          alpha: Math.random() * 0.4 + 0.1,
          speed: Math.random() * 0.008 + 0.003,
          phase: Math.random() * Math.PI * 2
        });
      }
    }
  }

  let t = 0;
  function draw() {
    ctx.clearRect(0, 0, W, H);
    t += 0.5;

    // Grid lines
    const gridSize = 60;
    ctx.strokeStyle = 'rgba(124,111,247,0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += gridSize) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y < H; y += gridSize) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    // Animated dots
    dots.forEach(d => {
      const pulse = Math.sin(t * d.speed * 10 + d.phase);
      const alpha = d.alpha * (0.6 + 0.4 * pulse);
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(124,111,247,${alpha})`;
      ctx.fill();
    });

    animFrame = requestAnimationFrame(draw);
  }

  const resizeObs = new ResizeObserver(resize);
  resizeObs.observe(canvas.parentElement);
  resize();
  draw();
})();

// ===== TAB SWITCHER =====
const gsTabs = document.getElementById('gsTabs');
if (gsTabs) {
  gsTabs.querySelectorAll('.gs-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      gsTabs.querySelectorAll('.gs-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const target = tab.dataset.tab;
      document.querySelectorAll('.gs-panel').forEach(p => {
        p.classList.toggle('active', p.id === 'tab-' + target);
      });
    });
  });
}

// ===== COPY BUTTON =====
window.copyCode = function(btn) {
  const panel = btn.closest('.gs-panel');
  const code = panel ? panel.querySelector('pre code') : null;
  if (!code) return;
  navigator.clipboard.writeText(code.innerText).then(() => {
    btn.textContent = 'Copied!';
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 2000);
  }).catch(() => {
    btn.textContent = 'Error';
    setTimeout(() => { btn.textContent = 'Copy'; }, 2000);
  });
};

// ===== SCROLL ANIMATIONS =====
const observer = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      observer.unobserve(e.target);
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('.problem-card, .diff-card, .stat-card, .ws-card, .feas-block, .ref-item, .tech-item, .arch-panel').forEach(el => {
  el.classList.add('fade-in');
  observer.observe(el);
});

// ===== STAGE HIGHLIGHT on pipeline hover =====
document.addEventListener('mouseover', e => {
  const stage = e.target.closest('[data-stage]');
  if (stage) {
    const n = stage.dataset.stage;
    document.querySelectorAll('[data-stage]').forEach(s => {
      s.style.opacity = s.dataset.stage === n ? '1' : '0.7';
    });
  }
});
document.addEventListener('mouseout', e => {
  if (e.target.closest('[data-stage]') && !e.relatedTarget?.closest('[data-stage]')) {
    document.querySelectorAll('[data-stage]').forEach(s => s.style.opacity = '');
  }
});

console.log('%c[LOGFLUX] Documentation site loaded.', 'color:#7c6ff7;font-family:monospace;font-weight:bold;');
console.log('%cSmart India Hackathon 2026 | PS 26156 | Team Aster2026', 'color:#9090b0;font-family:monospace;');