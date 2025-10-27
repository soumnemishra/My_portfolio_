// **COMPLETELY REWRITTEN: Modern, optimized portfolio app**
class PortfolioApp {
  constructor() {
    this.elements = this.getElements();
    this.currentCard = 1;
    this.totalCards = 7;
    this.isScrolling = false;
    this.scrollTimeout = null;
    
    if (!this.elements.progressBar) {
      console.error('Required elements not found');
      return;
    }
    
    this.init();
  }

  // **OPTIMIZED: Cached element selection**
  getElements() {
    return {
      progressBar: document.getElementById('progress-bar'),
      preloader: document.getElementById('preloader'),
      mainContent: document.getElementById('main-content'),
      navLinks: document.querySelectorAll('.nav-link'),
      sections: document.querySelectorAll('section[id]'),
      heroBtn: document.querySelector('.hero-btn'),
      cards: document.querySelectorAll('.card'),
      navBtns: document.querySelectorAll('.nav-btn')
    };
  }

  init() {
    this.startPreloader();
    this.initNavigation();
    this.initCardCarousel();
    this.handleScrollNavigation();
    
    // **OPTIMIZED: Better event handling**
    this.addEventListeners();
    
    // **ADDED: Keyboard support**
    this.addKeyboardSupport();
  }

  // **OPTIMIZED: Smoother preloader**
  startPreloader() {
    let progress = 0;
    const targetProgress = 100;
    const duration = 2000; // 2 seconds
    const startTime = performance.now();

    const updateProgress = (currentTime) => {
      const elapsed = currentTime - startTime;
      progress = Math.min((elapsed / duration) * targetProgress, targetProgress);
      
      this.elements.progressBar.style.width = `${progress}%`;
      
      if (progress < targetProgress) {
        requestAnimationFrame(updateProgress);
      } else {
        setTimeout(() => this.hidePreloader(), 300);
      }
    };

    requestAnimationFrame(updateProgress);
  }

  hidePreloader() {
    this.elements.preloader.classList.add('fade-out');
    
    setTimeout(() => {
      this.elements.preloader.style.display = 'none';
      this.elements.mainContent.classList.add('visible');
    }, 500);
  }

  // **IMPROVED: Event delegation**
  initNavigation() {
    document.addEventListener('click', (e) => {
      if (e.target.matches('.nav-link')) {
        e.preventDefault();
        this.handleNavClick(e.target);
      }
      
      if (e.target.matches('.hero-btn')) {
        e.preventDefault();
        this.scrollToSection('about');
      }
    });
  }

  handleNavClick(link) {
    const targetId = link.getAttribute('href').substring(1);
    this.scrollToSection(targetId);
    this.updateActiveNavLink(link);
  }

  // **OPTIMIZED: Smoother custom scroll**
  scrollToSection(sectionId) {
    const targetSection = document.getElementById(sectionId);
    if (!targetSection) return;

    const headerHeight = 60;
    const targetPosition = targetSection.offsetTop - headerHeight;
    
    this.smoothScrollTo(targetPosition, 800);
  }

  smoothScrollTo(targetPosition, duration = 800) {
    const startPosition = window.pageYOffset;
    const distance = targetPosition - startPosition;
    let startTime = null;

    const animation = (currentTime) => {
      if (startTime === null) startTime = currentTime;
      const timeElapsed = currentTime - startTime;
      const run = this.easeInOutCubic(timeElapsed, startPosition, distance, duration);
      
      window.scrollTo(0, run);
      
      if (timeElapsed < duration) {
        requestAnimationFrame(animation);
      }
    };

    requestAnimationFrame(animation);
  }

  // **IMPROVED: Better easing function**
  easeInOutCubic(t, b, c, d) {
    t /= d / 2;
    if (t < 1) return c / 2 * t * t * t + b;
    t -= 2;
    return c / 2 * (t * t * t + 2) + b;
  }

  // **COMPLETELY NEW: Simplified card carousel**
  initCardCarousel() {
    if (!this.elements.navBtns.length) return;

    this.elements.navBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const direction = btn.dataset.direction;
        if (direction === 'next') {
          this.nextCard();
        } else {
          this.prevCard();
        }
      });
    });

    // **ADDED: Auto-advance cards**
    this.startAutoAdvance();
  }

  nextCard() {
    this.currentCard = this.currentCard >= this.totalCards ? 1 : this.currentCard + 1;
    this.updateActiveCard();
  }

  prevCard() {
    this.currentCard = this.currentCard <= 1 ? this.totalCards : this.currentCard - 1;
    this.updateActiveCard();
  }

  updateActiveCard() {
    this.elements.cards.forEach((card, index) => {
      card.classList.toggle('active', index + 1 === this.currentCard);
    });
    
    // **ADDED: Reset auto-advance on manual navigation**
    this.resetAutoAdvance();
  }

  // **NEW: Auto-advance feature**
  startAutoAdvance() {
    this.autoAdvanceTimer = setInterval(() => {
      this.nextCard();
    }, 5000); // Change card every 5 seconds
  }

  resetAutoAdvance() {
    clearInterval(this.autoAdvanceTimer);
    this.startAutoAdvance();
  }

  // **OPTIMIZED: Throttled scroll handler**
  handleScrollNavigation() {
    const throttledScroll = this.throttle(() => {
      this.updateActiveNavOnScroll();
    }, 16); // ~60fps

    window.addEventListener('scroll', throttledScroll, { passive: true });
  }

  updateActiveNavOnScroll() {
    const scrollPosition = window.scrollY + 100;
    let currentSection = 'hero';

    this.elements.sections.forEach(section => {
      const sectionTop = section.offsetTop;
      const sectionHeight = section.offsetHeight;
      const sectionId = section.getAttribute('id');

      if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
        currentSection = sectionId;
      }
    });

    const activeLink = document.querySelector(`.nav-link[href="#${currentSection}"]`);
    if (activeLink && !activeLink.classList.contains('active')) {
      this.updateActiveNavLink(activeLink);
    }
  }

  updateActiveNavLink(activeLink) {
    this.elements.navLinks.forEach(link => link.classList.remove('active'));
    if (activeLink) {
      activeLink.classList.add('active');
    }
  }

  // **NEW: Keyboard support**
  addKeyboardSupport() {
    document.addEventListener('keydown', (e) => {
      // Arrow keys for card navigation
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        this.prevCard();
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        this.nextCard();
      }
      
      // Escape to pause auto-advance
      if (e.key === 'Escape') {
        clearInterval(this.autoAdvanceTimer);
      }
    });
  }

  // **ADDED: Modern event listeners**
  addEventListeners() {
    // Pause auto-advance on hover
    this.elements.cards.forEach(card => {
      card.addEventListener('mouseenter', () => {
        clearInterval(this.autoAdvanceTimer);
      });
      
      card.addEventListener('mouseleave', () => {
        this.startAutoAdvance();
      });
    });

    // **OPTIMIZED: Intersection Observer for better performance**
    if ('IntersectionObserver' in window) {
      this.initIntersectionObserver();
    }
  }

  // **NEW: Intersection Observer for animations**
  initIntersectionObserver() {
    const options = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
        }
      });
    }, options);

    // Observe sections for animations
    this.elements.sections.forEach(section => {
      observer.observe(section);
    });
  }

  // **UTILITY: Throttle function**
  throttle(func, limit) {
    let inThrottle;
    return function() {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  // **CLEANUP: Proper cleanup on page unload**
  destroy() {
    clearInterval(this.autoAdvanceTimer);
  }
}

// **OPTIMIZED: Better initialization**
document.addEventListener('DOMContentLoaded', () => {
  const app = new PortfolioApp();
  
  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    if (app.destroy) app.destroy();
  });
});

// **IMPROVED: Performance monitoring**
if ('performance' in window && 'PerformanceObserver' in window) {
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.entryType === 'navigation') {
        console.log(`Page load time: ${Math.round(entry.loadEventEnd - entry.loadEventStart)}ms`);
      }
    }
  });
  
  observer.observe({ entryTypes: ['navigation'] });
}
