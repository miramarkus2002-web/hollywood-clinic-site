/* ═══════════════════════════════════════════════════════════════════
   HOLLYWOOD CLINIC — dynamic content
   Renders site sections from the database when available, and falls
   back to the hardcoded HTML if the DB is unreachable or empty.
   Currently powers: homepage doctors section.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  function esc(s){ return (s==null?'':String(s)).replace(/[&<>"]/g,function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  function lang(){ return (window.I18N && window.I18N.current && window.I18N.current()) || 'en'; }
  function tr(key, fallback){ try{ if(window.I18N && window.I18N.t){ var v=window.I18N.t(key);
    if(v && v!==key) return v; } }catch(e){} return fallback; }

  // ── Homepage doctors ──────────────────────────────────────────────
  var row = document.getElementById('doctorsRow');
  var DOCTORS = null;

  function card(d){
    var l = lang();
    var name = (l==='ar' && d.name_ar) ? d.name_ar : d.name_en;
    var role = (l==='ar' && d.specialty_ar) ? d.specialty_ar : (d.specialty_en || '');
    var img  = (d.image_url || ('assets/images/doctors/'+d.slug+'.jpg')).replace(/\.(png|webp)$/i, '.jpg');
    var view = tr('doctors.viewprofile','View Profile');
    var href = d.page_url || ('doctors/profile.html?slug='+encodeURIComponent(d.slug));
    return '<a href="'+esc(href)+'" class="doctor-home-card">'+
      '<div class="doctor-home-photo"><img src="'+esc(img)+'" alt="'+esc(name)+'" loading="lazy"></div>'+
      '<div class="doctor-home-body"><h3>'+esc(name)+'</h3><p>'+esc(role)+'</p>'+
      '<span class="doctor-home-link">'+esc(view)+'</span></div></a>';
  }
  function renderDoctors(){ if(!row || !DOCTORS || !DOCTORS.length) return;
    row.innerHTML = DOCTORS.map(card).join(''); }
  function loadDoctors(){
    if(!row || !(window.HC && window.HC.db)) return;
    window.HC.db.from('doctors').select('*').eq('is_active',true)
      .order('sort_order',{ascending:true}).then(function(r){
        if(r.error || !r.data || !r.data.length) return;  // keep hardcoded fallback
        DOCTORS = r.data; renderDoctors();
      });
  }

  if(window.HC && window.HC.db) loadDoctors();
  document.addEventListener('hc:db-ready', loadDoctors);
  document.addEventListener('i18n:applied', function(){ if(DOCTORS) renderDoctors(); });

  // ── Treatment umbrella sub-grids: append dashboard-added services ──
  var subGrid=document.querySelector('.dept-services-grid, .sub-treatments-grid');
  if(subGrid){
    var CAT=null, path=location.pathname;
    ['body-shaping','skin-rejuvenation','hair-restoration','laser','votiva','surgery'].forEach(function(c){
      if(path.indexOf(c)>=0 && !CAT) CAT=c; });
    var ADDED=null;
    function addedCard(s){
      var l=lang();
      var name=(l==='ar'&&s.name_ar)?s.name_ar:s.name_en;
      var c=s.content||{};
      var desc=(l==='ar'&&c.ar&&c.ar.about_short)?c.ar.about_short:((c.en&&c.en.about_short)||'');
      var img=s.hero_image_url||(c&&c.hero_image_url)||''; if(img && !/^https?:|^\//.test(img)) img='../'+img;
      var href='service.html?slug='+encodeURIComponent(s.slug);
      var rm=tr('services.readmore','Read More');
      return '<a href="'+esc(href)+'" class="sub-card fade-up visible" data-added-svc>'+
        '<div class="sub-card-image">'+(img?'<img src="'+esc(img)+'" alt="'+esc(name)+'" loading="lazy">':'')+'</div>'+
        '<div class="sub-card-body"><h3>'+esc(name)+'</h3><p>'+esc(desc)+'</p>'+
        '<span class="sub-card-link">'+esc(rm)+'</span></div></a>';
    }
    function renderAdded(){ if(!ADDED) return;
      Array.prototype.slice.call(subGrid.querySelectorAll('[data-added-svc]')).forEach(function(el){el.remove();});
      if(ADDED.length) subGrid.insertAdjacentHTML('beforeend', ADDED.map(addedCard).join('')); }
    function loadAdded(){ if(!CAT||!(window.HC&&window.HC.db)) return;
      window.HC.db.from('service_pages').select('*').eq('category',CAT).eq('is_active',true)
        .order('sort_order',{ascending:true}).then(function(r){
          if(r.error||!r.data) return; ADDED=r.data; renderAdded(); }); }
    if(window.HC&&window.HC.db) loadAdded();
    document.addEventListener('hc:db-ready', loadAdded);
    document.addEventListener('i18n:applied', function(){ if(ADDED) renderAdded(); });
  }

  // ── Homepage "Every Service We Offer": order + visibility follow the dashboard ──
  // The static cards stay as the fallback; when the DB is reachable we re-order them to
  // match `treatments.sort_order`, hide any marked inactive, and append dashboard-added services.
  var allRow=document.querySelector('#all-services .treatment-cards');
  if(allRow){
    var SVC=null, SVC_ADDED=null;
    // "treatments/skin-rejuvenation/botox.html" -> "skin-rejuvenation/botox"
    function svcKey(u){
      if(!u) return '';
      return String(u).replace(/^\.\.\//,'').replace(/^\.\//,'').replace(/^\//,'')
        .replace(/^treatments\//,'').replace(/[?#].*$/,'').replace(/\.html$/,'').toLowerCase();
    }
    function svcAddedCard(s){
      var l=lang();
      var name=(l==='ar'&&s.name_ar)?s.name_ar:s.name_en;
      var c=s.content||{};
      var desc=(l==='ar'&&c.ar&&c.ar.about_short)?c.ar.about_short:((c.en&&c.en.about_short)||'');
      var img=s.hero_image_url||(c&&c.hero_image_url)||'';
      var href='treatments/service.html?slug='+encodeURIComponent(s.slug);
      var rm=tr('services.readmore','Read More');
      return '<a href="'+esc(href)+'" class="card fade-up visible" data-added-svc>'+
        '<div class="card-image">'+(img?'<img src="'+esc(img)+'" alt="'+esc(name)+'" style="width:100%;height:100%;object-fit:cover" loading="lazy">':'')+'</div>'+
        '<div class="card-body"><h3>'+esc(name)+'</h3><p>'+esc(desc)+'</p>'+
        '<span class="card-link">'+esc(rm)+'</span></div></a>';
    }
    function applySvcOrder(){
      if(!SVC) return;
      var cards=Array.prototype.slice.call(allRow.querySelectorAll('a.card:not([data-added-svc])'));
      var queue={};                                   // key -> [elements] (surgery cards share one href)
      cards.forEach(function(a){
        var k=svcKey(a.getAttribute('href'));
        (queue[k]=queue[k]||[]).push(a);
      });
      var moved=[], placed={};
      SVC.forEach(function(t){
        var k=svcKey(t.page_url||t.slug);
        var q=queue[k];
        if(q && q.length){
          var el=q.shift();
          placed[k]=el;
          el.style.display=(t.is_active===false)?'none':'';
          allRow.appendChild(el);                     // re-append in the dashboard's order
          moved.push(el);
        } else if(placed[k]){
          // several services share one card (e.g. the merged Cosmetic Surgery card)
          // → keep that card visible as long as ANY of them is active
          if(t.is_active!==false) placed[k].style.display='';
        }
      });
      // anything the dashboard didn't list keeps its relative order, after the ordered ones
      cards.forEach(function(a){ if(moved.indexOf(a)<0) allRow.appendChild(a); });
      pinSurgeryLast();
    }
    // the merged Cosmetic Surgery card always sits at the very end of the row
    function pinSurgeryLast(){
      var surg=allRow.querySelector('a.card[data-svc-cat="surgery"]');
      if(surg) allRow.appendChild(surg);
    }
    function renderSvcAdded(){
      if(!SVC_ADDED) return;
      Array.prototype.slice.call(allRow.querySelectorAll('[data-added-svc]')).forEach(function(el){el.remove();});
      if(SVC_ADDED.length) allRow.insertAdjacentHTML('beforeend', SVC_ADDED.map(svcAddedCard).join(''));
      pinSurgeryLast();
    }
    function loadAllServices(){
      if(!(window.HC&&window.HC.db)) return;
      window.HC.db.from('treatments').select('*').order('sort_order',{ascending:true}).then(function(r){
        if(r.error||!r.data) return; SVC=r.data; applySvcOrder();
      });
      window.HC.db.from('service_pages').select('*').eq('is_active',true)
        .order('sort_order',{ascending:true}).then(function(r){
          if(r.error||!r.data) return; SVC_ADDED=r.data; renderSvcAdded();
        });
    }
    if(window.HC&&window.HC.db) loadAllServices();
    document.addEventListener('hc:db-ready', loadAllServices);
    document.addEventListener('i18n:applied', function(){ if(SVC_ADDED) renderSvcAdded(); });
  }

  // ── Treatments overview: append dashboard-added departments ──
  var depGrid=document.querySelector('[data-departments-grid]');
  if(depGrid){
    var DEPTS=null;
    function deptCard(d){
      var l=lang();
      var name=(l==='ar'&&d.name_ar)?d.name_ar:d.name_en;
      var desc=(l==='ar'&&d.description_ar)?d.description_ar:(d.description_en||'');
      var img=d.image_url||'';
      var href=d.page_url||('treatments/department.html?slug='+encodeURIComponent(d.slug));
      var rm=tr('services.readmore','Read More');
      return '<a href="'+esc(href)+'" class="sub-card fade-up visible" data-added-dept>'+
        '<div class="sub-card-image">'+(img?'<img src="'+esc(img)+'" alt="'+esc(name)+'" loading="lazy">':'')+'</div>'+
        '<div class="sub-card-body"><h3>'+esc(name)+'</h3><p>'+esc(desc)+'</p>'+
        '<span class="sub-card-link">'+esc(rm)+'</span></div></a>';
    }
    function renderDepts(){ if(!DEPTS) return;
      Array.prototype.slice.call(depGrid.querySelectorAll('[data-added-dept]')).forEach(function(el){el.remove();});
      if(DEPTS.length) depGrid.insertAdjacentHTML('beforeend', DEPTS.map(deptCard).join('')); }
    function loadDepts(){ if(!(window.HC&&window.HC.db)) return;
      window.HC.db.from('departments').select('*').eq('is_active',true)
        .order('sort_order',{ascending:true}).then(function(r){
          if(r.error||!r.data) return;
          DEPTS=r.data.filter(function(d){return d.page_url && d.page_url.indexOf('department.html?slug=')>=0;});
          renderDepts(); }); }
    if(window.HC&&window.HC.db) loadDepts();
    document.addEventListener('hc:db-ready', loadDepts);
    document.addEventListener('i18n:applied', function(){ if(DEPTS) renderDepts(); });
  }

  // ── Site copy overrides (edit text from the dashboard) ────────────
  function applySiteCopy(){
    if(!(window.HC&&window.HC.db)) return;
    window.HC.db.from('site_content').select('*').then(function(r){
      if(r.error||!r.data) return;
      var l=lang();
      r.data.forEach(function(row){
        var val=(l==='ar')?row.value_ar:row.value_en;
        if(val==null||val==='') return;
        // Safeguard: a saved override must match the language being shown. If we're
        // in English but the value contains Arabic letters, it's a data-entry mistake
        // in the dashboard — skip it and keep the correct i18n translation.
        if(l==='en' && /[\u0600-\u06FF]/.test(val)) return;
        var sel='[data-i18n="'+String(row.key).replace(/["\\]/g,'')+'"]';
        document.querySelectorAll(sel).forEach(function(el){ el.textContent=val; });
      });
    });
  }
  if(window.HC&&window.HC.db) applySiteCopy();
  document.addEventListener('hc:db-ready', applySiteCopy);
  document.addEventListener('i18n:applied', applySiteCopy);
})();
