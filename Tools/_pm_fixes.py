import io

P = "app/src/main/assets/games/planetmerge/index.html"
s = io.open(P, encoding="utf-8").read()
n = 0


def sub(old, new, what):
    global s, n
    hits = s.count(old)
    assert hits == 1, "%s: %d hits" % (what, hits)
    s = s.replace(old, new, 1)
    n += 1


# --- 1. the bottom strip shows ONLY planets this run has unlocked ----------
sub(
    """function buildChain(container,unlockAll){
  for(let i=0;i<PLANETS.length;i++){
    const s=16+i*2;
    const cv=document.createElement('canvas');
    cv.width=s*2;cv.height=s*2;cv.style.width=s+'px';cv.style.height=s+'px';
    cv.getContext('2d').drawImage(ICONS[i],0,0,s*2,s*2);
    if(!unlockAll){
      /* In-game bottom strip: the FULL planet chain is always visible here,
         undiscovered planets greyed out; discover() lights them up as they
         appear on the board or in the next-planet queue. */
      cv.classList.add('locked');
    }
    container.appendChild(cv);
    stripItems.push({lvl:i+1,cv});
  }
}
function discover(lvl){
  if(discovered.has(lvl))return;
  discovered.add(lvl);
  for(const it of stripItems){
    if(it.lvl===lvl){
      it.cv.classList.remove('locked','pop');void it.cv.offsetWidth;it.cv.classList.add('pop');
    }
  }
}""",
    """function buildChain(container,unlockAll){
  for(let i=0;i<PLANETS.length;i++){
    const s=16+i*2;
    const cv=document.createElement('canvas');
    cv.width=s*2;cv.height=s*2;cv.style.width=s+'px';cv.style.height=s+'px';
    cv.getContext('2d').drawImage(ICONS[i],0,0,s*2,s*2);
    if(!unlockAll){
      /* In-game bottom strip. It shows ONLY the planets this run has actually
         unlocked: a planet counts as unlocked the moment it is on the board or
         waiting in the next-planet queue (see the discover() calls), so the
         strip reads as progress through the evolution rather than as a wall of
         greyed-out placeholders. */
      cv.classList.add('locked','pending');
    }
    container.appendChild(cv);
    stripItems.push({lvl:i+1,cv});
  }
}
function discover(lvl){
  if(discovered.has(lvl))return;
  discovered.add(lvl);
  for(const it of stripItems){
    if(it.lvl===lvl){
      it.cv.classList.remove('locked','pending','pop');
      void it.cv.offsetWidth;it.cv.classList.add('pop');
    }
  }
}""",
    "strip build/discover",
)

sub(
    "#chainWrap canvas{filter:drop-shadow(0 2px 3px rgba(90,60,30,.25))}\n"
    "#chainWrap canvas.locked{filter:drop-shadow(0 2px 3px rgba(90,60,30,.25))}",
    "#chainWrap canvas{filter:drop-shadow(0 2px 3px rgba(90,60,30,.25))}\n"
    "/* Not unlocked yet: not rendered at all, so the strip is pure progress. */\n"
    "#chainWrap canvas.pending{display:none}",
    "strip css",
)

# --- 2. keep the pile honest: wake anything left floating ------------------
sub(
    """Events.on(engine,'collisionStart',e=>{""",
    """/* Settle watchdog. Sleeping is what keeps this game cheap, but a sleeping
   planet that loses its support (the planet under it was merged away) never
   gets a collision event, so it hangs in the air. destroyBody() wakes the whole
   pile on every merge; this sweep is the belt-and-braces pass that catches any
   planet left unsupported for any other reason. */
let settleTick=0;
function settleSweep(){
  if((settleTick++%12)!==0) return;
  for(let i=0;i<planetBodies.length;i++){
    const b=planetBodies[i];
    if(!b.isSleeping) continue;
    let held=false;
    for(let j=0;j<planetBodies.length;j++){
      const o=planetBodies[j];
      if(o===b) continue;
      const dx=o.position.x-b.position.x, dy=o.position.y-b.position.y;
      if(dy<=0) continue;                       /* support must be BELOW */
      const reach=b.circleRadius+o.circleRadius+6;
      if(dx*dx+dy*dy<reach*reach){ held=true; break; }
    }
    if(!held&&b.position.y+b.circleRadius<BH-WALL-3) Matter.Sleeping.set(b,false);
  }
}

Events.on(engine,'collisionStart',e=>{""",
    "settle sweep",
)

io.open(P, "w", encoding="utf-8", newline="\n").write(s)
print("applied %d patches" % n)
