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
  whatsapp: "5521996903909",
  telefoneExibicao: "(21) 99690-3909",
  corretorNome: "Rafael Bodas",
  imobiliaria: "JBI",
  creci: "46697",
  mensagemWhatsApp: "Olá! Tenho interesse no ON Resort Cidade Jardim e gostaria de receber mais informações.",
  formEndpoint: "/api/leads"
};
