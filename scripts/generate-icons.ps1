Add-Type -AssemblyName System.Drawing

$pandaPath = "src/components/panda/assets/panda/happy/frame-01.png"
if (-not (Test-Path $pandaPath)) {
    Write-Error "Panda frame not found at $pandaPath"
    exit 1
}

$pandaImg = [System.Drawing.Image]::FromFile((Resolve-Path $pandaPath).Path)
$purpleColor = [System.Drawing.Color]::FromArgb(255, 124, 58, 237) # #7C3AED

function Create-Icon([string]$outputPath, [int]$width, [int]$height, [bool]$hasBackground, [double]$pandaScale = 0.7) {
    $bmp = New-Object System.Drawing.Bitmap($width, $height)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    if ($hasBackground) {
        $brush = New-Object System.Drawing.SolidBrush($purpleColor)
        $g.FillRectangle($brush, 0, 0, $width, $height)
        $brush.Dispose()
    } else {
        $g.Clear([System.Drawing.Color]::Transparent)
    }

    $targetSize = [int]([Math]::Min($width, $height) * $pandaScale)
    $posX = [int](($width - $targetSize) / 2)
    $posY = [int](($height - $targetSize) / 2)

    $g.DrawImage($pandaImg, $posX, $posY, $targetSize, $targetSize)
    $g.Dispose()

    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "Created $outputPath ($width x $height)"
}

# 1. Main app icon (1024x1024, purple background)
Create-Icon "assets/icon.png" 1024 1024 $true 0.65

# 2. Splash icon (512x512, transparent panda for splash)
Create-Icon "assets/splash-icon.png" 512 512 $false 0.75

# 3. Android adaptive icon foreground (1024x1024, transparent panda centered in safe area)
Create-Icon "assets/android-icon-foreground.png" 1024 1024 $false 0.55

# 4. Android adaptive icon background (1024x1024, solid purple)
Create-Icon "assets/android-icon-background.png" 1024 1024 $true 0.0

# 5. Favicon (48x48, purple background)
Create-Icon "assets/favicon.png" 48 48 $true 0.85

$pandaImg.Dispose()
Write-Host "All icons generated successfully!"
