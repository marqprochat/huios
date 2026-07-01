"use client"

import { useState, useEffect } from "react"
import { ThemeToggle } from "../components/ThemeToggle"
import { useToast } from "../components/Toast/useToast"

export default function ConfiguracoesPage() {
  const [activeTab, setActiveTab] = useState("geral")
  const [locationStatus, setLocationStatus] = useState<string>("")
  const [geoLoading, setGeoLoading] = useState(false)
  const { toast } = useToast()
  
  // Estados para campos de localização
  const [locationName, setLocationName] = useState("")
  const [latitude, setLatitude] = useState("")
  const [longitude, setLongitude] = useState("")
  const [radiusMeters, setRadiusMeters] = useState("100")
  const [checkInBufferMinutes, setCheckInBufferMinutes] = useState("30")

  // Estados de pagamento (gerais)
  const [paymentProvider, setPaymentProvider] = useState<"pagbank" | "santander">("pagbank")
  const [editProvider, setEditProvider] = useState<"pagbank" | "santander">("pagbank")
  const [appUrl, setAppUrl] = useState("")
  const [paySaving, setPaySaving] = useState(false)
  const [payTesting, setPayTesting] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [showSantanderHelp, setShowSantanderHelp] = useState(false)

  // PagBank
  const [pagbankEnv, setPagbankEnv] = useState("sandbox")
  const [pagbankToken, setPagbankToken] = useState("")
  const [pagbankWebhookToken, setPagbankWebhookToken] = useState("")
  const [tokenMasked, setTokenMasked] = useState<string | null>(null)
  const [hasPublicKey, setHasPublicKey] = useState(false)

  // Santander
  const [santanderEnv, setSantanderEnv] = useState("sandbox")
  const [santanderClientId, setSantanderClientId] = useState("")
  const [santanderClientSecret, setSantanderClientSecret] = useState("")
  const [santanderClientSecretMasked, setSantanderClientSecretMasked] = useState<string | null>(null)
  const [santanderApplicationKey, setSantanderApplicationKey] = useState("")
  const [santanderPixKey, setSantanderPixKey] = useState("")
  const [santanderCertificate, setSantanderCertificate] = useState("")
  const [santanderCertificateKey, setSantanderCertificateKey] = useState("")
  const [santanderCertificatePassphrase, setSantanderCertificatePassphrase] = useState("")
  const [hasSantanderCert, setHasSantanderCert] = useState(false)
  const [hasSantanderKey, setHasSantanderKey] = useState(false)
  const [hasSantanderPassphrase, setHasSantanderPassphrase] = useState(false)
  const [santanderConfigured, setSantanderConfigured] = useState(false)
  const [santanderWebhookConfigured, setSantanderWebhookConfigured] = useState(false)

  const base = (appUrl || '').replace(/\/$/, '')
  const webhookUrl = `${base}/api/pagamentos/webhook/pagbank`
  const santanderWebhookUrl = `${base}/api/pagamentos/webhook/santander`

  // Carregar configurações ao montar
  useEffect(() => {
    fetchSettings()
    fetchCheckinConfig()
    fetchPaymentConfig()
  }, [])

  const fetchPaymentConfig = async () => {
    try {
      const res = await fetch('/api/admin/configuracoes/pagamento')
      if (res.ok) {
        const data = await res.json()
        const provider = data.paymentProvider === 'santander' ? 'santander' : 'pagbank'
        setPaymentProvider(provider)
        setEditProvider(provider)
        setAppUrl(data.appUrl || '')
        // PagBank
        setPagbankEnv(data.pagbankEnv || 'sandbox')
        setTokenMasked(data.tokenMasked || null)
        setHasPublicKey(!!data.hasPublicKey)
        // Santander
        setSantanderEnv(data.santanderEnv || 'sandbox')
        setSantanderClientId(data.santanderClientId || '')
        setSantanderClientSecretMasked(data.santanderClientSecretMasked || null)
        setSantanderApplicationKey(data.santanderApplicationKey || '')
        setSantanderPixKey(data.santanderPixKey || '')
        setHasSantanderCert(!!data.hasSantanderCert)
        setHasSantanderKey(!!data.hasSantanderKey)
        setHasSantanderPassphrase(!!data.hasSantanderPassphrase)
        setSantanderConfigured(!!data.santanderConfigured)
        setSantanderWebhookConfigured(!!data.santanderWebhookConfigured)
      }
    } catch (error) {
      console.error('Error fetching payment config:', error)
    }
  }

  const savePaymentConfig = async () => {
    setPaySaving(true)
    try {
      const res = await fetch('/api/admin/configuracoes/pagamento', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentProvider,
          appUrl,
          pagbankEnv,
          pagbankToken,
          pagbankWebhookToken,
          santanderEnv,
          santanderClientId,
          santanderClientSecret,
          santanderApplicationKey,
          santanderPixKey,
          santanderCertificate,
          santanderCertificateKey,
          santanderCertificatePassphrase,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        toast('success', 'Configurações salvas', 'Dados de pagamento salvos com sucesso.')
        setPagbankToken('')
        setPagbankWebhookToken('')
        setSantanderClientSecret('')
        setSantanderCertificate('')
        setSantanderCertificateKey('')
        fetchPaymentConfig()
      } else {
        toast('error', 'Erro ao salvar', data.error || 'Não foi possível salvar.')
      }
    } catch {
      toast('error', 'Erro ao salvar', 'Ocorreu um erro inesperado.')
    } finally {
      setPaySaving(false)
    }
  }

  const testPaymentConnection = async (provider: "pagbank" | "santander") => {
    setPayTesting(true)
    try {
      const res = await fetch(`/api/admin/configuracoes/pagamento?provider=${provider}`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        toast('success', 'Conexão validada', data.message || 'Conexão validada com sucesso.')
        fetchPaymentConfig()
      } else {
        toast('error', 'Falha na validação', data.error || 'Credenciais inválidas.')
      }
    } catch {
      toast('error', 'Falha na validação', 'Ocorreu um erro inesperado.')
    } finally {
      setPayTesting(false)
    }
  }

  // Lê um arquivo de certificado/chave (.pem/.crt/.key) para o estado.
  const readFileToState = (file: File | undefined, setter: (v: string) => void) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setter(typeof reader.result === 'string' ? reader.result : '')
    reader.readAsText(file)
  }

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings')
      if (response.ok) {
        const data = await response.json()
        setLocationName(data.locationName || '')
        setLatitude(data.latitude?.toString() || '')
        setLongitude(data.longitude?.toString() || '')
        setRadiusMeters(data.radiusMeters?.toString() || '100')
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
    }
  }

  const fetchCheckinConfig = async () => {
    try {
      const response = await fetch('/api/checkin-config')
      if (response.ok) {
         const data = await response.json()
         setCheckInBufferMinutes(data.checkInBufferMinutes?.toString() || '30')
      }
    } catch (error) {
       console.error('Error fetching checkin config:', error)
    }
  }

  // Função para obter localização do navegador
  const getCurrentLocation = () => {
    setGeoLoading(true)
    setLocationStatus("")

    if (!navigator.geolocation) {
      toast('error', 'Geolocalização não suportada', 'Este navegador não suporta geolocalização.')
      setGeoLoading(false)
      return
    }

    // Solicitar permissão e obter localização
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toString())
        setLongitude(position.coords.longitude.toString())
        toast('success', 'Localização obtida', `Precisão: ${Math.round(position.coords.accuracy)} metros`)
        setGeoLoading(false)
      },
      (error) => {
        let errorMessage = "Erro ao obter localização: "
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage += "Permissão negada. Por favor, permita o acesso à localização nas configurações do navegador."
            break
          case error.POSITION_UNAVAILABLE:
            errorMessage += "Informação de localização indisponível."
            break
          case error.TIMEOUT:
            errorMessage += "Tempo esgotado ao tentar obter localização."
            break
          default:
            errorMessage += error.message
        }
        toast('error', 'Erro ao obter localização', errorMessage)
        setGeoLoading(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    )
  }

  // Salvar configurações de localização
  const saveLocationSettings = async () => {
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationName,
          latitude: latitude ? parseFloat(latitude) : null,
          longitude: longitude ? parseFloat(longitude) : null,
          radiusMeters: parseInt(radiusMeters) || 100
        })
      })

      const configResponse = await fetch('/api/checkin-config', {
         method: 'PUT',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
            checkInBufferMinutes: parseInt(checkInBufferMinutes) || 30
         })
      })

      if (response.ok && configResponse.ok) {
        toast('success', 'Configurações salvas', 'As configurações de localização foram salvas com sucesso!')
      } else {
        const data = await response.json();
        toast('error', 'Erro ao salvar', data.error || 'Erro ao salvar as configurações.');
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      toast('error', 'Erro ao salvar', 'Ocorreu um erro inesperado. Tente novamente.');
    }
  }

  return (
    <div className="max-w-[1600px] mx-auto p-4 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Configurações</h2>
          <p className="text-slate-500 dark:text-slate-400">Gerencie as configurações do sistema</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar de navegação */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <nav className="flex flex-col">
              <button
                onClick={() => setActiveTab("geral")}
                className={`px-6 py-4 text-left text-sm font-bold flex items-center gap-3 transition-colors ${
                  activeTab === "geral"
                    ? "bg-primary/5 text-primary border-l-4 border-primary"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                <span className="material-symbols-outlined">settings</span>
                Geral
              </button>
              <button
                onClick={() => setActiveTab("aparencia")}
                className={`px-6 py-4 text-left text-sm font-bold flex items-center gap-3 transition-colors ${
                  activeTab === "aparencia"
                    ? "bg-primary/5 text-primary border-l-4 border-primary"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                <span className="material-symbols-outlined">palette</span>
                Aparência
              </button>
              <button
                onClick={() => setActiveTab("notificacoes")}
                className={`px-6 py-4 text-left text-sm font-bold flex items-center gap-3 transition-colors ${
                  activeTab === "notificacoes"
                    ? "bg-primary/5 text-primary border-l-4 border-primary"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                <span className="material-symbols-outlined">notifications</span>
                Notificações
              </button>
      <button
        onClick={() => setActiveTab("seguranca")}
        className={`px-6 py-4 text-left text-sm font-bold flex items-center gap-3 transition-colors ${
          activeTab === "seguranca"
            ? "bg-primary/5 text-primary border-l-4 border-primary"
            : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
        }`}
      >
        <span className="material-symbols-outlined">security</span>
        Segurança
      </button>
      <button
        onClick={() => setActiveTab("localizacao")}
        className={`px-6 py-4 text-left text-sm font-bold flex items-center gap-3 transition-colors ${
          activeTab === "localizacao"
            ? "bg-primary/5 text-primary border-l-4 border-primary"
            : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
        }`}
      >
        <span className="material-symbols-outlined">location_on</span>
        Localização
      </button>
      <button
        onClick={() => setActiveTab("pagamentos")}
        className={`px-6 py-4 text-left text-sm font-bold flex items-center gap-3 transition-colors ${
          activeTab === "pagamentos"
            ? "bg-primary/5 text-primary border-l-4 border-primary"
            : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
        }`}
      >
        <span className="material-symbols-outlined">credit_card</span>
        Pagamentos
      </button>
            </nav>
          </div>
        </div>

        {/* Conteúdo */}
        <div className="lg:col-span-3">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
            {activeTab === "geral" && (
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Configurações Gerais</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                      Nome da Instituição
                    </label>
                    <input
                      type="text"
                      defaultValue="Huios Seminário Teológico"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                      Email de Contato
                    </label>
                    <input
                      type="email"
                      defaultValue="contato@huios.edu.br"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                      Telefone
                    </label>
                    <input
                      type="tel"
                      defaultValue="(11) 1234-5678"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                  <button className="bg-primary text-white px-6 py-3 rounded-xl text-sm font-bold hover:opacity-90 transition-all shadow-lg shadow-primary/20">
                    Salvar Alterações
                  </button>
                </div>
              </div>
            )}

            {activeTab === "aparencia" && (
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Aparência</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">Tema Escuro</p>
                      <p className="text-sm text-slate-500">Alternar entre tema claro e escuro</p>
                    </div>
                    <ThemeToggle />
                  </div>
                </div>
              </div>
            )}

            {activeTab === "notificacoes" && (
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Notificações</h3>
                
                <div className="space-y-4">
                  {[
                    { label: "Novas matrículas", desc: "Receber notificação quando um aluno se matricular" },
                    { label: "Presença em aula", desc: "Alertas sobre frequência dos alunos" },
                    { label: "Novas provas", desc: "Notificação quando provas forem agendadas" },
                    { label: "Lembretes", desc: "Lembretes de aulas e eventos" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">{item.label}</p>
                        <p className="text-sm text-slate-500">{item.desc}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" defaultChecked className="sr-only peer" />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                      </label>
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                  <button className="bg-primary text-white px-6 py-3 rounded-xl text-sm font-bold hover:opacity-90 transition-all shadow-lg shadow-primary/20">
                    Salvar Preferências
                  </button>
                </div>
              </div>
            )}

{activeTab === "seguranca" && (
        <div className="space-y-6">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Segurança</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                Senha Atual
              </label>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                Nova Senha
              </label>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                Confirmar Nova Senha
              </label>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
            <button className="bg-primary text-white px-6 py-3 rounded-xl text-sm font-bold hover:opacity-90 transition-all shadow-lg shadow-primary/20">
              Atualizar Senha
            </button>
          </div>
        </div>
      )}

      {activeTab === "localizacao" && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Configuração de Localização</h3>
            <p className="text-sm text-slate-500 mt-1">
              Defina a localização padrão da instituição para verificação de presença via check-in.
            </p>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">info</span>
              <div>
                <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">
                  Como funciona o check-in de presença
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  Os alunos podem fazer check-in usando seus dispositivos móveis. O sistema verifica automaticamente 
                  se estão dentro do raio permitido desta localização. Configure abaixo os dados do local principal 
                  onde as aulas são realizadas.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                Nome do Local
              </label>
              <input
                type="text"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="Ex: Auditório Principal, Sala de Aulas"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Latitude
                </label>
                <input
                  type="number"
                  step="any"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  placeholder="-23.550520"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Longitude
                </label>
                <input
                  type="number"
                  step="any"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  placeholder="-46.633308"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                Raio de Tolerância (metros)
              </label>
              <input
                type="number"
                min="10"
                max="1000"
                value={radiusMeters}
                onChange={(e) => setRadiusMeters(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              />
              <p className="text-xs text-slate-500 mt-1">
                Distância máxima permitida para o check-in (padrão: 100m)
              </p>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                Limite de Horário para Check-in/out (minutos)
              </label>
              <input
                type="number"
                min="0"
                max="120"
                value={checkInBufferMinutes}
                onChange={(e) => setCheckInBufferMinutes(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              />
              <p className="text-xs text-slate-500 mt-1">
                Tempo de tolerância antes e depois do início/fim da aula (padrão: 30 minutos)
              </p>
            </div>

            <div className="flex items-center gap-4 pt-2">
              <button
                type="button"
                onClick={getCurrentLocation}
                disabled={geoLoading}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {geoLoading ? (
                  <>
                    <span className="material-symbols-outlined animate-spin">refresh</span>
                    Obtendo localização...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined">my_location</span>
                    Usar minha localização atual
                  </>
                )}
              </button>
              <span className="text-sm text-slate-500">
                Clique para permitir o acesso à sua localização
              </span>
            </div>

            {locationStatus && (
              <div className={`p-4 rounded-xl text-sm ${
                locationStatus.includes('sucesso') 
                  ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300'
                  : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
              }`}>
                {locationStatus}
              </div>
            )}

            {latitude && longitude && (
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl">
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Pré-visualização:</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Coordenadas: {latitude}, {longitude}
                </p>
                <a 
                  href={`https://www.google.com/maps?q=${latitude},${longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline mt-2 inline-flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">open_in_new</span>
                  Ver no Google Maps
                </a>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
            <button
              onClick={saveLocationSettings}
              className="bg-primary text-white px-6 py-3 rounded-xl text-sm font-bold hover:opacity-90 transition-all shadow-lg shadow-primary/20"
            >
              Salvar Configurações de Localização
            </button>
          </div>
        </div>
      )}

      {activeTab === "pagamentos" && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Pagamentos</h3>
            <p className="text-sm text-slate-500 mt-1">
              Configure a integração para cobrar matrículas e mensalidades online. Escolha qual provedor fica ativo.
            </p>
          </div>

          {/* Seletor do provedor ATIVO */}
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Integração ativa</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {([
                { v: 'pagbank', l: 'PagBank', d: 'Cartão, Pix e Boleto', ok: hasPublicKey },
                { v: 'santander', l: 'Santander (Pix)', d: 'Pix via API do banco', ok: santanderConfigured },
              ] as const).map((opt) => (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() => { setPaymentProvider(opt.v); setEditProvider(opt.v) }}
                  className={`text-left p-4 rounded-xl border-2 transition-all ${
                    paymentProvider === opt.v
                      ? 'border-primary bg-primary/5'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-900 dark:text-white">{opt.l}</span>
                    {paymentProvider === opt.v && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary text-white">ATIVO</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{opt.d}</p>
                  <span className={`mt-2 inline-block text-[11px] font-bold ${opt.ok ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
                    {opt.ok ? '● Configurado' : '○ Não configurado'}
                  </span>
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-2">
              O provedor <b>ativo</b> é o que será usado para gerar as cobranças. Lembre-se de clicar em <b>Salvar configurações</b>.
            </p>
          </div>

          {/* URL pública (compartilhada) */}
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
              URL pública do sistema
            </label>
            <input
              type="url"
              value={appUrl}
              onChange={(e) => setAppUrl(e.target.value)}
              placeholder="https://huios.igrejaconviva.com.br"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
            />
            <p className="text-xs text-slate-500 mt-1">Endereço HTTPS onde o sistema está hospedado. Usado para receber as notificações de pagamento.</p>
          </div>

          {/* Sub-abas: qual provedor configurar */}
          <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700">
            {([
              { v: 'pagbank', l: 'PagBank' },
              { v: 'santander', l: 'Santander' },
            ] as const).map((opt) => (
              <button
                key={opt.v}
                type="button"
                onClick={() => setEditProvider(opt.v)}
                className={`px-4 py-2 text-sm font-bold border-b-2 -mb-px transition-colors ${
                  editProvider === opt.v
                    ? 'border-primary text-primary'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                Configurar {opt.l}
              </button>
            ))}
          </div>

          {/* ===== Configuração PagBank ===== */}
          {editProvider === 'pagbank' && (
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-4">
              <p className="text-sm text-slate-500">Token de integração do PagBank (cartão, Pix e boleto).</p>
              <span className={`shrink-0 px-3 py-1 rounded-full text-xs font-bold ${
                hasPublicKey
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                  : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
              }`}>
                {hasPublicKey ? 'Conectado' : 'Não conectado'}
              </span>
            </div>

            {/* Passo a passo de ajuda */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
              <button
                type="button"
                onClick={() => setShowHelp((v) => !v)}
                className="w-full flex items-center justify-between gap-3 text-left"
              >
                <span className="flex items-center gap-2 text-sm font-bold text-blue-800 dark:text-blue-200">
                  <span className="material-symbols-outlined">help</span>
                  Como obter o Token do PagBank (passo a passo)
                </span>
                <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">
                  {showHelp ? 'expand_less' : 'expand_more'}
                </span>
              </button>
              {showHelp && (
                <ol className="mt-3 space-y-2 text-sm text-blue-800 dark:text-blue-200 list-decimal list-inside">
                  <li>Acesse <a href="https://minhaconta.pagbank.com.br" target="_blank" rel="noopener noreferrer" className="font-bold underline">minhaconta.pagbank.com.br</a> e faça login.</li>
                  <li>No menu, vá em <b>Venda Online</b> → <b>Integrações</b> → <b>Token de Integração</b>.</li>
                  <li>Se já existir um token, <b>copie o existente</b> (não apague). Senão, clique em <b>Gerar Token</b>.</li>
                  <li>Copie o código gerado e cole no campo <b>Token de Integração</b> abaixo.</li>
                  <li>Em <b>Notificação de transação</b>, cole a URL de notificação exibida abaixo e salve no painel do PagBank.</li>
                  <li>Selecione o ambiente <b>Produção</b>, salve, e clique em <b>Testar conexão</b>.</li>
                </ol>
              )}
            </div>

            {/* Ambiente */}
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Ambiente</label>
              <div className="flex gap-3">
                {[
                  { v: 'sandbox', l: 'Testes (Sandbox)' },
                  { v: 'prod', l: 'Produção' },
                ].map((opt) => (
                  <button
                    key={opt.v}
                    type="button"
                    onClick={() => setPagbankEnv(opt.v)}
                    className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
                      pagbankEnv === opt.v
                        ? 'bg-primary text-white border-primary'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {opt.l}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-1">Use <b>Produção</b> com o token real para cobrar de verdade.</p>
            </div>

            {/* URL de notificação (read-only, copiável) */}
            {appUrl && (
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  URL de notificação — cadastre esta no painel do PagBank:
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs break-all text-slate-600 dark:text-slate-400">{webhookUrl}</code>
                  <button
                    type="button"
                    onClick={() => { navigator.clipboard.writeText(webhookUrl); toast('success', 'Copiado', 'URL de notificação copiada.') }}
                    className="shrink-0 text-primary text-xs font-bold inline-flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">content_copy</span>Copiar
                  </button>
                </div>
              </div>
            )}

            {/* Token */}
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                Token de Integração
              </label>
              <input
                type="password"
                value={pagbankToken}
                onChange={(e) => setPagbankToken(e.target.value)}
                placeholder={tokenMasked ? `Salvo: ${tokenMasked} — preencha só para alterar` : 'Cole aqui o token do PagBank'}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              />
              <p className="text-xs text-slate-500 mt-1">
                {tokenMasked ? 'Já existe um token salvo. Deixe em branco para mantê-lo.' : 'Obrigatório para ativar os pagamentos.'}
              </p>
            </div>

            {/* Webhook token (opcional) */}
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                Token do Webhook <span className="font-normal text-slate-400">(opcional)</span>
              </label>
              <input
                type="password"
                value={pagbankWebhookToken}
                onChange={(e) => setPagbankWebhookToken(e.target.value)}
                placeholder="Usado para validar a autenticidade das notificações"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={savePaymentConfig}
                disabled={paySaving}
                className="bg-primary text-white px-6 py-3 rounded-xl text-sm font-bold hover:opacity-90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
              >
                {paySaving ? 'Salvando...' : 'Salvar configurações'}
              </button>
              <button
                onClick={() => testPaymentConnection('pagbank')}
                disabled={payTesting}
                className="px-6 py-3 rounded-xl text-sm font-bold border border-primary text-primary hover:bg-primary/5 transition-all disabled:opacity-50 inline-flex items-center gap-2"
              >
                {payTesting ? (
                  <><span className="material-symbols-outlined animate-spin text-base">refresh</span>Testando...</>
                ) : (
                  <><span className="material-symbols-outlined text-base">wifi_tethering</span>Testar conexão</>
                )}
              </button>
            </div>
          </div>
          )}

          {/* ===== Configuração Santander ===== */}
          {editProvider === 'santander' && (
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-4">
              <p className="text-sm text-slate-500">Integração Pix via API do Santander (Cobrança Pix / padrão Bacen).</p>
              <span className={`shrink-0 px-3 py-1 rounded-full text-xs font-bold ${
                santanderConfigured
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                  : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
              }`}>
                {santanderConfigured ? 'Conectado' : 'Não conectado'}
              </span>
            </div>

            {/* Passo a passo de ajuda */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
              <button
                type="button"
                onClick={() => setShowSantanderHelp((v) => !v)}
                className="w-full flex items-center justify-between gap-3 text-left"
              >
                <span className="flex items-center gap-2 text-sm font-bold text-blue-800 dark:text-blue-200">
                  <span className="material-symbols-outlined">help</span>
                  Como configurar o Pix do Santander (passo a passo)
                </span>
                <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">
                  {showSantanderHelp ? 'expand_less' : 'expand_more'}
                </span>
              </button>
              {showSantanderHelp && (
                <ol className="mt-3 space-y-2 text-sm text-blue-800 dark:text-blue-200 list-decimal list-inside">
                  <li>Tenha uma <b>conta PJ no Santander</b> com o <b>Pix ativado</b> e ao menos uma <b>chave Pix</b> cadastrada (e-mail, CNPJ, telefone ou aleatória).</li>
                  <li>Acesse o <a href="https://developer.santander.com.br" target="_blank" rel="noopener noreferrer" className="font-bold underline">Portal do Desenvolvedor Santander</a> e faça login com a conta do banco.</li>
                  <li>Em <b>Meus Aplicativos</b>, clique em <b>Criar aplicação</b> e assine o produto <b>Pix</b> (Cobrança Pix / API Pix).</li>
                  <li>Gere o <b>certificado de transporte</b> (mTLS): baixe os arquivos <b>.crt</b> (certificado) e <b>.key</b> (chave privada). Guarde-os em local seguro.</li>
                  <li>Copie o <b>Client ID</b> e o <b>Client Secret</b> da aplicação criada.</li>
                  <li>Volte aqui: selecione o ambiente, cole o <b>Client ID</b>, o <b>Client Secret</b>, a <b>chave Pix recebedora</b> e envie os arquivos <b>.crt</b> e <b>.key</b> nos campos abaixo.</li>
                  <li>Confira a <b>URL de notificação</b> exibida abaixo (ela é registrada automaticamente ao testar a conexão).</li>
                  <li>Selecione <b>Produção</b>, clique em <b>Salvar configurações</b> e depois em <b>Testar conexão</b>. Por fim, marque o Santander como <b>integração ativa</b> no topo.</li>
                </ol>
              )}
            </div>

            {/* Ambiente */}
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Ambiente</label>
              <div className="flex gap-3">
                {[
                  { v: 'sandbox', l: 'Testes (Sandbox)' },
                  { v: 'prod', l: 'Produção' },
                ].map((opt) => (
                  <button
                    key={opt.v}
                    type="button"
                    onClick={() => setSantanderEnv(opt.v)}
                    className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
                      santanderEnv === opt.v
                        ? 'bg-primary text-white border-primary'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {opt.l}
                  </button>
                ))}
              </div>
            </div>

            {/* Client ID */}
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Client ID</label>
              <input
                type="text"
                value={santanderClientId}
                onChange={(e) => setSantanderClientId(e.target.value)}
                placeholder="Client ID da aplicação no portal Santander"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              />
            </div>

            {/* Client Secret */}
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Client Secret</label>
              <input
                type="password"
                value={santanderClientSecret}
                onChange={(e) => setSantanderClientSecret(e.target.value)}
                placeholder={santanderClientSecretMasked ? `Salvo: ${santanderClientSecretMasked} — preencha só para alterar` : 'Client Secret da aplicação'}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              />
            </div>

            {/* Application Key (Developer API Key) */}
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Application Key</label>
              <input
                type="text"
                value={santanderApplicationKey}
                onChange={(e) => setSantanderApplicationKey(e.target.value)}
                placeholder="Application Key / Developer API Key do app (diferente do Client ID)"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              />
              <p className="text-xs text-slate-500 mt-1">
                No portal do Santander, na tela de credenciais do app, além do Client ID/Secret costuma existir uma <b>Application Key</b> (ou <b>Developer API Key</b>). Ela vai no header <code>X-Application-Key</code>. Deixe em branco se o seu app não tiver esse valor.
              </p>
            </div>

            {/* Chave Pix recebedora */}
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Chave Pix recebedora</label>
              <input
                type="text"
                value={santanderPixKey}
                onChange={(e) => setSantanderPixKey(e.target.value)}
                placeholder="e-mail, CNPJ, telefone ou chave aleatória"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              />
              <p className="text-xs text-slate-500 mt-1">A chave Pix da conta Santander que vai receber os pagamentos.</p>
            </div>

            {/* Certificado (.crt) */}
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                Certificado de transporte (.crt / .pem)
                {hasSantanderCert && <span className="ml-2 text-[11px] font-bold text-green-600 dark:text-green-400">● enviado</span>}
              </label>
              <input
                type="file"
                accept=".crt,.pem,.cer,.txt"
                onChange={(e) => readFileToState(e.target.files?.[0], setSantanderCertificate)}
                className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
              />
              {santanderCertificate && <p className="text-xs text-green-600 dark:text-green-400 mt-1">Novo certificado carregado (será salvo).</p>}
              <p className="text-xs text-slate-500 mt-1">
                {hasSantanderCert ? 'Já existe um certificado salvo. Envie um novo apenas para substituir.' : 'Arquivo do certificado gerado no portal Santander.'}
              </p>
            </div>

            {/* Chave do certificado (.key) */}
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                Chave privada do certificado (.key)
                {hasSantanderKey && <span className="ml-2 text-[11px] font-bold text-green-600 dark:text-green-400">● enviada</span>}
              </label>
              <input
                type="file"
                accept=".key,.pem,.txt"
                onChange={(e) => readFileToState(e.target.files?.[0], setSantanderCertificateKey)}
                className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
              />
              {santanderCertificateKey && <p className="text-xs text-green-600 dark:text-green-400 mt-1">Nova chave carregada (será salva).</p>}
              <p className="text-xs text-slate-500 mt-1">
                {hasSantanderKey ? 'Já existe uma chave salva. Envie uma nova apenas para substituir.' : 'Arquivo da chave privada gerada com o certificado.'}
              </p>
            </div>

            {/* Senha da chave privada (quando cifrada) */}
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                Senha da chave privada
                {hasSantanderPassphrase && <span className="ml-2 text-[11px] font-bold text-green-600 dark:text-green-400">● salva</span>}
              </label>
              <input
                type="password"
                autoComplete="new-password"
                value={santanderCertificatePassphrase}
                onChange={(e) => setSantanderCertificatePassphrase(e.target.value)}
                placeholder={hasSantanderPassphrase ? '•••••••• (deixe em branco para manter)' : 'Somente se a chave (.key) tiver senha'}
                className="block w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <p className="text-xs text-slate-500 mt-1">
                Preencha apenas se a chave privada estiver protegida por senha (começa com <code>ENCRYPTED PRIVATE KEY</code>). Deixe em branco para chaves sem proteção — senha incorreta causa o erro <code>bad decrypt</code>.
              </p>
            </div>

            {/* URL de notificação (read-only, copiável) */}
            {appUrl && (
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  URL de notificação (webhook) — registrada automaticamente ao testar a conexão:
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs break-all text-slate-600 dark:text-slate-400">{santanderWebhookUrl}</code>
                  <button
                    type="button"
                    onClick={() => { navigator.clipboard.writeText(santanderWebhookUrl); toast('success', 'Copiado', 'URL de notificação copiada.') }}
                    className="shrink-0 text-primary text-xs font-bold inline-flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">content_copy</span>Copiar
                  </button>
                </div>
                {santanderWebhookConfigured && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-2 font-bold">✓ Webhook registrado no Santander.</p>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={savePaymentConfig}
                disabled={paySaving}
                className="bg-primary text-white px-6 py-3 rounded-xl text-sm font-bold hover:opacity-90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
              >
                {paySaving ? 'Salvando...' : 'Salvar configurações'}
              </button>
              <button
                onClick={() => testPaymentConnection('santander')}
                disabled={payTesting}
                className="px-6 py-3 rounded-xl text-sm font-bold border border-primary text-primary hover:bg-primary/5 transition-all disabled:opacity-50 inline-flex items-center gap-2"
              >
                {payTesting ? (
                  <><span className="material-symbols-outlined animate-spin text-base">refresh</span>Testando...</>
                ) : (
                  <><span className="material-symbols-outlined text-base">wifi_tethering</span>Testar conexão</>
                )}
              </button>
            </div>
          </div>
          )}
        </div>
      )}
          </div>
        </div>
      </div>
    </div>
  )
}
