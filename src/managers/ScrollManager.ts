
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export class ScrollManager {
    constructor() {
        this.init();
    }

    private init() {
        // Horizontal Scroll Animation for #works section
        // Wait for window load to ensure all styles and layout are applied
        window.addEventListener("load", () => {
            this.initHorizontalScroll();
            this.initAboutAnimation(); // Dipindah ke sini agar posisi scroll dikalkulasi setelah pinning #works selesai
        });

        // Smart Navbar
        this.initSmartNavbar();

        // Smooth Scroll anchors
        this.initAnchorScroll();
    }

    private initAboutAnimation() {
        const aboutText = document.querySelector(".about-desc-text");
        const aboutSection = document.querySelector(".about-section");

        if (aboutText && aboutSection) {
            const originalHTML = aboutText.innerHTML;
            let newHTML = "";
            let inTag = false;
            for (let i = 0; i < originalHTML.length; i++) {
                const char = originalHTML[i];
                if (char === '<') {
                    inTag = true;
                }
                if (!inTag && char.trim() !== '') {
                    newHTML += `<span class="about-char" style="opacity: 0.1;">${char}</span>`;
                } else {
                    newHTML += char;
                }
                if (char === '>') {
                    inTag = false;
                }
            }
            aboutText.innerHTML = newHTML;

            const chars = aboutText.querySelectorAll('.about-char');
            gsap.fromTo(chars,
                { opacity: 0.1 },
                {
                    opacity: 1,
                    ease: "none",
                    stagger: 0.1,
                    scrollTrigger: {
                        trigger: aboutSection,
                        start: "top 75%", // Mulai perlahan saat baru masuk atas layar
                        end: "center center", // Selesai maksimal saat posisinya di tengah
                        scrub: true, // `true` agar membalik seketika saat di-scroll ke atas
                        markers: false, // DEBUG: Shows start and end lines on the screen
                    }
                }
            );
            console.log("About animation initialized successfully. Chars found:", chars.length);
        } else {
            console.error("About text or section not found:", { aboutText, aboutSection });
        }
    }

    private initHorizontalScroll() {
        const worksSection = document.getElementById("works");
        const horizontalWrapper = document.querySelector(".horizontal-wrapper");

        if (worksSection && horizontalWrapper) {
            // Only enable horizontal scroll logic on Desktop
            if (window.innerWidth <= 768) {
                console.log("Mobile view detected: Skipping horizontal scroll animation.");
                return;
            }

            console.log("Initializing Horizontal Scroll (Load Event)");

            // Calculate distance dynamically
            const getScrollAmount = () => {
                const scrollWidth = horizontalWrapper.scrollWidth;
                const viewWidth = window.innerWidth;
                const amount = -(scrollWidth - viewWidth);
                // console.log(`Scroll Amount: ${amount} (ScrollWidth: ${scrollWidth}, ViewWidth: ${viewWidth})`);
                return amount;
            }

            let updateCurve = () => { };

            // Creating the animation
            gsap.to(horizontalWrapper, {
                x: getScrollAmount,
                ease: "none",
                onUpdate: () => updateCurve(),
                scrollTrigger: {
                    trigger: worksSection,
                    start: "top top",
                    end: () => `+=${horizontalWrapper.scrollWidth}`,
                    pin: true,
                    scrub: 0.1,
                    invalidateOnRefresh: true,
                    markers: false,
                }
            });

            ScrollTrigger.refresh();

            // Curved effect: only recomputed when the wrapper actually moves
            // (tween update) or the layout changes (refresh), not on every frame
            const boxes = Array.from(horizontalWrapper.querySelectorAll<HTMLElement>(".scroll-box"));
            updateCurve = () => {
                // Disable on mobile to prevent "sliding around"
                if (window.innerWidth <= 768) return;

                const viewportCenter = window.innerWidth / 2;

                // Atur kelengkungan di sini:
                // Angka lebih BESAR = Lingkaran lebih BESAR (Lengkungan lebih landai/flat)
                // Angka lebih KECIL = Lingkaran lebih KECIL (Lengkungan lebih tajam/curam)
                const radius = window.innerWidth * 12;

                // Read every position first, then write, so the browser
                // does not recalculate styles once per box
                const distances = boxes.map((box) => {
                    const rect = box.getBoundingClientRect();
                    return rect.left + rect.width / 2 - viewportCenter;
                });

                boxes.forEach((box, i) => {
                    const distanceFromCenter = distances[i];

                    // Parabolic curve: y = x^2 / (2 * R)
                    // This makes the center highest (y=0) and edges lower (y > 0)
                    const y = Math.pow(distanceFromCenter, 2) / (2 * radius);

                    // Rotation: angle = distance / radius
                    const angleDeg = (distanceFromCenter / radius) * (180 / Math.PI);

                    gsap.set(box, {
                        y: y,
                        rotation: angleDeg,
                        transformOrigin: "center center"
                    });
                });
            };
            ScrollTrigger.addEventListener("refresh", updateCurve);

            ScrollTrigger.refresh();
        } else {
            console.error("Horizontal scroll elements not found on load");
        }
    }

    private initSmartNavbar() {
        // Use ScrollTrigger to detect direction
        const navbar = document.querySelector('.navbar');
        const heroSection = document.querySelector('.hero-container') as HTMLElement;
        let isSticky = false;
        let lastScrollTop = 0;
        let scrollAccumulator = 0;

        if (navbar) {
            // Set initial state
            if (window.scrollY < 50) {
                navbar.classList.add('navbar-top');
            }

            // Measured once per layout change; reading it on every scroll tick forces a layout
            const measureThreshold = () => heroSection ? heroSection.offsetHeight : window.innerHeight;
            let threshold = measureThreshold();
            ScrollTrigger.addEventListener("refresh", () => { threshold = measureThreshold(); });

            ScrollTrigger.create({
                start: "top top",
                end: 99999,
                onUpdate: (self) => {
                    const scrollTop = self.scroll();

                    // Calculate a smoothed direction to avoid flickering (glitch) on trackpads
                    const delta = scrollTop - lastScrollTop;
                    lastScrollTop = scrollTop;

                    // Accumulate scroll in the current direction
                    if ((delta > 0 && scrollAccumulator < 0) || (delta < 0 && scrollAccumulator > 0)) {
                        scrollAccumulator = 0; // Reset if direction changed
                    }
                    scrollAccumulator += delta;

                    // Toggle transparent background class at the top
                    if (scrollTop < 50) {
                        navbar.classList.add('navbar-top');
                    } else {
                        navbar.classList.remove('navbar-top');
                    }

                    // Navbar is at the very top (reset to original)
                    if (scrollTop <= 10) {
                        if (isSticky) {
                            isSticky = false;
                            (navbar as HTMLElement).style.transition = 'none';
                            navbar.classList.remove('navbar-fixed');
                            navbar.classList.remove('navbar-hidden');
                            requestAnimationFrame(() => {
                                requestAnimationFrame(() => {
                                    (navbar as HTMLElement).style.transition = '';
                                });
                            });
                        }
                        return;
                    }

                    // In section 1, while it's still absolute, let it scroll away naturally
                    if (scrollTop > 10 && scrollTop < threshold && !isSticky) {
                        return;
                    }

                    // Once we cross threshold, it becomes a "Smart Navbar" (sticky)
                    if (scrollTop >= threshold && !isSticky) {
                        isSticky = true;
                        (navbar as HTMLElement).style.transition = 'none';
                        navbar.classList.add('navbar-fixed');
                        navbar.classList.add('navbar-hidden');
                        requestAnimationFrame(() => {
                            requestAnimationFrame(() => {
                                (navbar as HTMLElement).style.transition = '';
                            });
                        });
                    }

                    // While in sticky mode, react to direction with a threshold to prevent glitching
                    if (isSticky) {
                        // Only hide/show if we've scrolled distinctly in one direction (e.g. 15px)
                        if (scrollAccumulator < -15) {
                            navbar.classList.remove('navbar-hidden');
                        } else if (scrollAccumulator > 15 && scrollTop > 50) {
                            navbar.classList.add('navbar-hidden');
                        }
                    }
                }
            });
        }
    }

    private initAnchorScroll() {
        // This requires lenis if we want smooth scroll. 
        // We'll export a method to handle anchor clicks if passed a scrollTo function.
    }

    // Helper to register lenis update
    public setupLenis(lenis: any) {
        lenis.on('scroll', ScrollTrigger.update);
        gsap.ticker.add((time: number) => {
            lenis.raf(time * 1000);
        });
        gsap.ticker.lagSmoothing(0);

        // Re-implement anchor scroll using Lenis
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                e.preventDefault();
                const target = e.currentTarget as HTMLAnchorElement;
                const targetId = target.getAttribute('href');
                if (targetId && targetId !== '#') {
                    const targetElement = document.querySelector(targetId) as HTMLElement;
                    if (targetElement) {
                        lenis.scrollTo(targetElement);
                    }
                }
            });
        });
    }

}
