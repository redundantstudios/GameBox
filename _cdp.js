/* _cdp.js - minimal Chrome DevTools Protocol driver for the Shell's game WebView.
   Lets us inspect AND drive a running game page from the terminal (no npm deps).

   One-time device setup (the socket name carries the app's PID):
     adb forward tcp:9222 localabstract:webview_devtools_remote_<pid of app>

   Usage - each argument is one step, run in order:
     "expression"        evaluate JS in the page, print the JSON result
     tap:<selector>      tap that element (real touch event, CSS coords)
     tapxy:<x>,<y>       tap literal CSS viewport coords
     wait:<ms>           pause
     log:<text>          print text
     shot:<file.png>     screencap the device into <file.png>
     --console           at the end, print console/exception output captured

   Example:
     node _cdp.js "document.title" tap:#playBtn wait:600 shot:_x.png --console
*/
const PORT = Number(process.env.CDP_PORT || 9222);
const ADB = process.env.ADB || 'C:\\Users\\srinu\\.android-sdk\\platform-tools\\adb.exe';
const { execFileSync } = require('child_process');

const sleep = ms => new Promise(r => setTimeout(r, ms));

/* Several GameActivity instances can be alive at once, each with its own
   WebView on the same URL. The one actually on screen reports
   document.visibilityState === 'visible' - probe each candidate and use that. */
async function pickTarget(list) {
  const pages = list.filter(t => t.type === 'page' && t.webSocketDebuggerUrl && /index\.html/.test(t.url));
  const candidates = pages.length ? pages : list.filter(t => t.type === 'page' && t.webSocketDebuggerUrl);
  const probe = async t => {
    try {
      const ws = new WebSocket(t.webSocketDebuggerUrl);
      const done = new Promise((res, rej) => {
        const to = setTimeout(() => rej(new Error('probe timeout')), 4000);
        ws.addEventListener('open', async () => {
          ws.addEventListener('message', ev => {
            const m = JSON.parse(ev.data);
            if (m.id === 1) { clearTimeout(to); res(m.result?.result?.value); }
          });
          ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate',
            params: { expression: 'document.visibilityState+"|"+(!!window.__pmBooted)', returnByValue: true } }));
        });
        ws.addEventListener('error', () => { clearTimeout(to); rej(new Error('probe ws error')); });
      });
      const v = await done;
      ws.close();
      return { t, v };
    } catch (e) { return { t, v: 'ERR ' + e.message }; }
  };
  const results = await Promise.all(candidates.map(probe));
  results.forEach(r => console.log('# candidate ' + r.t.url.slice(-28) + ' -> ' + r.v));
  const visible = results.find(r => String(r.v).startsWith('visible'));
  return (visible || results[results.length - 1]).t;
}

(async () => {
  const args = process.argv.slice(2);
  const showConsole = args.includes('--console');
  const steps = args.filter(a => a !== '--console');

  const list = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
  const target = await pickTarget(list);
  if (!target) {
    console.error('No WebView page target on port ' + PORT);
    console.error(JSON.stringify(list.map(t => t.url), null, 1));
    process.exit(1);
  }
  console.log('# target: ' + target.url);

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  let id = 0;
  const waiters = new Map();
  const logs = [];

  ws.addEventListener('message', ev => {
    const msg = JSON.parse(ev.data);
    if (msg.id && waiters.has(msg.id)) { waiters.get(msg.id)(msg); waiters.delete(msg.id); return; }
    if (msg.method === 'Runtime.consoleAPICalled') {
      const text = msg.params.args.map(a => (a.value !== undefined ? String(a.value) : (a.description || a.type))).join(' ');
      logs.push(`[${msg.params.type}] ${text}`);
    } else if (msg.method === 'Runtime.exceptionThrown') {
      const d = msg.params.exceptionDetails;
      logs.push('[exception] ' + ((d.exception && d.exception.description) || d.text));
    }
  });

  const send = (method, params = {}, timeoutMs = 5000) => new Promise((res, rej) => {
    const i = ++id;
    const timer = setTimeout(() => { waiters.delete(i); rej(new Error('timeout: ' + method)); }, timeoutMs);
    waiters.set(i, msg => { clearTimeout(timer); res(msg); });
    ws.send(JSON.stringify({ id: i, method, params }));
  });

  await new Promise((res, rej) => {
    ws.addEventListener('open', res);
    ws.addEventListener('error', () => rej(new Error('websocket failed')));
  });
  await send('Runtime.enable');

  const evaluate = async expr => {
    const r = await send('Runtime.evaluate', {
      expression: expr, returnByValue: true, awaitPromise: true, userGesture: true
    });
    const out = r.result || {};
    if (out.exceptionDetails) {
      const d = out.exceptionDetails;
      return { exc: (d.exception && d.exception.description) || d.text };
    }
    return { value: out.result ? out.result.value : null };
  };

  /* Android WebView does not answer CDP Input.dispatchTouchEvent (it times out),
     so taps go through real `adb shell input tap`. CSS -> physical mapping:
       x_phys = x_css * SCALE
       y_phys = y_css * SCALE + OFFY      (WebView sits below the status bar)
     SCALE = screenWidthPx / innerWidth; OFFY = screenH - banner - innerH*SCALE. */
  const SCALE = Number(process.env.SCALE || 2.6258);
  const OFFY = Number(process.env.OFFY || 59);

  const tap = async (x, y) => {
    const px = Math.round(x * SCALE);
    const py = Math.round(y * SCALE + OFFY);
    execFileSync(ADB, ['shell', 'input', 'tap', String(px), String(py)]);
    await sleep(220);
    return [px, py];
  };

  for (const step of steps) {
    try {
      if (step.startsWith('wait:')) {
        const ms = Number(step.slice(5));
        await sleep(ms);
        console.log('.. waited ' + ms + 'ms');
      } else if (step.startsWith('log:')) {
        console.log(step.slice(4));
      } else if (step.startsWith('shot:')) {
        const file = step.slice(5);
        const onDev = '/sdcard/_cdp_shot.png';
        execFileSync(ADB, ['shell', 'screencap', '-p', onDev]);
        execFileSync(ADB, ['pull', onDev, file]);
        console.log('shot -> ' + file);
      } else if (step.startsWith('tapxy:')) {
        const [x, y] = step.slice(6).split(',').map(Number);
        const [px, py] = await tap(x, y);
        console.log(`tapxy css ${x},${y} -> phys ${px},${py}`);
      } else if (step.startsWith('tap:')) {
        const sel = step.slice(4);
        const r = await evaluate(
          `(()=>{const e=document.querySelector(${JSON.stringify(sel)});` +
          `if(!e)return null;const b=e.getBoundingClientRect();` +
          `return{x:b.left+b.width/2,y:b.top+b.height/2,w:b.width,h:b.height}})()`);
        if (!r.value) { console.log('TAP MISS: no element ' + sel); continue; }
        const [px, py] = await tap(r.value.x, r.value.y);
        console.log(`tap ${sel} css ${Math.round(r.value.x)},${Math.round(r.value.y)} -> phys ${px},${py} (${Math.round(r.value.w)}x${Math.round(r.value.h)})`);
      } else {
        const r = await evaluate(step);
        console.log(r.exc ? 'EXC  ' + r.exc : '=> ' + JSON.stringify(r.value));
      }
    } catch (err) {
      console.log('STEP FAILED (' + step + '): ' + err.message);
    }
  }

  if (showConsole) {
    console.log('--- console (' + logs.length + ') ---');
    logs.slice(-40).forEach(l => console.log(l));
  }
  ws.close();
  process.exit(0);
})().catch(err => { console.error('ERROR ' + err.message); process.exit(1); });
