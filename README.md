# Gestor de Obras - Medição de Canteiro

App completo de medição de canteiro de obra: múltiplas obras, empreiteiros, categorias
personalizadas, dashboard analítico, controle de aditivos e alerta de extrapolação de meta.

## Como publicar no Netlify (sem precisar de terminal/GitHub)

1. Acesse **https://app.netlify.com/drop**
2. Arraste a pasta **inteira** (com `index.html`, `app.jsx` e `netlify.toml`) para a área de upload
   - Se estiver com o ZIP, extraia todos os arquivos primeiro — não arraste o .zip fechado
3. Aguarde alguns segundos. O Netlify já publica o site com um link (ex: `nome-aleatorio.netlify.app`)
4. Pronto! Pode acessar esse link direto do celular.

## Publicar via GitHub (opcional, para atualizações automáticas)

1. Crie um repositório no GitHub e envie estes arquivos
2. No Netlify, escolha "Import from Git"
3. Não é necessário configurar build command nem publish directory — o `netlify.toml`
   já está configurado (publica a raiz do projeto, sem build)

## Importante sobre Câmera e GPS

- Funciona apenas em conexão **HTTPS** (o Netlify já publica em HTTPS automaticamente)
- Na primeira visita, o navegador vai pedir permissão de câmera e localização —
  confirme para poder tirar fotos e registrar GPS nas medições
- Os dados ficam salvos no `localStorage` do navegador do próprio aparelho.
  Isso significa que cada celular/navegador tem seu próprio conjunto de dados
  (não sincroniza entre aparelhos)

## Arquivos deste pacote

- `index.html` — carrega o app (React, Tailwind e ícones via CDN, sem necessidade de build)
- `app.jsx` — código completo do aplicativo (idêntico ao original, sem alteração de funcionalidade)
- `netlify.toml` — configuração de publicação e permissões de câmera/GPS
