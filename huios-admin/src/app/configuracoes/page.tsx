"use client"

import { useState, useEffect } from "react"
import { ThemeToggle } from "../components/ThemeToggle"

export default function ConfiguracoesPage() {
  const [activeTab, setActiveTab] = useState("geral")
  const [locationStatus, setLocationStatus] = useState<string>("")
  const [geoLoading, setGeoLoading] = useState(false)
  
  // Estados para campos de localização
  const [locationName, setLocationName] = useState("")
  const [latitude, setLatitude] = useState("")
  const [longitude, setLongitude] = useState("")
  const [radiusMeters, setRadiusMeters] = useState("100")

  // Carregar configurações ao montar
  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/settings')
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

  // Função para obter localização do navegador
  const getCurrentLocation = () => {
    setGeoLoading(true)
    setLocationStatus("")

    if (!navigator.geolocation) {
      setLocationStatus("Geolocalização não é suportada por este navegador.")
      setGeoLoading(false)
      return
    }

    // Solicitar permissão e obter localização
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toString())
        setLongitude(position.coords.longitude.toString())
        setLocationStatus(`Localização obtida com sucesso! Precisão: ${Math.round(position.coords.accuracy)} metros`)
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
        setLocationStatus(errorMessage)
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
      const response = await fetch('http://localhost:3001/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationName,
          latitude: latitude ? parseFloat(latitude) : null,
          longitude: longitude ? parseFloat(longitude) : null,
          radiusMeters: parseInt(radiusMeters) || 100
        })
      })

      if (response.ok) {
        alert('Configurações de localização salvas com sucesso!')
      } else {
        alert('Erro ao salvar configurações')
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      alert('Erro ao salvar configurações')
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
          </div>
        </div>
      </div>
    </div>
  )
}
