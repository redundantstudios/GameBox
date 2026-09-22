# Builds every launcher icon from sources/app logo.jpeg.
#
#   * mipmap-<dpi>/ic_launcher.png + ic_launcher_round.png  (all densities)
#   * drawable/ic_launcher_foreground.png                    (adaptive icon)
#
# The foreground is drawn at 108dp with the logo centred at 58% so it sits
# inside the circular/rounded mask every launcher applies.
#
#   powershell -ExecutionPolicy Bypass -File _gen_launcher_icons.ps1

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$src  = Join-Path $root 'sources\app logo.jpeg'
$bmp  = [System.Drawing.Bitmap]::FromFile($src)
Write-Host ("source: {0}x{1}" -f $bmp.Width, $bmp.Height)

# --- square + round legacy icons, one per density -------------------------
$sizes = @{ 'mdpi' = 48; 'hdpi' = 72; 'xhdpi' = 96; 'xxhdpi' = 144; 'xxxhdpi' = 192 }

function Save-Square([System.Drawing.Bitmap]$b, [int]$px, [string]$path) {
    $out = New-Object System.Drawing.Bitmap $px, $px
    $g = [System.Drawing.Graphics]::FromImage($out)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.DrawImage($b, 0, 0, $px, $px)
    $g.Dispose()
    $out.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $out.Dispose()
}

function Save-Round([System.Drawing.Bitmap]$b, [int]$px, [string]$path) {
    $out = New-Object System.Drawing.Bitmap $px, $px
    $g = [System.Drawing.Graphics]::FromImage($out)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)
    $clip = New-Object System.Drawing.Drawing2D.GraphicsPath
    $clip.AddEllipse(0, 0, $px, $px)
    $g.SetClip($clip)
    $g.DrawImage($b, 0, 0, $px, $px)
    $g.Dispose(); $clip.Dispose()
    $out.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $out.Dispose()
}

foreach ($dpi in $sizes.Keys) {
    $px = $sizes[$dpi]
    $dir = Join-Path $root ("app\src\main\res\mipmap-" + $dpi)
    New-Item -ItemType Directory -Force $dir | Out-Null
    Save-Square $bmp $px (Join-Path $dir 'ic_launcher.png')
    Save-Round  $bmp $px (Join-Path $dir 'ic_launcher_round.png')
    Write-Host ("mipmap-{0}: {1}px" -f $dpi, $px)
}

# --- adaptive-icon foreground (108dp canvas, logo at 58%) -----------------
$fgPx = 432   # xxxhdpi 108dp
$fg = New-Object System.Drawing.Bitmap $fgPx, $fgPx
$g = [System.Drawing.Graphics]::FromImage($fg)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.Clear([System.Drawing.Color]::Transparent)
$inner = [int]($fgPx * 0.58)
$pad = [int](($fgPx - $inner) / 2)
$g.DrawImage($bmp, $pad, $pad, $inner, $inner)
$g.Dispose()
$fgPath = Join-Path $root 'app\src\main\res\drawable\ic_launcher_foreground.png'
$fg.Save($fgPath, [System.Drawing.Imaging.ImageFormat]::Png)
$fg.Dispose()
$bmp.Dispose()
Write-Host "foreground: $fgPath"
Write-Host 'OK'
