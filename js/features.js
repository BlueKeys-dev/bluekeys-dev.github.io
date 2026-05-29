/* ============================================================
   FEATURES PAGE — Script
   Lenis Smooth Scroll + Tesla-Style Text Reveal + Card Stagger
   ============================================================ */

(function () {
  'use strict';





  /* --------------------------------------------------------
     2. TESLA-STYLE TEXT REVEAL — Word-by-word hero animation
     Splits .hero-title text into words and animates each.
     -------------------------------------------------------- */
  function initHeroTextReveal() {
    const heroTitle = document.querySelector('.hero-title');
    if (!heroTitle) return;

    const text = heroTitle.textContent.trim();
    heroTitle.textContent = '';
    heroTitle.setAttribute('aria-label', text);

    /* Split into words and wrap each */
    const words = text.split(/\s+/);

    words.forEach((word, i) => {
      const span = document.createElement('span');
      span.textContent = word;
      span.setAttribute('data-reveal', 'word');
      span.style.transitionDelay = `${0.1 + i * 0.08}s`;
      heroTitle.appendChild(span);

      /* Add a whitespace text node between words */
      if (i < words.length - 1) {
        heroTitle.appendChild(document.createTextNode('\u00A0'));
      }
    });

    /* Trigger after a small delay so the initial paint has completed */
    setTimeout(() => {
      const wordEls = heroTitle.querySelectorAll('[data-reveal="word"]');
      wordEls.forEach(el => el.classList.add('is-visible'));
    }, 200);
  }


  /* --------------------------------------------------------
     3. SCROLL REVEAL — IntersectionObserver-based
     Handles [data-reveal] elements across the page.
     -------------------------------------------------------- */
  function initScrollReveal() {
    const elements = document.querySelectorAll('[data-reveal]:not([data-reveal="word"])');
    if (!elements.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            console.log('[SCROLL-REVEAL] is-visible added to:', entry.target.className, entry.target.querySelector('.card-title')?.textContent);
            observer.unobserve(entry.target);  /* Fire once */
          }
        });
      },
      {
        root: null,
        threshold: 0.15,
        rootMargin: '0px 0px -60px 0px',
      }
    );

    elements.forEach(el => observer.observe(el));
    console.log('[SCROLL-REVEAL] Observing', elements.length, 'elements');
  }



  /* --------------------------------------------------------
     3.5. MOBILE ICON ANIMATIONS — Repeatable with Delay
     -------------------------------------------------------- */
  function initMobileIconAnimations() {
    if (window.innerWidth > 1024) return;

    const cards = document.querySelectorAll('.feature-card');
    if (!cards.length) return;

    const timers = new Map();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          const card = entry.target;
          if (entry.isIntersecting) {
            // Add a delay so the user has time to scroll and focus on the card
            const timerId = setTimeout(() => {
              card.classList.add('mobile-animate');
            }, 200); // 0.6s delay
            timers.set(card, timerId);
          } else {
            // Cancel the timer if they scroll past quickly
            if (timers.has(card)) {
              clearTimeout(timers.get(card));
              timers.delete(card);
            }
            card.classList.remove('mobile-animate');
          }
        });
      },
      {
        root: null,
        // Card must enter the middle 40% of the screen to trigger
        rootMargin: '-30% 0px -30% 0px',
        threshold: 0
      }
    );

    cards.forEach(card => observer.observe(card));
  }


  /* --------------------------------------------------------
     4. HERO SUBTITLE REVEAL — Fade after words
     -------------------------------------------------------- */
  function initSubtitleReveal() {
    const subtitle = document.querySelector('.hero-subtitle');
    const eyebrow = document.querySelector('.hero-eyebrow');
    if (!subtitle) return;

    /* Delay so word animation completes first */
    setTimeout(() => {
      if (eyebrow) eyebrow.classList.add('is-visible');
    }, 100);

    setTimeout(() => {
      subtitle.classList.add('is-visible');
    }, 700);
  }



  /* --------------------------------------------------------
     BOOT — Wire everything up on DOMContentLoaded
     -------------------------------------------------------- */
  function bootFeatures() {
    // Avoid double initialization if loaded dynamically
    if (window.__featuresLoaded) return;
    window.__featuresLoaded = true;

    initHeroTextReveal();
    initSubtitleReveal();
    initScrollReveal();
    initMobileIconAnimations();
  }

  if (document.readyState === 'interactive' || document.readyState === 'complete') {
    bootFeatures();
  } else {
    document.addEventListener('DOMContentLoaded', bootFeatures);
  }

})();

