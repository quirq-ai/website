;(function () {
    window.__onThemeChange = function () {}
    var darkQuery = window.matchMedia('(prefers-color-scheme: dark)')
    function resolve(theme) {
        return theme === 'system' ? (darkQuery.matches ? 'dark' : 'light') : theme
    }
    // Applies a light or dark theme; the preference ('system', 'light' or 'dark') is kept separately.
    function setTheme(newTheme) {
        window.__theme = newTheme
        document.body.className = newTheme
        window.__onThemeChange(newTheme)
    }
    // A visitor who hasn't chosen follows the operating system. Before 'system' was stored as itself, it
    // was stored as the light or dark it resolved to, with colorMode 'system' in siteSettings; read that
    // as 'system' too.
    var preferredTheme = 'system'
    try {
        var stored = localStorage.getItem('theme')
        var colorMode = (JSON.parse(localStorage.getItem('siteSettings') || '{}') || {}).colorMode
        if ((stored === 'light' || stored === 'dark') && colorMode !== 'system') preferredTheme = stored
    } catch (err) {}
    window.__preferredTheme = preferredTheme
    function followSystem() {
        if (preferredTheme === 'system') setTheme(resolve('system'))
    }
    if (darkQuery.addEventListener) darkQuery.addEventListener('change', followSystem)
    else darkQuery.addListener(followSystem)
    window.__setPreferredTheme = function (theme) {
        preferredTheme = theme === 'light' || theme === 'dark' ? theme : 'system'
        window.__preferredTheme = preferredTheme
        var newTheme = resolve(preferredTheme)
        setTheme(newTheme)
        try {
            localStorage.setItem('theme', preferredTheme)
        } catch (err) {}
        return newTheme
    }
    setTheme(resolve(preferredTheme))

    // Set initial transparency preference before React hydrates.
    try {
        var siteSettings = JSON.parse(localStorage.getItem('siteSettings') || '{}')
        document.body.setAttribute('data-reduce-transparency', siteSettings.reduceTransparency ? 'true' : 'false')
    } catch (err) {}
})()
