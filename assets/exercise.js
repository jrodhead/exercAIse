(function(){
  var statusEl = document.getElementById('status');
  function status(msg){ if(!statusEl) return; statusEl.textContent = msg || ''; }

  function qs(){
    var q = {}; var s = String(window.location.search||'').replace(/^\?/, '').split('&');
    for (var i=0;i<s.length;i++){ var kv = s[i].split('='); if (kv[0]) q[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1]||''); }
    return q;
  }
  function xhrGet(path, cb){
    try{ var r=new XMLHttpRequest(); r.open('GET', path, true); r.onreadystatechange=function(){ if(r.readyState===4){ if(r.status>=200&&r.status<300) cb(null,r.responseText); else cb(new Error('HTTP '+r.status+' for '+path)); } }; r.send(); }catch(e){ cb(e);} }

  function parseMarkdownLink(text){
    // Parse simple markdown links: [text](url)
    var linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    return text.replace(linkRegex, function(match, linkText, url) {
      // Clean up the URL - remove any ../ patterns and normalize
      var cleanUrl = url.replace(/\.\.\//g, '');
      // If the URL doesn't start with exercises/, add it
      var fullUrl = cleanUrl.indexOf('exercises/') === 0 ? cleanUrl : 'exercises/' + cleanUrl;
      return '<a href="exercise.html?file=' + fullUrl + '">' + linkText + '</a>';
    });
  }

  function renderExercise(data){
    var nameEl = document.getElementById('ex-name');
    var metaEl = document.getElementById('meta');
    var cuesEl = document.getElementById('cues');
    var safetyEl = document.getElementById('safety');
    var varsEl = document.getElementById('variations');
  var setupEl = document.getElementById('setup');
  var stepsEl = document.getElementById('steps');
  var mistakesEl = document.getElementById('mistakes');
  var regEl = document.getElementById('regressions');
  var progEl = document.getElementById('progressions');
  var phEl = document.getElementById('phints');
  var jointsEl = document.getElementById('joints');
  var mediaEl = document.getElementById('media');
    if (nameEl) nameEl.textContent = data.name || 'Exercise';
    // Meta badges
    var html = '';
    if (data.equipment && data.equipment.length){
      html += '<div><span class="muted">Equipment:</span> ' + data.equipment.map(function(e){return '<span class="pill">'+e+'</span>';}).join(' ') + '</div>';
    }
    if (data.tags && data.tags.length){
      html += '<div><span class="muted">Tags:</span> ' + data.tags.map(function(e){return '<span class="badge">'+e+'</span>';}).join(' ') + '</div>';
    }
    if (metaEl) metaEl.innerHTML = html;
    // Setup
    if (setupEl){ setupEl.innerHTML=''; if (data.setup && data.setup.length){ for (var i=0;i<data.setup.length;i++){ var li=document.createElement('li'); li.textContent=data.setup[i]; setupEl.appendChild(li);} } else { setupEl.innerHTML='<li class="muted">—</li>'; } }
    // Steps
    if (stepsEl){ stepsEl.innerHTML=''; if (data.steps && data.steps.length){ for (var i2=0;i2<data.steps.length;i2++){ var oli=document.createElement('li'); oli.textContent=data.steps[i2]; stepsEl.appendChild(oli);} } else { stepsEl.innerHTML='<li class="muted">—</li>'; } }
    // Cues
    cuesEl.innerHTML='';
    if (data.cues && data.cues.length){ for (var i=0;i<data.cues.length;i++){ var li=document.createElement('li'); li.textContent=data.cues[i]; cuesEl.appendChild(li);} } else { cuesEl.innerHTML='<li class="muted">No cues provided.</li>'; }
    // Safety
    safetyEl.textContent = data.safety || '—';
    // Mistakes
    if (mistakesEl){ mistakesEl.innerHTML=''; if (data.mistakes && data.mistakes.length){ for (var mi=0; mi<data.mistakes.length; mi++){ var mli=document.createElement('li'); mli.textContent=data.mistakes[mi]; mistakesEl.appendChild(mli);} } else { mistakesEl.innerHTML='<li class="muted">—</li>'; } }
    // Variations
    varsEl.innerHTML='';
    if (data.variations && data.variations.length){ for (var j=0;j<data.variations.length;j++){ var vli=document.createElement('li'); vli.innerHTML=parseMarkdownLink(data.variations[j]); varsEl.appendChild(vli);} } else { varsEl.innerHTML='<li class="muted">—</li>'; }
    // Scaling
    if (regEl || progEl){
      if (regEl){ regEl.innerHTML=''; var regs=(data.scaling&&data.scaling.regressions)||[]; if (regs.length){ for (var r=0;r<regs.length;r++){ var rli=document.createElement('li'); rli.textContent=regs[r]; regEl.appendChild(rli);} } else { regEl.innerHTML='<li class="muted">—</li>'; } }
      if (progEl){ progEl.innerHTML=''; var progs=(data.scaling&&data.scaling.progressions)||[]; if (progs.length){ for (var p=0;p<progs.length;p++){ var pli=document.createElement('li'); pli.textContent=progs[p]; progEl.appendChild(pli);} } else { progEl.innerHTML='<li class="muted">—</li>'; } }
    }
    // Prescription Hints
    if (phEl){
      phEl.innerHTML='';
      var ph = data.prescriptionHints || {};
      var pairs = [];
      function addHint(k,label){ if (ph && ph[k]) pairs.push('<li><span class="muted">'+label+':</span> '+ph[k]+'</li>'); }
      addHint('load','Load'); addHint('reps','Reps'); addHint('time','Time'); addHint('distance','Distance'); addHint('rpe','RPE'); addHint('notes','Notes');
      phEl.innerHTML = pairs.length ? pairs.join('') : '<li class="muted">—</li>';
    }
    // Joints
    if (jointsEl){
      var jhtml='';
      if (data.joints){
        if (data.joints.sensitiveJoints && data.joints.sensitiveJoints.length){ jhtml += '<div><span class="muted">Sensitive:</span> ' + data.joints.sensitiveJoints.join(', ') + '</div>'; }
        if (data.joints.notes){ jhtml += '<div>'+data.joints.notes+'</div>'; }
      }
      jointsEl.innerHTML = jhtml || '<div class="muted">—</div>';
    }
    // Media
    if (mediaEl){
      var mhtml='';
      if (data.media){
        if (data.media.video){ mhtml += '<div><a href="'+data.media.video+'" target="_blank">Video</a></div>'; }
        if (data.media.images && data.media.images.length){ for (var im=0; im<data.media.images.length; im++){ var src=data.media.images[im]; mhtml += '<img alt="exercise image" style="max-width:100%;height:auto;margin:4px 0;" src="'+src+'" />'; } }
      }
      mediaEl.innerHTML = mhtml || '<div class="muted">—</div>';
    }
  }

  function getRepoApiBase(){ return 'https://api.github.com/repos/jrodhead/exercAIse/contents/'; }

  function loadHistory(exKey){
    // Accept multiple key variants to match performed logs (which use hyphens via app slugify)
    function keyVariants(k){
      var a = [];
      var k1 = String(k||'');
      var k2 = k1.replace(/_/g, '-');
      var k3 = k1.replace(/-/g, '_');
      a.push(k1);
      if (a.indexOf(k2) === -1) a.push(k2);
      if (a.indexOf(k3) === -1) a.push(k3);
      return a;
    }
    var variants = keyVariants(exKey);
    var target = document.getElementById('history');
    if (!target) return;
    target.textContent = 'Loading history…';
    // Fetch directory listing
    var url = getRepoApiBase() + 'performed?ref=main';
    xhrGet(url, function(err, text){
      if (err) { target.textContent = 'Unable to load history.'; return; }
      var items=[]; try{ items=JSON.parse(text);}catch(e){ items=[]; }
      if (!items || Object.prototype.toString.call(items) !== '[object Array]'){ target.textContent = 'No history.'; return; }
      // Load each JSON (show all for now per requirements)
      var logs = [];
      var remaining = 0;
      function done(){
        // Render logs for this exKey
        var html = '';
        // Sort newest first by filename prefix (timestamp)
        logs.sort(function(a,b){ return a.name < b.name ? 1 : -1; });
        for (var i=0;i<logs.length;i++){
          var data = logs[i].data; if (!data || !data.exercises) continue;
          var ex = null;
          for (var v=0; v<variants.length; v++){
            if (data.exercises.hasOwnProperty(variants[v])) { ex = data.exercises[variants[v]]; break; }
          }
          if (!ex || !ex.sets || !ex.sets.length) continue;
          var when = data.timestamp || logs[i].name.slice(0, 24);
          html += '<div class="history-item">' +
                  '<div class="muted mono">' + when + '</div>' +
                  '<div>' + ex.sets.map(function(s){
                    var parts=[]; if (s.weight!=null){ parts.push((s.weight)+(s.multiplier!=null?(' ×'+s.multiplier):'')); }
                    if (s.reps!=null){ parts.push(s.reps + ' reps'); }
                    if (s.timeSeconds!=null){ parts.push((s.timeSeconds)+'s'); }
                    if (s.distanceMiles!=null){ parts.push(s.distanceMiles+' mi'); }
                    if (s.rpe!=null){ parts.push('RPE '+s.rpe); }
                    return parts.join(', ');
                  }).join(' | ') + '</div>' +
                  '</div>';
        }
        target.innerHTML = html || '<div class="muted">No history for this exercise yet.</div>';
      }
      // Start loads
      for (var k=0;k<items.length;k++){
        var it = items[k]; if (!it || it.type !== 'file' || !/\.json$/i.test(it.name)) continue;
        remaining++;
        (function(it){
          xhrGet(it.download_url, function(err2, txt){
            try{
              var data = err2 ? null : JSON.parse(txt || '{}');
              logs.push({ name: it.name, data: data });
            } catch(e){}
            remaining--; if (remaining===0) done();
          });
        })(it);
      }
      if (remaining===0) done();
    });
  }

  function slugify(s){ return String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,''); }

  function showNotFound(path){
    try{
      var main = document.getElementById('main');
      var nf = document.getElementById('not-found');
      var nfPath = document.getElementById('nf-path');
      if (nfPath) nfPath.textContent = path || '';
      if (main) main.style.display = 'none';
      if (nf) nf.style.display = 'block';
      status('');
    } catch(e){}
  }

  function isInternalExercisePath(p){
    if (!p) return false;
    if (/^https?:/i.test(p)) return false;
    return /^(?:\.?\.?\/)?exercises\/[\w\-]+\.(?:json|md)$/i.test(p);
  }

  function start(){
    var params = qs();
    var path = params.file || '';
    if (!path){ status('Missing ?file=exercises/<name>.json'); return; }
    if (!isInternalExercisePath(path)) { showNotFound(path); return; }
    // Normalize and compute key
  var base = path.split('/').pop();
  var key = base.replace(/\.json$/i, '');
  // Normalize to hyphenated slug to match logger keys
  key = key.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase();
    // Load JSON file directly
    xhrGet(path, function(err, text){
      if (!err) {
        try{
          var data = JSON.parse(text||'{}');
          renderExercise(data);
          loadHistory(key);
          return;
        } catch(e) {}
      }
      // Fallback to markdown if JSON not found yet
      var mdPath = path.replace(/\.json$/i, '.md');
      xhrGet(mdPath, function(err2, md){
        if (err2) { showNotFound(path); return; }
        // Naive parse: title = first H1, list items under cues; everything else minimal
        var name = (md.match(/^#\s+(.+)$/m)||[])[1] || key.replace(/-/g,' ');
        var cues = [];
        var li;
        var re = /^-\s+(.*)$/gm;
        while ((li = re.exec(md))) { cues.push(li[1]); }
        var data = { name: name, equipment: [], tags: [], cues: cues.slice(0,8), safety: '', variations: [] };
        renderExercise(data);
        loadHistory(key);
      });
    });
  }

  // kickoff
  start();
})();
