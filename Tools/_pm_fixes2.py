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


# --- audio: lift the whole mix, it was reading as too quiet ----------------
sub("function applyGain(){if(master)master.gain.value=(muted||extMuted)?0:0.5;}",
    "function applyGain(){if(master)master.gain.value=(muted||extMuted)?0:0.85;}",
    "master gain")

sub("      const v=Math.min(0.18,0.02+speed*0.018);",
    "      const v=Math.min(0.32,0.05+speed*0.030);",
    "bounce volume")

sub("tone({f:Math.max(70,190-lvl*10),type:'sine',dur:0.07,vol:v});noise({dur:0.04,vol:v*0.4,freq:600});",
    "tone({f:Math.max(70,190-lvl*10),type:'sine',dur:0.08,vol:v});noise({dur:0.05,vol:v*0.5,freq:600});",
    "bounce noise")

# --- keep the pile settling ------------------------------------------------
sub("    if(++sweepTick%6===0)proximitySweep();",
    "    if(++sweepTick%6===0)proximitySweep();\n    settleSweep();",
    "settle sweep call")

# --- font: no swap-in flash on the first frame -----------------------------
before = s.count("font-display:swap;")
s = s.replace("font-display:swap;", "font-display:block;")
assert before == 3, "font-display hits: %d" % before
n += 1

io.open(P, "w", encoding="utf-8", newline="\n").write(s)
print("applied %d patches (%d font-face declarations)" % (n, before))
