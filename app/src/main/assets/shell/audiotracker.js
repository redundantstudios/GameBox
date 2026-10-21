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
