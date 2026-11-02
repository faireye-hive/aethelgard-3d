# ✦ Aethelgard 3D — mundo explorável + editor
Protótipo de fantasia em Three.js e JavaScript puro. O mapa (168 × 84 pontos) é uma reconstrução editável do atlas enviado pelo criador. Inclui costa, mar, arquipélagos, cordilheiras, deserto, neve, florestas e oito localidades. O código gera geometria e personagens sem depender de modelos 3D externos.

## Jogar e testar
Execute um servidor HTTP na pasta do projeto:
```bash
python3 -m http.server 8000
```
Acesse **http://localhost:8000/** no navegador. É necessária uma conexão à internet para carregar a biblioteca Three.js fixada em uma versão do jsDelivr. Não abra o `index.html` diretamente com `file://`, porque isso pode bloquear os módulos.

Para publicar no GitHub Pages, vá a **Settings → Pages → Build and deployment → GitHub Actions**. O workflow `.github/workflows/pages.yml` publica este site sem etapa de build.

## Controles
| Ação | Tecla / controle |
| --- | --- |
| Andar em terceira pessoa | W A S D / setas |
| Correr | Shift |
| Pular | Espaço |
| Câmera | Arrastar mouse / toque; roda / pinça para zoom |
| Caminhar até um destino | Clique no terreno (rota terrestre) |
| Alternar exploração/editor | Botões no cabeçalho ou teclas 1 / 2 |
| Mobile | Joystick, botão Correr e botão Pular |
| Editor | Clique e arraste com a ferramenta selecionada |
| Desfazer/refazer | Ctrl+Z / Ctrl+Y |

No editor, altere o bioma, eleve, rebaixe e suavize o terreno; adicione cidades, castelos, portos, ruínas, rochas e árvores; defina o ponto inicial. As mudanças são salvas localmente. **Exporte JSON** para manter uma cópia e **importe** depois.

## Estrutura
- `index.html`: interface.
- `src/app.js`: mundo 3D, personagem low-poly animado, controles, câmera, terreno, locais, editor e navegação.
- `src/seed.js`: dados completos de relevo, biomas e localidades compactados (zlib); carregados via `DecompressionStream`.
- `src/style.css`: layout responsivo e controles mobile.
- `.github/workflows/pages.yml`: validação e publicação.

**Limitações**: este é um protótipo inicial, não um RPG completo. O mapa foi estimado a partir de uma imagem ilustrada e ainda precisa de correções manuais; os locais têm modelos geométricos simples. A travessia marítima, NPCs, sistema de combate e missões ainda não existem. Os dados não contêm a arte original do atlas, apenas sua reconstrução procedural. A ilustração fornecida pelo autor não é licenciada para terceiros.

## Estúdio de Assets 3D

Abra **[asset-editor.html](./asset-editor.html)**, disponível também pelo botão **Assets 3D** no topo do jogo, ou acesse diretamente a página publicada: https://faireye-hive.github.io/aethelgard-3d/asset-editor.html

Cada categoria (aventureiro, árvore, pedra, castelo, cidade, porto e ruínas) possui editor independente, com prévia 3D e seleção de peças. É possível editar escala geral, proporções X/Y/Z, posição/rotação/dimensões/cor/formato de cada peça, adicionar/duplicar/excluir peças, ajustar tamanho do personagem e visualizar animação de braços/pernas. Os modelos são geométricos e o catálogo é compartilhado entre o editor e o jogo.

**Para voltar ao mundo:** as edições são guardadas em `localStorage` sob `aethelgard-assets-v1`, por isso devem ser usadas no mesmo navegador/origem da versão publicada. Recarregue o jogo após editar, ou mantenha-o em outra aba para receber mudanças pelo evento de armazenamento.

**Para mandar alterações ao ChatGPT:** clique **Exportar catálogo JSON** e anexe `aethelgard-assets.json` nesta conversa. O botão **Exportar código JavaScript** também gera o catálogo em formato JS legível. O JSON pode ser importado no próprio editor. Exportar não cria automaticamente um commit no GitHub; o arquivo enviado aqui permite integrar os modelos revisados como padrões do projeto. Antes de limpar dados do navegador, guarde uma cópia do JSON.

O personagem agora começa em **55% da escala do antigo protótipo**; ajuste pelo controle **Tamanho geral** no Estúdio.
