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
     5. FEEDBACK FORM — Interactive and validation logic
     -------------------------------------------------------- */
  function initFeedbackForm() {
    const feedbackForm = document.getElementById('feedback-form');
    if (!feedbackForm) return;

    // Category Selection Selector Logic
    const categoryCards = document.querySelectorAll('.category-card');
    const categoryInput = document.getElementById('category');
    const categoryError = document.querySelector('[data-fs-error="category"]');

    // Emoji Rating Selector Logic
    const emojiBtns = document.querySelectorAll('.emoji-btn');
    const feelingInput = document.getElementById('feeling');

    // Form Validation Logic (Name and Feedback are compulsory)
    const nameInput = document.getElementById('name');
    const nameError = document.querySelector('[data-fs-error="name"]');
    const messageInput = document.getElementById('message');
    const messageError = document.querySelector('[data-fs-error="message"]');

    function validateName() {
      if (nameInput && nameError) {
        if (!nameInput.value.trim()) {
          nameError.textContent = 'Name is required.';
          nameInput.setAttribute('aria-invalid', 'true');
          return false;
        } else {
          nameError.textContent = '';
          nameInput.removeAttribute('aria-invalid');
          return true;
        }
      }
      return true;
    }

    function validateCategory() {
      if (categoryInput && categoryError) {
        if (!categoryInput.value) {
          categoryError.textContent = 'Please select a category.';
          return false;
        } else {
          categoryError.textContent = '';
          return true;
        }
      }
      return true;
    }

    function validateMessage() {
      if (messageInput && messageError) {
        if (!messageInput.value.trim()) {
          messageError.textContent = 'Feedback message is required.';
          messageInput.setAttribute('aria-invalid', 'true');
          return false;
        } else {
          messageError.textContent = '';
          messageInput.removeAttribute('aria-invalid');
          return true;
        }
      }
      return true;
    }

    if (nameInput) {
      nameInput.addEventListener('blur', validateName);
      nameInput.addEventListener('input', () => {
        if (nameInput.value.trim()) {
          nameError.textContent = '';
          nameInput.removeAttribute('aria-invalid');
        }
      });
    }

    if (messageInput) {
      messageInput.addEventListener('blur', validateMessage);
      messageInput.addEventListener('input', () => {
        if (messageInput.value.trim()) {
          messageError.textContent = '';
          messageInput.removeAttribute('aria-invalid');
        }
      });
    }

    feedbackForm.addEventListener('submit', async (e) => {
      const isNameValid = validateName();
      const isCategoryValid = validateCategory();
      const isMessageValid = validateMessage();

      if (!isNameValid || !isCategoryValid || !isMessageValid) {
        e.preventDefault();
        e.stopImmediatePropagation();
        return;
      }

      // Custom Native AJAX Submit using Fetch to handle errors gracefully
      e.preventDefault();
      e.stopImmediatePropagation();

      const submitBtn = document.getElementById('submit-btn');
      const successBanner = document.querySelector('[data-fs-success]');
      const errorBanner = document.querySelector('[data-fs-error]');
      const errorText = errorBanner ? errorBanner.querySelector('span:last-child') : null;

      // Show loading state
      if (submitBtn) {
        submitBtn.disabled = true;
        const btnSpan = submitBtn.querySelector('span.relative');
        if (btnSpan) btnSpan.innerHTML = '<span class="material-symbols-outlined animate-spin text-[18px]">progress_activity</span> Sending...';
      }

      // Hide previous alerts
      if (successBanner) successBanner.classList.add('hidden');
      if (errorBanner) errorBanner.classList.add('hidden');

      try {
        const formData = new FormData(feedbackForm);

        // Send as clean application/json to prevent 400 Errors on Formspree Free accounts
        const data = Object.fromEntries(formData.entries());

        const response = await fetch("https://formspree.io/f/mzdwrapv", {
          method: "POST",
          body: JSON.stringify(data),
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        });

        const result = await response.json();

        if (response.ok) {
          // Successful submission
          if (successBanner) successBanner.classList.remove('hidden');
          feedbackForm.reset();
        } else {
          // Server validation / limitation errors
          console.error("Formspree Server Error Response:", result);
          let errorMsg = 'Something went wrong. Please try again.';
          if (result.errors && result.errors.length > 0) {
            errorMsg = result.errors.map(err => err.message).join(', ');
          } else if (result.error) {
            errorMsg = result.error;
          }

          if (response.status === 400 && errorMsg.toLowerCase().includes('email')) {
            errorMsg = 'A valid email field is required by Formspree.';
          }

          if (errorText) errorText.textContent = errorMsg;
          if (errorBanner) errorBanner.classList.remove('hidden');
        }
      } catch (err) {
        console.error("Formspree Connection Network Error:", err);
        if (errorText) errorText.textContent = 'Connection error. Please check your internet and try again.';
        if (errorBanner) errorBanner.classList.remove('hidden');
      } finally {
        // Restore submit button state
        if (submitBtn) {
          submitBtn.disabled = false;
          const btnSpan = submitBtn.querySelector('span.relative');
          if (btnSpan) {
            btnSpan.innerHTML = `
                <span class="material-symbols-outlined text-[18px]">send</span>
                SEND Feedback
              `;
          }
        }
      }
    }, true); // useCapture to execute first

    if (categoryCards.length > 0 && categoryInput) {
      categoryCards.forEach(card => {
        card.addEventListener('click', function () {
          const value = this.getAttribute('data-category');
          const isAlreadySelected = this.classList.contains('bg-[#8ecae6]/20');

          if (isAlreadySelected) {
            categoryInput.value = '';
            this.classList.remove('bg-[#8ecae6]/20', 'border-[#8ecae6]', 'ring-1', 'ring-[#8ecae6]/30');
            this.classList.add('bg-white/70', 'border-black/10');
          } else {
            categoryInput.value = value;
            if (categoryError) {
              categoryError.textContent = '';
            }

            // Clear previous active states
            categoryCards.forEach(c => {
              c.classList.remove('bg-[#8ecae6]/20', 'border-[#8ecae6]', 'ring-1', 'ring-[#8ecae6]/30');
              c.classList.add('bg-white/70', 'border-black/10');
            });

            // Add active state to selected
            this.classList.remove('bg-white/70', 'border-black/10');
            this.classList.add('bg-[#8ecae6]/20', 'border-[#8ecae6]', 'ring-1', 'ring-[#8ecae6]/30');
          }
        });
      });
    }

    if (emojiBtns.length > 0 && feelingInput) {
      emojiBtns.forEach(btn => {
        btn.addEventListener('click', function () {
          const value = this.getAttribute('data-emoji');
          const isAlreadySelected = this.classList.contains('bg-[#8ecae6]/20');

          // Clear previous active states on all buttons
          emojiBtns.forEach(b => {
            b.classList.remove('bg-[#8ecae6]/20', 'ring-1', 'ring-[#8ecae6]/30');
            const emo = b.querySelector('span:first-child');
            const lbl = b.querySelector('span:last-child');
            emo.classList.remove('scale-125');
            lbl.classList.remove('text-primary');
            lbl.classList.add('text-primary/40');
          });

          if (isAlreadySelected) {
            feelingInput.value = '';
          } else {
            feelingInput.value = value;
            // Add active state to selected
            this.classList.add('bg-[#8ecae6]/20', 'ring-1', 'ring-[#8ecae6]/30');
            const emo = this.querySelector('span:first-child');
            const lbl = this.querySelector('span:last-child');
            emo.classList.add('scale-125');
            lbl.classList.remove('text-primary/40');
            lbl.classList.add('text-primary');
          }
        });
      });
    }

    feedbackForm.addEventListener('reset', function () {
      resetCategoryCards();
      resetEmojiRating();
      resetValidationErrors();
    });

    function resetCategoryCards() {
      if (categoryInput) {
        categoryInput.value = '';
        categoryCards.forEach(c => {
          c.classList.remove('bg-[#8ecae6]/20', 'border-[#8ecae6]', 'ring-1', 'ring-[#8ecae6]/30');
          c.classList.add('bg-white/70', 'border-black/10');
        });
      }
    }

    function resetEmojiRating() {
      if (feelingInput) {
        feelingInput.value = '';
        emojiBtns.forEach(b => {
          b.classList.remove('bg-[#8ecae6]/20', 'ring-1', 'ring-[#8ecae6]/30');
          const emo = b.querySelector('span:first-child');
          const lbl = b.querySelector('span:last-child');
          emo.classList.remove('scale-125');
          lbl.classList.remove('text-primary');
          lbl.classList.add('text-primary/40');
        });
      }
    }

    function resetValidationErrors() {
      if (nameInput && nameError) {
        nameError.textContent = '';
        nameInput.removeAttribute('aria-invalid');
      }
      if (categoryError) {
        categoryError.textContent = '';
      }
      if (messageInput && messageError) {
        messageError.textContent = '';
        messageInput.removeAttribute('aria-invalid');
      }
    }
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
    initFeedbackForm();
  }

  if (document.readyState === 'interactive' || document.readyState === 'complete') {
    bootFeatures();
  } else {
    document.addEventListener('DOMContentLoaded', bootFeatures);
  }

})();

