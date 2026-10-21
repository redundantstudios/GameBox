/* ==== dpr.js ==== */
        (function(){
          try {
            if (window.__studioDpr) return;
            var raw = window.devicePixelRatio || 1;
            var start = Math.min(raw, 2);
            var cur = start;
            window.__studioDpr = start;
            window.__studioDprScale = function(){ return cur; };

            /* The page is handed a GETTER, not a number, so the value can be
               lowered later without the page knowing anything happened. A game
               that asks for devicePixelRatio - now or in a minute - gets the
               scale that is right for the machine it is running on. */
            Object.defineProperty(window, 'devicePixelRatio', {
              get: function(){ return cur; },
              configurable: true
            });
            console.log('DPR: ' + raw + ' -> ' + start +
              (start === raw ? ' (already under cap)' : ' CAPPED'));

            /* THE ADAPTIVE GOVERNOR.

               A fixed cap of 2 is the right answer for most phones and the
               wrong answer for a slow one. It cannot be right for both, because
               what a device can afford depends on how much of the screen it has
               to shade, how fast its GPU is, and what the game is drawing - none
               of which is knowable from the outside before it is running.

               So the cap is measured rather than guessed. This watches the real
               frame times the page is already producing, and if the machine
               cannot hold a smooth frame at the current scale, it steps the
               scale down and tells the page to re-lay-out.

               WHY IT STOPS WHEN LOWERING STOPS HELPING

               This is the part that matters. Stepping down blindly walks
               2 -> 1.5 -> 1.25 -> 1 even when the game is slow for a reason
               resolution has nothing to do with. A game that issues a thousand
               draw calls a frame is slow because of the calls, not the pixels,
               and every step down costs it sharpness and buys it nothing.

               So each step down is treated as an experiment: the median is
               measured before the step and again after, and if the new median
               is not meaningfully better then resolution is not the lever. The
               governor stops there, holding the scale it has, rather than
               grinding all the way to 1 and ruining the picture for no gain.

               THE SETTLE WINDOW, AND WHY IT IS NOT OPTIONAL

               The first version of this got the experiment wrong, and the
               device log showed exactly how. Connect Four stepped from 2 to 1.5
               and then reported:

                 median 24.9ms -> scale 1.5
                 median 41.6ms - lowering the resolution did not help, holding

               The frame times got WORSE after the resolution went down, which
               is not how pixels work - and the reason is that dropping the
               scale asks the game to re-lay-out, and Connect Four answers by
               rebuilding a full-screen table sprite and a full-screen board
               sprite. Those frames are the cost of the experiment, not the cost
               of the game, and the governor was reading them as proof that
               resolution was not the answer.

               So after a change the governor does not sample at all until the
               page has settled back down. "Settled" means the frame times are
               back near where they were before the change - not merely that
               enough milliseconds have passed - because how long a game takes
               to rebuild its artwork is not something the shell knows. A game
               that answers a resize in 200ms and one that takes a second and a
               half are both handled correctly by the same rule.

               There is a timeout on that wait as well, so a game that is
               genuinely still slow after the change is measured rather than
               waited on for ever.

               WHY IT IS OTHERWISE SAFE

               - It only ever steps DOWN. There is no path back up, so a game
                 can never pump between two resolutions mid-play, and a
                 transient - an ad loading, a garbage collection, a phone
                 thermal-throttling for a moment - cannot cause a visible
                 flicker. Restarting the game restores full quality.
               - It measures the MEDIAN of a window of frames, not the mean.
                 One slow frame is noise; a run of them is the machine talking.
               - A gap longer than 250ms is treated as the page having been
                 backgrounded or as a stall, never as a slow frame, so coming
                 back from the recents screen cannot trigger a step down.
               - A step down needs the median to be over the threshold on two
                 separate readings, so a single slow moment - a transition, a
                 tap, a menu opening - cannot trigger one.
               - The median is only computed every so often, not every frame.
                 Sorting a window sixty times a second to look at it once a
                 second would be a tax on the very thing being measured.
               - The floor is 1.0. Below that text stops being legible, and a
                 game that is unreadable is not playable.

               All twenty-five games re-read devicePixelRatio inside their own
               resize handler, and all twenty-five listen for the resize event,
               so the step down is picked up and applied by the game itself
               rather than by the shell reaching into its canvas. */
            var samples = [];
            var WINDOW = 120;      // frames per reading
            var WARMUP = 90;       // frames ignored while the page settles
            var COOLDOWN = 150;    // frames to wait after a change
            var MIN_SETTLE = 250;  // ms of quiet after a change before sampling
            var SETTLE_MAX = 2000; // ms after which a slow game is measured anyway
            var EVERY = 30;        // frames between readings
            var THRESHOLD = 22;    // ms; slower than about 45fps
            var IMPROVE = 0.88;    // a step down must buy at least this much
            var frames = 0, last = 0, sinceChange = 9999, reported = false;
            var lastMed = 0, held = false, badRuns = 0, changedAt = 0;

            function median(a){
              var b = a.slice().sort(function(x,y){ return x-y; });
              var m = b.length >> 1;
              return b.length % 2 ? b[m] : (b[m-1] + b[m]) / 2;
            }

            function tick(now){
              requestAnimationFrame(tick);
              if (!last) { last = now; frames = 1; return; }
              var dt = now - last;
              last = now;
              frames++;
              sinceChange++;
              if (frames <= WARMUP) return;
              /* After a change, the page is re-laying-out and its frame times
                 say more about the re-layout than about the scale. Sampling
                 waits until the frames are back near where they were before the
                 change, so the experiment measures the steady state and not the
                 cost of asking the question. */
              if (changedAt) {
                var elapsed = now - changedAt;
                var normal = dt < Math.max(8, (lastMed || 40) * 1.25);
                if (elapsed < MIN_SETTLE || (elapsed < SETTLE_MAX && !normal)) {
                  samples.length = 0;
                  return;
                }
                changedAt = 0;
              }
              if (dt > 0 && dt < 250) {
                samples.push(dt);
                if (samples.length > WINDOW) samples.shift();
              }
              if (held) return;
              if (sinceChange <= COOLDOWN) return;
              if (samples.length < WINDOW) return;
              if (frames % EVERY !== 0) return;
              var med = median(samples);
              if (!reported) {
                reported = true;
                console.log('QUAL: median ' + med.toFixed(1) + 'ms at scale ' + cur);
              }
              if (med <= THRESHOLD) { badRuns = 0; return; }
              /* Two bad readings, not one. A transition, a tap or a menu opening
                 can put one slow stretch in the window, and reacting to that
                 would cost sharpness for nothing. */
              if (++badRuns < 2) return;
              badRuns = 0;
              if (cur <= 1) return;

              /* Did the last step down actually make anything better? If it did
                 not, the bottleneck is somewhere resolution cannot reach. */
              if (lastMed > 0 && med > lastMed * IMPROVE) {
                held = true;
                console.log('QUAL: median ' + med.toFixed(1) + 'ms - lowering the ' +
                  'resolution did not help, holding at ' + cur);
                return;
              }

              var next = Math.max(1, Math.round(cur * 0.75 * 4) / 4);
              if (next >= cur - 0.01) return;
              cur = next;
              lastMed = med;
              sinceChange = 0;
              changedAt = now;
              samples.length = 0;
              console.log('QUAL: median ' + med.toFixed(1) + 'ms -> scale ' + cur);
              try { window.dispatchEvent(new Event('resize')); } catch(e){}
              try { window.dispatchEvent(new Event('orientationchange')); } catch(e){}
            }
            requestAnimationFrame(tick);
          } catch(e){ console.log('DPR cap failed: ' + e); }
        })();

/* ==== fullscreen.js ==== */
        (function(){
          try {
            if (window.__studioFsStub) return;
            window.__studioFsStub = true;
            var proto = (window.Element && window.Element.prototype) || null;
            if (!proto || typeof proto.requestFullscreen !== 'function') return;

            function announce(el){
              try { window.dispatchEvent(new Event('resize')); } catch(e){}
              try { document.dispatchEvent(new Event('fullscreenchange')); } catch(e){}
              try { el && el.dispatchEvent && el.dispatchEvent(new Event('fullscreenchange')); } catch(e){}
            }
            function mark(el, on){
              try {
                Object.defineProperty(document, 'fullscreenElement',
                  { value: on ? el : null, configurable: true });
                Object.defineProperty(document, 'fullscreenEnabled',
                  { value: true, configurable: true });
              } catch(e){}
            }

            proto.requestFullscreen = function(){
              var el = this;
              mark(el, true);
              try { window.setTimeout(function(){ announce(el); }, 0); } catch(e){ announce(el); }
              return Promise.resolve(el);
            };
            if (window.Document && Document.prototype &&
                typeof Document.prototype.exitFullscreen === 'function') {
              Document.prototype.exitFullscreen = function(){
                mark(null, false);
                try { window.setTimeout(function(){ announce(null); }, 0); } catch(e){}
                return Promise.resolve();
              };
            }
          } catch(e){}
        })();

/* ==== canvaswatch.js ==== */
        (function(){
          function log(m){ try{ console.log('CW: ' + m); }catch(e){} }
          try {
            if (window.__studioCanvasWatch) return;
            window.__studioCanvasWatch = true;
            /* Said FIRST, before anything that could throw, so an empty log
               means "never ran" and a lone "running" means "ran and then threw".
               Those are different bugs and the log has to be able to tell them
               apart. */
            log('running');

            function tag(cv){
              if (!cv || cv.__studioTagged) return;
              cv.__studioTagged = 1;
              cv.__studioId = (cv.__studioId || 0) + 1;
              var id = cv.__studioId;
              /* One inventory line, not one per canvas. Listing every canvas produced dozens
               of near-identical lines per game and buried the two events that
               actually mean anything - a backing store being thrown away and
               coming back. Those still log, every time. */
              if (!window.__studioCanvasListed) {
                window.__studioCanvasListed = 1;
                log('canvases tagged; first is ' + cv.width + 'x' + cv.height +
                    (cv.id ? ' id=' + cv.id : ''));
              }
              cv.addEventListener('contextlost', function(e){
                try { e.preventDefault(); }catch(_){}
                log('LOST #' + id + ' ' + cv.width + 'x' + cv.height);
              }, false);
              cv.addEventListener('contextrestored', function(){
                log('RESTORED #' + id + ' ' + cv.width + 'x' + cv.height);
              }, false);
            }

            var proto = window.HTMLCanvasElement && HTMLCanvasElement.prototype;
            if (proto && proto.getContext && !proto.__studioCanvasPatched) {
              var rawGet = proto.getContext;
              proto.getContext = function(){
                var ctx = rawGet.apply(this, arguments);
                try { tag(this); } catch(e){}
                return ctx;
              };
              proto.__studioCanvasPatched = 1;
            }
            try {
              var all = document.getElementsByTagName('canvas');
              for (var i = 0; i < all.length; i++) tag(all[i]);
            } catch(e){}

            /* A game that is alive but painting nothing shows up here as a gap
               in the frame callbacks. Only counted while the page is actually
               visible, because a backgrounded page legitimately stops being
               called and that is not a stall. */
            var last = 0, wasVisible = false;
            function beat(){
              var now = (window.performance && performance.now) ? performance.now() : Date.now();
              var vis = document.visibilityState !== 'hidden';
              if (vis && wasVisible && last && (now - last) > 1200) {
                log('STALL ' + Math.round(now - last) + 'ms');
              }
              if (vis) { last = now; wasVisible = true; }
              else { last = 0; wasVisible = false; }
              requestAnimationFrame(beat);
            }
            requestAnimationFrame(beat);
            log('watch installed');
          } catch(e){}
        })();

/* ==== audiotracker.js ==== */
        (function(){
          /* The tracker is injected more than once (page start, then a beat
             later because an injection at onPageStarted can be thrown away when
             the navigation commits). A second run used to build its OWN empty
             context list and overwrite the global suspend helper with it, so the
             contexts the first run had captured were suspended by a tracker
             holding nothing - logged as "suspend 0 ctx" while the game kept
             playing. The registry lives on window so every run shares one list,
             and a run that finds the constructor already wrapped leaves the
             existing helper alone. */
          var store=window.__studioAudioStore;
          if(!store){store=window.__studioAudioStore={live:[],held:false,wrapped:false};}
          var live=store.live;
          function log(m){ try{console.log('AudioTrack: '+m);}catch(e){} }
          if(store.wrapped){log('already wrapped, '+live.length+' ctx');return;}
          function suspendAll(on){
            store.held=!!on;
            log((on?'suspend ':'resume ')+live.length+' ctx');
            live.forEach(function(c){
              try{ on?(c.__realSuspend?c.__realSuspend():c.suspend())
                      :(c.__realResume?c.__realResume():c.resume()); }catch(e){}
            });
          }
          window.__studioSuspendAudioAll=suspendAll;
          ['AudioContext','webkitAudioContext'].forEach(function(name){
            var Orig=window[name]; if(!Orig)return;
            var Wrapped=function(){
              var ctx=new (Function.prototype.bind.apply(Orig,[null].concat([].slice.call(arguments))))();
              if(live.indexOf(ctx)<0)live.push(ctx);
              ctx.__realResume=ctx.resume.bind(ctx);
              ctx.__realSuspend=ctx.suspend.bind(ctx);
              /* Games call resume() from their own audio paths, which undid a
                 suspend issued a moment earlier. While the screen is backgrounded
                 resume() is a no-op, so only suspendAll can restart it. */
              ctx.resume=function(){ if(store.held)return Promise.resolve();
                                    return ctx.__realResume(); };
              log('captured ('+live.length+')');
              return ctx;
            };
            Wrapped.prototype=Orig.prototype;
            window[name]=Wrapped;
          });
          store.wrapped=true;
          document.addEventListener('visibilitychange',function(){
            suspendAll(document.hidden);
          });
          log('installed');
        })();
