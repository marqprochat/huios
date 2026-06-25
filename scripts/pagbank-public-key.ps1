# =============================================================================
# Gera a chave pública do PagBank (checkout transparente) a partir do token.
#
# Uso:
#   .\scripts\pagbank-public-key.ps1 -Token "SEU_TOKEN"            # sandbox (padrão)
#   .\scripts\pagbank-public-key.ps1 -Token "SEU_TOKEN" -Env prod  # produção
#
# A chave retornada deve ir em NEXT_PUBLIC_PAGBANK_PUBLIC_KEY (.env).
# Lembre: é embutida no build do huios-admin — rebuilde após alterar.
# =============================================================================

param(
    [Parameter(Mandatory = $true)]
    [string]$Token,

    [ValidateSet("sandbox", "prod")]
    [string]$Env = "sandbox"
)

$baseUrl = if ($Env -eq "prod") { "https://api.pagseguro.com" } else { "https://sandbox.api.pagseguro.com" }
$uri = "$baseUrl/public-keys"

Write-Host "Gerando chave pública ($Env)..." -ForegroundColor Cyan

try {
    $resp = Invoke-RestMethod -Method Post `
        -Uri $uri `
        -Headers @{ Authorization = "Bearer $Token"; "Content-Type" = "application/json"; "accept" = "application/json" } `
        -Body '{"type":"card"}'
}
catch {
    Write-Host "Falha ao gerar a chave pública." -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    if ($_.ErrorDetails.Message) { Write-Host $_.ErrorDetails.Message -ForegroundColor DarkYellow }
    exit 1
}

if (-not $resp.public_key) {
    Write-Host "Resposta sem 'public_key':" -ForegroundColor Red
    $resp | ConvertTo-Json -Depth 5
    exit 1
}

Write-Host ""
Write-Host "Chave pública gerada com sucesso:" -ForegroundColor Green
Write-Host ""
Write-Host "NEXT_PUBLIC_PAGBANK_PUBLIC_KEY=$($resp.public_key)"
Write-Host ""
Write-Host "Copie a linha acima para o seu .env e rebuilde o huios-admin." -ForegroundColor DarkGray
