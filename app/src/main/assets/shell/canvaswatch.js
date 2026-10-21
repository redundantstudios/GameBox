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
