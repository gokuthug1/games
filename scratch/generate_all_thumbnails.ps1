Add-Type -AssemblyName System.Drawing

$outDir = "c:\Users\jb\Documents\GitHub\games\assets\thumbnails"
if (!(Test-Path $outDir)) { New-Item -ItemType Directory -Force -Path $outDir }

$W = 640
$H = 360

function New-Poster {
    param($title, $genre, $bg1, $bg2)
    $bmp = New-Object System.Drawing.Bitmap($W, $H)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

    # Background Gradient
    $rect = New-Object System.Drawing.Rectangle(0, 0, $W, $H)
    $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, $bg1, $bg2, 60.0)
    $g.FillRectangle($brush, $rect)

    # Perspective Grid lines
    $gridPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(25, 255, 255, 255), 1)
    for ($y = 120; $y -lt $H; $y += 24) {
        $g.DrawLine($gridPen, 0, $y, $W, $y)
    }
    for ($x = 0; $x -le $W; $x += 40) {
        $g.DrawLine($gridPen, $x, 120, [int]($W/2 + ($x - $W/2) * 1.8), $H)
    }

    return @{ bmp = $bmp; g = $g; title = $title; genre = $genre }
}

function Save-Poster($ctx, $filename, $accentColor) {
    $g = $ctx.g
    $title = $ctx.title
    $genre = $ctx.genre

    # Vignette overlay
    $vignetteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(70, 0, 0, 0))
    $g.FillRectangle($vignetteBrush, 0, 0, $W, 50)
    $g.FillRectangle($vignetteBrush, 0, $H - 70, $W, 70)

    # Genre Badge
    $badgeFont = New-Object System.Drawing.Font("Arial", 9, [System.Drawing.FontStyle]::Bold)
    $badgeBrush = New-Object System.Drawing.SolidBrush($accentColor)
    $badgeBg = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(180, 15, 23, 42))
    $genreSize = $g.MeasureString($genre.ToUpper(), $badgeFont)
    $g.FillRectangle($badgeBg, 24, 20, $genreSize.Width + 16, 22)
    $g.DrawRectangle((New-Object System.Drawing.Pen($accentColor, 1)), 24, 20, $genreSize.Width + 16, 22)
    $g.DrawString($genre.ToUpper(), $badgeFont, $badgeBrush, 32, 24)

    # Title with Glow and Shadow
    $titleFont = New-Object System.Drawing.Font("Arial Black", 20, [System.Drawing.FontStyle]::Bold)
    $titleSize = $g.MeasureString($title, $titleFont)
    $titleX = [int](($W - $titleSize.Width) / 2)
    $titleY = $H - 58

    # Title Backdrop Pill
    $pillBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(210, 11, 15, 25))
    $g.FillRectangle($pillBrush, 20, $H - 68, $W - 40, 52)
    $pillPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(100, $accentColor.R, $accentColor.G, $accentColor.B), 1.5)
    $g.DrawRectangle($pillPen, 20, $H - 68, $W - 40, 52)

    # Shadow
    $shadowBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(200, 0, 0, 0))
    $g.DrawString($title, $titleFont, $shadowBrush, $titleX + 2, $titleY + 2)

    # Main Title
    $titleBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $g.DrawString($title, $titleFont, $titleBrush, $titleX, $titleY)

    # Border frame
    $framePen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(60, 255, 255, 255), 2)
    $g.DrawRectangle($framePen, 1, 1, $W - 2, $H - 2)

    $dest = Join-Path $outDir $filename
    $ctx.bmp.Save($dest, [System.Drawing.Imaging.ImageFormat]::Jpeg)
    $ctx.g.Dispose()
    $ctx.bmp.Dispose()
    Write-Output "Saved: $filename"
}

# 1. Animal Stack Arcade
$p = New-Poster "ANIMAL STACK ARCADE" "Physics" ([System.Drawing.Color]::FromArgb(15, 23, 42)) ([System.Drawing.Color]::FromArgb(30, 27, 75))
# Draw swinging crane and stack
$cranePen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(245, 158, 11), 3)
$p.g.DrawLine($cranePen, 320, 0, 320, 70)
# Blocks
$b1 = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(56, 189, 248))
$b2 = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(244, 63, 94))
$b3 = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(16, 185, 129))
$b4 = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(245, 158, 11))
$p.g.FillRectangle($b1, 280, 210, 80, 45)
$p.g.FillRectangle($b2, 290, 160, 65, 45)
$p.g.FillRectangle($b3, 295, 112, 60, 42)
$p.g.FillRectangle($b4, 295, 70, 50, 38)
Save-Poster $p "stack-physics.jpg" ([System.Drawing.Color]::FromArgb(245, 158, 11))

# 2. Friday Night Funkin' Web
$p = New-Poster "FRIDAY NIGHT FUNKIN' WEB" "Rhythm" ([System.Drawing.Color]::FromArgb(24, 10, 40)) ([System.Drawing.Color]::FromArgb(5, 5, 20))
# Draw glowing arrows
$arrowPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(168, 85, 247), 3)
$colors = @([System.Drawing.Color]::FromArgb(192, 132, 252), [System.Drawing.Color]::FromArgb(56, 189, 248), [System.Drawing.Color]::FromArgb(52, 211, 153), [System.Drawing.Color]::FromArgb(244, 63, 94))
for ($i = 0; $i -lt 4; $i++) {
    $x = 230 + $i * 60
    $ab = New-Object System.Drawing.SolidBrush($colors[$i])
    $p.g.FillEllipse($ab, $x, 120, 44, 44)
    # Equalizer bars
    for ($b = 0; $b -lt 5; $b++) {
        $p.g.FillRectangle($ab, $x + $b * 8, 180 + (5 - $b) * 10, 6, 25 + $b * 8)
    }
}
Save-Poster $p "fnf-rhythm.jpg" ([System.Drawing.Color]::FromArgb(192, 132, 252))

# 3. Minecraft Web 3D (GokuMC)
$p = New-Poster "MINECRAFT WEB 3D" "3D Sandbox" ([System.Drawing.Color]::FromArgb(14, 165, 233)) ([System.Drawing.Color]::FromArgb(5, 46, 22))
# Draw 3D voxel cubes
$grassTop = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(74, 222, 128))
$dirtSide = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(136, 92, 54))
$stoneSide = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(100, 116, 139))
$diaSide = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(56, 189, 248))
for ($row = 0; $row -lt 4; $row++) {
    for ($col = 0; $col -lt 7; $col++) {
        $vx = 140 + $col * 50 - $row * 20
        $vy = 120 + $row * 30
        $p.g.FillRectangle($grassTop, $vx, $vy, 46, 16)
        $p.g.FillRectangle($dirtSide, $vx, $vy + 16, 46, 24)
    }
}
$p.g.FillRectangle($diaSide, 300, 130, 40, 40)
Save-Poster $p "goku-mc.jpg" ([System.Drawing.Color]::FromArgb(74, 222, 128))

# 4. Retro Neon Snake 2.0
$p = New-Poster "RETRO NEON SNAKE 2.0" "Arcade" ([System.Drawing.Color]::FromArgb(2, 6, 23)) ([System.Drawing.Color]::FromArgb(4, 30, 20))
$snakeBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(34, 197, 94))
$snakeHead = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(56, 189, 248))
$appleBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(244, 63, 94))
# Snake Body
$pts = @(
    @{x=220;y=170},@{x=245;y=170},@{x=270;y=170},@{x=295;y=170},
    @{x=295;y=145},@{x=295;y=120},@{x=320;y=120},@{x=345;y=120},
    @{x=370;y=120},@{x=395;y=120},@{x=420;y=120}
)
foreach ($pt in $pts) {
    $p.g.FillRectangle($snakeBrush, $pt.x, $pt.y, 22, 22)
}
$p.g.FillRectangle($snakeHead, 420, 120, 22, 22)
# Glowing food
$p.g.FillEllipse($appleBrush, 470, 120, 22, 22)
Save-Poster $p "neon-snake.jpg" ([System.Drawing.Color]::FromArgb(34, 197, 94))

# 5. Cyber Breakout
$p = New-Poster "CYBER BREAKOUT" "Arcade" ([System.Drawing.Color]::FromArgb(15, 23, 42)) ([System.Drawing.Color]::FromArgb(45, 10, 30))
# Bricks
$bcolors = @([System.Drawing.Color]::FromArgb(244, 63, 94), [System.Drawing.Color]::FromArgb(245, 158, 11), [System.Drawing.Color]::FromArgb(56, 189, 248), [System.Drawing.Color]::FromArgb(168, 85, 247))
for ($r = 0; $r -lt 4; $r++) {
    $b = New-Object System.Drawing.SolidBrush($bcolors[$r])
    for ($c = 0; $c -lt 8; $c++) {
        $p.g.FillRectangle($b, 120 + $c * 52, 70 + $r * 22, 46, 16)
    }
}
# Paddle & Ball
$p.g.FillRectangle((New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(56, 189, 248))), 270, 220, 100, 16)
$p.g.FillEllipse((New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)), 315, 175, 16, 16)
Save-Poster $p "cyber-breakout.jpg" ([System.Drawing.Color]::FromArgb(244, 63, 94))

# 6. Vector Space Asteroids
$p = New-Poster "VECTOR SPACE ASTEROIDS" "Arcade" ([System.Drawing.Color]::FromArgb(5, 8, 18)) ([System.Drawing.Color]::FromArgb(2, 4, 10))
# Stars
$starBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
$rand = New-Object System.Random(42)
for ($i = 0; $i -lt 40; $i++) {
    $p.g.FillRectangle($starBrush, $rand.Next(20, $W-20), $rand.Next(20, $H-80), 2, 2)
}
# Vector Asteroids
$vecPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(56, 189, 248), 2)
$p.g.DrawPolygon($vecPen, @(
    (New-Object System.Drawing.Point(180, 110)), (New-Object System.Drawing.Point(220, 80)),
    (New-Object System.Drawing.Point(260, 120)), (New-Object System.Drawing.Point(240, 170)),
    (New-Object System.Drawing.Point(190, 160))
))
# Vector Ship
$shipPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(244, 63, 94), 2.5)
$p.g.DrawPolygon($shipPen, @(
    (New-Object System.Drawing.Point(360, 140)), (New-Object System.Drawing.Point(320, 120)),
    (New-Object System.Drawing.Point(330, 140)), (New-Object System.Drawing.Point(320, 160))
))
Save-Poster $p "asteroids-vector.jpg" ([System.Drawing.Color]::FromArgb(56, 189, 248))

# 7. Sugar Match-3 Blitz
$p = New-Poster "SUGAR MATCH-3 BLITZ" "Puzzle" ([System.Drawing.Color]::FromArgb(50, 10, 40)) ([System.Drawing.Color]::FromArgb(15, 23, 42))
$gems = @([System.Drawing.Color]::FromArgb(244, 63, 94), [System.Drawing.Color]::FromArgb(56, 189, 248), [System.Drawing.Color]::FromArgb(245, 158, 11), [System.Drawing.Color]::FromArgb(168, 85, 247), [System.Drawing.Color]::FromArgb(16, 185, 129))
for ($r = 0; $r -lt 3; $r++) {
    for ($c = 0; $c -lt 7; $c++) {
        $col = $gems[($r + $c) % $gems.Count]
        $gb = New-Object System.Drawing.SolidBrush($col)
        $p.g.FillEllipse($gb, 160 + $c * 48, 85 + $r * 48, 36, 36)
    }
}
Save-Poster $p "sugar-match3.jpg" ([System.Drawing.Color]::FromArgb(236, 72, 153))

# 8. Cyber 2048 Matrix
$p = New-Poster "CYBER 2048 MATRIX" "Puzzle" ([System.Drawing.Color]::FromArgb(11, 15, 25)) ([System.Drawing.Color]::FromArgb(20, 30, 50))
$tFont = New-Object System.Drawing.Font("Arial", 16, [System.Drawing.FontStyle]::Bold)
$tiles = @(
    @{val="2"; c=[System.Drawing.Color]::FromArgb(30, 41, 59); tc=[System.Drawing.Color]::White},
    @{val="64"; c=[System.Drawing.Color]::FromArgb(244, 63, 94); tc=[System.Drawing.Color]::White},
    @{val="512"; c=[System.Drawing.Color]::FromArgb(168, 85, 247); tc=[System.Drawing.Color]::White},
    @{val="2048"; c=[System.Drawing.Color]::FromArgb(234, 179, 8); tc=[System.Drawing.Color]::Black}
)
for ($i = 0; $i -lt 4; $i++) {
    $t = $tiles[$i]
    $tb = New-Object System.Drawing.SolidBrush($t.c)
    $p.g.FillRectangle($tb, 180 + $i * 75, 105, 64, 64)
    $p.g.DrawString($t.val, $tFont, (New-Object System.Drawing.SolidBrush($t.tc)), 188 + $i * 75, 122)
}
Save-Poster $p "matrix-2048.jpg" ([System.Drawing.Color]::FromArgb(234, 179, 8))

# 9. Connect 4 Tactical AI
$p = New-Poster "CONNECT 4 TACTICAL AI" "Card & Board" ([System.Drawing.Color]::FromArgb(10, 20, 45)) ([System.Drawing.Color]::FromArgb(2, 6, 23))
# Blue Grid Frame
$c4Pen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(37, 99, 235), 4)
$p.g.FillRectangle((New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(30, 58, 138))), 170, 75, 300, 160)
# Holes with chips
$redChip = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(239, 68, 68))
$yelChip = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(234, 179, 8))
$emptySlot = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(11, 15, 25))
for ($r = 0; $r -lt 4; $r++) {
    for ($c = 0; $c -lt 6; $c++) {
        $chip = $emptySlot
        if (($r + $c) % 3 -eq 0) { $chip = $redChip }
        elseif (($r + $c) % 2 -eq 0) { $chip = $yelChip }
        $p.g.FillEllipse($chip, 185 + $c * 48, 85 + $r * 38, 30, 30)
    }
}
Save-Poster $p "connect4-ai.jpg" ([System.Drawing.Color]::FromArgb(37, 99, 235))

# 10. Cyber Minesweeper
$p = New-Poster "CYBER MINESWEEPER" "Puzzle" ([System.Drawing.Color]::FromArgb(11, 15, 25)) ([System.Drawing.Color]::FromArgb(15, 23, 42))
# Cells
$minePen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(56, 189, 248), 1.5)
$mFont = New-Object System.Drawing.Font("Arial", 14, [System.Drawing.FontStyle]::Bold)
for ($r = 0; $r -lt 3; $r++) {
    for ($c = 0; $c -lt 6; $c++) {
        $p.g.FillRectangle((New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(30, 41, 59))), 200 + $c * 42, 90 + $r * 42, 38, 38)
    }
}
# Mine icon in one
$p.g.FillEllipse((New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(244, 63, 94))), 250, 140, 20, 20)
$p.g.DrawString("1", $mFont, (New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(56, 189, 248))), 212, 100)
$p.g.DrawString("2", $mFont, (New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(52, 211, 153))), 295, 100)
$p.g.DrawString("3", $mFont, (New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(248, 113, 113))), 337, 100)
Save-Poster $p "cyber-minesweeper.jpg" ([System.Drawing.Color]::FromArgb(56, 189, 248))

# 11. Cyber Tetris Matrix
$p = New-Poster "CYBER TETRIS MATRIX" "Arcade" ([System.Drawing.Color]::FromArgb(5, 8, 20)) ([System.Drawing.Color]::FromArgb(20, 10, 35))
# Falling Tetrominoes
$tI = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(56, 189, 248))
$tT = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(168, 85, 247))
$tO = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(234, 179, 8))
$tZ = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(239, 68, 68))
# T Piece
$p.g.FillRectangle($tT, 280, 80, 28, 28)
$p.g.FillRectangle($tT, 252, 108, 28, 28)
$p.g.FillRectangle($tT, 280, 108, 28, 28)
$p.g.FillRectangle($tT, 308, 108, 28, 28)
# O Piece
$p.g.FillRectangle($tO, 360, 140, 28, 28)
$p.g.FillRectangle($tO, 388, 140, 28, 28)
$p.g.FillRectangle($tO, 360, 168, 28, 28)
$p.g.FillRectangle($tO, 388, 168, 28, 28)
# I Piece
for ($i = 0; $i -lt 4; $i++) {
    $p.g.FillRectangle($tI, 180 + $i * 28, 170, 28, 28)
}
Save-Poster $p "cyber-tetris.jpg" ([System.Drawing.Color]::FromArgb(168, 85, 247))

# 12. Neon Pac-Man Maze
$p = New-Poster "NEON PAC-MAN MAZE" "Arcade" ([System.Drawing.Color]::FromArgb(0, 0, 0)) ([System.Drawing.Color]::FromArgb(10, 20, 40))
# Pacman
$pacBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(250, 204, 21))
$p.g.FillPie($pacBrush, 220, 110, 60, 60, 30, 300)
# Pellets
$pelletBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(254, 240, 138))
for ($i = 0; $i -lt 5; $i++) {
    $p.g.FillEllipse($pelletBrush, 310 + $i * 30, 134, 12, 12)
}
# Blinky Ghost
$ghostBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(239, 68, 68))
$p.g.FillPie($ghostBrush, 130, 110, 50, 50, 180, 180)
$p.g.FillRectangle($ghostBrush, 130, 135, 50, 25)
Save-Poster $p "neon-pacman.jpg" ([System.Drawing.Color]::FromArgb(250, 204, 21))

# 13. Cyber Flappy Jet
$p = New-Poster "CYBER FLAPPY JET" "Arcade" ([System.Drawing.Color]::FromArgb(2, 6, 23)) ([System.Drawing.Color]::FromArgb(15, 23, 42))
# Neon Gates
$gateBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(15, 23, 42))
$gatePen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(56, 189, 248), 2)
$p.g.FillRectangle($gateBrush, 400, 0, 50, 100)
$p.g.DrawRectangle($gatePen, 400, 0, 50, 100)
$p.g.FillRectangle($gateBrush, 400, 200, 50, 160)
$p.g.DrawRectangle($gatePen, 400, 200, 50, 160)
# Jet
$jetBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(2, 132, 199))
$p.g.FillPolygon($jetBrush, @((New-Object System.Drawing.Point(280, 150)), (New-Object System.Drawing.Point(230, 130)), (New-Object System.Drawing.Point(240, 150)), (New-Object System.Drawing.Point(230, 170))))
Save-Poster $p "cyber-flappy.jpg" ([System.Drawing.Color]::FromArgb(56, 189, 248))

# 14. Cyber Pong Duel
$p = New-Poster "CYBER PONG DUEL" "Arcade" ([System.Drawing.Color]::FromArgb(5, 8, 20)) ([System.Drawing.Color]::FromArgb(15, 23, 42))
# Center net
$netPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(50, 255, 255, 255), 2)
$netPen.DashPattern = @(4.0, 6.0)
$p.g.DrawLine($netPen, 320, 40, 320, 260)
# Paddles
$p.g.FillRectangle((New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(56, 189, 248))), 140, 100, 14, 80)
$p.g.FillRectangle((New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(244, 63, 94))), 490, 130, 14, 80)
# Ball
$p.g.FillEllipse((New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)), 340, 140, 16, 16)
Save-Poster $p "cyber-pong.jpg" ([System.Drawing.Color]::FromArgb(56, 189, 248))

# 15. Cyber Word Matrix
$p = New-Poster "CYBER WORD MATRIX" "Puzzle" ([System.Drawing.Color]::FromArgb(11, 15, 25)) ([System.Drawing.Color]::FromArgb(15, 23, 42))
$wFont = New-Object System.Drawing.Font("Arial Black", 18, [System.Drawing.FontStyle]::Bold)
$chars = @("C", "Y", "B", "E", "R")
$cGreen = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(16, 185, 129))
for ($i = 0; $i -lt 5; $i++) {
    $p.g.FillRectangle($cGreen, 175 + $i * 60, 100, 50, 50)
    $p.g.DrawString($chars[$i], $wFont, (New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)), 186 + $i * 60, 110)
}
Save-Poster $p "cyber-wordle.jpg" ([System.Drawing.Color]::FromArgb(16, 185, 129))

# 16. Cyber Laser Typer
$p = New-Poster "CYBER LASER TYPER" "Arcade" ([System.Drawing.Color]::FromArgb(6, 9, 19)) ([System.Drawing.Color]::FromArgb(25, 15, 35))
# Turret and Laser
$turretBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(30, 41, 59))
$p.g.FillPie($turretBrush, 290, 220, 60, 60, 180, 180)
$laserPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(56, 189, 248), 3)
$p.g.DrawLine($laserPen, 320, 220, 320, 100)
# Word target
$typerFont = New-Object System.Drawing.Font("Arial", 16, [System.Drawing.FontStyle]::Bold)
$p.g.FillRectangle((New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(244, 63, 94))), 250, 75, 140, 34)
$p.g.DrawString("TARGET", $typerFont, (New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)), 272, 80)
Save-Poster $p "cyber-typer.jpg" ([System.Drawing.Color]::FromArgb(56, 189, 248))

# 17. Neon Memory Matrix
$p = New-Poster "NEON MEMORY MATRIX" "Puzzle" ([System.Drawing.Color]::FromArgb(15, 23, 42)) ([System.Drawing.Color]::FromArgb(35, 15, 50))
$memBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(30, 41, 59))
$memPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(192, 132, 252), 2)
for ($i = 0; $i -lt 4; $i++) {
    $p.g.FillRectangle($memBrush, 170 + $i * 80, 95, 68, 68)
    $p.g.DrawRectangle($memPen, 170 + $i * 80, 95, 68, 68)
}
# Inner symbol
$p.g.FillEllipse((New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(192, 132, 252))), 272, 117, 24, 24)
$p.g.FillEllipse((New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(192, 132, 252))), 352, 117, 24, 24)
Save-Poster $p "neon-memory.jpg" ([System.Drawing.Color]::FromArgb(192, 132, 252))

Write-Output "All 17 thumbnails generated successfully!"
