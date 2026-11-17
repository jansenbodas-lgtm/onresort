/*
 * CONFIGURAÇÕES DA LANDING PAGE — edite aqui.
 *
 * whatsapp:          número com DDI + DDD, só dígitos (ex.: 5521987654321)
 * telefoneExibicao:  como o número aparece no rodapé
 * corretorNome/creci: identificação do corretor/imobiliária (obrigatório por lei)
 * formEndpoint:      URL que recebe os leads via POST (JSON). Ex.: webhook do
 *                    RD Station, Zapier, Make, Google Apps Script, Formspree, CRM.
 *                    Se ficar vazio, o lead é enviado direto para o WhatsApp.
 * abrirWhatsAppAposEnvio: abre o WhatsApp com os dados do lead após o envio.
 */
window.ONRESORT_CONFIG = {
  whatsapp: "5521999999999",
  telefoneExibicao: "(21) 99999-9999",
  corretorNome: "Seu Nome / Imobiliária",
  creci: "00000",
  mensagemWhatsApp: "Olá! Tenho interesse no ON Resort Cidade Jardim e gostaria de receber mais informações.",
  formEndpoint: "",
  abrirWhatsAppAposEnvio: true
};
