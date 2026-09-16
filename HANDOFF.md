## Handoff 2026-09-16
- settings phase (S3.1) work EXISTS but is BROKEN — preserved on
  branch wip/settings-broken (compile errors: NativeBridgeContext
  undefined, SettingsActivity dual companions + bad imports)
- main is at 9515b1d (S3.0) = last known-good shell
- planetmerge asset: check branch tree
  assets/games/planetmerge/index.html — if present and ~263KB with
  zero tokens, cherry-pick that file to main tomorrow OR re-copy
  from dist artifact
- TOMORROW on laptop: pull main → BUILD.bat → then EITHER redo
  settings phase properly with fixed spec, OR proceed to S3.2
  bundle with test games still present
- Launch checklist reminder: testred/testbridge/testlandscape
  canaries stay until planetmerge is verified on device
