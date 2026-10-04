/* Rio a dois: anotações salvas no navegador (localStorage) */
(function(){
  var CHAVE = "rioadois:v1";
  function ler(){ try{ return JSON.parse(localStorage.getItem(CHAVE)) || {}; }catch(e){ return {}; } }
  function gravar(d){
    try{ localStorage.setItem(CHAVE, JSON.stringify(d)); return true; }
    catch(e){ return false; }
  }
  function doItem(d, slug){ return d[slug] || (d[slug] = {status:"", nota:0, data:"", comentario:"", fotos:[]}); }

  function indice(){
    var d = ler(), fomos = 0, quero = 0;
    document.querySelectorAll(".cartao").forEach(function(c){
      var n = d[c.dataset.slug], st = c.querySelector(".status");
      c.classList.remove("e-fomos","e-quero");
      if(!n || !n.status){ return; }
      c.classList.add("e-" + n.status);
      st.hidden = false;
      st.textContent = n.status === "fomos"
        ? "Já fomos" + (n.nota ? " " + "★".repeat(n.nota) : "")
        : "Queremos ir";
      if(n.status === "fomos") fomos++; else quero++;
    });
    var p = document.getElementById("progresso");
    if(fomos || quero){
      p.textContent = fomos + " de 40 já visitados" + (quero ? ", " + quero + " na lista de desejos" : "") + ".";
    }

    var filtro = "todos", busca = document.getElementById("busca");
    function aplicar(){
      var termo = busca.value.trim().toLowerCase(), algum = false;
      document.querySelectorAll(".secao").forEach(function(sec){
        var vis = 0;
        sec.querySelectorAll(".cartao").forEach(function(c){
          var ok = (!termo || c.dataset.texto.indexOf(termo) >= 0);
          if(filtro === "dia" || filtro === "noite") ok = ok && sec.dataset.periodo === filtro;
          if(filtro === "fomos") ok = ok && c.classList.contains("e-fomos");
          if(filtro === "quero") ok = ok && c.classList.contains("e-quero");
          c.hidden = !ok; if(ok) vis++;
        });
        sec.hidden = vis === 0; if(vis) algum = true;
      });
      document.getElementById("vazio").hidden = algum;
    }
    document.querySelectorAll(".abas button").forEach(function(b){
      b.addEventListener("click", function(){
        filtro = b.dataset.f;
        document.querySelectorAll(".abas button").forEach(function(x){ x.setAttribute("aria-pressed", x === b); });
        aplicar();
      });
    });
    busca.addEventListener("input", aplicar);

    var aviso = document.getElementById("aviso-backup");
    document.getElementById("exportar").addEventListener("click", function(){
      var blob = new Blob([JSON.stringify(ler(), null, 1)], {type:"application/json"});
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "rio-a-dois-anotacoes.json";
      document.body.appendChild(a); a.click(); a.remove();
      aviso.textContent = "Arquivo exportado.";
    });
    document.getElementById("importar").addEventListener("change", function(ev){
      var f = ev.target.files[0]; if(!f) return;
      var r = new FileReader();
      r.onload = function(){
        try{
          var novo = JSON.parse(r.result), atual = ler();
          Object.keys(novo).forEach(function(k){ atual[k] = novo[k]; });
          aviso.textContent = gravar(atual) ? "Anotações importadas." : "Não coube no armazenamento do navegador. Removam algumas fotos e tentem de novo.";
          indice();
        }catch(e){ aviso.textContent = "Esse arquivo não é um backup do Rio a dois."; }
      };
      r.readAsText(f);
    });
  }

  function item(){
    var slug = document.body.dataset.slug, d = ler(), n = doItem(d, slug);
    var salvo = document.getElementById("salvo"), t;
    function salvar(msg){
      d[slug] = n;
      if(gravar(d)){ salvo.textContent = msg || "Salvo."; }
      else { salvo.textContent = "Não foi possível salvar: o armazenamento do navegador está cheio. Removam algumas fotos."; }
      clearTimeout(t); t = setTimeout(function(){ salvo.textContent = ""; }, 2500);
    }
    // situação
    var sts = document.querySelectorAll(".status-escolha button");
    function pintaStatus(){ sts.forEach(function(b){ b.setAttribute("aria-checked", b.dataset.status === n.status); }); }
    sts.forEach(function(b){ b.addEventListener("click", function(){
      n.status = n.status === b.dataset.status ? "" : b.dataset.status; pintaStatus(); salvar();
    }); });
    pintaStatus();
    // estrelas
    var es = document.querySelectorAll(".estrelas button");
    function pintaNota(){ es.forEach(function(b){ var k = +b.dataset.nota; b.classList.toggle("on", k <= n.nota); b.setAttribute("aria-checked", k === n.nota); }); }
    es.forEach(function(b){ b.addEventListener("click", function(){
      var k = +b.dataset.nota; n.nota = n.nota === k ? 0 : k; pintaNota(); salvar();
    }); });
    pintaNota();
    // data e comentário
    var data = document.getElementById("data"), com = document.getElementById("comentario"), tt;
    data.value = n.data || ""; com.value = n.comentario || "";
    data.addEventListener("change", function(){ n.data = data.value; salvar(); });
    com.addEventListener("input", function(){ clearTimeout(tt); tt = setTimeout(function(){ n.comentario = com.value; salvar(); }, 500); });
    // fotos
    var gal = document.getElementById("galeria");
    function pintaFotos(){
      gal.innerHTML = "";
      (n.fotos || []).forEach(function(src, i){
        var fig = document.createElement("figure");
        var img = document.createElement("img"); img.src = src; img.alt = "Nossa foto " + (i+1);
        img.addEventListener("click", function(){
          var z = document.createElement("div"); z.className = "zoom";
          var zi = document.createElement("img"); zi.src = src; zi.alt = img.alt;
          z.appendChild(zi); z.addEventListener("click", function(){ z.remove(); }); document.body.appendChild(z);
        });
        var del = document.createElement("button"); del.textContent = "✕"; del.setAttribute("aria-label", "Remover foto " + (i+1));
        del.addEventListener("click", function(){ n.fotos.splice(i, 1); pintaFotos(); salvar("Foto removida."); });
        fig.appendChild(img); fig.appendChild(del); gal.appendChild(fig);
      });
    }
    function reduzir(file, cb){
      var r = new FileReader();
      r.onload = function(){
        var im = new Image();
        im.onload = function(){
          var max = 1100, s = Math.min(1, max / Math.max(im.width, im.height));
          var c = document.createElement("canvas"); c.width = Math.round(im.width*s); c.height = Math.round(im.height*s);
          c.getContext("2d").drawImage(im, 0, 0, c.width, c.height);
          cb(c.toDataURL("image/jpeg", 0.72));
        };
        im.src = r.result;
      };
      r.readAsDataURL(file);
    }
    document.getElementById("fotos").addEventListener("change", function(ev){
      var arqs = Array.prototype.slice.call(ev.target.files), faltam = arqs.length;
      n.fotos = n.fotos || [];
      arqs.forEach(function(f){ reduzir(f, function(url){
        n.fotos.push(url);
        if(--faltam === 0){ pintaFotos(); salvar(arqs.length > 1 ? "Fotos adicionadas." : "Foto adicionada."); }
      }); });
      ev.target.value = "";
    });
    pintaFotos();
  }

  window.RioADois = {indice:indice, item:item};
})();
