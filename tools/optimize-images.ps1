# ==========================================================
#  프로젝트 이미지 웹용 변환
#  assets/images/projects/<폴더>/<n>.(png|jpg)  →  assets/images/web/<폴더>/<n>.jpg
#  - 원본은 건드리지 않음
#  - 긴 변 최대 1800px, JPEG 품질 86
#  사용법 (프로젝트 루트에서):  powershell -ExecutionPolicy Bypass -File tools/optimize-images.ps1
#  이미 변환된 파일은 원본이 더 최신일 때만 다시 만듭니다.
# ==========================================================
param(
  [int]$MaxSide = 1800,
  [int]$Quality = 86
)

Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$src  = Join-Path $root 'assets/images/projects'
$dst  = Join-Path $root 'assets/images/web'

$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$params = New-Object System.Drawing.Imaging.EncoderParameters 1
$params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality), ([long]$Quality)

Get-ChildItem $src -Recurse -File -Include *.png, *.jpg, *.jpeg | ForEach-Object {
  $outDir = Join-Path $dst $_.Directory.Name
  $out    = Join-Path $outDir ($_.BaseName + '.jpg')
  if ((Test-Path $out) -and ((Get-Item $out).LastWriteTime -ge $_.LastWriteTime)) { return }
  New-Item -ItemType Directory -Force -Path $outDir | Out-Null

  $img = [System.Drawing.Image]::FromFile($_.FullName)
  try {
    $scale = [Math]::Min(1.0, $MaxSide / [Math]::Max($img.Width, $img.Height))
    $w = [int][Math]::Round($img.Width * $scale)
    $h = [int][Math]::Round($img.Height * $scale)
    $bmp = New-Object System.Drawing.Bitmap $w, $h
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode     = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode   = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::White)
    $g.DrawImage($img, 0, 0, $w, $h)
    $bmp.Save($out, $codec, $params)
    $g.Dispose(); $bmp.Dispose()
    Write-Output ("{0}/{1}.jpg  {2}x{3}  {4}KB" -f $_.Directory.Name, $_.BaseName, $w, $h, [Math]::Round((Get-Item $out).Length / 1KB))
  } finally {
    $img.Dispose()
  }
}

