/* WKTV — English / Spanish toggle for the home page.
   - Adds an "EN | ES" button to the header (next to the light/dark button).
   - Remembers the visitor's choice. English stays the default.
   - Translates by swapping visible text. The English text stays in the HTML,
     so switching back (and search engines) always see the original.
   - Text that other scripts rewrite later (prices, plan summaries) is translated
     again automatically. To change or add a Spanish phrase, edit DICT below. */
(function () {
  'use strict';
  var path = location.pathname.replace(/\/+$/, '') || '/';
  if (path !== '/' && path !== '/home.html') return; // home page only for now

  var KEY = 'wktv-lang';
  var root = document.documentElement;
  var lang = 'en';
  try { if (localStorage.getItem(KEY) === 'es') lang = 'es'; } catch (e) {}

  /* ---------- exact phrases (English → Spanish) ---------- */
  var DICT = {
    // top bar + header
    'YOUR NEXT WATCH STARTS HERE.': 'LO PRÓXIMO QUE VERÁS EMPIEZA AQUÍ.',
    'Try WKTV free for 24 hours': 'Prueba WKTV gratis por 24 horas',
    'WKTV home': 'Inicio de WKTV',
    'Main navigation': 'Navegación principal',
    'How it works': 'Cómo funciona',
    'Plans': 'Planes',
    'Streaming boxes': 'Cajas de streaming',
    'Resellers': 'Revendedores',
    'Help': 'Ayuda',
    'How to connect': 'Cómo conectarte',
    'Troubleshooting': 'Solución de problemas',
    'Contact support': 'Contactar a soporte',
    'Member login': 'Acceso de miembros',
    'Member login ↗': 'Acceso de miembros ↗',
    'Open menu': 'Abrir menú',
    'Close menu': 'Cerrar menú',
    'Switch to light mode': 'Cambiar a modo claro',
    'Switch to dark mode': 'Cambiar a modo oscuro',
    'Light mode': 'Modo claro',
    'Dark mode': 'Modo oscuro',
    'Back to top': 'Volver arriba',

    // hero
    'WKTV ORIGINAL EXPERIENCE': 'LA EXPERIENCIA ORIGINAL DE WKTV',
    'LIVE TV': 'TV EN VIVO',
    'MOVIES': 'PELÍCULAS',
    'SERIES': 'SERIES',
    'SPORTS': 'DEPORTES',
    'LIVE SPORTS.': 'DEPORTES EN VIVO.',
    'TV. SHOWS.': 'TV. SERIES.',
    '& MOVIES.': 'Y PELÍCULAS.',
    'All in one place.': 'Todo en un solo lugar.',
    'The big game, your next obsession, the perfect movie night — bring it all home with WKTV.': 'El gran partido, tu próxima obsesión, la noche de cine perfecta: llévalo todo a casa con WKTV.',
    'Start watching free': 'Empieza a ver gratis',
    'Explore plans': 'Ver planes',
    '24-hour trial · 2 connections · No credit card required': 'Prueba de 24 horas · 2 conexiones · Sin tarjeta de crédito',
    'Your ticket starts at': 'Tu entrada desde',
    '/mo': '/mes',
    '$175 billed annually · 1 connection': '$175 facturados anualmente · 1 conexión',
    '01 / THE WKTV EXPERIENCE': '01 / LA EXPERIENCIA WKTV',
    'YOUR SCREEN. YOUR WAY.': 'TU PANTALLA. A TU MANERA.',
    'SCROLL TO EXPLORE': 'DESLIZA PARA EXPLORAR',
    'Explore the WKTV experience': 'Explora la experiencia WKTV',

    // now showing
    'ONE SERVICE. EVERY KIND OF NIGHT.': 'UN SERVICIO. TODO TIPO DE NOCHE.',
    'What are you in the mood for?': '¿Qué te apetece ver?',
    'Find your next watch ↗': 'Encuentra qué ver ↗',
    'FEEL EVERY SECOND': 'SIENTE CADA SEGUNDO',
    'Game night.': 'Noche de partido.',
    'Live sports ↗': 'Deportes en vivo ↗',
    'MAKE TONIGHT EPIC': 'HAZ ÉPICA ESTA NOCHE',
    'Movie night.': 'Noche de cine.',
    'Movies & series ↗': 'Películas y series ↗',
    'TAKE THE EXPERIENCE WITH YOU': 'LLEVA LA EXPERIENCIA CONTIGO',
    'Your night.': 'Tu noche.',
    'Watch on your devices ↗': 'Mira en tus dispositivos ↗',
    'Discover the current lineup during your trial. Illustrative artwork; programming and availability may vary.': 'Descubre la programación actual durante tu prueba. Arte ilustrativo; la programación y la disponibilidad pueden variar.',

    // device band
    'BIG SCREEN. SMALL SCREEN. YOUR SCREEN.': 'PANTALLA GRANDE. PANTALLA CHICA. TU PANTALLA.',
    'Select models excluded': 'Algunos modelos excluidos',
    'Google TV devices': 'Dispositivos Google TV',
    'Android 6.0 and up': 'Android 6.0 y posteriores',
    'Apple TV 4K and newer': 'Apple TV 4K y más recientes',
    'Find your device ↗': 'Encuentra tu dispositivo ↗',
    'WKTV is free on Android.': 'WKTV es gratis en Android.',
    'ONN, Fire TV, Google TV and Android devices use the free WKTV app. Apple and other third-party apps have their own separate cost.': 'Los dispositivos ONN, Fire TV, Google TV y Android usan la app gratuita de WKTV. Apple y otras apps de terceros tienen su propio costo aparte.',

    // how it works
    'HOW IT WORKS': 'CÓMO FUNCIONA',
    'Watching in 3 easy steps.': 'Mira en 3 sencillos pasos.',
    'No cable box. No installer. No credit card to try.': 'Sin decodificador. Sin instalador. Sin tarjeta de crédito para probar.',
    'See setup steps for your device ↗': 'Ver los pasos de configuración para tu dispositivo ↗',
    'Pick your device': 'Elige tu dispositivo',
    'Use an ONN 4K, Fire TV, Android or Apple device you already own, or': 'Usa un ONN 4K, Fire TV, Android o Apple que ya tengas, o',
    'get a box from us': 'pídenos una caja',
    'with WKTV pre-installed.': 'con WKTV preinstalado.',
    'Try it free for 24 hours': 'Pruébalo gratis por 24 horas',
    '2 connections, no credit card. Check the lineup on your own TV and internet.': '2 conexiones, sin tarjeta de crédito. Revisa la programación en tu propia TV e internet.',
    'Choose a plan & press play': 'Elige un plan y dale al play',
    'Go monthly, annual or lifetime. Pick how many screens can watch at the same time.': 'Elige mensual, anual o de por vida. Escoge cuántas pantallas pueden ver al mismo tiempo.',
    'WKTV features': 'Funciones de WKTV',
    'Everything you love to watch': 'Todo lo que te encanta ver',
    'Explore live TV, sports, movies and series from one place.': 'Explora TV en vivo, deportes, películas y series desde un solo lugar.',
    'Your favorite devices': 'Tus dispositivos favoritos',
    'Watch on compatible streaming devices, phones and tablets.': 'Mira en dispositivos de streaming compatibles, teléfonos y tabletas.',
    'Explore compatible devices ↗': 'Ver dispositivos compatibles ↗',
    'Active': 'Activo',
    'days remaining': 'días restantes',
    'WKTV plan': 'Plan WKTV',
    'IPTV USERNAME': 'USUARIO IPTV',
    'yourname': 'tunombre',
    'Copy': 'Copiar',
    'IPTV PASSWORD': 'CONTRASEÑA IPTV',
    'Show': 'Mostrar',
    'EXPIRES': 'VENCE',
    'One year from today': 'Un año a partir de hoy',
    'Renew or upgrade': 'Renovar o mejorar',
    'Your account, your control': 'Tu cuenta, tu control',
    'See your plan and manage renewals from your account.': 'Consulta tu plan y administra tus renovaciones desde tu cuenta.',

    // savings calculator
    'MORE ROOM IN YOUR BUDGET': 'MÁS ESPACIO EN TU PRESUPUESTO',
    'Same night in.': 'La misma noche en casa.',
    'A smaller TV bill.': 'Una factura de TV más baja.',
    'See what switching could save you.': 'Mira cuánto podrías ahorrar al cambiarte.',
    'Adjust the cable bill to match your own.': 'Ajusta la factura de cable a la tuya.',
    'Enter your monthly cable TV bill': 'Ingresa tu factura mensual de cable',
    '✎ Edit': '✎ Editar',
    'Tap the number and type your own bill, or pick a common amount:': 'Toca el número y escribe tu propia factura, o elige un monto común:',
    'Common monthly cable bills': 'Facturas mensuales de cable comunes',
    'Starts at the $147/month comparison figure from our flyer. This is an illustrative baseline, not a verified current national average.': 'Comienza con la cifra de comparación de $147/mes de nuestro folleto. Es una referencia ilustrativa, no un promedio nacional actual verificado.',
    'Your cable cost over 12 months': 'Tu costo de cable en 12 meses',
    'WKTV MONTHLY · 1 CONNECTION': 'WKTV MENSUAL · 1 CONEXIÓN',
    '/month': '/mes',
    '$360 over 12 months': '$360 en 12 meses',
    'Estimated yearly savings': 'Ahorro anual estimado',
    'WKTV costs more per year by': 'WKTV cuesta más al año por',
    'WKTV ANNUAL · 1 CONNECTION': 'WKTV ANUAL · 1 CONEXIÓN',
    '/year': '/año',
    '$14.58/month equivalent · billed annually': 'Equivale a $14.58/mes · facturado anualmente',
    'Service-price comparison only. Keep any internet cost you still need in your budget. Hardware, third-party player fees, taxes, and other applicable charges are excluded. Lineups and features may differ; actual savings depend on your bill and selected plan.': 'Solo comparación de precios del servicio. Mantén en tu presupuesto cualquier costo de internet que aún necesites. Se excluyen equipos, tarifas de reproductores de terceros, impuestos y otros cargos aplicables. La programación y las funciones pueden diferir; el ahorro real depende de tu factura y del plan elegido.',
    'See WKTV plans ↓': 'Ver planes de WKTV ↓',

    // plans
    'YOUR PLAN. YOUR PACE.': 'TU PLAN. A TU RITMO.',
    'Good entertainment.': 'Buen entretenimiento.',
    'Simple numbers.': 'Números simples.',
    'Choose how you pay. Then choose how many screens watch together.': 'Elige cómo pagas. Luego elige cuántas pantallas ven juntas.',
    'KEEP IT FLEXIBLE': 'MANTÉNLO FLEXIBLE',
    'Month to month': 'Mes a mes',
    '1 simultaneous stream': '1 transmisión simultánea',
    '5 simultaneous streams': '5 transmisiones simultáneas',
    'Live TV, movies & series': 'TV en vivo, películas y series',
    'Monthly subscription': 'Suscripción mensual',
    'Cancel anytime': 'Cancela cuando quieras',
    'Choose monthly': 'Elegir mensual',
    'Need more monthly connections?': '¿Necesitas más conexiones mensuales?',
    'Ask us about options ↗': 'Pregúntanos por las opciones ↗',
    'MAKE YOURSELF AT HOME': 'SIÉNTETE EN CASA',
    'A year of WKTV': 'Un año de WKTV',
    '5 CONNECTIONS = BEST VALUE': '5 CONEXIONES = MEJOR VALOR',
    'How many screens at the same time?': '¿Cuántas pantallas al mismo tiempo?',
    'Annual connections': 'Conexiones anuales',
    'screen': 'pantalla',
    'screens': 'pantallas',
    '✓ 12 months of access': '✓ 12 meses de acceso',
    '✓ Live TV, movies & series': '✓ TV en vivo, películas y series',
    'PAY ONCE. WATCH FOR LIFE.': 'PAGA UNA VEZ. VE DE POR VIDA.',
    'Lifetime access': 'Acceso de por vida',
    'One payment. No renewals, no monthly bills.': 'Un solo pago. Sin renovaciones, sin facturas mensuales.',
    'one-time': 'pago único',
    'BEST LIFETIME VALUE': 'MEJOR VALOR DE POR VIDA',
    'Choose lifetime · 1': 'Elegir de por vida · 1',
    'Choose lifetime · 5': 'Elegir de por vida · 5',
    'Getting a streaming box too?': '¿Quieres también una caja de streaming?',
    'Save $50 with lifetime ↓': 'Ahorra $50 con el plan de por vida ↓',
    'What’s a connection?': '¿Qué es una conexión?',
    'One connection means one active stream. A five-connection plan lets you watch on up to five devices at the same time.': 'Una conexión equivale a una transmisión activa. Un plan de cinco conexiones te permite ver en hasta cinco dispositivos al mismo tiempo.',

    // streaming boxes
    'NOT TECHY? WE’LL SET IT UP FOR YOU.': '¿NO ERES TÉCNICO? NOSOTROS LO CONFIGURAMOS POR TI.',
    'Get a box with WKTV pre-installed': 'Recibe una caja con WKTV preinstalado',
    'We set up your streaming box, activate it and ship it to your door. Plug it in, connect to Wi-Fi and start watching.': 'Configuramos tu caja de streaming, la activamos y la enviamos a tu puerta. Conéctala, enlaza el Wi-Fi y empieza a ver.',
    'WKTV pre-installed': 'WKTV preinstalado',
    ', ready when it arrives': ', listo al llegar',
    'Full package': 'Paquete completo',
    'of live TV, sports, movies & series': 'de TV en vivo, deportes, películas y series',
    'Portable': 'Portátil',
    ': take it anywhere with Wi-Fi': ': llévala a cualquier lugar con Wi-Fi',
    'One-time setup fee': 'Cargo único de configuración',
    ', then just your plan': ', luego solo tu plan',
    'Every box is set up by our team before it ships. Questions first?': 'Cada caja es configurada por nuestro equipo antes de enviarse. ¿Preguntas antes?',
    'Ask us ↗': 'Pregúntanos ↗',
    'Choose your box': 'Elige tu caja',
    'one-time setup & activation': 'configuración y activación únicas',
    'Choose your plan': 'Elige tu plan',
    'Monthly': 'Mensual',
    '1 connection · no contract': '1 conexión · sin contrato',
    'BEST VALUE': 'MEJOR VALOR',
    'Annual': 'Anual',
    '/yr': '/año',
    '1 to 5 connections': '1 a 5 conexiones',
    '$50 OFF': '$50 DE DESCUENTO',
    'Lifetime': 'De por vida',
    'one-time · 1 or 5 connections': 'pago único · 1 o 5 conexiones',
    '(one-time)': '(único)',
    'Lifetime box discount': 'Descuento por plan de por vida en la caja',
    'Due today': 'Total a pagar hoy',
    'One-time payment. No renewals, no monthly bills. US shipping.': 'Pago único. Sin renovaciones ni facturas mensuales. Envío dentro de EE. UU.',
    'Then $30/month. The setup fee is one time only. US shipping.': 'Luego $30/mes. El cargo de configuración se paga una sola vez. Envío dentro de EE. UU.',

    // FAQ
    'A FEW GOOD ANSWERS': 'UNAS CUANTAS BUENAS RESPUESTAS',
    'Before you press play.': 'Antes de darle play.',
    'Can I install WKTV on more than one device?': '¿Puedo instalar WKTV en más de un dispositivo?',
    'You can set up compatible devices, but your plan determines how many can stream simultaneously. One connection supports one active stream; five connections support five.': 'Puedes configurar dispositivos compatibles, pero tu plan determina cuántos pueden transmitir al mismo tiempo. Una conexión admite una transmisión activa; cinco conexiones admiten cinco.',
    'How does the free trial work?': '¿Cómo funciona la prueba gratuita?',
    'The free trial lasts 24 hours and includes 2 connections, not just one, so you can share it with a friend or family member. Use it to check the lineup and performance on your own devices and internet connection. No credit card is required.': 'La prueba gratuita dura 24 horas e incluye 2 conexiones, no solo una, para que puedas compartirla con un amigo o familiar. Úsala para revisar la programación y el rendimiento en tus propios dispositivos y tu conexión a internet. No se requiere tarjeta de crédito.',
    'What if I need help setting up?': '¿Y si necesito ayuda para configurarlo?',
    'Follow the': 'Sigue la',
    'step-by-step setup guide': 'guía de configuración paso a paso',
    'for your device, join our': 'para tu dispositivo, únete a nuestro',
    'Facebook support group': 'grupo de soporte en Facebook',
    ', or': ' o',
    'contact WKTV Support': 'contacta a Soporte de WKTV',
    'for help with device compatibility, login, playlists, or an existing subscription.': 'para recibir ayuda con la compatibilidad de dispositivos, el inicio de sesión, las listas de reproducción o una suscripción existente.',
    'Are lifetime plans available?': '¿Hay planes de por vida?',
    'Yes. Lifetime access is a one-time payment of $600 for one connection or $850 for five connections.': 'Sí. El acceso de por vida es un pago único de $600 por una conexión o $850 por cinco conexiones.',
    'Get lifetime · 1 connection': 'Obtén el plan de por vida de 1 conexión',
    'or': 'o',
    'lifetime · 5 connections': 'el de 5 conexiones',
    'Can I buy a streaming box with WKTV already set up?': '¿Puedo comprar una caja de streaming con WKTV ya configurado?',
    'Yes. Choose an ONN 4K Plus ($100 one-time setup & activation) or ONN 4K Pro ($150 one-time setup & activation), then add a plan: monthly at $30 for 1 connection, annual with 1 to 5 connections, or lifetime (1 or 5 connections) with $50 off the bundle. WKTV comes pre-installed and we ship it to you.': 'Sí. Elige un ONN 4K Plus ($100 de configuración y activación únicas) o un ONN 4K Pro ($150 de configuración y activación únicas) y agrega un plan: mensual por $30 con 1 conexión, anual con 1 a 5 conexiones, o de por vida (1 o 5 conexiones) con $50 de descuento en el paquete. WKTV viene preinstalado y te lo enviamos.',
    'See streaming boxes': 'Ver cajas de streaming',
    'Can I try it for a full month?': '¿Puedo probarlo un mes completo?',
    'Yes. The one-month trial is $20 for one connection.': 'Sí. La prueba de un mes cuesta $20 por una conexión.',
    'Start the one-month trial': 'Comienza la prueba de un mes',

    // final call to action
    'TAKE A LOOK AROUND FIRST': 'ECHA UN VISTAZO PRIMERO',
    'Meet your next movie night.': 'Conoce tu próxima noche de cine.',
    'Free for 24 hours with 2 connections. No credit card. Want longer?': 'Gratis por 24 horas con 2 conexiones. Sin tarjeta de crédito. ¿Quieres más tiempo?',
    'Try a full month for $20': 'Prueba un mes completo por $20',
    'Get your free 24-hour trial ↗': 'Obtén tu prueba gratuita de 24 horas ↗',

    // resellers
    'PARTNER WITH WKTV': 'SÉ SOCIO DE WKTV',
    'Become a reseller of our services.': 'Conviértete en revendedor de nuestros servicios.',
    'Want to offer WKTV to your own customers? Leave your details and we’ll reach out personally. No commitment.': '¿Quieres ofrecer WKTV a tus propios clientes? Déjanos tus datos y nos comunicaremos contigo personalmente. Sin compromiso.',
    'Request reseller info': 'Solicitar información para revendedores',
    'Fields marked * are required.': 'Los campos marcados con * son obligatorios.',
    'First name *': 'Nombre *',
    'Last name *': 'Apellido *',
    'Email *': 'Correo electrónico *',
    'Contact number': 'Número de contacto',
    '(optional)': '(opcional)',
    'Send my request': 'Enviar mi solicitud',
    'Send my request ↗': 'Enviar mi solicitud ↗',
    'We only use these details to contact you about becoming a reseller.': 'Solo usamos estos datos para contactarte sobre cómo ser revendedor.',
    'Thank you!': '¡Gracias!',
    'We’ve got your request. Someone from the WKTV team will reach out soon.': 'Recibimos tu solicitud. Alguien del equipo de WKTV se comunicará contigo pronto.',

    // footer + plan dialog
    'Make tonight a WKTV night.': 'Haz de esta noche una noche WKTV.',
    'Support ↗': 'Soporte ↗',
    'Facebook support group ↗': 'Grupo de soporte en Facebook ↗',
    'Close plan details': 'Cerrar detalles del plan',
    'YOUR WKTV PLAN': 'TU PLAN WKTV',
    'Next, sign in or create your WKTV account, then send payment. Your plan starts after WKTV confirms payment and activates service.': 'A continuación, inicia sesión o crea tu cuenta WKTV y envía el pago. Tu plan comienza cuando WKTV confirma el pago y activa el servicio.',
    'Continue ↗': 'Continuar ↗',
    '📦 You’ll enter your shipping address at checkout.': '📦 Ingresarás tu dirección de envío al pagar.',
    'Already a member? You’ll go straight to checkout once you’re signed in.': '¿Ya eres miembro? Irás directo al pago una vez que inicies sesión.',
    'Monthly — 1 connection': 'Mensual — 1 conexión',
    'Lifetime — 1 connection': 'De por vida — 1 conexión',
    'Lifetime — 5 connections': 'De por vida — 5 conexiones'
  };

  /* ---------- phrases with numbers/prices that other scripts fill in ---------- */
  function conn(n) { return n + (+n === 1 ? ' conexión' : ' conexiones'); }
  function screens(n) { return n + (+n === 1 ? ' pantalla' : ' pantallas'); }
  function per(u) { return u === 'month' ? 'mes' : 'año'; }
  var PATTERNS = [
    [/^Equivalent to (\$[\d.,]+)\/month · billed annually$/, function (m) { return 'Equivale a ' + m[1] + '/mes · facturado anualmente'; }],
    [/^(\$[\d.,]+) \/ screen \/ month$/, function (m) { return m[1] + ' / pantalla / mes'; }],
    [/^✓ (\d+) simultaneous streams?$/, function (m) { return '✓ ' + m[1] + (+m[1] === 1 ? ' transmisión simultánea' : ' transmisiones simultáneas'); }],
    [/^Choose (\d+) connections?$/, function (m) { return 'Elegir ' + conn(m[1]); }],
    [/^Annual — (\d+) connections?$/, function (m) { return 'Anual — ' + conn(m[1]); }],
    [/^(Annual|Lifetime|Monthly) · (\d+) connections?$/, function (m) { return { Annual: 'Anual', Lifetime: 'De por vida', Monthly: 'Mensual' }[m[1]] + ' · ' + conn(m[2]); }],
    [/^(\$[\d.,]+) \/ (month|year)$/, function (m) { return m[1] + ' / ' + per(m[2]); }],
    [/^(\$[\d.,]+) one-time$/, function (m) { return m[1] + ' pago único'; }],
    [/^Then (\$[\d.,]+)\/(month|year)\. The setup fee is one time only\. US shipping\.$/, function (m) { return 'Luego ' + m[1] + '/' + per(m[2]) + '. El cargo de configuración se paga una sola vez. Envío dentro de EE. UU.'; }],
    [/^from (\$[\d.,]+)$/, function (m) { return 'desde ' + m[1]; }],
    [/^Annual totals: (.*)$/, function (m) { return 'Totales anuales: ' + m[1]; }],
    [/^(.+) setup & activation$/, function (m) { return m[1] + ': configuración y activación'; }],
    [/^Order my box · (\$[\d.,]+)$/, function (m) { return 'Pedir mi caja · ' + m[1]; }],
    [/^(\d) screens? — (\$[\d.,]+)\/yr( · Best value)?$/, function (m) { return screens(m[1]) + ' — ' + m[2] + '/año' + (m[3] ? ' · Mejor valor' : ''); }],
    [/^(\d) screens? — (\$[\d.,]+) one-time( · Best lifetime value)?$/, function (m) { return screens(m[1]) + ' — ' + m[2] + ' pago único' + (m[3] ? ' · Mejor valor de por vida' : ''); }]
  ];

  var TITLE_ES = 'WKTV — TV en vivo, deportes y películas en streaming | Prueba gratis de 24 horas';
  var DESC_ES = 'Descubre el streaming de WKTV, los dispositivos compatibles y planes mensuales y anuales sencillos. Empieza con una prueba gratuita de 24 horas.';
  var origTitle = document.title;
  var descEl = document.querySelector('meta[name="description"]');
  var origDesc = descEl ? descEl.getAttribute('content') : '';

  var ATTRS = ['aria-label', 'title', 'placeholder', 'alt'];
  var textOrig = new WeakMap(), textDone = new WeakMap();
  var attrOrig = new WeakMap(); // element -> { attr: [english, spanish] }
  var SKIP = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, TEXTAREA: 1 };

  function norm(s) { return s.replace(/\s+/g, ' ').trim(); }
  function lookup(key) {
    if (Object.prototype.hasOwnProperty.call(DICT, key)) return DICT[key];
    for (var i = 0; i < PATTERNS.length; i++) {
      var m = PATTERNS[i][0].exec(key);
      if (m) return PATTERNS[i][1](m);
    }
    return null;
  }

  function trText(node) {
    var v = node.nodeValue;
    if (!/\S/.test(v) || textDone.get(node) === v) return;
    var es = lookup(norm(v));
    if (es == null) return;
    var out = v.match(/^\s*/)[0] + es + v.match(/\s*$/)[0];
    textOrig.set(node, v); textDone.set(node, out);
    node.nodeValue = out;
  }
  function trAttrs(el) {
    if (!el.getAttribute) return;
    for (var i = 0; i < ATTRS.length; i++) {
      var a = ATTRS[i], v = el.getAttribute(a);
      if (!v) continue;
      var rec = attrOrig.get(el); rec = rec && rec[a];
      if (rec && rec[1] === v) continue; // already ours
      var es = lookup(norm(v));
      if (es == null) continue;
      var all = attrOrig.get(el) || {}; all[a] = [v, es]; attrOrig.set(el, all);
      el.setAttribute(a, es);
    }
  }
  function eachText(scope, fn) {
    if (scope.nodeType === 3) { if (!scope.parentNode || !SKIP[scope.parentNode.nodeName]) fn(scope); return; }
    if (scope.nodeType !== 1) return;
    var w = document.createTreeWalker(scope, 4, null), n;
    while ((n = w.nextNode())) if (!SKIP[n.parentNode.nodeName]) fn(n);
  }
  function eachEl(scope, fn) {
    if (scope.nodeType !== 1) return;
    fn(scope);
    var l = scope.querySelectorAll('[aria-label],[title],[placeholder],[alt]');
    for (var i = 0; i < l.length; i++) fn(l[i]);
  }

  function toSpanish(scope) {
    eachText(scope, trText);
    eachEl(scope, trAttrs);
  }
  function toEnglish() {
    eachText(document.body, function (n) {
      if (textDone.has(n) && textDone.get(n) === n.nodeValue) { n.nodeValue = textOrig.get(n); textDone.delete(n); }
    });
    var l = document.querySelectorAll('[aria-label],[title],[placeholder],[alt]');
    for (var i = 0; i < l.length; i++) {
      var rec = attrOrig.get(l[i]);
      if (!rec) continue;
      for (var a in rec) if (l[i].getAttribute(a) === rec[a][1]) l[i].setAttribute(a, rec[a][0]);
      attrOrig.delete(l[i]);
    }
  }

  // Re-translate text that other scripts rewrite after the switch (prices, summaries, etc.)
  var mo = window.MutationObserver ? new MutationObserver(function (muts) {
    if (lang !== 'es') return;
    muts.forEach(function (m) {
      if (m.type === 'characterData') trText(m.target);
      else if (m.type === 'attributes') trAttrs(m.target);
      else for (var i = 0; i < m.addedNodes.length; i++) { toSpanish(m.addedNodes[i]); }
    });
    mo.takeRecords(); // ignore the changes we just made ourselves
  }) : null;

  var btn;
  function paintButton() {
    if (!btn) return;
    btn.setAttribute('data-lang', lang);
    btn.setAttribute('aria-label', lang === 'es' ? 'Cambiar a inglés' : 'Cambiar a español (Switch to Spanish)');
    btn.setAttribute('title', lang === 'es' ? 'English' : 'Español');
  }
  function setLang(next) {
    lang = next;
    root.setAttribute('lang', next);
    if (next === 'es') {
      document.title = TITLE_ES;
      if (descEl) descEl.setAttribute('content', DESC_ES);
      toSpanish(document.body);
    } else {
      document.title = origTitle;
      if (descEl) descEl.setAttribute('content', origDesc);
      toEnglish();
    }
    if (mo) mo.takeRecords();
    paintButton();
    try { localStorage.setItem(KEY, next); } catch (e) {}
  }

  function init() {
    var header = document.querySelector('header.wrap');
    if (header && !header.querySelector('.lang-toggle')) {
      btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'lang-toggle';
      btn.setAttribute('data-lang-toggle', '');
      btn.innerHTML = '<span data-l="en">EN</span><span data-l="es">ES</span>';
      var login = header.querySelector('.login');
      header.insertBefore(btn, login || null);
      btn.addEventListener('click', function () { setLang(lang === 'es' ? 'en' : 'es'); });
    } else if (header) { btn = header.querySelector('.lang-toggle'); }
    if (mo) mo.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
    paintButton();
    if (lang === 'es') setLang('es');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
