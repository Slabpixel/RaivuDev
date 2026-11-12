
/**
 * Generic Lazy Loader using IntersectionObserver
 */
export class LazyLoader {
    private observer: IntersectionObserver;

    constructor(options?: IntersectionObserverInit) {
        this.observer = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const target = entry.target as HTMLElement;
                    this.onIntersect(target);
                    observer.unobserve(target);
                }
            });
        }, options || { rootMargin: "200px 0px" }); // Preload 200px before viewport
    }

    public observe(element: Element, callback: (el: Element) => void) {
        // Attach the callback to the element so we can call it later
        (element as any)._onIntersect = callback;
        this.observer.observe(element);
    }

    private onIntersect(element: HTMLElement) {
        if ((element as any)._onIntersect) {
            (element as any)._onIntersect(element);
            delete (element as any)._onIntersect; // Cleanup
        }
    }

    public disconnect() {
        this.observer.disconnect();
    }
}

/**
 * Plays each video only while it is on screen and pauses it once it leaves,
 * so the browser never decodes more than the two or three that are visible.
 * The videos use preload="none", so the first play() is also what loads them.
 */
export function initLazyVideos() {
    const lazyVideos = document.querySelectorAll<HTMLVideoElement>("video.lazy-video");

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const v = entry.target as HTMLVideoElement;
            if (entry.isIntersecting) {
                const dataSrc = v.getAttribute("data-src");
                if (dataSrc) {
                    v.src = dataSrc;
                    v.removeAttribute("data-src");
                }
                v.play().catch(e => console.log("Autoplay prevented", e));
            } else if (!v.paused) {
                v.pause();
            }
        });
    }, { rootMargin: "200px 0px" });

    lazyVideos.forEach(video => observer.observe(video));
}
