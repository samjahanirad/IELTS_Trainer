/**
 * dramatic-text-animation.js
 * Usage: initDramaticText(element, mode, options)
 * Modes: 'fire' | 'lightning' | 'glitch' | 'shatter' | 'neon'
 * Options: { speedMultiplier, loop, onComplete }
 */
(function (global) {
  'use strict';

  /* ── Helpers ──────────────────────────────────────────────────────────── */

  function splitChars(el) {
    const text = el.textContent;
    el.innerHTML = '';
    return Array.from(text).map(ch => {
      const s = document.createElement('span');
      s.className = 'anim-char';
      s.style.display = 'inline-block';
      s.textContent = ch;
      el.appendChild(s);
      return s;
    });
  }

  function addTimeout(el, fn, delay) {
    if (!el._animTimeouts) el._animTimeouts = [];
    el._animTimeouts.push(setTimeout(fn, Math.max(0, delay)));
  }

  function ensureRelative(el) {
    if (getComputedStyle(el).position === 'static') {
      el.style.position = 'relative';
      el._animAddedPos = true;
    }
  }

  function makeCanvas(el) {
    const c = document.createElement('canvas');
    c.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;z-index:0;';
    c.width  = el.offsetWidth  || el.getBoundingClientRect().width  || 400;
    c.height = el.offsetHeight || el.getBoundingClientRect().height || 80;
    el.insertBefore(c, el.firstChild);
    el._animCanvas = c;
    return c;
  }

  function cleanup(el) {
    if (el._animRAF)      { cancelAnimationFrame(el._animRAF); el._animRAF = null; }
    if (el._animTimeouts) { el._animTimeouts.forEach(clearTimeout); el._animTimeouts = []; }
    if (el._animLoopTO)   { clearTimeout(el._animLoopTO); el._animLoopTO = null; }
    if (el._animOrigText !== undefined) {
      el.textContent = el._animOrigText;
      el._animOrigText = undefined;
    }
    if (el._animAddedPos) { el.style.position = ''; el._animAddedPos = false; }
    el._animCanvas = null;
  }

  function done(el, origText, speed, loop, onComplete, modeFn) {
    el.textContent = origText;
    el._animOrigText = undefined;
    if (onComplete) onComplete();
    if (loop) {
      el._animLoopTO = setTimeout(() => {
        cleanup(el);
        modeFn(el, speed, loop, onComplete);
      }, 3000);
    }
  }

  /* ── 1. Fire Forge ────────────────────────────────────────────────────── */

  function fireForge(el, speed, loop, onComplete) {
    const origText = el.textContent;
    el._animOrigText = origText;
    ensureRelative(el);

    const spans = splitChars(el);
    spans.forEach(s => { s.style.opacity = '0'; });

    const canvas = makeCanvas(el);
    const ctx = canvas.getContext('2d');
    let particles = [];
    let revealDone = false;

    function spawnAt(span) {
      const eRect = el.getBoundingClientRect();
      const sRect = span.getBoundingClientRect();
      const x = sRect.left - eRect.left + sRect.width  * 0.5;
      const y = sRect.top  - eRect.top  + sRect.height * 0.5;
      for (let i = 0; i < 18; i++) {
        particles.push({
          x, y,
          vx: (Math.random() - 0.5) * 3.2,
          vy: -(Math.random() * 3.5 + 0.8),
          life: 40, max: 40,
          hue: 10 + Math.random() * 40
        });
      }
    }

    function raf() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        const a = p.life / p.max;
        ctx.beginPath();
        ctx.arc(p.x, p.y, a * 2.5 + 0.3, 0, Math.PI * 2);
        ctx.fillStyle = 'hsla(' + p.hue + ',100%,60%,' + a.toFixed(2) + ')';
        ctx.fill();
        p.x += p.vx; p.y += p.vy; p.vy += 0.07; p.life--;
      });
      particles = particles.filter(p => p.life > 0);
      if (particles.length > 0 || !revealDone) {
        el._animRAF = requestAnimationFrame(raf);
      } else {
        canvas.remove(); el._animCanvas = null;
      }
    }
    el._animRAF = requestAnimationFrame(raf);

    const tickMs = 90 / speed;
    spans.forEach((span, i) => {
      addTimeout(el, () => {
        span.style.opacity    = '1';
        span.style.color      = '#ff6a00';
        span.style.textShadow = '0 0 12px #ff6a00, 0 0 30px #ff3a00';
        spawnAt(span);

        addTimeout(el, () => {
          span.style.transition = 'color 400ms ease, text-shadow 600ms ease';
          span.style.color      = '';
          span.style.textShadow = '0 0 8px rgba(255,180,80,0.6)';
          addTimeout(el, () => {
            span.style.textShadow = '';
            span.style.transition = '';
          }, 700 / speed);
        }, 300 / speed);

        if (i === spans.length - 1) {
          addTimeout(el, () => {
            revealDone = true;
            addTimeout(el, () => done(el, origText, speed, loop, onComplete, fireForge), 200);
          }, 1000 / speed);
        }
      }, i * tickMs);
    });
  }

  /* ── 2. Lightning Strike ──────────────────────────────────────────────── */

  function lightningStrike(el, speed, loop, onComplete) {
    const origText = el.textContent;
    el._animOrigText = origText;
    ensureRelative(el);

    const spans = splitChars(el);
    spans.forEach(s => { s.style.opacity = '0'; });

    const canvas = makeCanvas(el);
    const ctx = canvas.getContext('2d');

    function drawBolt(x1, y1, x2, y2, depth, maxDepth) {
      if (depth > maxDepth) return;
      const mx = (x1 + x2) / 2 + (Math.random() - 0.5) * 50;
      const my = (y1 + y2) / 2 + (Math.random() - 0.5) * 12;
      const a  = 0.4 + Math.random() * 0.6;
      ctx.beginPath();
      ctx.moveTo(x1, y1); ctx.lineTo(mx, my); ctx.lineTo(x2, y2);
      ctx.strokeStyle = 'rgba(180,140,255,' + a.toFixed(2) + ')';
      ctx.lineWidth = Math.max(0.4, (maxDepth - depth + 1) * 0.9);
      ctx.stroke();
      if (Math.random() < 0.6) {
        drawBolt(mx, my, mx + (Math.random() - 0.5) * 70,
          my + canvas.height * 0.25 * Math.random(), depth + 1, maxDepth);
      }
      drawBolt(x1, y1, mx, my, depth + 1, maxDepth);
      drawBolt(mx, my, x2, y2, depth + 1, maxDepth);
    }

    function flash() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const x = 20 + Math.random() * (canvas.width - 40);
      drawBolt(x, 0, x + (Math.random() - 0.5) * 50, canvas.height, 0, 5);
    }

    const boltMs = 120 / speed;
    for (let i = 0; i < 4; i++) {
      addTimeout(el, () => {
        flash();
        if (i === 3) {
          addTimeout(el, () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            canvas.remove(); el._animCanvas = null;
            spans.forEach(s => {
              s.style.transition  = 'opacity 200ms ease';
              s.style.opacity     = '1';
              s.style.color       = '#e0d0ff';
              s.style.textShadow  = '0 0 20px #a070ff, 0 0 60px #7040ff';
            });
            addTimeout(el, () => {
              spans.forEach(s => { s.style.textShadow = '0 0 6px rgba(160,100,255,0.4)'; });
              addTimeout(el, () => done(el, origText, speed, loop, onComplete, lightningStrike),
                800 / speed);
            }, 400 / speed);
          }, 150 / speed);
        }
      }, i * boltMs);
    }
  }

  /* ── 3. Glitch ────────────────────────────────────────────────────────── */

  function glitch(el, speed, loop, onComplete) {
    const origText  = el.textContent;
    el._animOrigText = origText;
    ensureRelative(el);

    const origChars = Array.from(origText);
    const SYMBOLS   = '!@#$%&*ABCDEFXYZabcxyz01'.split('');
    const spans     = splitChars(el);

    let cycle = 0;
    const TOTAL     = 25;
    const REVEAL_AT = 12;
    const tickMs    = 60 / speed;

    function tick() {
      cycle++;
      const revealN = cycle <= REVEAL_AT ? 0
        : Math.round((cycle - REVEAL_AT) / (TOTAL - REVEAL_AT) * spans.length);

      if (cycle >= TOTAL) {
        spans.forEach((s, i) => {
          s.textContent = origChars[i];
          s.style.color = '#fff';
          s.style.textShadow = '';
        });
        addTimeout(el, () => done(el, origText, speed, loop, onComplete, glitch), 80);
        return;
      }

      spans.forEach((s, i) => {
        if (origChars[i] === ' ' || origChars[i] === '\n') { s.textContent = origChars[i]; return; }
        if (i < revealN) {
          s.textContent = origChars[i]; s.style.color = '#fff'; s.style.textShadow = '';
        } else {
          s.textContent = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
          const col = Math.random() < 0.5 ? '#0ff' : '#f0f';
          s.style.color = col; s.style.textShadow = '0 0 6px ' + col;
        }
      });
      addTimeout(el, tick, tickMs);
    }

    tick();
  }

  /* ── 4. Shatter In ────────────────────────────────────────────────────── */

  function shatterIn(el, speed, loop, onComplete) {
    const origText = el.textContent;
    el._animOrigText = origText;
    ensureRelative(el);

    const spans = splitChars(el);
    spans.forEach(s => {
      const tx  = (Math.random() - 0.5) * 80;
      const ty  = -(Math.random() * 60 + 20);
      const rot = (Math.random() - 0.5) * 40;
      s.style.opacity    = '0';
      s.style.transform  = 'translate(' + tx + 'px,' + ty + 'px) rotate(' + rot + 'deg) scale(2)';
      s.style.transition = 'none';
    });

    const stagger = 60 / speed;
    spans.forEach((s, i) => {
      addTimeout(el, () => {
        s.style.transition = 'opacity 300ms ease, transform 400ms cubic-bezier(0.2,0.8,0.3,1), text-shadow 300ms ease';
        s.style.opacity    = '1';
        s.style.transform  = 'translate(0,0) rotate(0deg) scale(1)';
        s.style.textShadow = '0 0 20px #ff8800';
        addTimeout(el, () => { s.style.textShadow = ''; }, 500 / speed);

        if (i === spans.length - 1) {
          addTimeout(el, () => done(el, origText, speed, loop, onComplete, shatterIn),
            500 / speed + 400 / speed + 100);
        }
      }, i * stagger);
    });
  }

  /* ── 5. Neon Flicker ─────────────────────────────────────────────────── */

  function neonFlicker(el, speed, loop, onComplete) {
    const origText = el.textContent;
    el._animOrigText = origText;
    ensureRelative(el);

    const COLORS = ['#ff2d78','#ff6b2d','#ffe02d','#2dffb4','#2d8fff','#c42dff'];
    const spans  = splitChars(el);
    spans.forEach(s => { s.style.opacity = '0'; });

    const stagger = 80 / speed;
    spans.forEach((s, i) => {
      const color = COLORS[i % COLORS.length];
      addTimeout(el, () => {
        s.style.opacity = '0.1'; s.style.color = color; s.style.textShadow = '';
        addTimeout(el, () => {
          s.style.opacity = '1';
          s.style.textShadow = '0 0 10px ' + color + ', 0 0 30px ' + color;
        }, 60 / speed);
        addTimeout(el, () => { s.style.opacity = '0.3'; }, 140 / speed);
        addTimeout(el, () => {
          s.style.opacity = '1';
          s.style.textShadow = '0 0 8px ' + color;
        }, 220 / speed);

        if (i === spans.length - 1) {
          addTimeout(el, () => done(el, origText, speed, loop, onComplete, neonFlicker), 350 / speed);
        }
      }, i * stagger);
    });
  }

  /* ── Public API ───────────────────────────────────────────────────────── */

  function initDramaticText(element, mode, options) {
    var opts  = Object.assign({ speedMultiplier: 1.0, loop: false, onComplete: null }, options || {});
    var speed = Math.max(0.1, opts.speedMultiplier);

    cleanup(element);
    element._animTimeouts = [];

    switch (mode) {
      case 'fire':      fireForge(element, speed, opts.loop, opts.onComplete);       break;
      case 'lightning': lightningStrike(element, speed, opts.loop, opts.onComplete); break;
      case 'glitch':    glitch(element, speed, opts.loop, opts.onComplete);          break;
      case 'shatter':   shatterIn(element, speed, opts.loop, opts.onComplete);       break;
      case 'neon':      neonFlicker(element, speed, opts.loop, opts.onComplete);     break;
      default: console.warn('[dramaticText] Unknown mode:', mode);
    }
  }

  global.initDramaticText = initDramaticText;

}(typeof window !== 'undefined' ? window : this));
