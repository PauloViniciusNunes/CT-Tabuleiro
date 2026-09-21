# CT-Tabuleiro

## Iniciar o ambiente completo

Instale as dependências do frontend e do backend normalmente. Para disponibilizar
uma sessão pela internet, instale também o
[`cloudflared`](https://developers.cloudflare.com/tunnel/downloads/) e confirme a
instalação com:

```bash
cloudflared --version
```

Depois execute apenas:

```bash
npm run start-all
```

O comando inicia e identifica os logs de frontend, backend, Socket.IO e
Cloudflare. Assim que o Quick Tunnel estiver conectado, um painel separado mostra
a URL aleatória `https://*.trycloudflare.com`. Essa é a única URL que deve ser
compartilhada com os jogadores. Ela muda a cada execução.

Quick Tunnels são destinados somente a desenvolvimento e testes. Se a criação
do tunnel falhar ou o `cloudflared` não estiver instalado, os serviços locais
continuam funcionando. Uma configuração `config.yaml` existente no diretório do
`cloudflared` pode impedir o uso de Quick Tunnels.

### Roteamento

O Vite funciona como gateway local na porta `5173`:

| Caminho público | Destino interno |
| --- | --- |
| `/` | frontend Vite `127.0.0.1:5173` |
| `/api/*` | backend Next.js `127.0.0.1:3000` |
| `/socket.io/*` | Socket.IO `127.0.0.1:3001` (HTTP e WebSocket) |

O `cloudflared` aponta somente para o gateway Vite. A API e o Socket.IO não
ganham URLs públicas independentes. O frontend usa caminhos da mesma origem,
portanto funciona tanto em `http://ct-tabuleiro.local:5173` quanto na URL HTTPS
do tunnel.

### Executar sem Cloudflare

Para iniciar todos os serviços locais sem criar acesso remoto:

```bash
npm run start-all -- --no-cloudflare
```

Também é possível usar `CT_DISABLE_CLOUDFLARE=1 npm run start-all` em ambientes
Unix. `Ctrl+C` encerra frontend, backend, Socket.IO e `cloudflared` em conjunto.

### Autenticação e CORS

A autenticação usa JWT enviado no header `Authorization` e armazenado no
`sessionStorage`; ela não depende de cookies ou de domínio. O backend e o
Socket.IO aceitam as origens locais conhecidas, a origem configurada em
`FRONTEND_ORIGIN` e subdomínios HTTPS de `trycloudflare.com`. Não é utilizado
um CORS irrestrito com `*`.
