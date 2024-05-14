Set-Location .\GPTPullRequestReview
npm run build
Set-Location ..
Remove-Item *.vsix
npx tfx-cli extension create