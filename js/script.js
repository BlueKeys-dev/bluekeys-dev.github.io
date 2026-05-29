// NOTE: tailwind.config is set inline in index.html BEFORE the CDN <script> tag.
// It cannot live here because script.js loads with defer — after Tailwind has
// already initialised and read the config.

      // ============================================================
      // DYNAMIC FEATURES LOADER & UNIFIED SCROLL CONTROLLER
      // ============================================================
      document.addEventListener("DOMContentLoaded", () => {
        const featuresContainer = document.getElementById("features-section-container");
        const scrollContainer = document.getElementById("app-scroll-container");
        if (!featuresContainer || !scrollContainer) return; // Only on welcome.html

        // Custom premium ease-in-out cubic-bezier scroll animation (Tesla/Apple style)
        function smoothScrollTo(container, targetY, duration = 1200) {
          const startY = (container === window) ? window.scrollY : container.scrollTop;
          const difference = targetY - startY;
          const startTime = performance.now();

          // Premium Ease In Out Quartic curve
          function easeInOutQuart(t) {
            return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
          }

          function animate(currentTime) {
            const timeElapsed = currentTime - startTime;
            const progress = Math.min(timeElapsed / duration, 1);
            const easedProgress = easeInOutQuart(progress);
            if (container === window) {
              window.scrollTo(0, startY + difference * easedProgress);
            } else {
              container.scrollTop = startY + difference * easedProgress;
            }
            if (progress < 1) {
              requestAnimationFrame(animate);
            }
          }

          requestAnimationFrame(animate);
        }

        // 1. Intercept "Features" link to smooth-scroll within the snap container
        const featuresLink = document.querySelector('a[href="features.html"]');
        if (featuresLink) {
          featuresLink.addEventListener("click", (e) => {
            e.preventDefault();
            smoothScrollTo(window, featuresContainer.offsetTop, 1400); // 1.4s luxurious ease-in-out
            try {
              history.pushState(null, "", "#features");
            } catch (err) {
              window.location.hash = "#features";
            }
          });
        }

        // Load the features page content
        fetch("features.html")
          .then((response) => {
            if (!response.ok) throw new Error("Could not fetch features.html");
            return response.text();
          })
          .then((htmlText) => {
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlText, "text/html");

            // Inject features.css if not already present
            if (!document.querySelector('link[href="css/features.css"]')) {
              const link = document.createElement("link");
              link.rel = "stylesheet";
              link.href = "css/features.css";
              document.head.appendChild(link);
            }

            // Extract body content (skip back-nav and ambient orbs which are position:fixed)
            const importedElements = doc.querySelectorAll(
              "body > *:not(.back-nav):not(.ambient-orb)"
            );
            featuresContainer.innerHTML = "";

            importedElements.forEach((el) => {
              featuresContainer.appendChild(el.cloneNode(true));
            });

            // Reset the __featuresLoaded guard so features.js can initialize
            window.__featuresLoaded = false;

            // Load features.js
            const s = document.createElement("script");
            s.src = "js/features.js";
            s.onerror = () => console.error("[BlueKeys] Failed to load js/features.js");
            document.head.appendChild(s);

            // Load bg-shader.js dynamically if not already present
            if (!document.querySelector('script[src="js/bg-shader.js"]')) {
              const bgShader = document.createElement("script");
              bgShader.src = "js/bg-shader.js";
              bgShader.onerror = () => console.error("[BlueKeys] Failed to load js/bg-shader.js");
              document.head.appendChild(bgShader);
            }
          })
          .catch((err) => {
            console.error("BlueKeys dynamic loader failed:", err);
            featuresContainer.innerHTML = `
              <div class="flex items-center justify-center min-h-[50vh] text-primary/40 font-bold uppercase tracking-widest text-xs">
                Failed to load ecosystem features.
              </div>
            `;
          });
      });
