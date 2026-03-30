// selector-sb.js — Supabase sync para Foro 7
// Slug: xv-anos-renata | Storage key: renata_xv_photo_selections
(function () {
    const SUPABASE_URL  = 'https://nzpujmlienzfetqcgsxz.supabase.co';
    const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56cHVqbWxpZW56ZmV0cWNnc3h6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2ODYzMzYsImV4cCI6MjA5MDI2MjMzNn0.xl3lsb-KYj5tVLKTnzpbsdEGoV9ySnswH4eyRuyEH1s';
    const EVENTO_SLUG   = 'xv-anos-renata';
    const SB_KEY        = 'renata_xv_photo_selections';
    const SB_H = { 'apikey': SUPABASE_ANON, 'Authorization': 'Bearer ' + SUPABASE_ANON, 'Content-Type': 'application/json' };

    const SESSION_KEY = 'foro7_sid';
    let sid = localStorage.getItem(SESSION_KEY);
    if (!sid) { sid = crypto.randomUUID(); localStorage.setItem(SESSION_KEY, sid); }

    let eventoId   = null;
    let sbOk       = true;
    let _syncing   = false;
    let _syncTimer = null;

    async function getEventoId() {
        if (eventoId) return eventoId;
        const r = await fetch(SUPABASE_URL + '/rest/v1/eventos?slug=eq.' + EVENTO_SLUG + '&select=id&limit=1', { headers: SB_H });
        const rows = await r.json();
        eventoId = rows[0] ? rows[0].id : null;
        return eventoId;
    }

    async function sbSync(sels) {
        if (!sbOk) return;
        try {
            const eid = await getEventoId();
            if (!eid) return;
            await fetch(SUPABASE_URL + '/rest/v1/selecciones?evento_id=eq.' + eid, { method: 'DELETE', headers: SB_H });
            const entries = Object.entries(sels);
            if (!entries.length) return;
            const rows = entries.map(function(e) {
                var idx = e[0], sel = e[1];
                return {
                    evento_id: eid, session_id: sid,
                    foto_index: parseInt(idx),
                    impresion:  sel.impresion  || false,
                    invitacion: sel.invitacion || false,
                    descartada: sel.descartada || false,
                    ampliacion: sel.ampliacion || false,
                    datos: sel
                };
            });
            await fetch(SUPABASE_URL + '/rest/v1/selecciones', {
                method: 'POST',
                headers: Object.assign({}, SB_H, { 'Prefer': 'return=minimal' }),
                body: JSON.stringify(rows)
            });
        } catch(e) { sbOk = false; }
    }

    async function sbLoad(isPoll) {
        if (!sbOk) return;
        try {
            const eid = await getEventoId();
            if (!eid) return;
            const r = await fetch(
                SUPABASE_URL + '/rest/v1/selecciones?evento_id=eq.' + eid + '&select=foto_index,datos,impresion,invitacion,descartada,ampliacion',
                { headers: SB_H }
            );
            const rows = await r.json();
            const sb = {};
            rows.forEach(function(row) {
                var sel = (row.datos && Object.keys(row.datos).length)
                    ? row.datos
                    : { impresion: row.impresion, invitacion: row.invitacion, descartada: row.descartada, ampliacion: row.ampliacion };
                if (Object.values(sel).some(function(v){ return v; })) sb[row.foto_index] = sel;
            });

            var merged;
            if (isPoll) {
                merged = sb;
            } else {
                var local = {};
                try { local = JSON.parse(localStorage.getItem(SB_KEY) || '{}'); } catch(e) {}
                merged = Object.assign({}, sb);
                Object.entries(local).forEach(function(e) {
                    if (Object.values(e[1]).some(function(v){ return v; })) merged[e[0]] = e[1];
                });
            }

            _syncing = true;
            try {
                localStorage.setItem(SB_KEY, JSON.stringify(merged));
                if (typeof loadSelections === 'function') loadSelections();
            } finally { _syncing = false; }

            if (!isPoll) {
                if (Object.keys(merged).length) sbSync(merged).catch(function(){});
                sbRegistrarVisita();
                mostrarBanner(merged);
            }
        } catch(e) { sbOk = false; }
    }

    async function sbRegistrarVisita() {
        try {
            const eid = await getEventoId();
            if (!eid) return;
            await fetch(SUPABASE_URL + '/rest/v1/visitas', {
                method: 'POST',
                headers: Object.assign({}, SB_H, { 'Prefer': 'return=minimal' }),
                body: JSON.stringify({ evento_id: eid, pagina: 'selector', session_id: sid })
            });
        } catch(e) {}
    }

    function mostrarBanner(sels) {
        if (document.getElementById('banner-sin-sel')) return;
        if (Object.keys(sels).length > 0) return;
        var cfg = window.CONFIG || window.LIMITS || {};
        var fecha = cfg.fechaEvento || cfg.fecha;
        if (fecha && new Date(fecha) > new Date()) return;
        var banner = document.createElement('div');
        banner.id = 'banner-sin-sel';
        banner.style.cssText = 'background:#78350f;color:#fcd34d;text-align:center;padding:12px 20px;font-size:.88rem;position:sticky;top:0;z-index:200;line-height:1.5;';
        banner.innerHTML = '\uD83D\uDCF8 <strong>\u00a1Tus fotos est\u00e1n listas!</strong> A\u00fan no has seleccionado ninguna. \u00a1Empieza ahora! <button onclick="this.parentElement.remove()" style="margin-left:12px;background:transparent;border:1px solid #fcd34d;color:#fcd34d;padding:1px 8px;border-radius:4px;cursor:pointer;">\u00d7</button>';
        document.body.insertBefore(banner, document.body.firstChild);
    }

    // Parchear localStorage para detectar guardados
    var _origSet = localStorage.setItem.bind(localStorage);
    localStorage.setItem = function(key, value) {
        _origSet(key, value);
        if (key === SB_KEY && !_syncing) {
            clearTimeout(_syncTimer);
            _syncTimer = setTimeout(function() {
                try { sbSync(JSON.parse(value)); } catch(e) {}
            }, 600);
        }
    };

    // Swipe en modal
    function addSwipe() {
        var modal = document.getElementById('photoModal') ||
                    document.querySelector('.photo-modal,.modal-overlay,[id*="modal"],[class*="modal"]');
        if (!modal || modal._sbSwipe) return;
        modal._sbSwipe = true;
        var tx = 0;
        modal.addEventListener('touchstart', function(e) { tx = e.touches[0].clientX; }, { passive: true });
        modal.addEventListener('touchend', function(e) {
            var dx = e.changedTouches[0].clientX - tx;
            if (Math.abs(dx) < 50) return;
            var next = document.getElementById('nextPhoto') ||
                       document.querySelector('[id*="next"],[onclick*="next"],[onclick*="siguiente"],[class*="next"]');
            if (dx > 0) {
                var save = document.getElementById('btnGuardar') ||
                           document.querySelector('[id*="guardar"],[id*="save"],[onclick*="guardar"],[onclick*="save"],[class*="guardar"]');
                if (save) save.click();
            } else {
                var clear = document.getElementById('btnLimpiar') ||
                            document.querySelector('[id*="limpiar"],[id*="clear"],[onclick*="limpiar"],[onclick*="clear"],[class*="limpiar"]');
                if (clear) clear.click();
            }
            if (next) setTimeout(function(){ next.click(); }, 60);
        }, { passive: true });
    }

    document.addEventListener('DOMContentLoaded', function() {
        sbLoad(false);
        setInterval(function() {
            var open = window.modalOpen ||
                document.querySelector('.modal[style*="block"],.modal.active,.modal.show,#photoModal[style*="flex"],#photoModal[style*="block"]');
            if (!open) sbLoad(true);
        }, 30000);
        document.addEventListener('click', function() { setTimeout(addSwipe, 200); }, { passive: true });
    });
})();
