/**
 * The page entrance.
 *
 * This was a JavaScript-animated div with initial={{ opacity: 0, y: 20,
 * filter: 'blur(10px)' }}. Because a template renders on the server, that
 * initial state was serialised into the HTML of every page — so every page
 * on the site shipped as `opacity:0; filter:blur(10px)` and stayed invisible
 * until React hydrated and the animation library animated it away. On a slow
 * connection that is a blank screen for as long as the bundle takes; if the
 * JS fails to run at all, the page never appears. It also blurred the entire
 * document for 700ms on every navigation, which forces a full-page
 * compositing layer and is why pages looked washed out mid-flight.
 *
 * The same entrance in CSS costs no JavaScript and cannot strand the page:
 * stylesheets are render-blocking, so the animation begins at first paint
 * and finishes whether or not hydration ever happens. The blur is gone —
 * it was the expensive half and the ugly half.
 */
export default function Template({ children }: { children: React.ReactNode }) {
    return <div className="pageEnter">{children}</div>;
}
