param([int]$Port = 18106)
$ErrorActionPreference = 'Stop'
& node (Join-Path $PSScriptRoot 'tools/serve.mjs') $Port
