(function(){
  const cv = document.getElementById("heroArt"); if(!cv) return;
  const ctx = cv.getContext("2d");
  function rng(seed){ return () => (seed = (seed*16807) % 2147483647) / 2147483647; }
  function draw(){
    const r = cv.getBoundingClientRect(); const dpr = Math.min(window.devicePixelRatio||1, 2);
    const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
    cv.width = w*dpr; cv.height = h*dpr; ctx.setTransform(dpr,0,0,dpr,0,0);
    const R = rng(97);
    const hz = h*0.5;              // horizon
    // Dusk sky
    let g = ctx.createLinearGradient(0,0,0,hz);
    g.addColorStop(0,"#081826"); g.addColorStop(.45,"#173E52"); g.addColorStop(.8,"#B9774A"); g.addColorStop(1,"#F0B866");
    ctx.fillStyle = g; ctx.fillRect(0,0,w,hz+2);
    // Low sun glow
    g = ctx.createRadialGradient(w*.74,hz,0,w*.74,hz,h*.55);
    g.addColorStop(0,"rgba(255,214,140,.9)"); g.addColorStop(.25,"rgba(245,170,90,.35)"); g.addColorStop(1,"rgba(245,170,90,0)");
    ctx.fillStyle = g; ctx.fillRect(0,0,w,hz);
    // Stars
    ctx.fillStyle = "rgba(255,255,255,.55)";
    for(let i=0;i<60;i++){ const x=R()*w, y=R()*hz*.4; ctx.fillRect(x,y,1,1); }
    // Crescent moon
    ctx.fillStyle="#F6E7C2"; ctx.beginPath(); ctx.arc(w*.9,h*.13,h*.035,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="#0B1E2D"; ctx.beginPath(); ctx.arc(w*.9+h*.014,h*.13-h*.008,h*.032,0,Math.PI*2); ctx.fill();
    // Skyline silhouette
    const sky = "#0E1C22"; ctx.fillStyle = sky;
    let x = 0;
    while(x < w){
      const bw = 14 + R()*38, bh = h*(.03 + R()*.12);
      ctx.fillRect(x, hz-bh, bw+1, bh+2);
      if(R() > .8){ ctx.fillRect(x+bw*.45, hz-bh-h*.05, 2, h*.05); }
      x += bw;
    }
    // Mosque: dome + minarets
    const mx = w*.3, my = hz, dr = h*.07;
    ctx.fillRect(mx-dr*1.5, my-dr*.9, dr*3, dr*.9+2);
    ctx.beginPath(); ctx.arc(mx, my-dr*.9, dr, Math.PI, 0); ctx.fill();
    ctx.fillRect(mx-1, my-dr*1.9-h*.03, 2, h*.03);
    [[-1],[1]].forEach(([s])=>{ const px = mx + s*dr*2; const ph = h*.24;
      ctx.fillRect(px-4, my-ph, 8, ph+2);
      ctx.beginPath(); ctx.moveTo(px-6,my-ph); ctx.lineTo(px,my-ph-h*.035); ctx.lineTo(px+6,my-ph); ctx.fill();
      ctx.fillRect(px-7, my-ph*.7, 14, 3);
    });
    // Tall tower with spire
    const tx = w*.58, th = h*.34;
    ctx.beginPath(); ctx.moveTo(tx-16,hz); ctx.lineTo(tx-9,hz-th); ctx.lineTo(tx-1,hz-th-h*.09); ctx.lineTo(tx+1,hz-th-h*.09); ctx.lineTo(tx+9,hz-th); ctx.lineTo(tx+16,hz); ctx.fill();
    // Stadium stands (a bowl)
    const standTop = hz + h*.02, standBot = h*.7;
    g = ctx.createLinearGradient(0,standTop,0,standBot);
    g.addColorStop(0,"#1A2226"); g.addColorStop(1,"#0C1316");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(0,standBot); ctx.lineTo(0,standTop+h*.05);
    ctx.quadraticCurveTo(w/2, standTop-h*.06, w, standTop+h*.05); ctx.lineTo(w,standBot); ctx.fill();
    // Roof rim
    ctx.strokeStyle="rgba(240,200,120,.35)"; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(0,standTop+h*.05); ctx.quadraticCurveTo(w/2, standTop-h*.06, w, standTop+h*.05); ctx.stroke();
    // Crowd: flag colours of the region
    const crowd = ["#F4F1E8","#C8102E","#00732F","#8A1538","#F4F1E8","#006C35","#2A2F33","#E0B040"];
    for(let i=0;i<Math.round(w*1.6);i++){
      const cx = R()*w, t = R();
      const topAt = standTop + h*.05 - (1-Math.pow((cx-w/2)/(w/2),2))*h*.055;
      const cy = topAt + 6 + t*(standBot-topAt-8);
      ctx.fillStyle = crowd[(R()*crowd.length)|0]; ctx.globalAlpha = .35 + R()*.4;
      ctx.fillRect(cx, cy, 2, 2);
    }
    ctx.globalAlpha = 1;
    // Floodlights with beams
    [[w*.07,-1],[w*.93,1]].forEach(([fx,s])=>{
      const top = h*.12;
      ctx.fillStyle="#0A1114"; ctx.fillRect(fx-2, top, 4, standBot-top);
      ctx.fillStyle="#FFF6D8"; ctx.shadowColor="rgba(255,240,190,.9)"; ctx.shadowBlur=18;
      for(let r2=0;r2<3;r2++) for(let c=0;c<5;c++) ctx.fillRect(fx-14+c*6, top-14+r2*5, 4, 3);
      ctx.shadowBlur=0;
      const bg = ctx.createLinearGradient(fx,top,w/2,h);
      bg.addColorStop(0,"rgba(255,244,205,.28)"); bg.addColorStop(1,"rgba(255,244,205,0)");
      ctx.fillStyle = bg; ctx.beginPath(); ctx.moveTo(fx-12,top); ctx.lineTo(fx+12,top);
      ctx.lineTo(w/2 - s*w*.05, h); ctx.lineTo(w/2 - s*w*.45, h); ctx.fill();
    });
    // Pitch in perspective
    const pTop = standBot, inset = w*.12;
    const stripes = 12;
    for(let i=0;i<stripes;i++){
      const y0 = pTop + (h-pTop)*Math.pow(i/stripes,1.3), y1 = pTop + (h-pTop)*Math.pow((i+1)/stripes,1.3);
      ctx.fillStyle = i%2 ? "#1E6B40" : "#237A4A";
      ctx.fillRect(0,y0,w,y1-y0+1);
    }
    ctx.strokeStyle="rgba(255,255,255,.75)"; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(inset, pTop+4); ctx.lineTo(w-inset, pTop+4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(w/2, pTop+4); ctx.lineTo(w/2, h); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(w/2, pTop+(h-pTop)*.62, w*.11, (h-pTop)*.32, 0, 0, Math.PI*2); ctx.stroke();
    ctx.fillStyle="#fff"; ctx.beginPath(); ctx.ellipse(w/2, pTop+(h-pTop)*.62, 3, 2, 0, 0, Math.PI*2); ctx.fill();
    // Ball
    const bx = w*.66, by = h*.9, br = Math.max(6, h*.028);
    ctx.fillStyle="rgba(0,0,0,.35)"; ctx.beginPath(); ctx.ellipse(bx+3, by+br*.9, br*1.1, br*.35, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle="#F7F7F2"; ctx.beginPath(); ctx.arc(bx,by,br,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="#1A1A1A"; ctx.beginPath();
    for(let k=0;k<5;k++){ const a = -Math.PI/2 + k*2*Math.PI/5; const px = bx + Math.cos(a)*br*.38, py = by + Math.sin(a)*br*.38; k?ctx.lineTo(px,py):ctx.moveTo(px,py); }
    ctx.closePath(); ctx.fill();
    // Haze over horizon
    g = ctx.createLinearGradient(0,hz-h*.05,0,hz+h*.08);
    g.addColorStop(0,"rgba(240,184,102,0)"); g.addColorStop(.5,"rgba(240,184,102,.12)"); g.addColorStop(1,"rgba(240,184,102,0)");
    ctx.fillStyle=g; ctx.fillRect(0,hz-h*.05,w,h*.13);
  }
  draw();
  let t; const ro = new ResizeObserver(()=>{ clearTimeout(t); t = setTimeout(draw, 80); }); ro.observe(cv);
})();
