param()
Add-Type -AssemblyName System.IO.Compression.FileSystem
Set-Location 'C:\Users\ROHIT\setu-frontend\dsa-quest-game\_route'
$dest = 'src\assets\tiles\ninja-village\WorldNPCs'
$zip = (Resolve-Path 'docs\asset-library\ninja-adventure\Ninja Adventure - Asset Pack.zip').Path
$z = [System.IO.Compression.ZipFile]::OpenRead($zip)
foreach ($n in @('Villager','NinjaBlue2','NinjaRed2')) {
  foreach ($f in @('SeparateAnim/Idle.png','SeparateAnim/Walk.png','Faceset.png')) {
    $e = $z.Entries | Where-Object FullName -eq "Ninja Adventure - Asset Pack/Actor/Character/$n/$f"
    if ($e) {
      $out = Join-Path $dest "$n\$($f.Split('/')[-1])"
      New-Item -ItemType Directory -Force -Path (Join-Path $dest $n) | Out-Null
      [System.IO.Compression.ZipFileExtensions]::ExtractToFile($e, $out, $true)
      $b = [System.IO.File]::ReadAllBytes($out)
      $w = [System.BitConverter]::ToUInt32((,$b[19] + $b[18] + $b[17] + $b[16]), 0)
      $h = [System.BitConverter]::ToUInt32((,$b[23] + $b[22] + $b[21] + $b[20]), 0)
      "$n/$($f.Split('/')[-1]) ${w}x${h}"
    } else { "$n/$f MISSING" }
  }
}
