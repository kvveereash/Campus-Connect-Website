/*
 * Campus Connect events widget.
 *
 *   <script src="https://campusconnect2026.netlify.app/embed.js" data-college="ID" async></script>
 *
 * (or data-club="ID"; add data-theme="dark" for the dark version). Puts an
 * iframe of the college's or club's upcoming events right after the script
 * tag and keeps it as tall as its content. Several on one page are fine: each
 * script tag gets its own frame, and each frame only listens to itself.
 */
(function () {
    'use strict';

    var ID = /^[\w-]{1,64}$/;
    var MOUNTED = 'data-campus-connect-mounted';

    function ourScripts() {
        var found = [];
        var current = document.currentScript;
        if (current) found.push(current);
        // currentScript is null in a few old browsers; any of our tags not yet
        // given a frame are picked up here as well, so none is left out.
        var all = document.querySelectorAll('script[data-college], script[data-club]');
        for (var i = 0; i < all.length; i++) {
            if (all[i] !== current && /\/embed\.js(?:[?#]|$)/.test(all[i].src)) found.push(all[i]);
        }
        return found;
    }

    function mount(script) {
        if (script.hasAttribute(MOUNTED) || !script.parentNode) return;

        var kind = script.getAttribute('data-college') ? 'college' : script.getAttribute('data-club') ? 'club' : null;
        var id = kind && script.getAttribute('data-' + kind);
        if (!kind || !ID.test(id)) {
            if (window.console) console.warn('Campus Connect widget: add data-college="..." or data-club="..." with the id from its page.');
            return;
        }
        script.setAttribute(MOUNTED, '');

        // The frame comes from wherever this script was loaded from, so a
        // preview deploy shows its own pages.
        var origin;
        try {
            origin = new URL(script.src).origin;
        } catch (_error) {
            return;
        }
        var dark = script.getAttribute('data-theme') === 'dark';

        var frame = document.createElement('iframe');
        frame.src = origin + '/embed/' + kind + '/' + encodeURIComponent(id) + (dark ? '?theme=dark' : '');
        frame.title = 'Upcoming events on Campus Connect';
        frame.setAttribute('loading', 'lazy');
        // Visible at a sensible size before the frame reports its height.
        frame.style.cssText = 'display:block;width:100%;height:420px;border:0;background:transparent;';
        script.parentNode.insertBefore(frame, script.nextSibling);

        window.addEventListener('message', function (event) {
            if (event.source !== frame.contentWindow || event.origin !== origin) return;
            var data = event.data;
            if (!data || data.type !== 'campus-connect:height') return;
            var height = Number(data.height);
            if (!isFinite(height)) return;
            frame.style.height = Math.min(Math.max(Math.round(height), 80), 6000) + 'px';
        });
    }

    var scripts = ourScripts();
    for (var i = 0; i < scripts.length; i++) mount(scripts[i]);
})();
