
import { Rive, Layout, Fit, Alignment, EventType, RiveEventType } from "@rive-app/webgl2";
import { LazyLoader } from "../utils/LazyLoader";

// Every button and link inside the Rive files goes here
const BOOK_CALL_URL = "https://dribbble.com/RaivuMotionLab";
// One press can fire the bookCall trigger and several OpenUrl events at once
const OPEN_URL_COOLDOWN_MS = 1500;

export class RiveManager {
    private activeInstances: Rive[] = [];
    private layout: Layout;
    private lastUrlOpen = 0;

    constructor() {
        this.layout = new Layout({
            fit: Fit.Layout,
            layoutScaleFactor: 1.1,
        });

        // Handle resizing
        window.addEventListener('resize', this.resizeAll.bind(this));
        // Use capped pixel ratio
        this.resizeAll();
    }

    private resizeAll() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        this.activeInstances.forEach(instance => {
            instance.resizeDrawingSurfaceToCanvas(dpr);
        });
    }

    public initHeroAnimations() {
        // Logo in Navbar
        const logoCanvasNav = document.getElementById("logo-canvas-nav") as HTMLCanvasElement;
        if (logoCanvasNav) {
            this.createRiveInstance(logoCanvasNav, new URL("../assets/rive/logo_raivu2.riv", import.meta.url).href, ["State Machine 1"], true);
        }

        // Logo in Hero Section
        const logoCanvasHero = document.getElementById("logo-canvas-hero") as HTMLCanvasElement;
        if (logoCanvasHero) {
            this.createRiveInstance(logoCanvasHero, new URL("../assets/rive/logo_raivu2.riv", import.meta.url).href, ["State Machine 1"], true);
        }

        // CTA in Navbar
        const ctaCanvasNav = document.getElementById("cta-canvas-nav") as HTMLCanvasElement;
        if (ctaCanvasNav) {
            const instance = new Rive({
                src: new URL("../assets/rive/contact_us_raivuNewVersion.riv", import.meta.url).href,
                stateMachines: ["State Machine 1"],
                canvas: ctaCanvasNav,
                layout: new Layout({ fit: Fit.Contain, alignment: Alignment.Center }),
                autoplay: true,
                useOffscreenRenderer: true,
                autoBind: true,
                artboard: "Artboard",
                isTouchScrollEnabled: true,
                onLoad: () => {
                    instance.resizeDrawingSurfaceToCanvas(Math.min(window.devicePixelRatio || 1, 2));
                    this.handleOpenUrlEvents(instance);
                    this.activeInstances.push(instance);
                },
            });
        }
    }

    public initLazyAnimations(lenisInstance: any) {
        const loader = new LazyLoader({ rootMargin: "1700px 0px" }); // Load early


        // 1. Main Mascot (Bottom of Hero)
        const riveCanvas = document.getElementById("rive-canvas") as HTMLCanvasElement;
        if (riveCanvas) {
            this.setupMainMascot(riveCanvas, lenisInstance);
        }

        // 2. Calculator (Green Section)
        const riveCanvas2 = document.getElementById("riveCanvas2") as HTMLCanvasElement;
        if (riveCanvas2) {
            loader.observe(riveCanvas2, () => {
                this.setupCalculator(riveCanvas2);
            });
        }

        // 3. Ball Physics (Blue Section)
        const riveCanvas3 = document.getElementById("riveCanvas3") as HTMLCanvasElement;
        if (riveCanvas3) {
            loader.observe(riveCanvas3, () => {
                this.setupBallPhysics(riveCanvas3);
            });
        }
    }

    private setupBallPhysics(canvas: HTMLCanvasElement) {
        // The mobile section is shorter, so smaller balls keep the pile below the headline
        const layout = window.innerWidth <= 768
            ? new Layout({ fit: Fit.Layout, layoutScaleFactor: 0.8 })
            : undefined;
        const riveInstance = this.createRiveInstance(canvas, new URL("../assets/rive/ball_physics_gyro.riv", import.meta.url).href, ["State Machine 1"], true, "mainPlay", layout, () => {
            const vmi = riveInstance.viewModelInstance;
            if (!vmi) return;

            const bookCall = vmi.trigger("bookCall");
            if (bookCall) {
                bookCall.on(() => this.openBookCall());
            }

            const gravityX = vmi.number("gravityX");
            const gravityY = vmi.number("gravityY");
            if (gravityX && gravityY) {
                this.setupTiltGravity((x, y) => {
                    gravityX.value = x;
                    gravityY.value = y;
                });
            }
        });
    }

    // Feeds the device tilt to the ball scene as gravity, in g along the
    // screen's axes (x right, y down): upright is (0, 1), flat is (0, 0).
    private setupTiltGravity(setGravity: (x: number, y: number) => void) {
        // Desktops send no orientation, so listening everywhere is harmless and
        // keeps DevTools device mode working when it is turned on after load
        if (typeof DeviceOrientationEvent === "undefined") return;
        if (!window.isSecureContext) {
            console.warn("Tilt needs HTTPS (or localhost): the browser sends no orientation here");
        }

        const onOrientation = (event: DeviceOrientationEvent) => {
            if (event.beta === null || event.gamma === null) return;
            const beta = event.beta * Math.PI / 180;
            const gamma = event.gamma * Math.PI / 180;

            // Gravity in the device's portrait axes
            const deviceX = Math.cos(beta) * Math.sin(gamma);
            const deviceY = Math.sin(beta);

            // Turn it into screen axes when the phone is held in landscape
            const angle = ((screen.orientation?.angle ?? (window as any).orientation ?? 0) as number) * Math.PI / 180;
            const x = deviceX * Math.cos(angle) + deviceY * Math.sin(angle);
            const y = -deviceX * Math.sin(angle) + deviceY * Math.cos(angle);
            setGravity(x, y);
        };

        // Android delivers orientation right away
        window.addEventListener("deviceorientation", onOrientation);

        // iOS only delivers it after a permission prompt from a tap
        const requestPermission = (DeviceOrientationEvent as any).requestPermission;
        if (typeof requestPermission !== "function") return;

        // Safari counts touchend and click as a user gesture, not pointerup
        const askOnTap = () => {
            requestPermission.call(DeviceOrientationEvent)
                .then((state: string) => {
                    if (state !== "granted") return;
                    document.removeEventListener("touchend", askOnTap);
                    document.removeEventListener("click", askOnTap);
                })
                .catch((e: unknown) => console.warn("Tilt permission was not granted", e));
        };
        document.addEventListener("touchend", askOnTap);
        document.addEventListener("click", askOnTap);
    }

    private handleOpenUrlEvents(rive: Rive) {
        rive.on(EventType.RiveEvent, (event) => {
            const eventData = event.data as any;
            if (eventData && eventData.type === RiveEventType.OpenUrl) {
                this.openBookCall();
            }
        });
    }

    private openBookCall() {
        const now = Date.now();
        if (now - this.lastUrlOpen < OPEN_URL_COOLDOWN_MS) return;
        this.lastUrlOpen = now;

        // Rive events arrive outside the tap, so a popup blocker may refuse a new tab
        const opened = window.open(BOOK_CALL_URL, "_blank");
        if (!opened) {
            window.location.href = BOOK_CALL_URL;
        }
    }

    private setupMainMascot(canvas: HTMLCanvasElement, lenis: any) {
        const riveInstance = new Rive({
            src: new URL("../assets/rive/raivumascot_new_versionFmob.riv", import.meta.url).href,
            stateMachines: ["State Machine 1"],
            canvas: canvas,
            artboard: "MainArtboard",
            autoBind: true,
            layout: new Layout({
                fit: Fit.Contain,
                alignment: Alignment.BottomCenter,
            }),
            autoplay: true,
            isTouchScrollEnabled: true,
            useOffscreenRenderer: true,
            onLoad: () => {
                this.handleOpenUrlEvents(riveInstance);
                const vmi = riveInstance.viewModelInstance;
                const isMobileRive = vmi.boolean("isMobile");

                let wasMobile: boolean | null = null;
                const updateMobileState = () => {
                    const isMobile = window.innerWidth <= 768;
                    if (isMobileRive) {
                        isMobileRive.value = isMobile;
                    }
                    if (isMobile === wasMobile) return;
                    wasMobile = isMobile;
                    // The artboard is landscape, so Contain shrinks it on a portrait phone;
                    // Cover scales it to the screen height and keeps the mobile content centered
                    riveInstance.layout = isMobile
                        ? new Layout({ fit: Fit.Cover, alignment: Alignment.Center })
                        : new Layout({ fit: Fit.Contain, alignment: Alignment.BottomCenter });
                };

                updateMobileState();
                window.addEventListener('resize', updateMobileState);

                const dpr = Math.min(window.devicePixelRatio || 1, 2);
                riveInstance.resizeDrawingSurfaceToCanvas(dpr);
                this.activeInstances.push(riveInstance);
                this.observeVisibility(riveInstance, canvas);
            }
        });
    }

    private setupCalculator(canvas: HTMLCanvasElement) {
        const riveInstance = new Rive({
            src: new URL("../assets/rive/calkulator_Re.riv", import.meta.url).href,
            stateMachines: ["State Machine 1"],
            canvas: canvas,
            artboard: "Main",
            autoBind: true,
            layout: new Layout({ fit: Fit.Contain, alignment: Alignment.Center }),
            autoplay: true,
            isTouchScrollEnabled: true,
            useOffscreenRenderer: true,
            onLoad: () => {
                this.handleOpenUrlEvents(riveInstance);
                try {
                    const vmi = riveInstance.viewModelInstance;
                    if (vmi) {
                        const isMobileRive = vmi.boolean("isMobileCal");
                        let wasMobile: boolean | null = null;
                        const updateMobileState = () => {
                            const isMobile = window.innerWidth <= 768;
                            if (isMobileRive) {
                                isMobileRive.value = isMobile;
                            }
                            if (isMobile === wasMobile) return;
                            wasMobile = isMobile;
                            // On mobile the calculator hugs the top, so no empty band sits under the About text
                            riveInstance.layout = new Layout({
                                fit: Fit.Contain,
                                alignment: isMobile ? Alignment.TopCenter : Alignment.Center,
                            });
                        };
                        updateMobileState();
                        window.addEventListener('resize', updateMobileState);

                        const btmPressed = vmi.trigger("BtmPressed");
                        if (btmPressed) {
                            btmPressed.on(() => this.openBookCall());
                        }
                    }
                } catch (e) {
                    console.warn("Could not bind isMobile to calculator", e);
                }

                const dpr = Math.min(window.devicePixelRatio || 1, 2);
                riveInstance.resizeDrawingSurfaceToCanvas(dpr);
                this.activeInstances.push(riveInstance);
                this.observeVisibility(riveInstance, canvas);
            }
        });
    }

    private createRiveInstance(canvas: HTMLCanvasElement, assetUrl: string, stateMachines: string[], handleUrlEvents: boolean = false, artboard: string = "Artboard", customLayout?: Layout, onLoaded?: () => void) {
        const instance: Rive = new Rive({
            src: assetUrl,
            stateMachines: stateMachines,
            canvas: canvas,
            artboard: artboard,
            autoBind: true,
            layout: customLayout || this.layout,
            autoplay: true,
            useOffscreenRenderer: true,
            isTouchScrollEnabled: true,
            onLoad: () => {
                if (handleUrlEvents) {
                    this.handleOpenUrlEvents(instance);
                }
                const dpr = Math.min(window.devicePixelRatio || 1, 2);
                instance.resizeDrawingSurfaceToCanvas(dpr);
                this.activeInstances.push(instance);
                this.observeVisibility(instance, canvas);
                onLoaded?.();
            }
        });
        return instance;
    }

    private observeVisibility(rive: Rive, canvas: HTMLElement) {
        if (!rive || !canvas) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    rive.play();
                } else {
                    rive.pause();
                }
            });
        }, { threshold: 0.1 });

        observer.observe(canvas);
    }
}
