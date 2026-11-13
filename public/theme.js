// WKTV light / dark mode.
// - Remembers the visitor's choice (dark is the default look).
// - Any element with [data-theme-toggle] switches the theme when clicked.
// - Adds the toggle button to the static pages' header (home, support, troubleshooting).
// - In light mode, re-colours inline style="" colours so they read on a light background.
(function () {
  var KEY = 'wktv-theme'
  var root = document.documentElement

  function saved() { try { return localStorage.getItem(KEY) } catch (e) { return null } }
  function save(t) { try { localStorage.setItem(KEY, t) } catch (e) {} }
  function current() { return root.getAttribute('data-theme') === 'light' ? 'light' : 'dark' }

  // ---------- colour mapping for inline styles (mirrors theme-light CSS) ----------
  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255
    var max = Math.max(r, g, b), min = Math.min(r, g, b), h = 0, s = 0, l = (max + min) / 2
    if (max !== min) {
      var d = max - min
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
      h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4
      h /= 6
    }
    return [h, s, l]
  }
  function hue(p, q, t) { if (t < 0) t += 1; if (t > 1) t -= 1; if (t < 1 / 6) return p + (q - p) * 6 * t; if (t < 1 / 2) return q; if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6; return p }
  function hslToRgb(h, s, l) {
    if (s === 0) return [l, l, l].map(function (v) { return Math.round(v * 255) })
    var q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q
    return [hue(p, q, h + 1 / 3), hue(p, q, h), hue(p, q, h - 1 / 3)].map(function (v) { return Math.round(v * 255) })
  }
  function fmt(c) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + (+c[3].toFixed(3)) + ')' }
  function parse(str) {
    str = str.toLowerCase()
    if (str === 'white') return [255, 255, 255, 1]
    if (str === 'black') return [0, 0, 0, 1]
    if (str[0] === '#') {
      var h = str.slice(1)
      if (h.length === 3 || h.length === 4) h = h.split('').map(function (c) { return c + c }).join('')
      if (h.length !== 6 && h.length !== 8) return null
      return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1]
    }
    var n = str.match(/[\d.%]+/g)
    if (!n || n.length < 3) return null
    return [+n[0], +n[1], +n[2], n[3] === undefined ? 1 : (/%$/.test(n[3]) ? parseFloat(n[3]) / 100 : parseFloat(n[3]))]
  }
  function mapColor(c, kind) {
    var hsl = rgbToHsl(c[0], c[1], c[2]), h = hsl[0], s = hsl[1], l = hsl[2], a = c[3]
    var neutral = s < 0.2 || l < 0.1 || l > 0.94
    if (kind === 'shadow') {
      if (neutral && l < 0.5) return fmt([20, 20, 30, Math.min(a, 1) * 0.22])
      return neutral ? fmt(c) : fmt([c[0], c[1], c[2], a * 0.55])
    }
    if (neutral) {
      var nl = 1 - l
      if (kind === 'text') nl = Math.min(Math.max(nl, 0.07), 0.62)
      else if (nl > 0.9 && a >= 1) nl = 0.93 + (nl - 0.9) * 0.7
      return fmt(hslToRgb(h, Math.min(s, 0.12), nl).concat(a))
    }
    if (kind === 'text') return l > 0.55 ? fmt(hslToRgb(h, s, Math.max(0.3, Math.min(0.42, 1 - l))).concat(a)) : fmt(c)
    if (l < 0.3) return fmt(hslToRgb(h, Math.min(s, 0.6), Math.min(0.96, 1 - l * 0.6)).concat(a))
    return fmt(c)
  }
  var COLOR_RE = /#[0-9a-fA-F]{3,8}\b|rgba?\(\s*[\d.]+[\s,]+[\d.]+[\s,]+[\d.]+(?:[\s,/]+[\d.%]+)?\s*\)|\b(?:white|black)\b/g
  function mapDecl(prop, value) {
    var kind = /shadow/.test(prop) ? 'shadow' : /^(color|-webkit-text-fill-color|caret-color|fill|stroke)$/.test(prop) ? 'text' : 'bg'
    var urls = []
    var v = value.replace(/url\([^)]*\)/g, function (m) { urls.push(m); return '__U' + (urls.length - 1) + '__' })
    v = v.replace(COLOR_RE, function (m) { var c = parse(m); return c ? mapColor(c, kind) : m })
    return v.replace(/__U(\d+)__/g, function (_, i) { return urls[i] })
  }
  function lightStyle(styleText) {
    return styleText.split(';').map(function (part) {
      var i = part.indexOf(':')
      if (i < 0) return part
      var prop = part.slice(0, i).trim().toLowerCase(), value = part.slice(i + 1)
      if (!COLOR_RE.test(value)) { COLOR_RE.lastIndex = 0; return part }
      COLOR_RE.lastIndex = 0
      return prop + ':' + mapDecl(prop, value)
    }).join(';')
  }

  // Keep the original style in data-dark-style so switching back is exact
  var busy = false
  function paint(el) {
    if (!el.getAttribute) return
    var style = el.getAttribute('style')
    if (!style) return
    if (el.__wkLight === style) return // already ours
    COLOR_RE.lastIndex = 0
    if (!COLOR_RE.test(style)) { COLOR_RE.lastIndex = 0; return }
    COLOR_RE.lastIndex = 0
    el.__wkDark = style
    var next = lightStyle(style)
    el.__wkLight = next
    el.setAttribute('style', next)
  }
  function paintAll(scope) {
    if (scope.nodeType === 1 && scope.hasAttribute('style')) paint(scope)
    var list = (scope.querySelectorAll ? scope.querySelectorAll('[style]') : [])
    for (var i = 0; i < list.length; i++) paint(list[i])
  }
  function restoreAll() {
    var list = document.querySelectorAll('[style]')
    for (var i = 0; i < list.length; i++) {
      var el = list[i]
      if (el.__wkDark && el.getAttribute('style') === el.__wkLight) el.setAttribute('style', el.__wkDark)
      el.__wkDark = el.__wkLight = undefined
    }
  }
  var observer = window.MutationObserver ? new MutationObserver(function (muts) {
    if (busy || current() !== 'light') return
    busy = true
    for (var i = 0; i < muts.length; i++) {
      var m = muts[i]
      if (m.type === 'attributes') paint(m.target)
      else for (var j = 0; j < m.addedNodes.length; j++) if (m.addedNodes[j].nodeType === 1) paintAll(m.addedNodes[j])
    }
    busy = false
  }) : null

  function setMeta(theme) {
    var m = document.querySelector('meta[name="theme-color"]')
    if (m) m.setAttribute('content', theme === 'light' ? '#f5f5f7' : '#0a0a0c')
  }
  function syncButtons(theme) {
    var btns = document.querySelectorAll('[data-theme-toggle]')
    for (var i = 0; i < btns.length; i++) {
      btns[i].setAttribute('aria-label', theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode')
      btns[i].setAttribute('title', theme === 'light' ? 'Dark mode' : 'Light mode')
    }
  }
  function apply(theme) {
    if (theme === 'light') {
      root.setAttribute('data-theme', 'light')
      if (document.body) { busy = true; paintAll(document.body); busy = false }
      if (observer && document.body) observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['style'] })
    } else {
      root.setAttribute('data-theme', 'dark')
      if (observer) observer.disconnect()
      restoreAll()
    }
    root.style.colorScheme = theme
    setMeta(theme)
    syncButtons(theme)
  }

  var ICONS = '<svg class="ti-sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6"/></svg>' +
    '<svg class="ti-moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7z"/></svg>'
  window.WKTV_THEME_ICONS = ICONS

  function addStaticToggle() {
    // Static pages (home / support / troubleshooting) use <header class="wrap">
    var header = document.querySelector('header.wrap')
    if (!header || header.querySelector('[data-theme-toggle]')) return
    var b = document.createElement('button')
    b.type = 'button'
    b.className = 'theme-toggle'
    b.setAttribute('data-theme-toggle', '')
    b.innerHTML = ICONS
    var login = header.querySelector('.login')
    if (login) header.insertBefore(b, login); else header.appendChild(b)
  }

  document.addEventListener('click', function (e) {
    var t = e.target && e.target.closest && e.target.closest('[data-theme-toggle]')
    if (!t) return
    e.preventDefault()
    var next = current() === 'light' ? 'dark' : 'light'
    root.classList.add('theme-switching')
    apply(next)
    save(next)
    setTimeout(function () { root.classList.remove('theme-switching') }, 350)
  })

  function init() {
    addStaticToggle()
    apply(saved() === 'light' ? 'light' : 'dark')
  }
  // Set the attribute right away (before paint) and finish once the page is ready
  if (saved() === 'light') root.setAttribute('data-theme', 'light')
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init)
  else init()
})()
