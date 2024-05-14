Write-Host "Publishing extension"
$ext = Get-Content .\vss-extension.json -Raw | ConvertFrom-Json
$version = $ext.version -split "\."
$version[2] = [int]$version[2] + 1
$ext.version = $version -join "."
$ext | ConvertTo-Json -Depth 100 | Set-Content vss-extension.json
Write-Host "Updated version to $($ext.version)"

Set-Location .\GPTPullRequestReview

$task = Get-Content task.json -Raw | ConvertFrom-Json
$task.version.Patch = [int]$task.version.Patch + 1
$task | ConvertTo-Json -Depth 100 | Set-Content task.json
Write-Host "Updated task version to $($task.version.Major).$($task.version.Minor).$($task.version.Patch)"

npm install

npm run build
Set-Location ..
Remove-Item *.vsix
npx tfx-cli extension create