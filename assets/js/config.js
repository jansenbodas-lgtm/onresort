/*
 * CONFIGURAÇÕES DA LANDING PAGE — edite aqui.
 *
 * whatsapp:          número com DDI + DDD, só dígitos (ex.: 5521987654321)
 * telefoneExibicao:  como o número aparece no rodapé
 * corretorNome/imobiliaria/creci: identificação no rodapé (o CRECI some se ficar vazio)
 * formEndpoint:      URL que recebe os leads via POST (JSON). Padrão: o CRM próprio
 *                    em /api/leads (Worker onresort + D1). Painel em /admin.
 */
window.ONRESORT_CONFIG = {
  whatsapp: "5521983799691",
  telefoneExibicao: "(21) 98379-9691",
  corretorNome: "Carla Jansen",
  imobiliaria: "JBI",
  creci: "94190",
  mensagemWhatsApp: "Olá! Tenho interesse no ON Resort Cidade Jardim e gostaria de receber mais informações.",
  formEndpoint: "/api/leads"
};
