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
