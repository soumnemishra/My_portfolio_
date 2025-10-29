// **NEW: Sound Management Class**
class SoundManager {
  constructor() {
    this.sounds = {};
    this.isEnabled = false;
    this.init();
  }

  init() {
    // Preload sounds
    this.loadSound(
      "hover",
      "https://assets.codepen.io/7558/click-reverb-001.mp3"
    );
    this.loadSound(
      "click",
      "https://assets.codepen.io/7558/shutter-fx-001.mp3"
    );
  }

  loadSound(name, url) {
    const audio = new Audio(url);
    audio.preload = "auto";
    if (name === "hover") {
      audio.volume = 0.15;
    } else {
      audio.volume = 0.3;
    }
    this.sounds[name] = audio;
  }

  enableAudio() {
    // Simple check to prevent errors if AudioContext isn't resumed
    if (!this.isEnabled) {
        // Attempt to resume audio context on first interaction - improves compatibility
        const context = new (window.AudioContext || window.webkitAudioContext)();
        if (context.state === 'suspended') {
            context.resume();
        }
        this.isEnabled = true;
        console.log("Audio enabled");
    }
  }


  play(soundName, delay = 0) {
    if (this.isEnabled && this.sounds[soundName]) {
      // Ensure audio context is running before playing
      const context = this.sounds[soundName].context || new (window.AudioContext || window.webkitAudioContext)();
      if (context.state === 'suspended') {
          context.resume().then(() => {
              this._playSound(soundName, delay);
          });
      } else {
          this._playSound(soundName, delay);
      }
    }
  }

  _playSound(soundName, delay) { // Private helper method
      if (delay > 0) {
        setTimeout(() => {
          this.sounds[soundName].currentTime = 0;
          this.sounds[soundName].play().catch((e) => {
            console.error(`Audio play failed for ${soundName}:`, e); // Use error for failures
          });
        }, delay);
      } else {
        this.sounds[soundName].currentTime = 0;
        this.sounds[soundName].play().catch((e) => {
           console.error(`Audio play failed for ${soundName}:`, e); // Use error for failures
        });
      }
  }
}


// **COMPLETELY REWRITTEN: Modern, optimized portfolio app**
class PortfolioApp {
  constructor() {
    this.elements = this.getElements();
    this.soundManager = new SoundManager();
    this.currentCard = 1;
    this.totalCards = this.elements.cards ? this.elements.cards.length : 0; // Dynamically count cards
    this.isScrolling = false;
    this.scrollTimeout = null;
    this.autoAdvanceTimer = null; // Initialize timer property


    // Consolidated checks for essential elements
    const essentialElements = ['progressBar', 'goTopBtn', 'toggleBtnBox', 'skillsBox', 'mainContent', 'preloader'];
    let missingElement = false;
    essentialElements.forEach(key => {
        if (!this.elements[key]) {
            console.error(`Initialization failed: Element "${key}" not found.`);
            missingElement = true;
        }
    });

    if (missingElement) {
        // Attempt to gracefully handle missing non-critical elements later if possible
        // but prevent full init if core elements are missing.
        if (!this.elements.mainContent || !this.elements.preloader) {
            console.error("Critical elements (mainContent or preloader) missing. Aborting init.");
            return; // Hard stop if these are missing
        }
    }


    this.init();
  }

  // **OPTIMIZED: Cached element selection**
  getElements() {
    // Use optional chaining ?. where elements might not exist initially or are optional
    return {
      progressBar: document.getElementById('progress-bar'),
      preloader: document.getElementById('preloader'),
      mainContent: document.getElementById('main-content'),
      navLinks: document.querySelectorAll('.nav-link'),
      sections: document.querySelectorAll('section[id]'),
      heroBtn: document.querySelector('.hero-btn'),
      cards: document.querySelectorAll('#about .card'), // Be specific for About section cards
      navBtns: document.querySelectorAll('.card-navigation .nav-btn'), // Be specific for About nav
      heroSocialLinks: document.querySelectorAll('.hero-social-link'),
      goTopBtn: document.querySelector('[data-go-top]'),
      // ********************************** //
      // ***** HIGHLIGHTED CHANGE START ***** //
      // ********************************** //
      // Elements for Skills Toggle
      toggleBtnBox: document.querySelector('[data-toggle-box]'),
      toggleBtns: document.querySelectorAll('[data-toggle-btn]'),
      skillsBox: document.querySelector('[data-skills-box]')
      // ********************************** //
      // ****** HIGHLIGHTED CHANGE END ****** //
      // ********************************** //
    };
  }

  init() {
    this.startPreloader();
    this.initNavigation();
    this.initCardCarousel(); // Will check internally if elements exist
    this.handleScrollNavigation();
    this.addEventListeners();
    this.addKeyboardSupport();
    this.initSoundEvents();
    // ********************************** //
    // ***** HIGHLIGHTED CHANGE START ***** //
    // ********************************** //
    this.initSkillsToggle(); // Initialize the skills toggle functionality
    // ********************************** //
    // ****** HIGHLIGHTED CHANGE END ****** //
    // ********************************** //
  }

  // Preloader functions
  startPreloader() {
    // Check if preloader elements exist before proceeding
    if (!this.elements.preloader || !this.elements.progressBar) {
        console.warn("Preloader elements missing, skipping animation.");
        // Directly call hidePreloader logic if needed, or just show main content
        this.hidePreloader(); // Attempt to hide even if parts are missing
        if (this.elements.mainContent) {
           this.elements.mainContent.classList.add('visible'); // Ensure content is visible
        }
        return;
    }

    let progress = 0;
    const targetProgress = 100;
    const duration = 2000;
    const startTime = performance.now();
    const updateProgress = (currentTime) => {
      const elapsed = currentTime - startTime;
      progress = Math.min((elapsed / duration) * targetProgress, targetProgress);
      // Check again inside animation frame
      if (this.elements.progressBar) {
          this.elements.progressBar.style.width = `${progress}%`;
      }
      if (progress < targetProgress) {
        requestAnimationFrame(updateProgress);
      } else {
        setTimeout(() => this.hidePreloader(), 300);
      }
    };
    requestAnimationFrame(updateProgress);
  }


  hidePreloader() {
      // Check if preloader element exists
      if (this.elements.preloader) {
          this.elements.preloader.classList.add('fade-out');
          setTimeout(() => {
              if (this.elements.preloader) { // Check again in timeout
                 this.elements.preloader.style.display = 'none';
              }
              // Check if mainContent exists before adding class
              if (this.elements.mainContent) {
                  this.elements.mainContent.classList.add('visible');
              }
          }, 500); // Match CSS transition duration
      } else if (this.elements.mainContent) {
           // If no preloader, just make sure content is visible
           this.elements.mainContent.classList.add('visible');
      }
  }


  // Navigation functions
   initNavigation() {
    document.addEventListener('click', (e) => {
      // Use optional chaining for safety
      if (e.target.matches?.('.nav-link')) {
        e.preventDefault();
        this.handleNavClick(e.target);
      }

      if (e.target.matches?.('.hero-btn')) {
        e.preventDefault();
        this.scrollToSection('about');
      }

      if (e.target.matches?.('.scroll-down')) {
        e.preventDefault();
        const targetId = e.target.getAttribute('href')?.substring(1);
        if(targetId) this.scrollToSection(targetId);
      }

      // Use closest for Go Top button to handle clicks inside the icon
      if (e.target.closest?.('[data-go-top]')) {
        e.preventDefault();
        this.smoothScrollTo(0); // Scroll to top
      }
    });
  }


  handleNavClick(link) {
    const targetId = link?.getAttribute('href')?.substring(1);
    if (targetId) this.scrollToSection(targetId);
    // this.updateActiveNavLink(link); // Uncomment if using visible nav links
  }

  scrollToSection(sectionId) {
    const targetSection = document.getElementById(sectionId);
    if (!targetSection) {
        console.warn(`Section with ID "${sectionId}" not found for scrolling.`);
        return;
    }
    const headerHeight = 0; // Assuming header is permanently removed
    const targetPosition = targetSection.offsetTop - headerHeight;
    this.smoothScrollTo(targetPosition, 800);
  }


  smoothScrollTo(targetPosition, duration = 800) {
    const startPosition = window.pageYOffset;
    const distance = targetPosition - startPosition;
    let startTime = null;
    const animation = (currentTime) => {
      startTime = startTime === null ? currentTime : startTime; // Simplified assignment
      const timeElapsed = currentTime - startTime;
      // Ensure duration is not zero and timeElapsed doesn't exceed duration
      const easedTime = Math.min(timeElapsed, duration);
      const run = this.easeInOutCubic(easedTime, startPosition, distance, duration);
      window.scrollTo(0, run);
      if (timeElapsed < duration) {
        requestAnimationFrame(animation);
      }
    };
    requestAnimationFrame(animation);
  }



  easeInOutCubic(t, b, c, d) {
      // Ensure duration is not zero to prevent division by zero
      if (d === 0) return b + c; // Go directly to end position if duration is 0
      t /= d / 2;
      if (t < 1) return c / 2 * t * t * t + b;
      t -= 2;
      return c / 2 * (t * t * t + 2) + b;
   }


  // Card Carousel functions
  initCardCarousel() {
    // Check elements exist
    if (!this.elements.navBtns || this.elements.navBtns.length === 0 || !this.elements.cards || this.elements.cards.length === 0) {
        console.warn("Card carousel elements missing, skipping initialization.");
        this.totalCards = 0; // Ensure totalCards is 0 if no cards
        return;
    }

    // Update totalCards based on actual elements found
    this.totalCards = this.elements.cards.length;

    this.elements.navBtns.forEach(btn => {
      btn.addEventListener('click', () => { // Simplified event handler
        const direction = btn.getAttribute('data-direction');
        if (direction === 'next') this.nextCard();
        else if (direction === 'prev') this.prevCard();
      });
    });

    // Start auto-advance only if cards exist
    if (this.totalCards > 0) {
        this.startAutoAdvance();
    }
  }


    nextCard() {
      if (this.totalCards <= 0) return; // Guard clause
      this.currentCard = (this.currentCard % this.totalCards) + 1; // Use modulo for cleaner wrapping
      this.updateActiveCard();
    }

    prevCard() {
      if (this.totalCards <= 0) return; // Guard clause
      this.currentCard = (this.currentCard - 2 + this.totalCards) % this.totalCards + 1; // Use modulo for cleaner wrapping
      this.updateActiveCard();
    }


  updateActiveCard() {
      if (!this.elements.cards || this.totalCards <= 0) return; // Guard clause

      this.elements.cards.forEach((card, index) => {
        card.classList.toggle('active', index + 1 === this.currentCard);
      });

      // Also update indicators if they exist
      const indicators = document.querySelectorAll('.indicator');
      if (indicators.length === this.totalCards) {
          indicators.forEach((indicator, index) => {
             indicator.classList.toggle('active', index + 1 === this.currentCard);
          });
      }

      this.resetAutoAdvance();
    }


  startAutoAdvance() {
    this.clearAutoAdvanceTimer(); // Clear existing timer first
    if (this.totalCards > 0) { // Only start if there are cards
        this.autoAdvanceTimer = setInterval(() => { this.nextCard(); }, 5000);
    }
  }

  resetAutoAdvance() {
    this.clearAutoAdvanceTimer();
    this.startAutoAdvance();
  }

  clearAutoAdvanceTimer() { // Helper to clear timer
      if (this.autoAdvanceTimer) {
          clearInterval(this.autoAdvanceTimer);
          this.autoAdvanceTimer = null;
      }
  }


  // Scroll Navigation / Go Top logic
  handleScrollNavigation() {
      // Check if goTopBtn exists before adding scroll listener
      if (!this.elements.goTopBtn) {
          console.warn("Go Top button not found, skipping scroll listener for it.");
          return;
      }

      const throttledScroll = this.throttle(() => {
        // Toggle Go To Top button visibility
        const shouldBeActive = window.scrollY >= 500; // Determine state first
        // Check current state before changing to avoid unnecessary DOM manipulation
        if (this.elements.goTopBtn) { // Check again inside throttled function
            if (shouldBeActive && !this.elements.goTopBtn.classList.contains('active')) {
                 this.elements.goTopBtn.classList.add('active');
            } else if (!shouldBeActive && this.elements.goTopBtn.classList.contains('active')) {
                 this.elements.goTopBtn.classList.remove('active');
            }
        }
      }, 100);

      window.addEventListener('scroll', throttledScroll, { passive: true });
    }


  // Keyboard support
  addKeyboardSupport() {
    document.addEventListener('keydown', (e) => {
      // Check if focus is inside an input/textarea to avoid hijacking typing
      const activeElement = document.activeElement;
      if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
          return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault(); this.prevCard();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault(); this.nextCard();
      } else if (e.key === 'Escape') {
        this.clearAutoAdvanceTimer(); // Use the helper function
      }
    });
  }


  // Sound events
   initSoundEvents() {
    // Enable audio context on first click anywhere
    document.addEventListener('click', () => this.soundManager.enableAudio(), { once: true });

    // Helper function to add listeners safely
    const addSafeListeners = (elements, eventTypes = ['mouseenter', 'click']) => {
        if (elements && elements.length > 0) {
            elements.forEach(el => {
                if (eventTypes.includes('mouseenter')) {
                    el.addEventListener('mouseenter', () => this.soundManager.play('hover'));
                }
                if (eventTypes.includes('click')) {
                    el.addEventListener('click', () => this.soundManager.play('click'));
                }
            });
        }
    };

    addSafeListeners(this.elements.heroSocialLinks);
    addSafeListeners(this.elements.heroBtn ? [this.elements.heroBtn] : null); // Handle single element
    addSafeListeners(this.elements.navBtns); // For carousel
    addSafeListeners(this.elements.toggleBtns); // For skills toggle
    addSafeListeners(this.elements.goTopBtn ? [this.elements.goTopBtn] : null, ['click']); // Only click sound for goTop
  }


  // General Event Listeners
  addEventListeners() {
      // Check if cards exist before adding listeners
      if (this.elements.cards && this.elements.cards.length > 0) {
          this.elements.cards.forEach(card => {
            card.addEventListener('mouseenter', () => this.clearAutoAdvanceTimer());
            card.addEventListener('mouseleave', () => this.startAutoAdvance());
          });
      }

      // Initialize Intersection Observer if supported
      if ('IntersectionObserver' in window) {
        this.initIntersectionObserver();
      } else {
          console.warn("IntersectionObserver not supported. Scroll animations disabled.");
          // Fallback: Add 'in-view' class to all sections immediately if observer not supported
          this.elements.sections?.forEach(section => section.classList.add('in-view'));
      }
  }


  // Intersection Observer
  initIntersectionObserver() {
    // Check if sections exist
    if (!this.elements.sections || this.elements.sections.length === 0) {
        console.warn("No sections found to observe with IntersectionObserver.");
        return;
    }

    const options = { threshold: 0.1, rootMargin: '0px 0px -50px 0px' };
    const observer = new IntersectionObserver((entries, obs) => { // Receive observer instance
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
           obs.unobserve(entry.target); // Unobserve after animation triggers once
        }
      });
    }, options);
    this.elements.sections.forEach(section => observer.observe(section));
  }


  // ********************************** //
  // ***** HIGHLIGHTED CHANGE START ***** //
  // ********************************** //
  // **NEW: Skills Toggle Functionality**
  initSkillsToggle() {
    // Check if necessary elements exist
    if (!this.elements.toggleBtns || this.elements.toggleBtns.length !== 2 || !this.elements.toggleBtnBox || !this.elements.skillsBox) {
        console.warn("Skills toggle elements missing or invalid, skipping initialization.");
        return;
    }

    this.elements.toggleBtns.forEach(btn => {
      btn.addEventListener('click', () => {
         // Only toggle if the clicked button isn't already active
         if (btn.classList.contains('active')) {
             return;
         }

        // Toggle active class on the parent container (for the ::before slider)
        this.elements.toggleBtnBox.classList.toggle('active');

        // Toggle active class on *both* buttons simultaneously
        this.elements.toggleBtns.forEach(innerBtn => innerBtn.classList.toggle('active'));

        // Toggle active class on the skills box (to show/hide lists via CSS)
        this.elements.skillsBox.classList.toggle('active');

        // Click sound is handled centrally in initSoundEvents
      });
    });
  }
  // ********************************** //
  // ****** HIGHLIGHTED CHANGE END ****** //
  // ********************************** //

  // **UTILITY: Throttle function**
  throttle(func, limit) {
    let inThrottle;
    return (...args) => { // Use rest parameters
      const context = this;
      if (!inThrottle) {
        // Check if func is actually a function before applying
        if (typeof func === 'function') {
           func.apply(context, args);
        }
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }


  // **CLEANUP: Proper cleanup on page unload**
  destroy() {
    this.clearAutoAdvanceTimer(); // Use helper function
    // Potentially remove global event listeners like scroll or resize if added
    console.log("PortfolioApp instance destroyed.");
  }
}

// **OPTIMIZED: Better initialization & Singleton Pattern**
document.addEventListener('DOMContentLoaded', () => {
  // Prevent multiple initializations
  if (!window.portfolioAppInstance) {
      window.portfolioAppInstance = new PortfolioApp();

      // Cleanup on page unload
      window.addEventListener('beforeunload', () => {
        // Check instance exists before calling destroy
        if (window.portfolioAppInstance?.destroy) {
          window.portfolioAppInstance.destroy();
          window.portfolioAppInstance = null; // Clear reference
        }
      });
  } else {
      console.warn("PortfolioApp already initialized.");
  }
});


// **IMPROVED: Performance monitoring**
if ('performance' in window && 'PerformanceObserver' in window) {
  try { // Wrap in try...catch
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries(); // Get entries only once
        for (const entry of entries) {
          if (entry.entryType === 'navigation') {
            console.info(`Page load time: ${Math.round(entry.loadEventEnd - entry.loadEventStart)}ms`);
          }
        }
      });
      observer.observe({ entryTypes: ['navigation'] });
  } catch (e) {
      console.error("PerformanceObserver setup failed:", e);
  }
}

